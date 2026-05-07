import React, { useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Smart ETA badge — calls computeETA backend and refreshes every 60s
 * Used on customer order tracking and driver app.
 *
 * Props:
 *  - orderId (preferred) OR { driverLat, driverLng, destLat, destLng }
 *  - compact: render small inline pill
 */
export default function ETABadge({ orderId, driverLat, driverLng, destLat, destLng, compact = false }) {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchETA = async () => {
    try {
      const payload = orderId
        ? { order_id: orderId }
        : { driver_lat: driverLat, driver_lng: driverLng, dest_lat: destLat, dest_lng: destLng };

      const res = await base44.functions.invoke('computeETA', payload);
      if (res?.data?.success) {
        setEta(res.data);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId && (!destLat || !destLng)) {
      setLoading(false);
      return;
    }
    fetchETA();
    const t = setInterval(fetchETA, 60000); // refresh every minute
    return () => clearInterval(t);
  }, [orderId, driverLat, driverLng, destLat, destLng]);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
        <Loader2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} /> Calculando ETA...
      </span>
    );
  }

  if (error || !eta) return null;

  const trafficLabel = eta.traffic_factor >= 1.4 ? 'tráfico pesado' :
                       eta.traffic_factor >= 1.2 ? 'tráfico moderado' : 'tránsito fluido';

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${
      compact
        ? 'px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200'
        : 'px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700'
    }`}>
      <Clock className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-blue-600`} />
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-blue-900 dark:text-blue-200">~{eta.eta_minutes} min</span>
        {!compact && (
          <span className="text-[10px] text-muted-foreground">{eta.distance_km} km · {trafficLabel}</span>
        )}
      </div>
    </div>
  );
}