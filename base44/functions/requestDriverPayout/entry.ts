import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Process a REAL driver payout via Stripe Connect Transfer.
 * Driver requests a withdrawal → we transfer from platform balance to driver's Connect account.
 *
 * Body: { amount }
 * Driver must have completed Stripe Connect onboarding first.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount } = await req.json();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get driver
    const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: user.email });
    const driver = drivers[0];
    if (!driver) return Response.json({ error: 'Driver not found' }, { status: 404 });

    if (!driver.stripe_account_id || !driver.stripe_onboarding_complete) {
      return Response.json({
        error: 'Stripe onboarding required',
        needs_onboarding: true,
      }, { status: 400 });
    }

    // Get earnings record
    const earningsRecs = await base44.asServiceRole.entities.DriverEarnings.filter({ driver_email: user.email });
    const earnings = earningsRecs[0];
    if (!earnings) return Response.json({ error: 'No earnings record' }, { status: 404 });

    const minWithdrawal = earnings.min_withdrawal || 50;
    if (amountNum < minWithdrawal) {
      return Response.json({ error: `Minimum withdrawal: $${minWithdrawal}` }, { status: 400 });
    }
    if (amountNum > (earnings.balance || 0)) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    // Create Stripe transfer to driver's Connect account
    const params = new URLSearchParams({
      amount: String(Math.round(amountNum * 100)),
      currency: 'mxn',
      destination: driver.stripe_account_id,
      description: `Fresitas G&F payout — ${driver.full_name}`,
      'metadata[driver_email]': user.email,
      'metadata[driver_id]': driver.id,
    });

    const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const transfer = await transferRes.json();

    if (transfer.error) {
      console.error('[PAYOUT ERROR]:', transfer.error);
      return Response.json({ success: false, error: transfer.error.message }, { status: 400 });
    }

    // Atomically update balance + create transaction
    await base44.asServiceRole.entities.DriverEarnings.update(earnings.id, {
      balance: Math.max(0, (earnings.balance || 0) - amountNum),
      total_withdrawn: (earnings.total_withdrawn || 0) + amountNum,
      last_payout_date: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.DriverTransaction.create({
      driver_email: user.email,
      amount: -amountNum,
      type: 'withdrawal',
      status: 'completed',
      description: `Payout · Stripe transfer ${transfer.id}`,
    });

    console.log(`[PAYOUT SUCCESS] ${user.email} · $${amountNum.toFixed(2)} · ${transfer.id}`);

    return Response.json({
      success: true,
      transfer_id: transfer.id,
      amount: amountNum,
      new_balance: Math.max(0, (earnings.balance || 0) - amountNum),
    });
  } catch (error) {
    console.error('[requestDriverPayout ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});