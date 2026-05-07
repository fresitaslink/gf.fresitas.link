import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Stripe Instant Payouts — driver gets money in their bank in MINUTES (not 1-2 days).
 * Costs 1.5% fee (Stripe charges) — by default we pass it to the driver.
 *
 * Body: { amount }
 * Driver must have completed Stripe Connect onboarding + supported debit card.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount } = await req.json();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

    const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: user.email }, undefined, 1);
    const driver = drivers[0];
    if (!driver?.stripe_account_id || !driver.stripe_payouts_enabled) {
      return Response.json({ error: 'Stripe Connect not ready', needs_onboarding: true }, { status: 400 });
    }

    const earningsRecs = await base44.asServiceRole.entities.DriverEarnings.filter({ driver_email: user.email }, undefined, 1);
    const earnings = earningsRecs[0];
    if (!earnings || amountNum > (earnings.balance || 0)) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const amountCents = Math.round(amountNum * 100);

    // Step 1: Transfer funds to driver's Stripe Connect account
    const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        amount: String(amountCents),
        currency: 'mxn',
        destination: driver.stripe_account_id,
        description: `Instant payout — ${driver.full_name}`,
        'metadata[driver_email]': user.email,
        'metadata[instant]': 'true',
      }).toString(),
    });
    const transfer = await transferRes.json();
    if (transfer.error) return Response.json({ success: false, error: transfer.error.message }, { status: 400 });

    // Step 2: Trigger instant payout from connected account → driver's debit card
    const payoutRes = await fetch('https://api.stripe.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Account': driver.stripe_account_id,
      },
      body: new URLSearchParams({
        amount: String(amountCents),
        currency: 'mxn',
        method: 'instant',
        description: `Fresitas G&F instant payout`,
      }).toString(),
    });
    const payout = await payoutRes.json();

    if (payout.error) {
      // Fallback: regular payout will happen automatically (1-2 days)
      console.warn('[INSTANT PAYOUT FALLBACK]:', payout.error.message);
    }

    // Update balance
    await base44.asServiceRole.entities.DriverEarnings.update(earnings.id, {
      balance: Math.max(0, (earnings.balance || 0) - amountNum),
      total_withdrawn: (earnings.total_withdrawn || 0) + amountNum,
      last_payout_date: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.DriverTransaction.create({
      driver_email: user.email,
      amount: -amountNum,
      type: 'withdrawal',
      status: payout.error ? 'pending' : 'completed',
      description: payout.error ? `Standard payout (1-2 days)` : `⚡ Instant payout — arrives in minutes`,
    });

    return Response.json({
      success: true,
      transfer_id: transfer.id,
      payout_id: payout.id,
      instant: !payout.error,
      arrival_estimate: payout.error ? '1-2 días hábiles' : 'minutos',
      amount: amountNum,
    });
  } catch (error) {
    console.error('[requestInstantPayout ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});