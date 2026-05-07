import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Detach a saved payment method from the user's Stripe Customer.
 * Body: { payment_method_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { payment_method_id } = await req.json();
    if (!payment_method_id) return Response.json({ error: 'payment_method_id required' }, { status: 400 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    // Verify the payment method belongs to this user
    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: user.email }, undefined, 1);
    const customerId = profiles[0]?.stripe_customer_id;
    if (!customerId) return Response.json({ error: 'No Stripe customer' }, { status: 400 });

    // Fetch PM to verify ownership
    const pmRes = await fetch(`https://api.stripe.com/v1/payment_methods/${payment_method_id}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const pm = await pmRes.json();
    if (pm.error) return Response.json({ error: pm.error.message }, { status: 400 });
    if (pm.customer !== customerId) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Detach
    const detachRes = await fetch(`https://api.stripe.com/v1/payment_methods/${payment_method_id}/detach`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const result = await detachRes.json();
    if (result.error) return Response.json({ error: result.error.message }, { status: 400 });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});