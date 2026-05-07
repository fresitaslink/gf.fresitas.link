import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Create a real Stripe Subscription for membership plans.
 * Uses Stripe Checkout Session for plan signup with recurring billing.
 *
 * Body: { plan: 'basic'|'premium'|'vip', success_url?, cancel_url? }
 */

const PLAN_CONFIGS = {
  basic:   { price: 9900,  name: 'Fresita Basic',   discount_percent: 10, free_delivery: false, points_multiplier: 1.5 },
  premium: { price: 19900, name: 'Fresita Premium', discount_percent: 15, free_delivery: true,  points_multiplier: 2.0 },
  vip:     { price: 34900, name: 'Fresita VIP',     discount_percent: 20, free_delivery: true,  points_multiplier: 3.0 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, success_url, cancel_url } = await req.json();
    const config = PLAN_CONFIGS[plan];
    if (!config) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const baseUrl = req.headers.get('origin') || 'https://fresitas.app';

    // 1. Get or create Stripe Customer
    let customerId;
    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: user.email }, undefined, 1);
    const profile = profiles[0];
    customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const custParams = new URLSearchParams({
        email: user.email,
        name: user.full_name || '',
        'metadata[user_email]': user.email,
      });
      const custRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: custParams.toString(),
      });
      const cust = await custRes.json();
      if (cust.error) return Response.json({ error: cust.error.message }, { status: 400 });
      customerId = cust.id;
      if (profile) {
        await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { stripe_customer_id: customerId });
      } else {
        await base44.asServiceRole.entities.CustomerProfile.create({
          user_email: user.email,
          customer_name: user.full_name || user.email,
          stripe_customer_id: customerId,
        });
      }
    }

    // 2. Create Stripe Checkout Session for subscription
    const sessionParams = new URLSearchParams();
    sessionParams.append('mode', 'subscription');
    sessionParams.append('customer', customerId);
    sessionParams.append('success_url', success_url || `${baseUrl}/suscripciones?success=1&session_id={CHECKOUT_SESSION_ID}`);
    sessionParams.append('cancel_url', cancel_url || `${baseUrl}/suscripciones?cancelled=1`);
    sessionParams.append('line_items[0][price_data][currency]', 'mxn');
    sessionParams.append('line_items[0][price_data][product_data][name]', config.name);
    sessionParams.append('line_items[0][price_data][product_data][description]', `Membresía mensual ${config.name}`);
    sessionParams.append('line_items[0][price_data][unit_amount]', String(config.price));
    sessionParams.append('line_items[0][price_data][recurring][interval]', 'month');
    sessionParams.append('line_items[0][quantity]', '1');
    sessionParams.append('metadata[user_email]', user.email);
    sessionParams.append('metadata[plan]', plan);
    sessionParams.append('subscription_data[metadata][user_email]', user.email);
    sessionParams.append('subscription_data[metadata][plan]', plan);
    sessionParams.append('allow_promotion_codes', 'true');

    const sessRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: sessionParams.toString(),
    });
    const session = await sessRes.json();
    if (session.error) return Response.json({ error: session.error.message }, { status: 400 });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('[createStripeSubscription ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});