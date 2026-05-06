import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Clock } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="background:#7c3aed;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.4);font-size:18px;animation:pulse 2s infinite;">🚗</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="background:#e11d48;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.4);font-size:16px;">🏠</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function AutoFit({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      try { map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 15 }); } catch {}
    }
  }, []);
  return null;
}

export default function CustomerTrackingMap({ order, driverLat, driverLng }) {
  const hasDriver = driverLat && driverLng;
  const hasDest = order?.delivery_lat && order?.delivery_lng;

  if (!hasDest && !hasDriver) {
    return (
      <div className="rounded-2xl border border-border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ height: 220 }}>
        <MapPin className="w-8 h-8 opacity-40" />
        <p className="text-sm">Mapa disponible cuando tengamos coordenadas</p>
      </div>
    );
  }

  const center = hasDriver
    ? [driverLat, driverLng]
    : [order.delivery_lat, order.delivery_lng];

  const positions = [
    ...(hasDriver ? [[driverLat, driverLng]] : []),
    ...(hasDest   ? [[order.delivery_lat, order.delivery_lng]] : []),
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        <span>Seguimiento en tiempo real</span>
        <Clock className="w-3 h-3 ml-auto" />
        <span>{new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="rounded-2xl overflow-hidden border-2 border-purple-200 dark:border-purple-800 shadow-lg" style={{ height: 220 }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AutoFit positions={positions} />
          
          {hasDriver && (
            <Marker position={[driverLat, driverLng]} icon={driverIcon}>
              <Popup><div className="text-xs font-semibold">🚗 Repartidor en camino</div></Popup>
            </Marker>
          )}
          
          {hasDest && (
            <Marker position={[order.delivery_lat, order.delivery_lng]} icon={destinationIcon}>
              <Popup><div className="text-xs font-semibold">🏠 Tu dirección</div></Popup>
            </Marker>
          )}
          
          {hasDriver && hasDest && (
            <Polyline
              positions={[[driverLat, driverLng], [order.delivery_lat, order.delivery_lng]]}
              pathOptions={{ color: '#7c3aed', weight: 3, dashArray: '8, 6', opacity: 0.8 }}
            />
          )}
        </MapContainer>
      </div>
      {hasDriver && hasDest && (() => {
        const R = 6371;
        const dLat = (order.delivery_lat - driverLat) * Math.PI / 180;
        const dLon = (order.delivery_lng - driverLng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(driverLat*Math.PI/180)*Math.cos(order.delivery_lat*Math.PI/180)*Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const mins = Math.round(dist / 25 * 60); // ~25 km/h city speed
        return (
          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2">
            <Navigation className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
              Distancia: {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} · ETA: ~{mins} min
            </p>
          </div>
        );
      })()}
    </div>
  );
}