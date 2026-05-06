import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Real-time location broadcaster for drivers
 * Streams position every 10 seconds when driver is on delivery
 * Uses Geolocation API for accurate GPS tracking
 */
export default function DriverLocationBroadcaster({ order, driverId }) {
  const [tracking, setTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Start tracking only if driver is on delivery
    if (!order || !['on_the_way', 'delivering'].includes(order.status)) {
      setTracking(false);
      return;
    }

    setTracking(true);
    let watchId = null;
    let updateInterval = null;

    const startTracking = async () => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        toast.error('GPS no soportado en este dispositivo');
        return;
      }

      try {
        // Get initial position
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;
            setAccuracy(Math.round(gpsAccuracy));

            // Update driver location
            await base44.functions.invoke('updateDriverLocation', {
              lat: latitude,
              lng: longitude,
              is_available: true,
            });

            console.log(`Driver location: ${latitude}, ${longitude} (±${gpsAccuracy}m)`);
          },
          (err) => {
            setError(err.message);
            toast.error('Error obteniendo GPS: ' + err.message);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        // Watch position with 10-second interval
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;
            setAccuracy(Math.round(gpsAccuracy));

            try {
              // Broadcast location every 10 seconds
              await base44.functions.invoke('updateDriverLocation', {
                lat: latitude,
                lng: longitude,
              });
            } catch (err) {
              console.error('Failed to update location:', err);
            }
          },
          (err) => {
            console.error('Geolocation error:', err);
            setError(err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          }
        );
      } catch (err) {
        setError(err.message);
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [order?.status, driverId]);

  // This is a background service - no UI needed
  if (!tracking) return null;

  return (
    <div className="hidden">
      {/* Background location tracking service */}
      <meta name="description" content={`GPS Accuracy: ±${accuracy}m`} />
    </div>
  );
}