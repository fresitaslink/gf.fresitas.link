import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Record driver earnings when order is delivered
 * Called automatically when order status → delivered
 * Calculates fare based on distance + time + demand
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id, driver_email, delivery_distance_km, delivery_time_minutes, is_rush } = await req.json();

    if (!order_id || !driver_email) {
      return Response.json({ error: 'order_id and driver_email required' }, { status: 400 });
    }

    // Base fare calculation
    const BASE_FARE = 3; // $3 per delivery
    const KM_RATE = 0.50; // $0.50 per km
    const TIME_RATE = 0.05; // $0.05 per minute (less important)
    const RUSH_MULTIPLIER = is_rush ? 1.5 : 1.0; // 50% boost during peak hours

    const earnings = (BASE_FARE + (delivery_distance_km * KM_RATE) + (delivery_time_minutes * TIME_RATE)) * RUSH_MULTIPLIER;

    // Get or create driver earnings record
    const existingEarnings = await base44.entities.DriverEarnings.filter(
      { driver_email },
      undefined,
      1
    );

    let driverEarningsId;
    if (existingEarnings.length > 0) {
      driverEarningsId = existingEarnings[0].id;
      // Update existing
      await base44.asServiceRole.entities.DriverEarnings.update(driverEarningsId, {
        pending_balance: (existingEarnings[0].pending_balance || 0) + earnings,
        total_earned: (existingEarnings[0].total_earned || 0) + earnings,
        total_deliveries: (existingEarnings[0].total_deliveries || 0) + 1,
        avg_earnings_per_delivery: ((existingEarnings[0].total_earned || 0) + earnings) / ((existingEarnings[0].total_deliveries || 0) + 1)
      });
    } else {
      // Create new record
      const driver = await base44.entities.Driver.filter({ user_email: driver_email }, undefined, 1);
      const driverName = driver.length > 0 ? driver[0].full_name : 'Driver';
      
      await base44.asServiceRole.entities.DriverEarnings.create({
        driver_email,
        driver_name: driverName,
        pending_balance: earnings,
        total_earned: earnings,
        total_deliveries: 1,
        avg_earnings_per_delivery: earnings
      });
    }

    // Create transaction record for history
    await base44.asServiceRole.entities.DriverTransaction.create({
      driver_email,
      order_id,
      amount: earnings,
      type: 'delivery',
      distance_km: delivery_distance_km,
      time_minutes: delivery_time_minutes,
      is_rush,
      status: 'pending'
    });

    console.log(`[EARNINGS] Driver ${driver_email} earned $${earnings.toFixed(2)} for order ${order_id}`);

    return Response.json({
      success: true,
      driver_email,
      earnings: earnings.toFixed(2),
      breakdown: {
        base_fare: BASE_FARE,
        distance_bonus: (delivery_distance_km * KM_RATE).toFixed(2),
        rush_multiplier: is_rush ? '1.5x' : '1.0x'
      }
    });
  } catch (error) {
    console.error('Earnings Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});