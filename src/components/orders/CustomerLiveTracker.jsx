import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { Bike, MapPin, Phone, Loader2 } from 'lucide-react';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  html: `<div style="background:#7C3AED;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);font-size:18px">🛵</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const destinationIcon = L.divIcon({
  html: `<div style="background:#E8294A;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);font-size:18px">📍</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

/**
 * Live customer-facing tracker with real-time driver position.
 * Subscribes to Order entity changes for instant GPS updates.
 */
export default function CustomerLiveTracker({ order: initialOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    setOrder(initialOrder);
    // Load driver details
    if (initialOrder?.assigned_driver_email) {
      base44.entities.Driver.filter({ user_email: initialOrder.assigned_driver_email }, undefined, 1)
        .then(rows => setDriver(rows[0] || null))
        .catch(() => {});
    }
  }, [initialOrder?.id]);

  // Real-time subscription on order updates (gets driver_current_lat/lng updates)
  useEffect(() => {
    if (!order?.id) return;
    const unsub = base44.entities.Order.subscribe(event => {
      if (event.id === order.id && event.type === 'update' && event.data) {
        setOrder(prev => ({ ...prev, ...event.data }));
      }
    });
    return unsub;
  }, [order?.id]);

  if (!order) return null;

  const driverLat = order.driver_current_lat;
  const driverLng = order.driver_current_lng;
  const destLat = order.delivery_lat;
  const destLng = order.delivery_lng;

  const hasDriverPos = driverLat && driverLng;
  const hasDestPos = destLat && destLng;
  const hasUpdated = order.driver_last_location_update;

  // Center map: midpoint between driver and destination, or just destination
  const center = hasDriverPos && hasDestPos
    ? [(driverLat + destLat) / 2, (driverLng + destLng) / 2]
    : hasDestPos
      ? [destLat, destLng]
      : hasDriverPos
        ? [driverLat, driverLng]
        : [19.4326, -99.1332]; // Mexico City fallback

  if (!hasDestPos) {
    return (
      <div className="bg-muted rounded-2xl p-6 text-center text-sm text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Sin coordenadas de entrega disponibles para este pedido
      </div>
    );
  }

  if (order.status !== 'on_the_way') {
    return (
      <div className="bg-muted rounded-2xl p-6 text-center text-sm text-muted-foreground">
        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
        El rastreo en vivo se activa cuando tu pedido salga a entregar
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Driver card */}
      {driver && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 flex items-center gap-3 border border-purple-200 dark:border-purple-800">
          {driver.photo_url ? (
            <img src={driver.photo_url} alt={driver.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-400" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
              <Bike className="w-6 h-6 text-purple-700 dark:text-purple-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{driver.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {driver.vehicle_type === 'motorcycle' ? '🏍️ Moto' : driver.vehicle_type === 'van' ? '🚐 Van' : '🚗 Auto'}
              {driver.vehicle_color && ` · ${driver.vehicle_color}`}
              {driver.vehicle_plate && ` · ${driver.vehicle_plate}`}
            </p>
          </div>
          {driver.phone && (
            <a href={`tel:${driver.phone}`} className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-2.5">
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="font-medium text-purple-700 dark:text-purple-400">EN VIVO</span>
        {hasUpdated && (
          <span className="text-muted-foreground ml-auto">
            Actualizado {new Date(hasUpdated).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border-2 border-purple-300" style={{ height: 320 }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} key={`${center[0]}-${center[1]}`}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {hasDriverPos && (
            <Marker position={[driverLat, driverLng]} icon={driverIcon}>
              <Popup>🛵 Tu repartidor está aquí</Popup>
            </Marker>
          )}
          <Marker position={[destLat, destLng]} icon={destinationIcon}>
            <Popup>📍 Tu dirección de entrega</Popup>
          </Marker>
          {hasDriverPos && (
            <Polyline
              positions={[[driverLat, driverLng], [destLat, destLng]]}
              color="#7C3AED"
              weight={3}
              dashArray="6, 8"
            />
          )}
        </MapContainer>
      </div>

      {!hasDriverPos && (
        <div className="text-center text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          Esperando ubicación del repartidor...
        </div>
      )}
    </div>
  );
}