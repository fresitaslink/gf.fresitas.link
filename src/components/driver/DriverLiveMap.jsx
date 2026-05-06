import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon paths (Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="background:#7c3aed;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);font-size:16px;">🚗</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const orderIcon = (status) => {
  const colors = { on_the_way: '#7c3aed', preparing: '#ea580c', confirmed: '#2563eb' };
  const color = colors[status] || '#e11d48';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:13px;">📦</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      try {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch {}
    }
  }, [positions.length]);
  return null;
}

export default function DriverLiveMap({ orders, driverLocation }) {
  const ordersWithCoords = orders.filter(o => o.delivery_lat && o.delivery_lng);
  
  const defaultCenter = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : ordersWithCoords.length > 0
      ? [ordersWithCoords[0].delivery_lat, ordersWithCoords[0].delivery_lng]
      : [19.4326, -99.1332]; // Mexico City fallback

  const allPositions = [
    ...(driverLocation ? [[driverLocation.lat, driverLocation.lng]] : []),
    ...ordersWithCoords.map(o => [o.delivery_lat, o.delivery_lng]),
  ];

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-border shadow-lg" style={{ height: 320 }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds positions={allPositions} />

        {/* Driver location */}
        {driverLocation && (
          <>
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
              <Popup>
                <div className="text-xs font-semibold">📍 Tu ubicación actual</div>
              </Popup>
            </Marker>
            <Circle
              center={[driverLocation.lat, driverLocation.lng]}
              radius={150}
              pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.1, weight: 2 }}
            />
          </>
        )}

        {/* Order delivery locations */}
        {ordersWithCoords.map(order => (
          <Marker
            key={order.id}
            position={[order.delivery_lat, order.delivery_lng]}
            icon={orderIcon(order.status)}
          >
            <Popup>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-sm">#{order.tracking_code}</p>
                <p className="font-semibold">{order.customer_name}</p>
                <p className="text-gray-500">{order.customer_address}</p>
                <p className="font-medium">${order.total?.toFixed(2)}</p>
                <p className={`inline-block px-1.5 py-0.5 rounded text-white text-xs mt-1 ${
                  order.status === 'on_the_way' ? 'bg-purple-600' :
                  order.status === 'preparing' ? 'bg-orange-600' : 'bg-blue-600'
                }`}>
                  {order.status === 'on_the_way' ? '🚗 En Camino' :
                   order.status === 'preparing' ? '🍳 Preparando' : '✅ Listo'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}