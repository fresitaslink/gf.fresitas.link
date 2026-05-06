import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Star, AlertCircle, CheckCircle, Clock, Camera, Lock, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import GoogleMapTracker from './GoogleMapTracker';

/**
 * Customer-facing order tracking panel.
 * Shows assigned driver info + PIN for the customer to read aloud + delivery photo proof.
 * Reads from Order.assigned_driver_email (current source of truth) and falls back to
 * DriverAssignment if available.
 */
export default function EnhancedOrderTracking({ order }) {
  const [driver, setDriver] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        // Fetch driver profile from assigned_driver_email (live source)
        if (order.assigned_driver_email) {
          const drv = await base44.entities.Driver.filter({ user_email: order.assigned_driver_email });
          if (active && drv.length > 0) setDriver(drv[0]);
        }

        // Fetch delivery verification record (for photo proof)
        const verif = await base44.entities.DeliveryVerification.filter({ order_id: order.id });
        if (active && verif.length > 0) setVerification(verif[0]);
      } catch (err) {
        // silent — tracker is non-critical
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();

    // Subscribe to verification updates (for photo)
    const unsub = base44.entities.DeliveryVerification.subscribe((event) => {
      if (event.data?.order_id === order.id) {
        setVerification(event.data);
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, [order.id, order.assigned_driver_email]);

  const copyPin = () => {
    if (!order.verification_pin) return;
    navigator.clipboard?.writeText(String(order.verification_pin));
    toast.success('Código copiado');
  };

  if (loading) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-center text-sm text-muted-foreground">
        Cargando información de entrega...
      </div>
    );
  }

  // No driver assigned yet
  if (!order.assigned_driver_email) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 text-sm">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Buscando repartidor...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Te avisaremos en cuanto un repartidor acepte tu pedido.
          </p>
        </div>
      </div>
    );
  }

  const driverName = driver?.full_name || order.assigned_driver_name || 'Tu repartidor';
  const driverPhoto = driver?.photo_url || order.assigned_driver_photo;
  const driverRating = driver?.average_rating || order.assigned_driver_rating || 5.0;

  return (
    <div className="space-y-4">
      {/* Driver Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-strawberry/10 to-orange-100/10 dark:from-strawberry/5 dark:to-orange-900/10 rounded-2xl border border-strawberry/20 p-5"
      >
        <div className="flex items-start gap-4">
          {driverPhoto ? (
            <img src={driverPhoto} alt={driverName} className="w-16 h-16 rounded-full object-cover border-2 border-strawberry" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-strawberry/10 border-2 border-strawberry flex items-center justify-center">
              <span className="text-strawberry font-bold text-xl">{driverName.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">{driverName}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-semibold">{driverRating.toFixed(1)}</span>
              {driver?.rating_count !== undefined && (
                <span className="text-xs text-muted-foreground">({driver.rating_count})</span>
              )}
            </div>
            {(driver?.vehicle_model || driver?.vehicle_plate) && (
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {driver.vehicle_model && (
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                    <p className="text-muted-foreground">Vehículo</p>
                    <p className="font-semibold truncate">{driver.vehicle_model} {driver.vehicle_color || ''}</p>
                  </div>
                )}
                {driver.vehicle_plate && (
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                    <p className="text-muted-foreground">Placa</p>
                    <p className="font-semibold">{driver.vehicle_plate}</p>
                  </div>
                )}
              </div>
            )}
            {driver?.phone && (
              <a href={`tel:${driver.phone}`} className="inline-flex items-center gap-1 mt-3 text-xs bg-green-600 hover:bg-green-700 text-white rounded-full px-3 py-1.5">
                <Phone className="w-3 h-3" /> Llamar al repartidor
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* PIN Display - CRITICAL: customer reads this to driver */}
      {order.verification_pin && order.status !== 'delivered' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">Tu código de verificación</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Cuando tu repartidor llegue, dale este código para confirmar la entrega:
          </p>
          <button
            onClick={copyPin}
            className="w-full bg-white dark:bg-black/30 rounded-xl p-5 border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono font-black text-4xl tracking-[0.5em] text-blue-700 dark:text-blue-300">
                {order.verification_pin}
              </span>
              <Copy className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </div>
          </button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Toca el código para copiarlo
          </p>
        </motion.div>
      )}

      {/* Photo proof (shown after delivery) */}
      {verification?.driver_photo_url && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-sm">Foto de entrega</h3>
          </div>
          <img
            src={verification.driver_photo_url}
            alt="Entrega"
            className="w-full rounded-xl object-cover max-h-64"
          />
          {verification.driver_photo_timestamp && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(verification.driver_photo_timestamp).toLocaleString('es-MX')}
            </p>
          )}
        </motion.div>
      )}

      {/* Live Map */}
      {driver?.current_lat && driver?.current_lng && order?.delivery_lat && order?.delivery_lng && (
        <GoogleMapTracker
          driverLat={driver.current_lat}
          driverLng={driver.current_lng}
          deliveryLat={order.delivery_lat}
          deliveryLng={order.delivery_lng}
          driverName={driverName}
        />
      )}
    </div>
  );
}