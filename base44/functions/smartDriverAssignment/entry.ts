import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id, assignment_mode = 'auto' } = await req.json();

    const order = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!order.length) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];
    const drivers = await base44.asServiceRole.entities.Driver.list('-average_rating');
    const activeAssignments = await base44.asServiceRole.entities.DriverAssignment.filter({ assignment_status: { $in: ['pending', 'accepted', 'active'] } });

    const eligibleDrivers = drivers
      .filter(d => d.is_active) // Accept both available and unavailable drivers
      .filter(d => {
        const currentOrders = activeAssignments.filter(a => a.driver_email === d.user_email).length;
        return currentOrders < 3;
      })
      .filter(d => {
        const distance = calculateDistance(
          d.current_lat || 0,
          d.current_lng || 0,
          orderData.delivery_lat || 0,
          orderData.delivery_lng || 0
        );
        return distance <= (d.max_distance_km || 50);
      });

    if (!eligibleDrivers.length) {
      return Response.json({ error: 'No drivers available' }, { status: 400 });
    }

    // **Smart Scoring Algorithm** (Uber-style)
    const scoredDrivers = eligibleDrivers.map(driver => {
      const distance = calculateDistance(
        driver.current_lat || 0,
        driver.current_lng || 0,
        orderData.delivery_lat || 0,
        orderData.delivery_lng || 0
      );

      const distanceScore = Math.max(0, 100 - distance * 2);
      const ratingScore = (driver.average_rating || 5) * 20;
      const acceptanceScore = (driver.acceptance_rate || 100) * 0.5;
      const activeOrdersPenalty = Math.max(0, 30 - (driver.active_orders_count || 0) * 5);

      const totalScore = (distanceScore * 0.35) + (ratingScore * 0.35) + (acceptanceScore * 0.2) + activeOrdersPenalty;

      return { ...driver, score: totalScore };
    }).sort((a, b) => b.score - a.score);

    const selectedDriver = scoredDrivers[0];
    const distance = calculateDistance(
      selectedDriver.current_lat || 0,
      selectedDriver.current_lng || 0,
      orderData.delivery_lat || 0,
      orderData.delivery_lng || 0
    );
    const estimatedTime = Math.ceil(distance / 25 * 60);

    // Create assignment
    const assignment = await base44.asServiceRole.entities.DriverAssignment.create({
      order_id: orderData.id,
      driver_email: selectedDriver.user_email,
      driver_name: selectedDriver.full_name,
      driver_photo: selectedDriver.photo_url,
      driver_rating: selectedDriver.average_rating,
      assignment_status: 'pending',
      pickup_lat: orderData.delivery_lat,
      pickup_lng: orderData.delivery_lng,
      delivery_lat: orderData.delivery_lat,
      delivery_lng: orderData.delivery_lng,
      estimated_distance_km: distance,
      estimated_duration_minutes: estimatedTime,
      assignment_method: assignment_mode,
      notes_for_driver: orderData.notes,
    });

    // Create delivery verification with PIN
    const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
    await base44.asServiceRole.entities.DeliveryVerification.create({
      order_id: orderData.id,
      driver_email: selectedDriver.user_email,
      customer_email: orderData.user_email,
      verification_pin: verificationPin,
      verification_status: 'pending',
    });

    // Send PIN to customer via email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: orderData.user_email,
      subject: `Tu código de entrega: ${verificationPin}`,
      body: `Hola ${orderData.customer_name},\n\nTu conductor es ${selectedDriver.full_name}. Tu código de entrega es: ${verificationPin}\n\nComparte este código cuando se entregue tu pedido.`,
    });

    return Response.json({
      assignment: assignment,
      driver: selectedDriver,
      verification_pin: verificationPin,
      message: `Asignado a ${selectedDriver.full_name}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}