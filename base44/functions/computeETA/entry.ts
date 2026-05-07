import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Haversine distance in km
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Time-of-day traffic factor (multiplier on travel time)
 * Higher = more traffic = slower trip.
 * Local time is taken from the request (UTC) — fine for relative weighting.
 */
function trafficFactor(now = new Date()) {
  const hour = now.getHours();
  // Rush hours: 7-9am, 12-2pm (lunch), 5-8pm
  if (hour >= 17 && hour <= 20) return 1.6;       // evening rush
  if (hour >= 12 && hour <= 14) return 1.35;      // lunch
  if (hour >= 7 && hour <= 9) return 1.4;         // morning rush
  if (hour >= 22 || hour <= 5) return 0.85;       // late night / early — light
  return 1.1;                                      // normal
}

/**
 * Compute ETA for an order.
 * Body: { order_id }  OR  { driver_lat, driver_lng, dest_lat, dest_lng }
 * Returns: { eta_minutes, distance_km, traffic_factor, arrives_at }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    let driverLat, driverLng, destLat, destLng, prepBuffer = 0;

    if (body.order_id) {
      const order = await base44.asServiceRole.entities.Order.read?.(body.order_id)
        ?? (await base44.asServiceRole.entities.Order.filter({ id: body.order_id }))[0];
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

      destLat = order.delivery_lat;
      destLng = order.delivery_lng;
      driverLat = order.driver_current_lat;
      driverLng = order.driver_current_lng;

      // If driver hasn't started, add prep buffer based on items
      if (!driverLat || order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing') {
        prepBuffer = (order.status === 'preparing') ? 8 : 15; // mins
        // fall back to driver's current loc if assigned
        if (order.assigned_driver_email) {
          const drv = await base44.asServiceRole.entities.Driver.filter({ user_email: order.assigned_driver_email });
          if (drv[0]?.current_lat) {
            driverLat = drv[0].current_lat;
            driverLng = drv[0].current_lng;
          }
        }
      }
    } else {
      driverLat = body.driver_lat;
      driverLng = body.driver_lng;
      destLat = body.dest_lat;
      destLng = body.dest_lng;
    }

    if (!destLat || !destLng) {
      return Response.json({ error: 'Destination coordinates missing' }, { status: 400 });
    }

    let distance_km = 0;
    let travelMinutes = 0;
    const factor = trafficFactor();

    if (driverLat && driverLng) {
      distance_km = distanceKm(driverLat, driverLng, destLat, destLng);
      // Base avg speed: 30 km/h urban
      travelMinutes = (distance_km / 30) * 60 * factor;
    } else {
      // No driver location yet — rough estimate from store (Monterrey default)
      const storeLat = 25.6866;
      const storeLng = -100.3161;
      distance_km = distanceKm(storeLat, storeLng, destLat, destLng);
      travelMinutes = (distance_km / 25) * 60 * factor;
    }

    const eta_minutes = Math.max(2, Math.ceil(travelMinutes + prepBuffer));
    const arrives_at = new Date(Date.now() + eta_minutes * 60 * 1000).toISOString();

    return Response.json({
      success: true,
      eta_minutes,
      distance_km: parseFloat(distance_km.toFixed(2)),
      traffic_factor: factor,
      prep_buffer_minutes: prepBuffer,
      arrives_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});