import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const payload = await req.json();
    const { orderId, driverId } = payload;

    if (!orderId || !driverId) {
      return Response.json({ error: 'Missing orderId or driverId' }, { status: 400 });
    }

    // Get order and driver
    const [order, driver] = await Promise.all([
      base44.asServiceRole.entities.Order.get(orderId),
      base44.asServiceRole.entities.Driver.get(driverId)
    ]);

    if (!order || !driver) {
      return Response.json({ error: 'Order or driver not found' }, { status: 404 });
    }

    // Create assignment
    const assignment = await base44.asServiceRole.entities.DriverAssignment.create({
      order_id: orderId,
      driver_email: driver.user_email,
      driver_name: driver.full_name,
      driver_photo: driver.photo_url,
      driver_rating: driver.average_rating || 5.0,
      assigned_at: new Date().toISOString(),
      assignment_status: 'pending',
      acceptance_deadline: new Date(Date.now() + 2 * 60000).toISOString(), // 2 min
      pickup_lat: order.delivery_lat,
      pickup_lng: order.delivery_lng,
      delivery_lat: order.delivery_lat,
      delivery_lng: order.delivery_lng,
      assignment_method: 'auto',
      assigned_by_email: user.email
    });

    // Send push notification
    await base44.functions.invoke('sendPushNotification', {
      user_email: driver.user_email,
      title: '🎯 Nueva Orden Asignada',
      body: `Entregar a ${order.customer_name} - $${order.total}`,
      data: {
        order_id: orderId,
        customer_name: order.customer_name,
        address: order.customer_address,
        total: order.total
      }
    });

    // Update order status
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'confirmed'
    });

    return Response.json({ 
      success: true, 
      assignment,
      message: `Orden asignada a ${driver.full_name}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});