import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation, Loader2, Check } from 'lucide-react';
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

const STORE_CENTER = [19.4326, -99.1332];
const DELIVERY_RADIUS_KM = 10;

// Reverse geocode using Nominatim (free, no key needed)
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    if (!data.address) return null;
    const a = data.address;
    const parts = [
      a.road && `${a.road}${a.house_number ? ' ' + a.house_number : ''}`,
      a.suburb || a.neighbourhood || a.city_district,
      a.city || a.town || a.village || a.municipality,
      a.state,
      a.postcode,
      a.country,
    ].filter(Boolean);
    return parts.join(', ');
  } catch {
    return null;
  }
}

function MapPanTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { animate: true, duration: 1 });
  }, [position]);
  return null;
}

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function DeliveryMap({ onLocationSelect, onAddressResolved, savedAddresses = [] }) {
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const resolveAndReport = async (latlng) => {
    setPosition(latlng);
    onLocationSelect(latlng);
    setResolving(true);
    const addr = await reverseGeocode(latlng[0], latlng[1]);
    setResolving(false);
    if (addr) {
      setResolvedAddress(addr);
      if (onAddressResolved) onAddressResolved(addr);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        resolveAndReport([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSavedAddressSelect = (addr) => {
    setShowSuggestions(false);
    if (onAddressResolved) onAddressResolved(addr.address);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-strawberry" />
          Marca tu ubicación exacta en el mapa
        </p>
        <div className="flex items-center gap-2">
          {savedAddresses.length > 0 && (
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowSuggestions(v => !v)}
                className="rounded-full text-xs border-border"
              >
                <MapPin className="w-3 h-3 mr-1" />
                Guardadas
              </Button>
              {showSuggestions && (
                <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-xl w-72 overflow-hidden">
                  {savedAddresses.map((addr, i) => (
                    <button
                      key={i}
                      onClick={() => handleSavedAddressSelect(addr)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-muted/60 transition-colors flex items-start gap-2 border-b border-border last:border-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-strawberry flex-shrink-0 mt-0.5" />
                      <div>
                        {addr.label && <p className="font-semibold text-xs text-strawberry">{addr.label}</p>}
                        <p className="text-foreground">{addr.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleLocateMe}
            disabled={locating}
            className="rounded-full text-xs border-strawberry text-strawberry hover:bg-strawberry hover:text-white"
          >
            {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
            <span className="ml-1">Usar mi ubicación</span>
          </Button>
        </div>
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
          <Circle
            center={STORE_CENTER}
            radius={DELIVERY_RADIUS_KM * 1000}
            pathOptions={{ color: '#E8294A', fillColor: '#E8294A', fillOpacity: 0.08, weight: 2, dashArray: '8,4' }}
          />
          <Marker position={STORE_CENTER} icon={new L.DivIcon({
            html: '<div style="background:#5C2D0E;color:white;padding:4px 8px;border-radius:8px;font-size:11px;white-space:nowrap;font-weight:bold;">Fresitas G&F</div>',
            className: '',
            iconAnchor: [40, 10],
          })} />
          {position && <Marker position={position} icon={customIcon} />}
          {position && <MapPanTo position={position} />}
          <LocationPicker onSelect={resolveAndReport} />
        </MapContainer>
      </div>

      {position ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
          {resolving ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <div>
            {resolving ? (
              <span>Obteniendo dirección completa...</span>
            ) : resolvedAddress ? (
              <span className="font-medium">{resolvedAddress}</span>
            ) : (
              <span>Ubicación marcada: {position[0].toFixed(5)}, {position[1].toFixed(5)}</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Toca el mapa para marcar tu dirección exacta de entrega. El área rosa es nuestra zona de cobertura.
        </p>
      )}
    </div>
  );
}