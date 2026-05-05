import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customIcon = new L.DivIcon({
  html: '<div style="background:#E8294A;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: '',
});

// Default center — Mexico City (adjust to actual location)
const STORE_CENTER = [19.4326, -99.1332];
const DELIVERY_RADIUS_KM = 10;

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function DeliveryMap({ onLocationSelect, initialAddress }) {
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);

  const handleMapClick = (latlng) => {
    setPosition(latlng);
    onLocationSelect(latlng);
  };

  const handleLocateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = [pos.coords.latitude, pos.coords.longitude];
        setPosition(latlng);
        onLocationSelect(latlng);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert('No se pudo obtener tu ubicación');
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-strawberry" />
          Marca tu ubicación exacta en el mapa
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleLocateMe}
          disabled={locating}
          className="rounded-full text-xs border-strawberry text-strawberry hover:bg-strawberry hover:text-white"
        >
          {locating ? '...' : '📍 Usar mi ubicación'}
        </Button>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 border-border shadow-sm" style={{ height: '280px' }}>
        <MapContainer
          center={STORE_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* Coverage area */}
          <Circle
            center={STORE_CENTER}
            radius={DELIVERY_RADIUS_KM * 1000}
            pathOptions={{ color: '#E8294A', fillColor: '#E8294A', fillOpacity: 0.08, weight: 2, dashArray: '8,4' }}
          />
          {/* Store marker */}
          <Marker position={STORE_CENTER} icon={new L.DivIcon({
            html: '<div style="background:#5C2D0E;color:white;padding:4px 8px;border-radius:8px;font-size:11px;white-space:nowrap;font-weight:bold;">🍓 Fresitas G&F</div>',
            className: '',
            iconAnchor: [40, 10],
          })} />
          {/* User marker */}
          {position && <Marker position={position} icon={customIcon} />}
          <LocationPicker onSelect={handleMapClick} />
        </MapContainer>
      </div>

      {position ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <span>✅</span>
          <span>Ubicación marcada: {position[0].toFixed(5)}, {position[1].toFixed(5)}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Toca el mapa para marcar tu dirección exacta de entrega. El área rosa es nuestra zona de cobertura.
        </p>
      )}
    </div>
  );
}