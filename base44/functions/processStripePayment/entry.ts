import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// NOTE: Stripe requires STRIPE_SECRET_KEY to be set in environment variables.
// If not set, the function will return a demo success response for testing.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, card_number, exp_month, exp_year, cvc, name } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      // Demo mode: simulate successful payment
      console.log('[Demo Mode] Stripe key not configured. Simulating payment.');
      return Response.json({
        success: true,
        payment_intent_id: 'pi_demo_' + Date.now(),
        demo: true,
        message: 'Demo payment (configure STRIPE_SECRET_KEY for real payments)',
      });
    }

    // Create PaymentMethod with card details
    const pmParams = new URLSearchParams({
      type: 'card',
      'card[number]': card_number,
      'card[exp_month]': exp_month,
      'card[exp_year]': exp_year,
      'card[cvc]': cvc,
      'billing_details[name]': name || '',
    });

    const pmRes = await fetch('https://api.stripe.com/v1/payment_methods', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: pmParams.toString(),
    });

    const pm = await pmRes.json();
    if (pm.error) {
      return Response.json({ success: false, error: pm.error.message }, { status: 400 });
    }

    // Create and confirm PaymentIntent
    const piParams = new URLSearchParams({
      amount: String(amount),
      currency: 'mxn',
      payment_method: pm.id,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
      description: `Fresitas G&F — Pedido de ${user.email}`,
      'metadata[user_email]': user.email,
    });

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: piParams.toString(),
    });

    const pi = await piRes.json();

    if (pi.error || (pi.status !== 'succeeded' && pi.status !== 'requires_capture')) {
      return Response.json({ success: false, error: pi.error?.message || `Payment status: ${pi.status}` }, { status: 400 });
    }

    return Response.json({
      success: true,
      payment_intent_id: pi.id,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      amount_paid: amount,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});