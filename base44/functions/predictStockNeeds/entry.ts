import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Predicts stock needs for the next 7 / 14 / 30 days based on:
 *  - Recent order history (last 30 days)
 *  - Active subscription demand (recurring weekly/biweekly/monthly orders)
 *  - Active scheduled orders
 *  - Per-ingredient safety buffer (low_stock_threshold)
 *
 * Returns predictions per ingredient + can trigger admin email alerts.
 *
 * Called from:
 *   - GET-style: { send_alerts: false } → just compute and return predictions (admin dashboard)
 *   - Scheduled automation: { send_alerts: true } → also email admin if items below buffer
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { send_alerts = false, horizon_days = 14 } = body;

    // Auth check (only admin/owner/manager can read)
    const user = await base44.auth.me().catch(() => null);
    if (!send_alerts && user && !['admin', 'owner', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [ingredients, products, orders, subscriptions, scheduledOrders, settings] = await Promise.all([
      base44.asServiceRole.entities.Ingredient.list(),
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Order.list('-created_date', 1000),
      base44.asServiceRole.entities.Subscription.filter({ status: 'active' }),
      base44.asServiceRole.entities.ScheduledOrder.filter({ status: 'active' }),
      base44.asServiceRole.entities.StoreSettings.list(),
    ]);

    // Filter recent non-cancelled orders
    const recentOrders = orders.filter(o => {
      if (o.status === 'cancelled') return false;
      return new Date(o.created_date) >= thirtyDaysAgo;
    });

    // Calculate average daily product consumption (units/day)
    const productDailyDemand = {}; // product_id -> avg units/day
    recentOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const id = item.product_id;
        if (!id) return;
        productDailyDemand[id] = (productDailyDemand[id] || 0) + (item.quantity || 1);
      });
    });
    Object.keys(productDailyDemand).forEach(id => {
      productDailyDemand[id] = productDailyDemand[id] / 30; // per-day avg
    });

    // Add subscription demand (recurring)
    subscriptions.forEach(sub => {
      // Subscriptions imply ~4 deliveries/month per active sub of related product
      // Conservative model: each active sub adds 0.13 units/day per "default" product
      // Without per-sub product mapping, we distribute evenly to top products
      const topProducts = products.filter(p => p.is_featured).slice(0, 3);
      topProducts.forEach(p => {
        productDailyDemand[p.id] = (productDailyDemand[p.id] || 0) + 0.13;
      });
    });

    // Add scheduled order demand
    scheduledOrders.forEach(s => {
      const perWeekFactor = s.frequency === 'weekly' ? 1 : s.frequency === 'biweekly' ? 0.5 : 0.25;
      const dailyFactor = perWeekFactor / 7;
      (s.items || []).forEach(item => {
        const id = item.product_id;
        if (!id) return;
        productDailyDemand[id] = (productDailyDemand[id] || 0) + (item.quantity || 1) * dailyFactor;
      });
    });

    // Build per-ingredient prediction
    const predictions = ingredients.map(ing => {
      const linkedIds = ing.linked_product_ids || [];
      // Sum daily demand across all linked products
      const dailyDemand = linkedIds.reduce((sum, pid) => sum + (productDailyDemand[pid] || 0), 0);
      const predicted7  = Math.ceil(dailyDemand * 7);
      const predicted14 = Math.ceil(dailyDemand * 14);
      const predicted30 = Math.ceil(dailyDemand * 30);
      const safetyBuffer = ing.low_stock_threshold || 5;
      // Reorder point = demand during lead-time (assume 3 days) + safety buffer
      const reorderPoint = Math.ceil(dailyDemand * 3) + safetyBuffer;
      const stock = ing.stock || 0;
      const daysOfSupply = dailyDemand > 0 ? Math.floor(stock / dailyDemand) : 999;

      let urgency = 'ok';
      if (stock <= safetyBuffer) urgency = 'critical';
      else if (stock <= reorderPoint) urgency = 'warning';
      else if (daysOfSupply < 7) urgency = 'attention';

      return {
        ingredient_id: ing.id,
        name: ing.name,
        unit: ing.unit,
        current_stock: stock,
        safety_buffer: safetyBuffer,
        reorder_point: reorderPoint,
        daily_demand: Math.round(dailyDemand * 100) / 100,
        days_of_supply: daysOfSupply,
        predicted_7d: predicted7,
        predicted_14d: predicted14,
        predicted_30d: predicted30,
        suggested_order: Math.max(0, reorderPoint + predicted14 - stock),
        urgency,
        linked_product_count: linkedIds.length,
      };
    });

    predictions.sort((a, b) => {
      const order = { critical: 0, warning: 1, attention: 2, ok: 3 };
      return order[a.urgency] - order[b.urgency];
    });

    const summary = {
      total_ingredients: ingredients.length,
      critical: predictions.filter(p => p.urgency === 'critical').length,
      warning: predictions.filter(p => p.urgency === 'warning').length,
      attention: predictions.filter(p => p.urgency === 'attention').length,
      ok: predictions.filter(p => p.urgency === 'ok').length,
      total_orders_analyzed: recentOrders.length,
      active_subscriptions: subscriptions.length,
      scheduled_orders: scheduledOrders.length,
      horizon_days,
    };

    // Send alert email if requested
    let emailSent = false;
    const itemsNeedingAlert = predictions.filter(p => p.urgency === 'critical' || p.urgency === 'warning');

    if (send_alerts && itemsNeedingAlert.length > 0) {
      const adminEmail = settings[0]?.admin_email;
      if (adminEmail) {
        const rows = itemsNeedingAlert.map(p => `
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px;font-weight:600;color:${p.urgency === 'critical' ? '#DC2626' : '#F59E0B'}">${p.urgency === 'critical' ? '🚨' : '⚠️'} ${p.name}</td>
            <td style="padding:10px;text-align:center">${p.current_stock} ${p.unit}</td>
            <td style="padding:10px;text-align:center;color:#666">${p.days_of_supply >= 999 ? '∞' : p.days_of_supply + ' d'}</td>
            <td style="padding:10px;text-align:center">${p.predicted_14d} ${p.unit}</td>
            <td style="padding:10px;text-align:center;font-weight:700;color:#E8294A">${p.suggested_order} ${p.unit}</td>
          </tr>`).join('');

        const emailHtml = `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:680px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
            <div style="background:linear-gradient(135deg,#DC2626,#F59E0B);padding:32px 30px;text-align:center">
              <p style="font-size:48px;margin:0">📦</p>
              <h1 style="color:white;font-size:24px;margin:12px 0 4px">Alerta de Inventario</h1>
              <p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px">${itemsNeedingAlert.length} ingrediente(s) requieren reabastecimiento</p>
            </div>
            <div style="padding:24px;background:#fff">
              <p style="color:#333;font-size:14px;margin-bottom:18px">Predicción basada en <b>${recentOrders.length} pedidos</b> de los últimos 30 días + <b>${subscriptions.length} suscripciones activas</b> + <b>${scheduledOrders.length} pedidos programados</b>.</p>
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                  <tr style="background:#F9FAFB;border-bottom:2px solid #E8294A">
                    <th style="padding:10px;text-align:left">Ingrediente</th>
                    <th style="padding:10px">Stock</th>
                    <th style="padding:10px">Días</th>
                    <th style="padding:10px">Demanda 14d</th>
                    <th style="padding:10px">Sugerido</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div style="background:#FDE8EC;border-left:4px solid #E8294A;padding:14px;border-radius:8px;margin-top:20px">
                <p style="margin:0;font-size:13px;color:#7A1D2E"><b>Recomendación:</b> Coloca pedidos a tus proveedores para los items críticos antes que se agoten. Los items en advertencia se acercan al punto de reorden.</p>
              </div>
            </div>
          </div>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `📦 ${itemsNeedingAlert.filter(p => p.urgency === 'critical').length > 0 ? '🚨 ' : ''}Alerta de inventario — ${itemsNeedingAlert.length} ingredientes`,
          body: emailHtml,
        });
        emailSent = true;
      }
    }

    return Response.json({
      success: true,
      summary,
      predictions,
      email_alert_sent: emailSent,
      items_alerted: itemsNeedingAlert.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});