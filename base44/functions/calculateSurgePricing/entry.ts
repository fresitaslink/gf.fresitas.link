import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { delivery_lat, delivery_lng, base_fee = 30 } = await req.json();

    if (!delivery_lat || !delivery_lng) {
      return Response.json({ error: 'Coordinates required' }, { status: 400 });
    }

    // Get all pending orders
    const allOrders = await base44.entities.Order.list('-created_date', 500);
    const pendingOrders = allOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));

    // Calculate heatmap grid (0.01 degrees ≈ 1km)
    const gridSize = 0.01;
    const deliveryBucket = {
      lat: Math.floor(delivery_lat / gridSize),
      lng: Math.floor(delivery_lng / gridSize)
    };

    // Count orders in nearby buckets (3x3 grid around delivery location)
    let nearbyOrders = 0;
    for (let dlat = -1; dlat <= 1; dlat++) {
      for (let dlng = -1; dlng <= 1; dlng++) {
        const checkBucket = {
          lat: deliveryBucket.lat + dlat,
          lng: deliveryBucket.lng + dlng
        };

        nearbyOrders += pendingOrders.filter(order => {
          if (!order.delivery_lat || !order.delivery_lng) return false;
          const bucket = {
            lat: Math.floor(order.delivery_lat / gridSize),
            lng: Math.floor(order.delivery_lng / gridSize)
          };
          return bucket.lat === checkBucket.lat && bucket.lng === checkBucket.lng;
        }).length;
      }
    }

    // Surge calculation: based on demand concentration
    // 0-3 orders: 1.0x (no surge)
    // 4-6 orders: 1.25x
    // 7-10 orders: 1.5x
    // 11+ orders: 2.0x
    let surgeFactor = 1.0;
    if (nearbyOrders >= 11) surgeFactor = 2.0;
    else if (nearbyOrders >= 7) surgeFactor = 1.5;
    else if (nearbyOrders >= 4) surgeFactor = 1.25;

    // Also consider time of day (peak hours multiplier)
    const hour = new Date().getHours();
    let timeFactor = 1.0;
    if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 20)) {
      timeFactor = 1.15; // +15% during lunch and dinner
    }

    // Combined surge
    const finalSurge = surgeFactor * timeFactor;
    const surgeDeliveryFee = Math.round(base_fee * finalSurge * 100) / 100;
    const surgeAmount = surgeDeliveryFee - base_fee;

    return Response.json({
      success: true,
      base_fee,
      surge_factor: finalSurge,
      final_delivery_fee: surgeDeliveryFee,
      surge_amount: surgeAmount,
      demand_level: nearbyOrders >= 11 ? 'CRÍTICA' : nearbyOrders >= 7 ? 'ALTA' : nearbyOrders >= 4 ? 'MEDIA' : 'BAJA',
      nearby_orders: nearbyOrders,
      is_surge: finalSurge > 1.0,
      time_period: (hour >= 11 && hour <= 14) ? 'lunch' : (hour >= 18 && hour <= 20) ? 'dinner' : 'normal'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});