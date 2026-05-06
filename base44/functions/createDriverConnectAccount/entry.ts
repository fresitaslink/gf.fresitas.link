import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Stripe Connect Express account onboarding for drivers.
 * Creates a Stripe Express account + onboarding link for the driver.
 * Driver fills bank details on Stripe's hosted page (PCI-safe).
 *
 * Body: { return_url?, refresh_url? }
 * Returns: { onboarding_url, account_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'delivery' && !['admin', 'owner', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const { return_url, refresh_url } = await req.json().catch(() => ({}));
    const baseUrl = req.headers.get('origin') || 'https://fresitas.app';
    const returnUrl = return_url || `${baseUrl}/driver-earnings?onboarded=1`;
    const refreshUrl = refresh_url || `${baseUrl}/driver-earnings?refresh=1`;

    // Find or create driver record
    const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: user.email });
    const driver = drivers[0];
    if (!driver) return Response.json({ error: 'Driver record not found' }, { status: 404 });

    let accountId = driver.stripe_account_id;

    // Create Stripe Express account if not exists
    if (!accountId) {
      const acctParams = new URLSearchParams({
        type: 'express',
        country: 'MX',
        email: user.email,
        'capabilities[transfers][requested]': 'true',
        'business_type': 'individual',
        'metadata[driver_id]': driver.id,
        'metadata[user_email]': user.email,
      });

      const acctRes = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: acctParams.toString(),
      });
      const acct = await acctRes.json();
      if (acct.error) {
        console.error('[CONNECT ERROR]:', acct.error);
        return Response.json({ error: acct.error.message }, { status: 400 });
      }
      accountId = acct.id;

      await base44.asServiceRole.entities.Driver.update(driver.id, {
        stripe_account_id: accountId,
        stripe_onboarding_complete: false,
      });
    }

    // Create onboarding link
    const linkParams = new URLSearchParams({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });

    const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: linkParams.toString(),
    });
    const link = await linkRes.json();
    if (link.error) return Response.json({ error: link.error.message }, { status: 400 });

    return Response.json({
      success: true,
      account_id: accountId,
      onboarding_url: link.url,
    });
  } catch (error) {
    console.error('[createDriverConnectAccount ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});