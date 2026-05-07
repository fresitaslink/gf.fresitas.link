import React, { useState } from 'react';
import { Route, MapPin, Loader2, ExternalLink, Navigation, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Multi-stop route optimizer panel for drivers.
 * Renders the driver's current active orders as a sequence and lets them
 * compute the optimal pickup/delivery order via the existing
 * `optimizeDeliveryRoutes` backend function.
 *
 * Props:
 *  - driverEmail: string
 *  - orders: array of orders assigned to this driver (status === 'on_the_way' or 'confirmed')
 */
export default function MultiStopRoutePanel({ driverEmail, orders }) {
  const [optimized, setOptimized] = useState(null);
  const [loading, setLoading] = useState(false);

  const eligibleOrders = (orders || []).filter(o =>
    o.delivery_lat && o.delivery_lng && ['on_the_way', 'confirmed', 'preparing'].includes(o.status)
  );

  if (eligibleOrders.length === 0) return null;

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('optimizeDeliveryRoutes', {
        driver_email: driverEmail,
        order_ids: eligibleOrders.map(o => o.id),
      });
      if (res?.data?.success) {
        setOptimized(res.data);
        toast.success(`Ruta optimizada · ${res.data.total_distance_km} km · ${res.data.estimated_time_minutes} min`);
      } else {
        toast.error('No se pudo optimizar la ruta');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build "Google Maps directions" URL with all stops
  const buildMapsUrl = (sequence) => {
    if (!sequence?.length) return '#';
    const waypoints = sequence
      .slice(0, -1)
      .map(s => `${s.delivery_lat},${s.delivery_lng}`)
      .join('|');
    const dest = sequence[sequence.length - 1];
    const base = `https://www.google.com/maps/dir/?api=1&destination=${dest.delivery_lat},${dest.delivery_lng}&travelmode=driving`;
    return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Route className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-poppins font-bold text-sm">Ruta Multi-Stop</h3>
          <p className="text-xs text-muted-foreground">
            {eligibleOrders.length} entregas activas · optimiza el orden
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleOptimize}
          disabled={loading || eligibleOrders.length < 2}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListOrdered className="w-3.5 h-3.5" />}
          Optimizar
        </Button>
      </div>

      {/* Optimized result */}
      {optimized && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 space-y-2 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-900 dark:text-purple-200">Ruta óptima</span>
            <span className="text-purple-700 dark:text-purple-300">
              {optimized.total_distance_km} km · {optimized.estimated_time_minutes} min
            </span>
          </div>
          <ol className="space-y-1.5">
            {optimized.optimized_route.map((stop) => (
              <li key={stop.order_id} className="flex items-center gap-2 text-sm bg-card rounded-lg px-2 py-1.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex-shrink-0">
                  {stop.sequence}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-bold text-strawberry">#{stop.tracking_code}</p>
                  <p className="text-xs text-muted-foreground truncate">{stop.customer_address}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href={buildMapsUrl(optimized.optimized_route)}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <Navigation className="w-3.5 h-3.5" /> Abrir en Google Maps
              <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </div>
      )}

      {/* Hint */}
      {!optimized && eligibleOrders.length === 1 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Necesitas al menos 2 entregas activas para optimizar.
        </p>
      )}
    </div>
  );
}