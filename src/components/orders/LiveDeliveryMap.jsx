import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Navigation, Clock, Route as RouteIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

let mapsLoaderPromise = null;

/**
 * Loads Google Maps JS API once, fetching the key from the backend.
 */
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (mapsLoaderPromise) return mapsLoaderPromise;

  mapsLoaderPromise = (async () => {
    const res = await base44.functions.invoke('getGoogleMapsKey', {});
    const apiKey = res?.data?.apiKey;
    if (!apiKey) throw new Error('Missing Google Maps API key');

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  })();

  return mapsLoaderPromise;
}

/**
 * Live customer-facing map: shows driver (animated) → destination polyline + ETA.
 * Driver position should be updated via parent re-renders (subscription on Order).
 */
export default function LiveDeliveryMap({
  driverLat,
  driverLng,
  deliveryLat,
  deliveryLng,
  driverName = 'Repartidor',
  driverPhoto,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [eta, setEta] = useState(null); // { minutes, distanceKm }

  // Init map once
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          zoom: 14,
          center: { lat: driverLat, lng: driverLng },
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });
        mapInstanceRef.current = map;

        // Destination marker (green pin)
        destMarkerRef.current = new google.maps.Marker({
          position: { lat: deliveryLat, lng: deliveryLng },
          map,
          title: 'Tu dirección',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
        });

        // Driver marker (custom strawberry pin with optional photo)
        const driverIcon = driverPhoto
          ? {
              url: driverPhoto,
              scaledSize: new google.maps.Size(48, 48),
              anchor: new google.maps.Point(24, 24),
            }
          : {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#e11d48',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            };
        driverMarkerRef.current = new google.maps.Marker({
          position: { lat: driverLat, lng: driverLng },
          map,
          title: driverName,
          icon: driverIcon,
        });

        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: { strokeColor: '#e11d48', strokeWeight: 5, strokeOpacity: 0.85 },
        });

        // Fit bounds to both points
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: driverLat, lng: driverLng });
        bounds.extend({ lat: deliveryLat, lng: deliveryLng });
        map.fitBounds(bounds, 64);

        setReady(true);
      })
      .catch((err) => {
        console.error('Maps load error:', err);
        setError(err.message || 'No se pudo cargar el mapa');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update driver marker position smoothly + recompute route + ETA
  useEffect(() => {
    if (!ready || !driverMarkerRef.current || !directionsServiceRef.current) return;

    const google = window.google;
    const newPos = new google.maps.LatLng(driverLat, driverLng);
    driverMarkerRef.current.setPosition(newPos);

    // Recompute directions & ETA
    directionsServiceRef.current.route(
      {
        origin: { lat: driverLat, lng: driverLng },
        destination: { lat: deliveryLat, lng: deliveryLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
          directionsRendererRef.current.setDirections(result);
          const leg = result.routes[0].legs[0];
          setEta({
            minutes: Math.max(1, Math.round(leg.duration.value / 60)),
            distanceKm: (leg.distance.value / 1000).toFixed(1),
          });
        }
      }
    );
  }, [ready, driverLat, driverLng, deliveryLat, deliveryLng]);

  if (error) {
    return (
      <Card className="p-4 text-sm text-muted-foreground text-center">
        Mapa no disponible. {error}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div ref={mapRef} className="w-full h-80 bg-muted" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <Loader2 className="w-6 h-6 animate-spin text-strawberry" />
          </div>
        )}
      </div>

      {/* Live ETA banner */}
      <div className="p-4 bg-gradient-to-r from-strawberry/10 to-orange-100/10 border-t border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-strawberry animate-pulse" />
          <span className="text-sm font-semibold">{driverName} en camino</span>
        </div>
        {eta ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-bold text-strawberry">
              <Clock className="w-4 h-4" /> {eta.minutes} min
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <RouteIcon className="w-4 h-4" /> {eta.distanceKm} km
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Calculando ruta…</span>
        )}
      </div>
    </Card>
  );
}