import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cancel order with REAL Stripe refund for card payments.
 * Refund policy: 100% if pending/confirmed, 50% if preparing, 0% if on_the_way+.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id, reason } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Permission: customer-self OR staff
    const isStaff = ['admin', 'owner', 'manager'].includes(user.role);
    if (!isStaff && order.user_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['pending', 'confirmed', 'preparing'].includes(order.status)) {
      return Response.json({ error: 'Order cannot be cancelled at this stage' }, { status: 400 });
    }

    // Refund policy by status
    let refundPercent = 1.0;
    if (order.status === 'preparing') refundPercent = 0.5;

    const refundAmount = (order.total || 0) * refundPercent;
    let stripeRefund = null;

    // REAL Stripe refund if card payment
    if (refundAmount > 0 && order.payment_method === 'tarjeta' && order.payment_intent_id?.startsWith('pi_')) {
      try {
        const refundResult = await base44.asServiceRole.functions.invoke('refundStripePayment', {
          order_id,
          amount: refundAmount,
          reason: reason || 'requested_by_customer',
        });
        stripeRefund = refundResult.data;
      } catch (e) {
        console.error('Stripe refund failed:', e.message);
        return Response.json({ error: 'Stripe refund failed: ' + e.message }, { status: 500 });
      }
    } else {
      // Cash/transfer: just mark cancelled
      await base44.asServiceRole.entities.Order.update(order_id, {
        status: 'cancelled',
        payment_status: refundAmount > 0 ? 'refunded' : (order.payment_status || 'cancelled'),
      });
    }

    // Reverse driver tip if any was assigned
    if (order.tip_amount > 0 && order.assigned_driver_email) {
      const earningsRecs = await base44.asServiceRole.entities.DriverEarnings.filter({ driver_email: order.assigned_driver_email });
      if (earningsRecs[0]) {
        const e = earningsRecs[0];
        await base44.asServiceRole.entities.DriverEarnings.update(e.id, {
          pending_balance: Math.max(0, (e.pending_balance || 0) - order.tip_amount),
          total_earned: Math.max(0, (e.total_earned || 0) - order.tip_amount),
        });
      }
    }

    // Customer email
    if (order.user_email && refundAmount > 0) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: order.user_email,
          subject: `✅ Reembolso procesado — Pedido #${order.tracking_code}`,
          body: `Tu pedido #${order.tracking_code} fue cancelado.

Reembolso: $${refundAmount.toFixed(2)} (${(refundPercent * 100).toFixed(0)}% del total)
Razón: ${reason || 'Solicitud del cliente'}
${stripeRefund?.refund_id ? `\nID de reembolso Stripe: ${stripeRefund.refund_id}\nEl reembolso aparecerá en tu tarjeta en 5-10 días hábiles.` : ''}

— Fresitas G&F 🍓`
        });
      } catch (e) { console.warn('Email failed:', e.message); }
    }

    return Response.json({
      success: true,
      order_id,
      refund_amount: refundAmount,
      refund_percent: refundPercent,
      stripe_refund_id: stripeRefund?.refund_id,
    });
  } catch (error) {
    console.error('[handleOrderCancellation ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});