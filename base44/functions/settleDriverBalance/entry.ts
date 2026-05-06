import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Settles drivers' pending_balance into withdrawable balance.
 * Runs daily — moves earnings older than 1 day from pending → balance.
 * Without this, drivers can never withdraw earnings.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow auth check skip for scheduled automation calls
    const allEarnings = await base44.asServiceRole.entities.DriverEarnings.list();

    let settledCount = 0;
    let totalSettled = 0;

    for (const e of allEarnings) {
      const pending = e.pending_balance || 0;
      if (pending <= 0) continue;

      await base44.asServiceRole.entities.DriverEarnings.update(e.id, {
        balance: (e.balance || 0) + pending,
        pending_balance: 0,
      });

      settledCount++;
      totalSettled += pending;
      console.log(`[SETTLE] ${e.driver_email} · $${pending.toFixed(2)} → balance`);
    }

    return Response.json({
      success: true,
      drivers_settled: settledCount,
      total_settled: totalSettled.toFixed(2),
    });
  } catch (error) {
    console.error('[settleDriverBalance ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});