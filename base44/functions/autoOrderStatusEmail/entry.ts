import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function is triggered by entity automation when an Order status changes.
// It calls sendOrderEmail with the appropriate event_type.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Called either directly or via automation payload
    const { event, data, old_data } = body;

    let orderId = body.order_id;
    let eventType = body.event_type;

    // When called from entity automation
    if (event?.entity_id && !orderId) {
      orderId = event.entity_id;
    }
    if (!eventType) {
      // Determine if this is a new order or status update
      if (event?.type === 'create') {
        eventType = 'new_order';
      } else if (event?.type === 'update') {
        const statusChanged = old_data?.status !== data?.status;
        if (!statusChanged) return Response.json({ skipped: 'status not changed' });
        eventType = 'status_update';
      }
    }

    if (!orderId || !eventType) {
      return Response.json({ error: 'Missing order_id or event_type' }, { status: 400 });
    }

    // Delegate to sendOrderEmail
    const result = await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      order_id: orderId,
      event_type: eventType,
    });

    return Response.json({ success: true, result: result.data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});