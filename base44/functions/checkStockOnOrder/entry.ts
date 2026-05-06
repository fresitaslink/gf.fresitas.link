import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: triggered when a new Order is created
// Checks if critical ingredients (fresas, chocolate) are low after each order
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: order, event } = body;

    if (event?.type !== 'create') {
      return Response.json({ skipped: 'not a create event' });
    }

    // Get all ingredients
    const ingredients = await base44.asServiceRole.entities.Ingredient.list();

    // Determine which ingredients were consumed by this order
    const orderItems = order?.items || [];
    const usedIngredientKeys = new Set();

    orderItems.forEach(item => {
      const name = (item.name || '').toLowerCase();
      if (name.includes('fresa') || name.includes('strawberry')) usedIngredientKeys.add('fresa');
      if (name.includes('chocolate') || name.includes('choco')) usedIngredientKeys.add('chocolate');
      if (name.includes('crema') || name.includes('cream')) usedIngredientKeys.add('crema');
    });

    // Find low-stock ingredients that were used
    const criticalLowStock = ingredients.filter(ing => {
      const ingName = ing.name?.toLowerCase() || '';
      const isUsed = [...usedIngredientKeys].some(k => ingName.includes(k));
      const isLow = (ing.stock || 0) <= (ing.low_stock_threshold || 5);
      return isLow && isUsed;
    });

    // Also find any ingredients at zero (regardless of order)
    const outOfStock = ingredients.filter(i => (i.stock || 0) === 0);

    const allAlerts = [...new Map([...criticalLowStock, ...outOfStock].map(i => [i.id, i])).values()];

    if (allAlerts.length === 0) {
      return Response.json({ success: true, message: 'No low stock alerts needed' });
    }

    // Get settings
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const adminEmail = settingsList[0]?.admin_email;

    if (!adminEmail) {
      return Response.json({ success: true, message: 'No admin email configured' });
    }

    // Build alert email
    const rows = allAlerts.map(ing => `
      <tr>
        <td style="padding:10px 14px; font-weight:600; border-bottom:1px solid #f0f0f0;">${ing.name}</td>
        <td style="padding:10px 14px; text-align:center; border-bottom:1px solid #f0f0f0;">
          <span style="background:${ing.stock === 0 ? '#FEE2E2' : '#FEF3C7'};color:${ing.stock === 0 ? '#DC2626' : '#D97706'};padding:3px 10px;border-radius:20px;font-weight:bold;font-size:13px;">
            ${ing.stock === 0 ? 'AGOTADO' : `${ing.stock} ${ing.unit || 'u'}`}
          </span>
        </td>
        <td style="padding:10px 14px; text-align:center; color:#999; font-size:13px; border-bottom:1px solid #f0f0f0;">Mín: ${ing.low_stock_threshold || 5}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#5C2D0E,#8B4513);padding:28px;text-align:center;">
          <p style="font-size:36px;margin:0;">⚠️🍓</p>
          <h1 style="color:#FDE8EC;font-size:20px;margin:10px 0 4px;">Alerta Automática de Stock</h1>
          <p style="color:rgba(253,232,236,0.7);margin:0;font-size:13px;">Pedido #${order?.tracking_code || 'nuevo'} activó esta alerta</p>
        </div>
        <div style="padding:24px;background:#fff;">
          <p style="color:#555;font-size:14px;margin-bottom:16px;">
            El sistema detectó ingredientes con stock bajo o agotado después del último pedido:
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#FDE8EC;">
                <th style="padding:10px 14px;text-align:left;color:#E8294A;font-size:11px;text-transform:uppercase;">Ingrediente</th>
                <th style="padding:10px 14px;text-align:center;color:#E8294A;font-size:11px;text-transform:uppercase;">Stock</th>
                <th style="padding:10px 14px;text-align:center;color:#E8294A;font-size:11px;text-transform:uppercase;">Umbral</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="background:#FEF3C7;border-radius:10px;padding:14px;margin-top:20px;font-size:13px;color:#92400E;">
            <strong>💡 Acción requerida:</strong> Reabastece los ingredientes en tu panel de Admin → Stock IA para evitar que los productos se desactiven automáticamente.
          </div>
        </div>
      </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🚨 Stock Bajo detectado — Pedido #${order?.tracking_code || 'nuevo'} — Fresitas G&F`,
      body: html,
    });

    return Response.json({ success: true, alerts_sent: allAlerts.length, to: adminEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});