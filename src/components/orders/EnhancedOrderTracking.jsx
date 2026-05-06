import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Star, AlertCircle, CheckCircle, Clock, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function EnhancedOrderTracking({ order }) {
  const [assignment, setAssignment] = useState(null);
  const [driver, setDriver] = useState(null);
  const [verification, setVerification] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assign = await base44.entities.DriverAssignment.filter({ order_id: order.id });
        if (assign.length > 0) {
          setAssignment(assign[0]);
          const drv = await base44.entities.Driver.filter({ user_email: assign[0].driver_email });
          if (drv.length > 0) setDriver(drv[0]);
        }

        const verif = await base44.entities.DeliveryVerification.filter({ order_id: order.id });
        if (verif.length > 0) setVerification(verif[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const unsubscribe = base44.entities.DriverAssignment.subscribe((event) => {
      if (event.data.order_id === order.id) setAssignment(event.data);
    });
    return () => unsubscribe();
  }, [order.id]);

  const handleVerifyPin = async () => {
    if (!verification || pinInput.length !== 4) {
      toast.error('Ingresa un PIN de 4 dígitos');
      return;
    }

    try {
      await base44.entities.DeliveryVerification.update(verification.id, {
        pin_entered: pinInput,
        pin_verified: pinInput === verification.verification_pin,
        pin_verified_at: new Date().toISOString(),
        verification_status: pinInput === verification.verification_pin ? 'in_progress' : 'failed',
      });

      if (pinInput === verification.verification_pin) {
        toast.success('PIN correcto! Toma la foto de confirmación');
        setVerification(prev => ({ ...prev, pin_verified: true }));
      } else {
        toast.error('PIN incorrecto');
      }
    } catch (err) {
      toast.error('Error al verificar PIN');
    }
  };

  if (loading) return <div className="text-center py-4">Cargando...</div>;

  if (!assignment || !driver) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm">
        <AlertCircle className="w-4 h-4 inline mr-2 text-yellow-600" />
        Asignando conductor...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Driver Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-strawberry/10 to-orange-100/10 dark:from-strawberry/5 dark:to-orange-900/10 rounded-2xl border border-strawberry/20 p-5">
        <div className="flex items-start gap-4">
          <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-strawberry" />
          <div className="flex-1">
            <p className="font-bold text-lg">{driver.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-gold fill-gold" />
              <span className="font-semibold">{driver.average_rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({driver.rating_count} calificaciones)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                <p className="text-muted-foreground">Vehículo</p>
                <p className="font-semibold">{driver.vehicle_model} • {driver.vehicle_color}</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                <p className="text-muted-foreground">Placa</p>
                <p className="font-semibold">{driver.vehicle_plate}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 text-xs">
                <Phone className="w-3 h-3 mr-1" /> Llamar
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs">
                <MapPin className="w-3 h-3 mr-1" /> Mapa
              </Button>
            </div>
          </div>
        </div>

        {/* ETA & Distance */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center bg-white/50 dark:bg-black/20 rounded-lg p-2">
            <Clock className="w-4 h-4 mx-auto text-strawberry mb-1" />
            <p className="text-xs text-muted-foreground">ETA</p>
            <p className="font-bold text-sm">{assignment.estimated_duration_minutes} min</p>
          </div>
          <div className="text-center bg-white/50 dark:bg-black/20 rounded-lg p-2">
            <MapPin className="w-4 h-4 mx-auto text-strawberry mb-1" />
            <p className="text-xs text-muted-foreground">Distancia</p>
            <p className="font-bold text-sm">{assignment.estimated_distance_km?.toFixed(1)} km</p>
          </div>
          <div className="text-center bg-white/50 dark:bg-black/20 rounded-lg p-2">
            <Badge className="w-full bg-green-100 text-green-700 dark:bg-green-900/30">{assignment.assignment_status === 'accepted' ? 'En ruta' : 'Confirmando'}</Badge>
          </div>
        </div>
      </motion.div>

      {/* Delivery Verification */}
      {assignment.assignment_status === 'active' && verification && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">Verificación de Entrega</h3>

          {!verification.pin_verified && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Ingresa el PIN de 4 dígitos enviado a tu teléfono</p>
              <div className="flex gap-2">
                <Input
                  maxLength={4}
                  type="password"
                  placeholder="••••"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="rounded-lg text-center text-lg tracking-widest font-bold flex-1"
                />
                <Button onClick={handleVerifyPin} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Verificar
                </Button>
              </div>
            </div>
          )}

          {verification.pin_verified && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                PIN verificado correctamente
              </div>
              <p className="text-xs text-muted-foreground">El conductor debe tomar una foto de confirmación</p>
              {verification.driver_photo_url ? (
                <div className="bg-white dark:bg-black/20 rounded-lg p-2">
                  <img src={verification.driver_photo_url} alt="Driver confirmation" className="w-full rounded-lg" />
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <Camera className="w-6 h-6 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">Esperando foto del conductor...</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Live Map Placeholder */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 h-48 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">Mapa de seguimiento en vivo</p>
          <p className="text-xs text-muted-foreground mt-1">Google Maps / Apple Maps API</p>
        </div>
      </div>
    </div>
  );
}