import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * SMART DRIVER ASSIGNMENT
 * Auto-assigns orders to best available driver.
 * Returns { success, driver, assignment } or { success:false, reason } with 200 status.
 *
 * Inputs:
 *  - order_id (required) - the order to assign
 *  - delivery_lat, delivery_lng (optional - falls back to order.delivery_lat/lng or city center)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return Response.json({ success: false, error: 'order_id required' }, { status: 400 });
    }

    // 1. Fetch order
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Skip if already assigned
    if (order.assigned_driver_email) {
      return Response.json({
        success: false,
        reason: 'already_assigned',
        message: `Order already assigned to ${order.assigned_driver_email}`
      });
    }

    // Resolve delivery coords (body > order > LA fallback)
    const deliveryLat = body.delivery_lat ?? order.delivery_lat ?? 34.0522;
    const deliveryLng = body.delivery_lng ?? order.delivery_lng ?? -118.2437;

    // 2. Get available drivers
    const drivers = await base44.asServiceRole.entities.Driver.filter({
      is_active: true,
      is_available: true
    });

    if (!drivers || drivers.length === 0) {
      console.warn(`[ASSIGNMENT] No active drivers for order ${order_id}`);
      return Response.json({
        success: false,
        reason: 'no_drivers',
        message: 'No drivers available'
      });
    }

    // 3. Score each driver
    const allAssignments = await base44.asServiceRole.entities.DriverAssignment.filter({
      assignment_status: { $in: ['pending', 'accepted', 'active'] }
    });

    const scoredDrivers = drivers.map(driver => {
      const distance = calculateDistance(
        driver.current_lat || 34.0522,
        driver.current_lng || -118.2437,
        deliveryLat,
        deliveryLng
      );
      const distanceScore = Math.max(0, 100 - distance * 2);
      const ratingScore = (driver.average_rating || 5.0) * 10;
      const driverAssignments = allAssignments.filter(a => a.driver_email === driver.user_email).length;
      const workloadPenalty = driverAssignments * 10;
      const acceptanceBonus = (driver.acceptance_rate || 100) / 100 * 20;
      const smartScore = distanceScore + ratingScore + acceptanceBonus - workloadPenalty;

      return { driver, distance, score: smartScore };
    });

    scoredDrivers.sort((a, b) => b.score - a.score);
    const selected = scoredDrivers[0];
    console.log(`[ASSIGNMENT] Order ${order_id} → ${selected.driver.full_name} (score: ${selected.score.toFixed(1)})`);

    // 4. Generate PIN (single source of truth)
    const pin = order.verification_pin || String(Math.floor(1000 + Math.random() * 9000));

    // 5. Create DriverAssignment record
    const assignment = await base44.asServiceRole.entities.DriverAssignment.create({
      order_id,
      driver_email: selected.driver.user_email,
      driver_name: selected.driver.full_name,
      driver_photo: selected.driver.photo_url,
      driver_rating: selected.driver.average_rating,
      assigned_at: new Date().toISOString(),
      assignment_status: 'accepted',
      acceptance_deadline: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      pickup_lat: 34.0522,
      pickup_lng: -118.2437,
      delivery_lat: deliveryLat,
      delivery_lng: deliveryLng,
      estimated_distance_km: selected.distance,
      estimated_duration_minutes: Math.ceil(selected.distance / 0.5),
      assignment_method: 'auto'
    });

    // 6. Update order with driver + PIN in one call
    await base44.asServiceRole.entities.Order.update(order_id, {
      assigned_driver_email: selected.driver.user_email,
      assigned_driver_name: selected.driver.full_name,
      assigned_driver_photo: selected.driver.photo_url,
      assigned_driver_rating: selected.driver.average_rating,
      assignment_id: assignment.id,
      verification_pin: pin,
      status: 'confirmed'
    });

    // 7. Create DeliveryVerification record (idempotent)
    const existingVerif = await base44.asServiceRole.entities.DeliveryVerification.filter({ order_id });
    if (existingVerif.length === 0) {
      await base44.asServiceRole.entities.DeliveryVerification.create({
        order_id,
        driver_email: selected.driver.user_email,
        customer_email: order.user_email || 'unknown@example.com',
        verification_pin: pin,
        verification_status: 'pending'
      });
    }

    // 8. Notifications (best-effort)
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email: selected.driver.user_email,
        title_es: `📦 Nuevo Pedido #${order.tracking_code}`,
        title_en: `📦 New Order #${order.tracking_code}`,
        message_es: `${order.customer_name} · $${order.total} · ${selected.distance.toFixed(1)}km`,
        message_en: `${order.customer_name} · $${order.total} · ${selected.distance.toFixed(1)}km`,
        type: 'order_assignment',
        link: '/driver'
      });

      if (order.user_email) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: order.user_email,
          title_es: '✅ Pedido Confirmado',
          title_en: '✅ Order Confirmed',
          message_es: `Tu repartidor: ${selected.driver.full_name} ⭐${(selected.driver.average_rating || 5).toFixed(1)}`,
          message_en: `Your driver: ${selected.driver.full_name} ⭐${(selected.driver.average_rating || 5).toFixed(1)}`,
          type: 'order_update',
          link: '/orders'
        });
      }
    } catch (e) {
      console.warn('[ASSIGNMENT] Notification failed:', e.message);
    }

    console.log(`[ASSIGNMENT SUCCESS] Order ${order_id} → ${selected.driver.full_name} · PIN ${pin}`);

    return Response.json({
      success: true,
      driver: selected.driver,
      assignment,
      distance_km: selected.distance.toFixed(1),
      pin
    });
  } catch (error) {
    console.error('[ASSIGNMENT ERROR]:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}