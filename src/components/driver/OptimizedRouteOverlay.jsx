import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Navigation, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OptimizedRouteOverlay({ route, onClose, driverLocation }) {
  if (!route) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 mb-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-poppins font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
              <Navigation className="w-5 h-5" /> Ruta Optimizada
            </h3>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
              Sigue esta secuencia para minimizar tiempo y distancia
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="font-bold text-green-700 dark:text-green-400">{route.sequence}</p>
          </div>
          <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3" /> Distancia
            </p>
            <p className="font-bold text-green-700 dark:text-green-400">{route.total_distance_km} km</p>
          </div>
          <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Tiempo
            </p>
            <p className="font-bold text-green-700 dark:text-green-400">{route.estimated_time_minutes} min</p>
          </div>
        </div>

        {/* Route sequence */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">SECUENCIA DE ENTREGA:</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {route.orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 bg-white dark:bg-black/30 rounded-lg p-2.5 hover:bg-white/80 dark:hover:bg-black/40 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-mono font-bold text-foreground">#{order.tracking_code}</span>
                    <span className="text-xs text-muted-foreground">${order.total?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {order.customer_address}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Navigation button */}
        <Button
          onClick={() => {
            const first = route.orders[0];
            if (first && first.lat && first.lng) {
              const origin = driverLocation ? `${driverLocation.lat},${driverLocation.lng}` : '';
              const dest = `${first.lat},${first.lng}`;
              const url = origin
                ? `https://www.google.com/maps/dir/${origin}/${dest}`
                : `https://maps.google.com/?q=${dest}`;
              window.open(url, '_blank');
            }
          }}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg h-9 text-sm font-semibold gap-2"
        >
          <Navigation className="w-4 h-4" /> Iniciar Navegación
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}