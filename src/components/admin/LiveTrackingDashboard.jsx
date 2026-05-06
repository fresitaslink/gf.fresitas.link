import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { MapPin, Truck, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LiveTrackingDashboard({ orders = [] }) {
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [driverLocations, setDriverLocations] = useState({});

  useEffect(() => {
    // Get active deliveries
    const active = orders.filter(o => o.status === 'on_the_way');
    setActiveDeliveries(active);

    // Subscribe to driver location updates
    const unsubDriver = base44.entities.Driver.subscribe((event) => {
      if (event.type === 'update' && event.data?.current_lat) {
        setDriverLocations(prev => ({
          ...prev,
          [event.data.user_email]: {
            lat: event.data.current_lat,
            lng: event.data.current_lng,
            name: event.data.full_name,
            updated: new Date().toLocaleTimeString()
          }
        }));
      }
    });

    return () => unsubDriver();
  }, [orders]);

  const getDriverDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-strawberry" />
        <h3 className="font-semibold">Rastreo en Vivo</h3>
        <Badge className="ml-auto bg-green-100 text-green-700">{activeDeliveries.length} en ruta</Badge>
      </div>

      {activeDeliveries.length === 0 ? (
        <div className="bg-muted rounded-xl p-8 text-center text-muted-foreground">
          No hay entregas en ruta
        </div>
      ) : (
        <div className="space-y-3">
          {activeDeliveries.map(order => {
            const assignment = base44.entities.DriverAssignment.filter?.({ order_id: order.id })?.[0];
            const driverLocation = assignment ? driverLocations[assignment.driver_email] : null;
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_address}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">En ruta</Badge>
                </div>

                {driverLocation && (
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Truck className="w-3.5 h-3.5 text-strawberry" />
                      <span className="font-medium">{driverLocation.name}</span>
                      <span className="text-muted-foreground">
                        {getDriverDistance(
                          driverLocation.lat,
                          driverLocation.lng,
                          order.delivery_lat,
                          order.delivery_lng
                        )} km away
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Actualizado: {driverLocation.updated}
                    </div>
                  </div>
                )}

                {!driverLocation && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Esperando ubicación del repartidor...
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}