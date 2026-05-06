import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, TrendingUp, Package } from 'lucide-react';

// Cluster nearby coordinates
function clusterCoordinates(orders, radius = 0.008) {
  const points = orders
    .filter(o => o.delivery_lat && o.delivery_lng)
    .map(o => ({ lat: o.delivery_lat, lng: o.delivery_lng, order: o }));

  const clusters = [];
  const used = new Set();

  points.forEach((p, i) => {
    if (used.has(i)) return;
    const cluster = { lat: p.lat, lng: p.lng, count: 1, orders: [p.order], totalRevenue: p.order.total || 0 };
    points.forEach((p2, j) => {
      if (i === j || used.has(j)) return;
      const dist = Math.sqrt(Math.pow(p.lat - p2.lat, 2) + Math.pow(p.lng - p2.lng, 2));
      if (dist < radius) {
        cluster.count++;
        cluster.orders.push(p2.order);
        cluster.totalRevenue += p2.order.total || 0;
        cluster.lat = (cluster.lat * (cluster.count - 1) + p2.lat) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + p2.lng) / cluster.count;
        used.add(j);
      }
    });
    used.add(i);
    clusters.push(cluster);
  });

  return clusters;
}

function HeatLayer({ clusters, maxCount }) {
  return clusters.map((cluster, i) => {
    const intensity = cluster.count / maxCount;
    const radius = Math.max(200, intensity * 800);
    const color = intensity > 0.7 ? '#E8294A' : intensity > 0.4 ? '#ff8c00' : '#22c55e';
    const opacity = 0.3 + intensity * 0.4;

    return (
      <Circle
        key={i}
        center={[cluster.lat, cluster.lng]}
        radius={radius}
        pathOptions={{ color, fillColor: color, fillOpacity: opacity, weight: 1 }}
      >
        <Popup>
          <div className="text-sm font-sans">
            <p className="font-bold text-strawberry">{cluster.count} pedido{cluster.count !== 1 ? 's' : ''}</p>
            <p className="text-gray-600">Revenue: ${cluster.totalRevenue.toFixed(0)}</p>
            <p className="text-gray-500 text-xs mt-1">{cluster.orders.slice(0,3).map(o => o.customer_address).join(', ')}</p>
          </div>
        </Popup>
      </Circle>
    );
  });
}

export default function DeliveryHeatmap() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    base44.entities.Order.filter({ status: 'delivered' }, '-created_date', 500)
      .then(deliveredOrders => {
        setOrders(deliveredOrders);
        const c = clusterCoordinates(deliveredOrders);
        setClusters(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxCount = clusters.length > 0 ? Math.max(...clusters.map(c => c.count)) : 1;
  const ordersWithCoords = orders.filter(o => o.delivery_lat && o.delivery_lng);
  const topZones = [...clusters].sort((a, b) => b.count - a.count).slice(0, 5);

  // Default center - Mexico City (fallback if no orders)
  const center = ordersWithCoords.length > 0
    ? [
        ordersWithCoords.reduce((s, o) => s + o.delivery_lat, 0) / ordersWithCoords.length,
        ordersWithCoords.reduce((s, o) => s + o.delivery_lng, 0) / ordersWithCoords.length,
      ]
    : [19.4326, -99.1332];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-2xl">
        <Loader2 className="w-6 h-6 animate-spin text-strawberry" />
      </div>
    );
  }

  if (ordersWithCoords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-2xl text-center p-6">
        <MapPin className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="font-semibold text-muted-foreground">Sin datos de ubicación aún</p>
        <p className="text-xs text-muted-foreground mt-1">Los pedidos con coordenadas GPS aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pedidos mapeados', value: ordersWithCoords.length, icon: Package, color: 'text-blue-600' },
          { label: 'Zonas calientes', value: clusters.filter(c => c.count >= 2).length, icon: TrendingUp, color: 'text-red-600' },
          { label: 'Zona top', value: topZones[0]?.count ? `${topZones[0].count} pedidos` : '-', icon: MapPin, color: 'text-gold' },
        ].map((s, i) => (
          <div key={i} className="bg-muted rounded-xl p-3 text-center">
            <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
            <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: '400px' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatLayer clusters={clusters} maxCount={maxCount} />
        </MapContainer>
      </div>

      {/* Top zones legend */}
      {topZones.length > 0 && (
        <div className="bg-muted rounded-xl p-4">
          <p className="font-semibold text-sm mb-3">🔥 Zonas de Mayor Demanda</p>
          <div className="space-y-2">
            {topZones.map((zone, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: i === 0 ? '#E8294A' : i === 1 ? '#ff8c00' : '#22c55e' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {zone.orders[0]?.customer_address?.split(',')[0] || `Zona ${i + 1}`}
                  </p>
                </div>
                <span className="font-bold text-sm text-strawberry">{zone.count} pedidos</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}