import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * PCI-COMPLIANT payment processing.
 * Receives a Stripe payment_method ID (tokenized client-side via Stripe.js).
 * Cards NEVER touch our server. Creates and confirms a PaymentIntent.
 *
 * Body: { amount (cents), payment_method_id, currency?, order_id?, customer_email? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, payment_method_id, currency = 'mxn', order_id, customer_email } = await req.json();

    if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });
    if (!payment_method_id) return Response.json({ error: 'payment_method_id required (must be tokenized client-side)' }, { status: 400 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    // Create + confirm PaymentIntent in one call
    const params = new URLSearchParams({
      amount: String(Math.round(amount)),
      currency,
      payment_method: payment_method_id,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
      description: `Fresitas G&F${order_id ? ` — Order ${order_id}` : ''} — ${user.email}`,
      'metadata[user_email]': user.email,
      'metadata[order_id]': order_id || '',
      receipt_email: customer_email || user.email,
    });

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const pi = await piRes.json();

    if (pi.error) {
      console.error('[STRIPE ERROR]:', pi.error);
      return Response.json({ success: false, error: pi.error.message, code: pi.error.code }, { status: 400 });
    }

    if (pi.status === 'requires_action') {
      // 3D Secure required — return client_secret for frontend to handle
      return Response.json({
        success: false,
        requires_action: true,
        client_secret: pi.client_secret,
        payment_intent_id: pi.id,
      });
    }

    if (pi.status !== 'succeeded') {
      return Response.json({ success: false, error: `Payment status: ${pi.status}` }, { status: 400 });
    }

    // Get card details from charge
    const charge = pi.charges?.data?.[0];
    const card = charge?.payment_method_details?.card;

    console.log(`[STRIPE SUCCESS] PI ${pi.id} · $${(amount/100).toFixed(2)} · ${user.email}`);

    return Response.json({
      success: true,
      payment_intent_id: pi.id,
      charge_id: charge?.id,
      last4: card?.last4,
      brand: card?.brand,
      amount_paid: amount,
      receipt_url: charge?.receipt_url,
    });
  } catch (error) {
    console.error('[processStripePayment ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});