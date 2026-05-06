import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Trigger when order status → delivered.
 * Records earnings (idempotent), sends customer notification + immediate review email.
 * NOTE: setTimeout doesn't survive in serverless — review email is sent immediately.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const order = data;

    if (order.status !== 'delivered') {
      return Response.json({ success: true, message: 'Order not delivered' });
    }

    // 1. Record driver earnings (function is idempotent)
    if (order.assigned_driver_email) {
      try {
        // Calculate real distance if available
        let distanceKm = 3;
        if (order.delivery_lat && order.delivery_lng && order.driver_current_lat && order.driver_current_lng) {
          distanceKm = haversine(
            order.driver_current_lat, order.driver_current_lng,
            order.delivery_lat, order.delivery_lng
          );
        }

        // Detect rush hour (LA timezone-ish: 11am-1pm or 6pm-9pm)
        const hour = new Date().getUTCHours() - 7; // crude PST adjust
        const isRush = (hour >= 11 && hour <= 13) || (hour >= 18 && hour <= 21);

        await base44.asServiceRole.functions.invoke('recordDeliveryEarnings', {
          order_id: order.id,
          driver_email: order.assigned_driver_email,
          delivery_distance_km: Math.max(1, distanceKm),
          delivery_time_minutes: 20,
          is_rush: isRush
        });
      } catch (e) {
        console.warn('Earnings recording failed:', e.message);
      }
    }

    // 2. Customer notification
    if (order.user_email) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: order.user_email,
          title_es: '✅ ¡Tu pedido llegó!',
          title_en: '✅ Order delivered!',
          message_es: `Pedido #${order.tracking_code} entregado. ¡Disfrútalo! 🍓`,
          message_en: `Order #${order.tracking_code} delivered. Enjoy!`,
          type: 'order_update',
          link: '/orders'
        });
      } catch (e) {
        console.warn('Notification failed:', e.message);
      }

      // 3. Review email — sent immediately (setTimeout doesn't work in serverless)
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: order.user_email,
          subject: '⭐ ¿Cómo fue tu experiencia? Califica tu pedido',
          body: `Hola ${order.customer_name},

Tu pedido #${order.tracking_code} fue entregado por ${order.assigned_driver_name || 'nuestro repartidor'}.

¿Cómo fue tu experiencia? Tu opinión nos ayuda a mejorar. 🌟

👉 Califica aquí: /reviews?order=${order.id}

¡Gracias por tu compra! 🍓
— Fresitas G&F`
        });
      } catch (e) {
        console.warn('Review email failed:', e.message);
      }
    }

    console.log(`[onOrderDelivered] Order ${order.id} processed`);
    return Response.json({ success: true, order_id: order.id });
  } catch (error) {
    console.error('[onOrderDelivered ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}