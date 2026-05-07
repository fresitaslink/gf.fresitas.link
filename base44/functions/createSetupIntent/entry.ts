import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Create a SetupIntent so customers can save a payment method for future use
 * (e.g. recurring scheduled orders, one-tap reorder).
 * Returns client_secret for Stripe.js to confirm card setup.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    // Get or create Stripe Customer
    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: user.email }, undefined, 1);
    let profile = profiles[0];
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const custRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: user.email,
          name: user.full_name || '',
          'metadata[user_email]': user.email,
        }).toString(),
      });
      const cust = await custRes.json();
      if (cust.error) return Response.json({ error: cust.error.message }, { status: 400 });
      customerId = cust.id;

      if (profile) {
        await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { stripe_customer_id: customerId });
      } else {
        profile = await base44.asServiceRole.entities.CustomerProfile.create({
          user_email: user.email,
          customer_name: user.full_name || user.email,
          stripe_customer_id: customerId,
        });
      }
    }

    // Create SetupIntent
    const sRes = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        customer: customerId,
        'payment_method_types[]': 'card',
        usage: 'off_session',
        'metadata[user_email]': user.email,
      }).toString(),
    });
    const setup = await sRes.json();
    if (setup.error) return Response.json({ error: setup.error.message }, { status: 400 });

    return Response.json({
      success: true,
      client_secret: setup.client_secret,
      customer_id: customerId,
    });
  } catch (error) {
    console.error('[createSetupIntent ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});