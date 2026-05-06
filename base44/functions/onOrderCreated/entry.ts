import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * On order create:
 * 1. ALWAYS generate a 4-digit verification PIN and save to order
 * 2. Try to auto-assign a driver (best effort, doesn't fail if no drivers)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const order = data;

    // Step 1: Generate and save verification PIN if missing
    let verificationPin = order.verification_pin;
    if (!verificationPin) {
      verificationPin = String(Math.floor(1000 + Math.random() * 9000));
      await base44.asServiceRole.entities.Order.update(order.id, {
        verification_pin: verificationPin,
      });
      console.log(`[onOrderCreated] PIN ${verificationPin} generated for order ${order.id}`);
    }

    // Step 2: Try auto-assignment (best effort)
    try {
      const assignmentResult = await base44.asServiceRole.functions.invoke('smartDriverAssignment', {
        order_id: order.id,
        assignment_mode: 'auto'
      });

      if (!assignmentResult.data?.driver) {
        console.log(`[onOrderCreated] No drivers available for order ${order.id} — admin can assign manually`);
        return Response.json({ success: true, pin: verificationPin, message: 'PIN generated, no drivers available' });
      }

      const assignment = assignmentResult.data.assignment;
      const driver = assignmentResult.data.driver;

      await base44.asServiceRole.entities.Order.update(order.id, {
        assigned_driver_email: driver.user_email,
        assigned_driver_name: driver.full_name,
        assigned_driver_photo: driver.photo_url,
        assigned_driver_rating: driver.average_rating,
        status: 'confirmed',
        assignment_id: assignment.id,
        verification_pin: verificationPin,
      });

      // Notify driver
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          user_email: driver.user_email,
          title: 'Nuevo Pedido',
          message: `Pedido #${order.tracking_code} - $${order.total}`,
          action_url: '/driver'
        });
      } catch (e) {
        console.warn('Push notification failed:', e.message);
      }

      console.log(`[onOrderCreated] Order ${order.id} assigned to ${driver.full_name}`);

      return Response.json({
        success: true,
        pin: verificationPin,
        driver_email: driver.user_email,
      });
    } catch (assignError) {
      console.log(`[onOrderCreated] Auto-assignment failed: ${assignError.message}`);
      return Response.json({ success: true, pin: verificationPin, message: 'PIN generated, manual assignment needed' });
    }
  } catch (error) {
    console.error('[onOrderCreated ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});