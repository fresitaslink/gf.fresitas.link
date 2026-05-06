import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Auto-assign driver when order is created
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const order = data;

    // Call smartDriverAssignment to find best driver
    try {
      const assignmentResult = await base44.asServiceRole.functions.invoke('smartDriverAssignment', {
        order_id: order.id,
        assignment_mode: 'auto'
      });

      if (!assignmentResult.data) {
        console.log(`[onOrderCreated] No drivers available for order ${order.id}`);
        return Response.json({ success: true, message: 'No drivers available' });
      }

      const assignment = assignmentResult.data.assignment;
      const driver = assignmentResult.data.driver;

      // Update order with driver info
      await base44.asServiceRole.entities.Order.update(order.id, {
        assigned_driver_email: driver.user_email,
        assigned_driver_name: driver.full_name,
        assigned_driver_photo: driver.photo_url,
        assigned_driver_rating: driver.average_rating,
        status: 'confirmed',
        assignment_id: assignment.id,
        verification_pin: assignmentResult.data.verification_pin
      });

      // Send push notification to driver
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          user_email: driver.user_email,
          title: '📦 Nuevo Pedido',
          message: `Pedido #${order.tracking_code} - $${order.total}`,
          action_url: '/driver'
        });
      } catch (e) {
        console.warn('Push notification failed:', e);
      }

      console.log(`[onOrderCreated] Order ${order.id} assigned to ${driver.full_name}`);

      return Response.json({
        success: true,
        message: `Order assigned to ${driver.full_name}`,
        assignment_id: assignment.id,
        driver_email: driver.user_email
      });
    } catch (assignError) {
      console.log(`[onOrderCreated] Assignment failed: ${assignError.message}`);
      return Response.json({ success: true, message: 'No drivers available' });
    }
  } catch (error) {
    console.error('[onOrderCreated ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});