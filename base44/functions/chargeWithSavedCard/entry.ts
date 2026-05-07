import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Charge a saved payment method off-session (no UI prompt).
 * Used for: recurring scheduled orders, one-tap reorders.
 *
 * Body: { amount (cents), payment_method_id, order_id?, currency? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, payment_method_id, order_id, currency = 'mxn' } = await req.json();
    if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });
    if (!payment_method_id) return Response.json({ error: 'payment_method_id required' }, { status: 400 });

    if (currency === 'mxn' && amount < 1000) {
      return Response.json({
        success: false,
        error: 'El monto mínimo para pagar con tarjeta es $10 MXN. Para órdenes menores, usa efectivo o transferencia.',
        code: 'amount_too_small',
      }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: user.email }, undefined, 1);
    const customerId = profiles[0]?.stripe_customer_id;
    if (!customerId) return Response.json({ error: 'No saved customer' }, { status: 400 });

    const params = new URLSearchParams({
      amount: String(Math.round(amount)),
      currency,
      customer: customerId,
      payment_method: payment_method_id,
      off_session: 'true',
      confirm: 'true',
      'metadata[user_email]': user.email,
      'metadata[order_id]': order_id || '',
      description: `Fresitas G&F${order_id ? ` — ${order_id}` : ''}`,
    });

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const pi = await piRes.json();

    if (pi.error) {
      // If 3DS auth required for off-session, mark order as needing customer action
      if (pi.error.code === 'authentication_required') {
        return Response.json({
          success: false,
          requires_action: true,
          payment_intent_id: pi.error.payment_intent?.id,
          message: 'El cliente debe autenticar la tarjeta de nuevo',
        }, { status: 402 });
      }
      const friendlyMessages = {
        'amount_too_small': 'El monto es muy pequeño. Mínimo: $10 MXN para pago con tarjeta.',
        'card_declined': pi.error.decline_code === 'insufficient_funds'
          ? 'Tarjeta rechazada: fondos insuficientes.'
          : 'Tu tarjeta fue rechazada por el banco.',
        'expired_card': 'Tu tarjeta está vencida.',
      };
      const friendly = friendlyMessages[pi.error.code] || pi.error.message;
      return Response.json({ success: false, error: friendly, code: pi.error.code }, { status: 400 });
    }

    if (pi.status !== 'succeeded') {
      return Response.json({ success: false, error: `Status: ${pi.status}` }, { status: 400 });
    }

    return Response.json({
      success: true,
      payment_intent_id: pi.id,
      last4: pi.charges?.data?.[0]?.payment_method_details?.card?.last4,
    });
  } catch (error) {
    console.error('[chargeWithSavedCard ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});