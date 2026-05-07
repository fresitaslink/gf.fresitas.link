import React, { useState, useEffect, useRef } from 'react';
import { Power, Signal, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Real-time driver availability + GPS broadcasting.
 * - Toggles is_available on Driver record
 * - When available, watches GPS and pushes location every 15s via updateDriverLocation
 * - Stops broadcasting when driver goes offline
 */
export default function DriverAvailabilityToggle({ user }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [lastBroadcast, setLastBroadcast] = useState(null);
  const watchIdRef = useRef(null);
  const broadcastTimerRef = useRef(null);
  const lastSentRef = useRef(0);

  // Load driver record
  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Driver.filter({ user_email: user.email }, undefined, 1)
      .then(rows => {
        setDriver(rows[0] || null);
        if (rows[0]?.is_available) startGPS();
      })
      .finally(() => setLoading(false));

    return () => stopGPS();
  }, [user?.email]);

  const broadcastLocation = async (coords) => {
    if (!driver) return;
    try {
      await base44.functions.invoke('updateDriverLocation', {
        driver_email: user.email,
        lat: coords.lat,
        lng: coords.lng,
        is_available: true,
      });
      setLastBroadcast(new Date());
      lastSentRef.current = Date.now();
    } catch (e) {
      console.warn('Location broadcast failed:', e.message);
    }
  };

  const startGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Tu dispositivo no soporta GPS');
      return;
    }
    setGpsError(null);
    setGpsActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        // Throttle: broadcast at most every 15s
        if (Date.now() - lastSentRef.current > 15000) {
          broadcastLocation(coords);
        }
      },
      err => {
        console.warn('GPS error:', err);
        setGpsError(err.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener GPS');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Force broadcast every 30s even if no movement
    broadcastTimerRef.current = setInterval(() => {
      if (currentCoords) broadcastLocation(currentCoords);
    }, 30000);
  };

  const stopGPS = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (broadcastTimerRef.current) {
      clearInterval(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    setGpsActive(false);
    setCurrentCoords(null);
    setLastBroadcast(null);
  };

  const handleToggle = async () => {
    if (!driver) {
      toast.error('No tienes registro de repartidor. Contacta a admin.');
      return;
    }
    setToggling(true);
    const newStatus = !driver.is_available;
    try {
      await base44.entities.Driver.update(driver.id, { is_available: newStatus });
      setDriver(prev => ({ ...prev, is_available: newStatus }));
      if (newStatus) {
        startGPS();
        toast.success('🟢 Estás en línea — recibiendo pedidos');
      } else {
        stopGPS();
        toast.info('⏸️ Estás fuera de línea');
        // Push final offline status
        await base44.functions.invoke('updateDriverLocation', {
          driver_email: user.email,
          lat: currentCoords?.lat || driver.current_lat || 0,
          lng: currentCoords?.lng || driver.current_lng || 0,
          is_available: false,
        }).catch(() => {});
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally { setToggling(false); }
  };

  if (loading) return <div className="h-16 bg-muted animate-pulse rounded-2xl" />;
  if (!driver) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-300">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Tu cuenta no tiene perfil de repartidor. Pide al administrador que te registre.
      </div>
    );
  }

  const online = driver.is_available;

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${online ? 'bg-green-50 dark:bg-green-900/20 border-green-400' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${online ? 'bg-green-500 text-white shadow-lg shadow-green-500/40' : 'bg-muted text-muted-foreground'}`}
        >
          {toggling ? <Loader2 className="w-6 h-6 animate-spin" /> : <Power className="w-6 h-6" />}
          {online && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-bold ${online ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
            {online ? '🟢 En línea · Disponible' : '⚪ Fuera de línea'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {online
              ? gpsActive
                ? gpsError
                  ? <span className="text-amber-600">⚠️ {gpsError}</span>
                  : currentCoords
                    ? <><Signal className="w-3 h-3 inline" /> GPS activo · {lastBroadcast ? `actualizado ${Math.floor((Date.now() - lastBroadcast.getTime())/1000)}s` : 'enviando...'}</>
                    : 'Obteniendo GPS...'
                : 'Esperando GPS...'
              : 'Toca el botón para empezar a recibir pedidos'
            }
          </p>
        </div>
      </div>

      {online && currentCoords && (
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 text-strawberry" />
          <code className="text-[10px]">{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</code>
        </div>
      )}
    </div>
  );
}