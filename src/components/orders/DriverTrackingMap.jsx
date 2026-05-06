import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, MapPin, Phone } from 'lucide-react';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  html: `<div style="background:#7c3aed;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🚗</div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const customerIcon = L.divIcon({
  html: `<div style="background:#E8294A;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🏠</div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15);
    }
  }, [positions.map(p => p.join(',')).join('|')]);
  return null;
}

export default function DriverTrackingMap({ order }) {
  const [driverPos, setDriverPos] = useState(null);
  const [simIndex, setSimIndex] = useState(0);

  const customerPos = order.delivery_lat && order.delivery_lng
    ? [order.delivery_lat, order.delivery_lng]
    : null;

  // Simulate driver movement if we have a customer position
  // In production, driver position would come from a real-time entity update
  useEffect(() => {
    if (!customerPos) return;

    // Start driver ~1.5km away and simulate movement toward customer
    const startLat = customerPos[0] + 0.013;
    const startLng = customerPos[1] - 0.008;

    const steps = 20;
    const positions = Array.from({ length: steps }, (_, i) => [
      startLat + (customerPos[0] - startLat) * (i / steps),
      startLng + (customerPos[1] - startLng) * (i / steps),
    ]);

    setDriverPos(positions[0]);

    const interval = setInterval(() => {
      setSimIndex(prev => {
        const next = prev + 1;
        if (next >= steps) {
          clearInterval(interval);
          return prev;
        }
        setDriverPos(positions[next]);
        return next;
      });
    }, 3000); // advance every 3 seconds

    return () => clearInterval(interval);
  }, [order.id]);

  const mapCenter = customerPos || [19.4326, -99.1332];
  const positions = [
    ...(driverPos ? [driverPos] : []),
    ...(customerPos ? [customerPos] : []),
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-purple-200 dark:border-purple-800 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <Navigation className="w-4 h-4 text-white animate-pulse" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">¡Tu repartidor está en camino! 🚗</p>
          <p className="text-purple-200 text-xs">Ubicación actualizada en tiempo real</p>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: '280px' }}>
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds positions={positions} />

          {driverPos && (
            <Marker position={driverPos} icon={driverIcon}>
              <Popup>🚗 Tu repartidor</Popup>
            </Marker>
          )}

          {customerPos && (
            <Marker position={customerPos} icon={customerIcon}>
              <Popup>🏠 Tu dirección</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Footer info */}
      <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="text-purple-800 dark:text-purple-300 text-xs truncate max-w-[200px]">
            {order.customer_address}
          </span>
        </div>
        {order.customer_phone && (
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 hover:underline"
          >
            <Phone className="w-3 h-3" /> Llamar
          </a>
        )}
      </div>

      {!customerPos && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 text-center">
          📍 El mapa exacto está disponible cuando el repartidor activa su ubicación GPS
        </div>
      )}
    </div>
  );
}