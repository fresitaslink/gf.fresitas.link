import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled function: run weekly to process subscription deliveries
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all active subscriptions due today or overdue
    const allSubs = await base44.asServiceRole.entities.Subscription.list();
    const due = allSubs.filter(s =>
      s.status === 'active' &&
      s.next_delivery &&
      s.next_delivery <= todayStr
    );

    const results = [];

    for (const sub of due) {
      try {
        const trackingCode = 'SUB' + Date.now().toString(36).toUpperCase();

        // Create an order from the subscription
        const order = await base44.asServiceRole.entities.Order.create({
          user_email: sub.user_email,
          customer_name: sub.customer_name || '',
          customer_phone: '',
          customer_address: sub.delivery_address,
          items: sub.items || [],
          subtotal: sub.total_monthly || 0,
          delivery_fee: 0, // subscriptions always free delivery
          discount: 0,
          total: sub.total_monthly || 0,
          status: 'pending',
          payment_method: 'transferencia',
          payment_status: 'pending',
          notes: `Pedido automático de suscripción ${sub.plan?.toUpperCase()} — ${sub.frequency}`,
          subscription_id: sub.id,
          tracking_code: trackingCode,
          loyalty_points_earned: Math.floor(sub.total_monthly || 0),
        });

        // Calculate next delivery date
        const next = new Date(sub.next_delivery || todayStr);
        if (sub.frequency === 'weekly') next.setDate(next.getDate() + 7);
        else if (sub.frequency === 'biweekly') next.setDate(next.getDate() + 14);
        else next.setMonth(next.getMonth() + 1);

        // Update subscription with new next_delivery
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          next_delivery: next.toISOString().split('T')[0],
        });

        // Notify customer
        await base44.asServiceRole.entities.Notification.create({
          user_email: sub.user_email,
          title_es: 'Nuevo pedido de suscripción generado',
          title_en: 'New subscription order generated',
          message_es: `Tu pedido recurrente (${trackingCode}) ha sido creado. Próxima entrega: ${next.toLocaleDateString('es-MX')}`,
          message_en: `Your recurring order (${trackingCode}) has been created. Next delivery: ${next.toLocaleDateString('en-US')}`,
          type: 'order_update',
          link: '/orders',
        });

        results.push({ subscription_id: sub.id, order_id: order.id, tracking_code: trackingCode, status: 'created' });
      } catch (err) {
        results.push({ subscription_id: sub.id, status: 'error', error: err.message });
      }
    }

    return Response.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});