import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Greedy nearest-neighbor routing: optimal for Uber-scale with minimal compute
 * Calculates haversine distance between coordinates
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Nearest-neighbor TSP approximation
 * Returns optimized order sequence
 */
function optimizeRoute(startLat, startLng, orders) {
  if (orders.length <= 1) return orders;

  const unvisited = [...orders];
  const route = [];
  let currentLat = startLat;
  let currentLng = startLng;
  let totalDistance = 0;

  while (unvisited.length > 0) {
    let nearest = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversine(
        currentLat,
        currentLng,
        unvisited[i].delivery_lat,
        unvisited[i].delivery_lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = i;
      }
    }

    const nextOrder = unvisited.splice(nearest, 1)[0];
    route.push(nextOrder);
    totalDistance += minDistance;
    currentLat = nextOrder.delivery_lat;
    currentLng = nextOrder.delivery_lng;
  }

  return route;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driver_email, order_ids } = await req.json();

    if (!driver_email || !order_ids || order_ids.length === 0) {
      return Response.json({ error: 'driver_email and order_ids required' }, { status: 400 });
    }

    // Get driver location
    const drivers = await base44.entities.Driver.filter({ user_email: driver_email });
    if (!drivers[0]) {
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = drivers[0];
    const startLat = driver.current_lat || 25.6866;
    const startLng = driver.current_lng || -100.3161; // Default to Monterrey

    // Get order details with delivery coordinates
    const orders = [];
    for (const orderId of order_ids) {
      const order = await base44.entities.Order.read(orderId);
      if (order && order.delivery_lat && order.delivery_lng) {
        orders.push(order);
      }
    }

    if (orders.length === 0) {
      return Response.json({ error: 'No valid orders with coordinates found' }, { status: 400 });
    }

    // Optimize route
    const optimizedRoute = optimizeRoute(startLat, startLng, orders);

    // Calculate total metrics
    let totalDistance = 0;
    let currentLat = startLat;
    let currentLng = startLng;

    for (const order of optimizedRoute) {
      totalDistance += haversine(currentLat, currentLng, order.delivery_lat, order.delivery_lng);
      currentLat = order.delivery_lat;
      currentLng = order.delivery_lng;
    }

    // Estimate time: ~20 km/h average urban speed
    const estimatedMinutes = Math.ceil((totalDistance / 20) * 60);

    return Response.json({
      success: true,
      optimized_route: optimizedRoute.map((o, i) => ({
        sequence: i + 1,
        order_id: o.id,
        tracking_code: o.tracking_code,
        customer_address: o.customer_address,
        delivery_lat: o.delivery_lat,
        delivery_lng: o.delivery_lng,
      })),
      total_distance_km: parseFloat(totalDistance.toFixed(2)),
      estimated_time_minutes: estimatedMinutes,
      order_count: optimizedRoute.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});