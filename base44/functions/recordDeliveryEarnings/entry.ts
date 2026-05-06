import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Record driver earnings when order is delivered.
 * Idempotent. Includes 100% of customer tip.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id, driver_email, delivery_distance_km = 3, delivery_time_minutes = 20, is_rush = false, tip_amount } = await req.json();

    if (!order_id || !driver_email) {
      return Response.json({ error: 'order_id and driver_email required' }, { status: 400 });
    }

    // IDEMPOTENCY
    const existingTx = await base44.asServiceRole.entities.DriverTransaction.filter({
      order_id, driver_email, type: 'delivery'
    }, undefined, 1);
    if (existingTx.length > 0) {
      return Response.json({ success: true, already_recorded: true, earnings: existingTx[0].amount });
    }

    // Get order to pull tip if not passed in
    let actualTip = tip_amount;
    if (typeof actualTip === 'undefined') {
      try {
        const order = await base44.asServiceRole.entities.Order.get(order_id);
        actualTip = order?.tip_amount || 0;
      } catch { actualTip = 0; }
    }

    // Fare formula
    const BASE_FARE = 3;
    const KM_RATE = 0.50;
    const TIME_RATE = 0.05;
    const RUSH_MULTIPLIER = is_rush ? 1.5 : 1.0;

    const fare = (BASE_FARE + (delivery_distance_km * KM_RATE) + (delivery_time_minutes * TIME_RATE)) * RUSH_MULTIPLIER;
    const earnings = fare + (actualTip || 0); // 100% of tip goes to driver

    // Get or create earnings record
    const existing = await base44.asServiceRole.entities.DriverEarnings.filter({ driver_email }, undefined, 1);

    if (existing.length > 0) {
      const e = existing[0];
      await base44.asServiceRole.entities.DriverEarnings.update(e.id, {
        pending_balance: (e.pending_balance || 0) + earnings,
        total_earned: (e.total_earned || 0) + earnings,
        total_deliveries: (e.total_deliveries || 0) + 1,
        avg_earnings_per_delivery: ((e.total_earned || 0) + earnings) / ((e.total_deliveries || 0) + 1)
      });
    } else {
      const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: driver_email }, undefined, 1);
      const driverName = drivers[0]?.full_name || 'Driver';
      await base44.asServiceRole.entities.DriverEarnings.create({
        driver_email,
        driver_name: driverName,
        pending_balance: earnings,
        total_earned: earnings,
        total_deliveries: 1,
        avg_earnings_per_delivery: earnings,
      });
    }

    await base44.asServiceRole.entities.DriverTransaction.create({
      driver_email,
      order_id,
      amount: earnings,
      type: 'delivery',
      distance_km: delivery_distance_km,
      time_minutes: delivery_time_minutes,
      is_rush,
      status: 'pending',
      description: `Delivery · fare $${fare.toFixed(2)}${actualTip ? ` + tip $${actualTip.toFixed(2)}` : ''}`,
    });

    console.log(`[EARNINGS] ${driver_email} · $${earnings.toFixed(2)} (fare $${fare.toFixed(2)} + tip $${(actualTip||0).toFixed(2)}) for order ${order_id}`);

    return Response.json({
      success: true,
      earnings: earnings.toFixed(2),
      breakdown: { base_fare: BASE_FARE, distance_bonus: (delivery_distance_km * KM_RATE).toFixed(2), tip: (actualTip||0).toFixed(2), rush_multiplier: is_rush ? '1.5x' : '1.0x' }
    });
  } catch (error) {
    console.error('[recordDeliveryEarnings ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});