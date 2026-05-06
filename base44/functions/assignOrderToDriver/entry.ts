import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Manual driver assignment by admin/owner/manager.
 * Generates PIN, creates assignment + verification, updates order.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { orderId, driverId } = await req.json();
    if (!orderId || !driverId) {
      return Response.json({ error: 'Missing orderId or driverId' }, { status: 400 });
    }

    const [order, driver] = await Promise.all([
      base44.asServiceRole.entities.Order.get(orderId),
      base44.asServiceRole.entities.Driver.get(driverId)
    ]);

    if (!order || !driver) {
      return Response.json({ error: 'Order or driver not found' }, { status: 404 });
    }

    // Single source of truth for PIN
    const pin = order.verification_pin || String(Math.floor(1000 + Math.random() * 9000));

    // Create assignment
    const assignment = await base44.asServiceRole.entities.DriverAssignment.create({
      order_id: orderId,
      driver_email: driver.user_email,
      driver_name: driver.full_name,
      driver_photo: driver.photo_url,
      driver_rating: driver.average_rating || 5.0,
      assigned_at: new Date().toISOString(),
      assignment_status: 'accepted',
      acceptance_deadline: new Date(Date.now() + 2 * 60000).toISOString(),
      pickup_lat: 34.0522,
      pickup_lng: -118.2437,
      delivery_lat: order.delivery_lat,
      delivery_lng: order.delivery_lng,
      assignment_method: 'manual',
      assigned_by_email: user.email
    });

    // Update order with everything in one go
    await base44.asServiceRole.entities.Order.update(orderId, {
      assigned_driver_email: driver.user_email,
      assigned_driver_name: driver.full_name,
      assigned_driver_photo: driver.photo_url,
      assigned_driver_rating: driver.average_rating || 5.0,
      assignment_id: assignment.id,
      verification_pin: pin,
      status: 'confirmed'
    });

    // Idempotent verification record
    const existingVerif = await base44.asServiceRole.entities.DeliveryVerification.filter({ order_id: orderId });
    if (existingVerif.length === 0) {
      await base44.asServiceRole.entities.DeliveryVerification.create({
        order_id: orderId,
        driver_email: driver.user_email,
        customer_email: order.user_email || 'unknown@example.com',
        verification_pin: pin,
        verification_status: 'pending'
      });
    }

    // Notify driver
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email: driver.user_email,
        title_es: `📦 Nuevo Pedido #${order.tracking_code}`,
        title_en: `📦 New Order #${order.tracking_code}`,
        message_es: `${order.customer_name} · $${order.total}`,
        message_en: `${order.customer_name} · $${order.total}`,
        type: 'order_assignment',
        link: '/driver'
      });
    } catch (e) {
      console.warn('Driver notification failed:', e.message);
    }

    return Response.json({
      success: true,
      assignment,
      pin,
      message: `Orden asignada a ${driver.full_name}`
    });
  } catch (error) {
    console.error('[assignOrderToDriver ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});