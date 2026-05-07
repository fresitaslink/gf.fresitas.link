import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Calculate dynamic surge pricing for a delivery location.
 * Uses thresholds and multipliers from StoreSettings (admin-controlled).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { delivery_lat, delivery_lng, base_fee = 30 } = await req.json();
    if (!delivery_lat || !delivery_lng) {
      return Response.json({ error: 'Coordinates required' }, { status: 400 });
    }

    // Pull dynamic settings (admin-controlled)
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const s = settingsList[0] || {};
    const surgeEnabled = s.surge_enabled !== false; // default true
    const tLow  = s.surge_threshold_low  ?? 4;
    const tMed  = s.surge_threshold_med  ?? 7;
    const tHigh = s.surge_threshold_high ?? 11;
    const mLow  = s.surge_multiplier_low  ?? 1.25;
    const mMed  = s.surge_multiplier_med  ?? 1.5;
    const mHigh = s.surge_multiplier_high ?? 2.0;
    const peakMult = s.peak_hour_multiplier ?? 1.15;

    // If surge globally disabled, return base fee
    if (!surgeEnabled) {
      return Response.json({
        success: true, base_fee, surge_factor: 1.0,
        final_delivery_fee: base_fee, surge_amount: 0,
        is_surge: false, demand_level: 'BAJA',
        nearby_orders: 0, time_period: 'normal',
      });
    }

    // Count pending orders nearby
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    const pending = allOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));

    const gridSize = 0.01;
    const targetLat = Math.floor(delivery_lat / gridSize);
    const targetLng = Math.floor(delivery_lng / gridSize);

    let nearbyOrders = 0;
    for (const o of pending) {
      if (!o.delivery_lat || !o.delivery_lng) continue;
      const dLat = Math.abs(Math.floor(o.delivery_lat / gridSize) - targetLat);
      const dLng = Math.abs(Math.floor(o.delivery_lng / gridSize) - targetLng);
      if (dLat <= 1 && dLng <= 1) nearbyOrders++;
    }

    // Demand-based surge
    let surgeFactor = 1.0;
    let demandLevel = 'BAJA';
    if (nearbyOrders >= tHigh) { surgeFactor = mHigh; demandLevel = 'CRÍTICA'; }
    else if (nearbyOrders >= tMed)  { surgeFactor = mMed;  demandLevel = 'ALTA'; }
    else if (nearbyOrders >= tLow)  { surgeFactor = mLow;  demandLevel = 'MEDIA'; }

    // Peak hours
    const hour = new Date().getHours();
    const isPeak = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 20);
    const timeFactor = isPeak ? peakMult : 1.0;

    const finalFactor = surgeFactor * timeFactor;
    const finalFee = Math.round(base_fee * finalFactor * 100) / 100;
    const surgeAmount = finalFee - base_fee;

    return Response.json({
      success: true,
      base_fee,
      surge_factor: finalFactor,
      final_delivery_fee: finalFee,
      surge_amount: surgeAmount,
      demand_level: demandLevel,
      nearby_orders: nearbyOrders,
      is_surge: finalFactor > 1.0,
      time_period: (hour >= 11 && hour <= 14) ? 'lunch' : (hour >= 18 && hour <= 20) ? 'dinner' : 'normal',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});