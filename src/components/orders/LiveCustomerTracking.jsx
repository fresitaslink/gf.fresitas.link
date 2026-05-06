import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, MessageSquare, Clock, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Real-time delivery tracking for customers
 * Shows live driver location, ETA, contact options
 */
export default function LiveCustomerTracking({ order }) {
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (!order?.driver_current_lat || !order?.driver_current_lng) return;

    // Calculate distance and ETA
    const d = calculateDistance(
      order.driver_current_lat,
      order.driver_current_lng,
      order.delivery_lat,
      order.delivery_lng
    );
    setDistance(d.toFixed(1));
    setEta(Math.max(1, Math.ceil(d / 0.7))); // ~0.7 km/min = 42 km/h
  }, [order?.driver_current_lat, order?.driver_current_lng]);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!order?.id) return;

    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'update' && event.id === order.id) {
        // Update local order data (in parent component, would trigger re-render)
      }
    });

    return () => unsub();
  }, [order?.id]);

  if (!order || !['on_the_way', 'confirmed', 'preparing'].includes(order.status)) {
    return null;
  }

  const callUrl = `tel:${order.assigned_driver_phone || ''}`;
  const waNumber = (order.assigned_driver_phone || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido #${order.tracking_code}`);
  const waUrl = `https://wa.me/${waNumber}?text=${waMsg}`;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(order.driver_current_lng, order.delivery_lng) - 0.01}%2C${Math.min(order.driver_current_lat, order.delivery_lat) - 0.01}%2C${Math.max(order.driver_current_lng, order.delivery_lng) + 0.01}%2C${Math.max(order.driver_current_lat, order.delivery_lat) + 0.01}&layer=mapnik`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/20 p-5 space-y-4 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Rastreo en Vivo
        </h3>
        {order.status === 'on_the_way' && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            En ruta
          </span>
        )}
      </div>

      {/* Driver Card */}
      {order.status === 'on_the_way' && (
        <div className="bg-white dark:bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            {order.assigned_driver_photo && (
              <img
                src={order.assigned_driver_photo}
                alt={order.assigned_driver_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{order.assigned_driver_name || 'Repartidor'}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-500">⭐</span>
                <span className="text-xs text-muted-foreground">
                  {order.assigned_driver_rating?.toFixed(1) || 5.0} • {order.tracking_code}
                </span>
              </div>
            </div>
            {eta && (
              <div className="text-right">
                <div className="font-bold text-primary text-sm">{eta} min</div>
                <p className="text-xs text-muted-foreground">ETA</p>
              </div>
            )}
          </div>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={callUrl}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Llamar</span>
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366]/10 text-[#25D366] rounded-lg text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Live Map */}
      {order.driver_current_lat && order.driver_current_lng && (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: 220 }}>
          <iframe
            title="Mapa en vivo"
            src={mapUrl}
            width="100%"
            height="220"
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
      )}

      {/* Stats */}
      {order.status === 'on_the_way' && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white dark:bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Navigation className="w-3.5 h-3.5" />
              <span className="font-medium">Distancia</span>
            </div>
            <p className="font-bold text-sm">{distance} km</p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">ETA</span>
            </div>
            <p className="font-bold text-sm">{eta} minutos</p>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {order.status === 'preparing' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-semibold">🍳 Preparando:</span> Tu pedido está siendo preparado. El repartidor saldrá en breve.
          </p>
        </div>
      )}

      {order.status === 'confirmed' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">⏳ Confirmado:</span> Tu pedido ha sido confirmado. ¡Pronto estará en camino!
          </p>
        </div>
      )}
    </motion.div>
  );
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}