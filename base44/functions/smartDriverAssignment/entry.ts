import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * SMART DRIVER ASSIGNMENT
 * Auto-assigns orders to best available driver based on:
 * - Distance to delivery location
 * - Driver rating
 * - Current workload
 * - Acceptance rate
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id, delivery_lat, delivery_lng } = await req.json();

    if (!order_id || !delivery_lat || !delivery_lng) {
      return Response.json({ error: 'Missing order_id or delivery coordinates' }, { status: 400 });
    }

    // 1. Fetch order
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Get ALL active drivers with 'delivery' role from User entity
    const drivers = await base44.asServiceRole.entities.Driver.filter({
      is_active: true,
      is_available: true
    });

    if (!drivers || drivers.length === 0) {
      console.warn(`[ASSIGNMENT] No active drivers available for order ${order_id}`);
      return Response.json({
        success: false,
        message: 'No drivers available',
        order_id
      }, { status: 200 });
    }

    // 3. Get existing assignments to count driver workload
    const allAssignments = await base44.asServiceRole.entities.DriverAssignment.filter({
      assignment_status: { $in: ['pending', 'accepted', 'active'] }
    });

    // 4. Score each driver
    const scoredDrivers = drivers.map(driver => {
      // Distance score (closer = better)
      const distance = calculateDistance(
        driver.current_lat || 34.0522,
        driver.current_lng || -118.2437,
        delivery_lat,
        delivery_lng
      );
      const distanceScore = Math.max(0, 100 - distance * 2); // -2 points per km

      // Rating score (higher = better)
      const ratingScore = (driver.average_rating || 5.0) * 10;

      // Workload penalty (more assignments = penalty)
      const driverAssignments = allAssignments.filter(a => a.driver_email === driver.user_email).length;
      const workloadPenalty = driverAssignments * 10;

      // Acceptance rate bonus
      const acceptanceBonus = (driver.acceptance_rate || 100) / 100 * 20;

      // FINAL SMART SCORE
      const smartScore = distanceScore + ratingScore + acceptanceBonus - workloadPenalty;

      return {
        driver,
        distance,
        score: smartScore,
        breakdown: { distanceScore, ratingScore, acceptanceBonus, workloadPenalty }
      };
    });

    // Sort by score (highest first)
    scoredDrivers.sort((a, b) => b.score - a.score);

    const selectedDriver = scoredDrivers[0];
    console.log(`[ASSIGNMENT] Assigning order ${order_id} to ${selectedDriver.driver.full_name} (score: ${selectedDriver.score.toFixed(1)})`);

    // 5. Create assignment
    const assignment = await base44.asServiceRole.entities.DriverAssignment.create({
      order_id: order_id,
      driver_email: selectedDriver.driver.user_email,
      driver_name: selectedDriver.driver.full_name,
      driver_photo: selectedDriver.driver.photo_url,
      driver_rating: selectedDriver.driver.average_rating,
      assigned_at: new Date().toISOString(),
      assignment_status: 'pending',
      acceptance_deadline: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      pickup_lat: 34.0522, // Store location (can be made dynamic)
      pickup_lng: -118.2437,
      delivery_lat: delivery_lat,
      delivery_lng: delivery_lng,
      estimated_distance_km: selectedDriver.distance,
      estimated_duration_minutes: Math.ceil(selectedDriver.distance / 0.7),
      assignment_method: 'auto'
    });

    // 6. Update order with assignment
    await base44.asServiceRole.entities.Order.update(order_id, {
      assigned_driver_email: selectedDriver.driver.user_email,
      assigned_driver_name: selectedDriver.driver.full_name,
      assigned_driver_photo: selectedDriver.driver.photo_url,
      assigned_driver_rating: selectedDriver.driver.average_rating,
      assignment_id: assignment.id,
      status: 'confirmed'
    });

    // 7. Generate verification PIN
    const pin = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const verification = await base44.asServiceRole.entities.DeliveryVerification.create({
      order_id: order_id,
      driver_email: selectedDriver.driver.user_email,
      customer_email: order.user_email || 'unknown@example.com',
      verification_pin: pin,
      verification_status: 'pending'
    });

    // Update order with PIN
    await base44.asServiceRole.entities.Order.update(order_id, {
      verification_pin: pin
    });

    // 8. Send driver notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: selectedDriver.driver.user_email,
      title_es: `📦 Nuevo Pedido: #${order.tracking_code}`,
      title_en: `📦 New Order: #${order.tracking_code}`,
      message_es: `${order.customer_name} - $${order.total} - ${selectedDriver.distance.toFixed(1)}km`,
      message_en: `${order.customer_name} - $${order.total} - ${selectedDriver.distance.toFixed(1)}km`,
      type: 'order_assignment',
      link: '/driver'
    });

    // 9. Send customer notification
    if (order.user_email) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: order.user_email,
        title_es: '✅ Pedido Confirmado',
        title_en: '✅ Order Confirmed',
        message_es: `Tu repartidor es ${selectedDriver.driver.full_name} ⭐${selectedDriver.driver.average_rating?.toFixed(1)}`,
        message_en: `Your driver is ${selectedDriver.driver.full_name} ⭐${selectedDriver.driver.average_rating?.toFixed(1)}`,
        type: 'order_update',
        link: '/orders'
      });
    }

    console.log(`[ASSIGNMENT SUCCESS] Order ${order_id} assigned to ${selectedDriver.driver.full_name}. PIN: ${pin}`);

    return Response.json({
      success: true,
      message: 'Driver assigned successfully',
      order_id,
      assignment_id: assignment.id,
      driver: {
        name: selectedDriver.driver.full_name,
        email: selectedDriver.driver.user_email,
        distance_km: selectedDriver.distance.toFixed(1),
        eta_minutes: Math.ceil(selectedDriver.distance / 0.7),
        rating: selectedDriver.driver.average_rating
      }
    });
  } catch (error) {
    console.error('[ASSIGNMENT ERROR]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}