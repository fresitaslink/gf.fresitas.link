import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Handle driver accepting or rejecting an assignment
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'delivery') {
      return Response.json({ 
        error: 'Only drivers can respond to assignments' 
      }, { status: 403 });
    }

    const { assignment_id, response } = await req.json();

    if (!assignment_id || !['accepted', 'rejected'].includes(response)) {
      return Response.json({ 
        error: 'Missing assignment_id or invalid response' 
      }, { status: 400 });
    }

    const assignment = await base44.asServiceRole.entities.DriverAssignment.get(assignment_id);
    if (!assignment) {
      return Response.json({ 
        error: 'Assignment not found' 
      }, { status: 404 });
    }

    const order = await base44.asServiceRole.entities.Order.get(assignment.order_id);

    if (response === 'accepted') {
      await base44.asServiceRole.entities.DriverAssignment.update(assignment_id, {
        assignment_status: 'accepted'
      });

      // Update order status to confirmed
      await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'confirmed'
      });

      console.log(`[ASSIGNMENT] ${user.email} ACCEPTED assignment ${assignment_id}`);

      return Response.json({
        success: true,
        message: 'Assignment accepted'
      });
    } else {
      await base44.asServiceRole.entities.DriverAssignment.update(assignment_id, {
        assignment_status: 'rejected'
      });

      console.log(`[ASSIGNMENT] ${user.email} REJECTED assignment ${assignment_id}`);

      return Response.json({
        success: true,
        message: 'Assignment rejected'
      });
    }
  } catch (error) {
    console.error('[ASSIGNMENT ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});