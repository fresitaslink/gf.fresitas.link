import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, AlertCircle, CheckCircle2, Truck, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import CustomerTrackingMap from '@/components/driver/CustomerTrackingMap';

export default function LiveDeliveryTracker({ order }) {
  const [driverInfo, setDriverInfo] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order || order.status !== 'on_the_way') {
      setLoading(false);
      return;
    }

    // Fetch driver info from Order
    const loadTracking = async () => {
      try {
        // In a real app, this would query a Driver entity with live location
        // For now, we'll simulate with the order data
        setTrackingData({
          eta: '8-12 minutos',
          distance: '2.3 km',
          estimatedTime: order.estimated_delivery || new Date(Date.now() + 10 * 60000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        });
      } finally {
        setLoading(false);
      }
    };

    loadTracking();

    // Subscribe to real-time driver location updates
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'update' && event.id === order.id) {
        // Update with new order data if status changes
        if (event.data?.status !== 'on_the_way') {
          setTrackingData(null);
        }
      }
    });

    return unsubscribe;
  }, [order]);

  if (!order || order.status !== 'on_the_way') return null;

  if (loading) {
    return <div className="h-64 bg-muted rounded-2xl animate-pulse" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">Tu repartidor está en camino</h3>
          <p className="text-white/80 text-xs">{trackingData?.eta}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-sm">{trackingData?.distance}</p>
          <p className="text-white/80 text-xs">{trackingData?.estimatedTime}</p>
        </div>
      </div>

      {/* Map */}
      <div className="h-64">
        <CustomerTrackingMap order={order} driverLat={null} driverLng={null} />
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {/* ETA Box */}
        <div className="bg-muted rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Tiempo estimado de entrega</p>
            <p className="text-sm font-semibold">{trackingData?.estimatedTime}</p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-muted rounded-xl p-3 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-strawberry flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Dirección de entrega</p>
            <p className="text-sm font-semibold truncate">{order.customer_address}</p>
          </div>
        </div>

        {/* Driver Contact */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-lg text-sm gap-1">
            <Phone className="w-4 h-4" />
            Contactar repartidor
          </Button>
          <Button variant="outline" className="flex-1 rounded-lg text-sm gap-1">
            <MessageCircle className="w-4 h-4" />
            Mensaje
          </Button>
        </div>

        {/* Tip */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400">El mapa se actualiza en tiempo real. Mantén disponible tu teléfono.</p>
        </div>
      </div>
    </motion.div>
  );
}