import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cancel a Stripe Subscription (at period end, so user keeps benefits until paid through).
 * Body: { subscription_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscription_id } = await req.json();
    if (!subscription_id) return Response.json({ error: 'subscription_id required' }, { status: 400 });

    const subRecord = await base44.asServiceRole.entities.Subscription.get(subscription_id);
    if (!subRecord) return Response.json({ error: 'Subscription not found' }, { status: 404 });

    const isStaff = ['admin', 'owner', 'manager'].includes(user.role);
    if (!isStaff && subRecord.user_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Cancel at period end via Stripe (if linked)
    if (subRecord.stripe_subscription_id && stripeKey) {
      const cancelRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${subRecord.stripe_subscription_id}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'cancel_at_period_end=true',
        }
      );
      const result = await cancelRes.json();
      if (result.error) {
        console.error('[STRIPE CANCEL ERROR]:', result.error);
        return Response.json({ error: result.error.message }, { status: 400 });
      }
    }

    // Update local record — mark cancelled but keep active until period end
    await base44.asServiceRole.entities.Subscription.update(subscription_id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    });

    return Response.json({ success: true, message: 'Subscription will end at period end' });
  } catch (error) {
    console.error('[cancelStripeSubscription ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});