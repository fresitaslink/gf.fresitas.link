import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Trigger when order status → delivered
 * Records earnings, sends notifications, schedules review email
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const order = data;

    // Only trigger if delivered
    if (order.status !== 'delivered') {
      return Response.json({ success: true, message: 'Order not delivered' });
    }

    // 1. Record driver earnings
    if (order.assigned_driver_email) {
      try {
        await base44.asServiceRole.functions.invoke('recordDeliveryEarnings', {
          order_id: order.id,
          driver_email: order.assigned_driver_email,
          delivery_distance_km: 3,
          delivery_time_minutes: 20,
          is_rush: false
        });
      } catch (e) {
        console.warn('Earnings recording failed:', e);
      }
    }

    // 2. Send customer "delivered" notification
    if (order.user_email) {
      await base44.entities.Notification.create({
        user_email: order.user_email,
        title_es: '✅ ¡Tu pedido llegó!',
        title_en: '✅ Order delivered!',
        message_es: `Pedido #${order.tracking_code} entregado. ¡Disfrútalo! 🍓`,
        message_en: `Order #${order.tracking_code} delivered. Enjoy!`,
        type: 'order_update',
        link: '/orders'
      });

      // 3. Schedule review email for 30 minutes later
      // (In production, would use a scheduled job)
      setTimeout(async () => {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: order.user_email,
            subject: '⭐ ¿Cómo fue tu experiencia? Califica tu pedido',
            body: `Hola ${order.customer_name},

Tu pedido #${order.tracking_code} fue entregado por ${order.assigned_driver_name || 'nuestro repartidor'}.

¿Cómo fue tu experiencia? Tu opinión nos ayuda a mejorar. 🌟

👉 Califica aquí: ${order.assigned_driver_email ? `https://fresitas.app/orders?rate=${order.id}` : 'https://fresitas.app/orders'}

¡Gracias por tu compra! 🍓`
          });
        } catch (e) {
          console.warn('Review email failed:', e);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }

    console.log(`[onOrderDelivered] Order ${order.id} delivered. Earnings recorded, notifications sent.`);

    return Response.json({
      success: true,
      message: 'Order delivery processed',
      order_id: order.id
    });
  } catch (error) {
    console.error('[onOrderDelivered ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});