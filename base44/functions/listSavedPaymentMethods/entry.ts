import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * List the user's saved payment methods (cards) from Stripe.
 * Returns: { payment_methods: [{id, last4, brand, exp_month, exp_year}] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ payment_methods: [] });

    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: user.email }, undefined, 1);
    const customerId = profiles[0]?.stripe_customer_id;
    if (!customerId) return Response.json({ payment_methods: [] });

    const res = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${customerId}&type=card&limit=20`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } }
    );
    const data = await res.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

    const methods = (data.data || []).map(pm => ({
      id: pm.id,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));

    return Response.json({ payment_methods: methods });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});