import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Process a REAL Stripe refund.
 * Body: { order_id, amount? (full refund if omitted), reason? }
 * Returns refund object from Stripe.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id, amount, reason = 'requested_by_customer' } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Permission check: must be admin/owner/manager OR the customer who placed the order
    const isStaff = ['admin', 'owner', 'manager'].includes(user.role);
    if (!isStaff && order.user_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!order.payment_intent_id || !order.payment_intent_id.startsWith('pi_')) {
      return Response.json({ error: 'No valid Stripe payment to refund' }, { status: 400 });
    }

    if (order.payment_status === 'refunded') {
      return Response.json({ success: false, already_refunded: true });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    // Default: full refund
    const refundAmountCents = amount
      ? Math.round(amount * 100)
      : Math.round((order.total || 0) * 100);

    const params = new URLSearchParams({
      payment_intent: order.payment_intent_id,
      amount: String(refundAmountCents),
      reason,
      'metadata[order_id]': order_id,
      'metadata[refunded_by]': user.email,
    });

    const refundRes = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const refund = await refundRes.json();
    if (refund.error) {
      console.error('[REFUND ERROR]:', refund.error);
      return Response.json({ success: false, error: refund.error.message }, { status: 400 });
    }

    // Update order
    const isFullRefund = refundAmountCents >= Math.round((order.total || 0) * 100);
    await base44.asServiceRole.entities.Order.update(order_id, {
      payment_status: 'refunded',
      status: isFullRefund ? 'cancelled' : order.status,
    });

    console.log(`[REFUND SUCCESS] Order ${order_id} · $${(refundAmountCents/100).toFixed(2)} · ${refund.id}`);

    return Response.json({
      success: true,
      refund_id: refund.id,
      amount_refunded: refundAmountCents / 100,
      status: refund.status,
    });
  } catch (error) {
    console.error('[refundStripePayment ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});