import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Haversine distance in km
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, is_available } = await req.json();

    const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: user.email });
    if (!drivers.length) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = drivers[0];

    // Update driver location & availability
    await base44.asServiceRole.entities.Driver.update(driver.id, {
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
      ...(typeof is_available !== 'undefined' && { is_available }),
    });

    // Find any active order this driver is delivering
    const activeOrders = await base44.asServiceRole.entities.Order.filter({
      assigned_driver_email: user.email,
      status: 'on_the_way',
    });

    // Log location history (linked to active order if any)
    await base44.asServiceRole.entities.DriverLocationHistory.create({
      driver_email: user.email,
      order_id: activeOrders[0]?.id || null,
      lat,
      lng,
      recorded_at: new Date().toISOString(),
    });

    // Update driver_current_lat/lng on each active order + check ETA for 5-min notification
    for (const order of activeOrders) {
      const updates = {
        driver_current_lat: lat,
        driver_current_lng: lng,
        driver_last_location_update: new Date().toISOString(),
      };

      // Calculate ETA
      if (order.delivery_lat && order.delivery_lng) {
        const km = distanceKm(lat, lng, order.delivery_lat, order.delivery_lng);
        const etaMinutes = (km / 30) * 60; // assume 30km/h avg city speed

        // Send 5-minute arrival notification (once)
        if (etaMinutes <= 5 && etaMinutes > 0 && !order.five_min_notified) {
          updates.five_min_notified = true;

          // Email notification
          if (order.user_email) {
            await base44.integrations.Core.SendEmail({
              to: order.user_email,
              subject: '🚗 Tu pedido llega en 5 minutos',
              body: `Hola ${order.customer_name},\n\nTu conductor ${driver.full_name} está a 5 minutos de llegar con tu pedido #${order.tracking_code}.\n\n¡Prepárate para recibir tu pedido!\n\n— Fresitas G&F`,
            });
          }

          // SMS fallback (via existing function)
          if (order.customer_phone) {
            try {
              await base44.functions.invoke('sendSMSNotification', {
                phone: order.customer_phone,
                message: `🚗 Fresitas G&F: Tu conductor ${driver.full_name} llega en ~5 min con tu pedido #${order.tracking_code}`,
                type: 'arrival_5min',
                recipient_email: order.user_email,
              });
            } catch (e) {
              console.error('SMS error:', e.message);
            }
          }

          console.log(`[5-MIN] Notified ${order.user_email} for order ${order.tracking_code}`);
        }
      }

      await base44.asServiceRole.entities.Order.update(order.id, updates);
    }

    return Response.json({ success: true, active_orders: activeOrders.length });
  } catch (error) {
    console.error('updateDriverLocation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});