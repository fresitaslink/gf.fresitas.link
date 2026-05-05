import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#f97316',
  on_the_way: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

const STATUS_LABELS = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  on_the_way: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado',
};

function createColoredIcon(color) {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Parse coordinates from address string or lat/lng fields
function parseCoords(order) {
  if (order.delivery_lat && order.delivery_lng) {
    return [parseFloat(order.delivery_lat), parseFloat(order.delivery_lng)];
  }
  // Fallback: randomize near a default center so orders appear on map
  // In production these would come from geocoded addresses
  return null;
}

export default function OrdersMap({ orders, center = [19.4326, -99.1332] }) {
  // Only show orders with coords OR generate approximate positions for demo
  const mappableOrders = useMemo(() => {
    return orders.filter(o => parseCoords(o) !== null);
  }, [orders]);

  // Heatmap zones: count orders per rough area
  const heatZones = useMemo(() => {
    const zones = {};
    orders.forEach(o => {
      const coords = parseCoords(o);
      if (!coords) return;
      const key = `${Math.round(coords[0] * 20) / 20},${Math.round(coords[1] * 20) / 20}`;
      zones[key] = (zones[key] || 0) + 1;
    });
    return Object.entries(zones).map(([key, count]) => {
      const [lat, lng] = key.split(',').map(Number);
      return { lat, lng, count };
    });
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="bg-muted rounded-2xl flex items-center justify-center" style={{ height: 320 }}>
        <div className="text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay pedidos con coordenadas</p>
          <p className="text-xs mt-1">Los pedidos con ubicación GPS aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 360 }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Heat zones */}
        {heatZones.map((zone, i) => (
          <Circle
            key={i}
            center={[zone.lat, zone.lng]}
            radius={zone.count * 150}
            pathOptions={{ color: '#E8294A', fillColor: '#E8294A', fillOpacity: 0.15, weight: 0 }}
          />
        ))}
        {/* Order markers */}
        {mappableOrders.map(order => {
          const coords = parseCoords(order);
          const color = STATUS_COLORS[order.status] || '#gray';
          return (
            <Marker key={order.id} position={coords} icon={createColoredIcon(color)}>
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-bold text-strawberry">#{order.tracking_code}</p>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-gray-500 text-xs">{order.customer_address}</p>
                  <p className="mt-1">
                    <span className="font-semibold">${order.total?.toFixed(2)}</span>
                    {' · '}
                    <span style={{ color }}>{STATUS_LABELS[order.status]}</span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}