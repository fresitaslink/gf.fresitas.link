import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// K-means clustering para agrupar pedidos cercanos
function kMeansClustering(orders, k = 4) {
  if (orders.length <= k) return orders.map((o, i) => ({ ...o, cluster: i }));

  const points = orders.map(o => ({
    id: o.id,
    lat: o.delivery_lat || 0,
    lng: o.delivery_lng || 0,
    order: o,
  }));

  // Inicializar centroides aleatoriamente
  let centroids = points.slice(0, k).map(p => ({ lat: p.lat, lng: p.lng }));
  let assignments = [];
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 10) {
    iterations++;
    changed = false;

    // Asignar puntos al centroide más cercano
    const newAssignments = points.map(p => {
      let minDist = Infinity;
      let cluster = 0;
      centroids.forEach((c, i) => {
        const dist = Math.hypot(p.lat - c.lat, p.lng - c.lng);
        if (dist < minDist) {
          minDist = dist;
          cluster = i;
        }
      });
      return cluster;
    });

    if (JSON.stringify(assignments) !== JSON.stringify(newAssignments)) {
      changed = true;
      assignments = newAssignments;
    }

    // Recalcular centroides
    const newCentroids = Array(k).fill(null).map((_, i) => {
      const clusterPoints = points.filter((_, idx) => assignments[idx] === i);
      if (clusterPoints.length === 0) return centroids[i];
      return {
        lat: clusterPoints.reduce((s, p) => s + p.lat, 0) / clusterPoints.length,
        lng: clusterPoints.reduce((s, p) => s + p.lng, 0) / clusterPoints.length,
      };
    });
    centroids = newCentroids;
  }

  return points.map((p, i) => ({
    ...p.order,
    cluster: assignments[i],
  }));
}

// Haversine distance (km)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Traveling Salesman Problem aproximado (greedy nearest neighbor)
function optimizeRoute(orders) {
  if (orders.length <= 1) return orders;

  const route = [orders[0]];
  const remaining = orders.slice(1);

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((o, i) => {
      const dist = haversineDistance(
        last.delivery_lat || 0, last.delivery_lng || 0,
        o.delivery_lat || 0, o.delivery_lng || 0
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });

    route.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return route;
}

// Calcular zona por coordenadas (geohash simple)
function getZone(lat, lng) {
  if (!lat || !lng) return 'unknown';
  const latZone = Math.floor(lat * 2);
  const lngZone = Math.floor(lng * 2);
  return `Z${latZone}_${lngZone}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { driver_email, order_ids = [] } = await req.json();

    // Obtener pedidos (por driver o específicos)
    let orders = [];
    if (order_ids.length > 0) {
      orders = await Promise.all(
        order_ids.map(id => base44.entities.Order.filter({ id }, '', 1))
          .map(p => p.then(arr => arr[0]))
      );
      orders = orders.filter(Boolean);
    } else if (driver_email) {
      const assignments = await base44.entities.DriverAssignment.filter({
        driver_email,
        assignment_status: 'active'
      }, '-created_date', 50);
      
      const orderIds = [...new Set(assignments.map(a => a.order_id))];
      orders = await Promise.all(
        orderIds.map(id => base44.entities.Order.filter({ id }, '', 1))
          .map(p => p.then(arr => arr[0]))
      );
      orders = orders.filter(Boolean);
    } else {
      // Todos los pedidos activos sin asignar
      orders = await base44.entities.Order.filter({
        status: { $in: ['confirmed', 'preparing'] }
      }, '-created_date', 100);
    }

    if (orders.length === 0) {
      return Response.json({ clusters: [], optimized_routes: [] });
    }

    // Agrupar por zona
    const byZone = {};
    orders.forEach(o => {
      const zone = getZone(o.delivery_lat, o.delivery_lng);
      if (!byZone[zone]) byZone[zone] = [];
      byZone[zone].push(o);
    });

    // Optimizar rutas por zona
    const clusters = [];
    Object.entries(byZone).forEach(([zone, zoneOrders]) => {
      const k = Math.ceil(zoneOrders.length / 5);
      const clustered = kMeansClustering(zoneOrders, k);

      clustered.forEach(o => {
        if (!clusters[o.cluster]) clusters[o.cluster] = [];
        clusters[o.cluster].push(o);
      });
    });

    // Optimizar cada cluster (TSP)
    const optimized_routes = clusters
      .filter(Boolean)
      .map(cluster => {
        const route = optimizeRoute(cluster);
        const distance = route.reduce((total, o, i) => {
          if (i === 0) return 0;
          return total + haversineDistance(
            route[i-1].delivery_lat || 0, route[i-1].delivery_lng || 0,
            o.delivery_lat || 0, o.delivery_lng || 0
          );
        }, 0);

        return {
          orders: route.map(o => ({
            id: o.id,
            tracking_code: o.tracking_code,
            customer_name: o.customer_name,
            customer_address: o.customer_address,
            lat: o.delivery_lat,
            lng: o.delivery_lng,
            total: o.total,
          })),
          total_distance_km: distance.toFixed(2),
          estimated_time_minutes: Math.ceil(distance / 1.2) + (route.length * 3),
          sequence: route.length,
        };
      })
      .sort((a, b) => b.sequence - a.sequence);

    // Guardar sugerencias de ruta para el conductor
    if (driver_email && optimized_routes.length > 0) {
      const bestRoute = optimized_routes[0];
      const routeData = {
        driver_email,
        suggested_sequence: bestRoute.orders.map(o => o.id),
        total_distance_km: parseFloat(bestRoute.total_distance_km),
        estimated_minutes: bestRoute.estimated_time_minutes,
        created_at: new Date().toISOString(),
      };
      
      try {
        // Guardar en metadata del driver o crear entity si existe
        await base44.asServiceRole.entities.Driver.update(
          (await base44.entities.Driver.filter({ user_email: driver_email }))[0]?.id,
          { current_route_suggestion: JSON.stringify(routeData) }
        ).catch(() => {});
      } catch (e) {
        // Silenciar error de actualización
      }
    }

    return Response.json({
      total_orders: orders.length,
      total_zones: Object.keys(byZone).length,
      optimized_routes,
      zones_breakdown: Object.entries(byZone).map(([z, o]) => ({ zone: z, count: o.length })),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});