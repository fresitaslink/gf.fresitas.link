import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, ChefHat, CheckCircle, Clock, MapPin, ChevronRight, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  pending:    { icon: Clock,       label_es: 'Pendiente',       label_en: 'Pending',      color: 'text-yellow-600',  bg: 'bg-yellow-50 dark:bg-yellow-900/20',  pulse: false },
  confirmed:  { icon: CheckCircle, label_es: 'Confirmado',      label_en: 'Confirmed',    color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',      pulse: false },
  preparing:  { icon: ChefHat,     label_es: 'Preparando',      label_en: 'Preparing',    color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/20',  pulse: true },
  ready:      { icon: CheckCircle, label_es: 'Listo p/ recoger',label_en: 'Ready',         color: 'text-green-600',   bg: 'bg-green-50 dark:bg-green-900/20',    pulse: true },
  on_the_way: { icon: Truck,       label_es: 'En Camino',       label_en: 'On the Way',    color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-900/20',  pulse: true },
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'];

export default function ActiveOrderBanner() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeOrder, setActiveOrder] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // Fetch active orders
    base44.entities.Order.filter({ user_email: user.email }, '-created_date', 20)
      .then(orders => {
        const active = orders.find(o => ACTIVE_STATUSES.includes(o.status));
        setActiveOrder(active || null);
      })
      .finally(() => setLoading(false));

    // Subscribe to real-time updates
    const unsub = base44.entities.Order.subscribe(event => {
      if (event.data?.user_email !== user.email) return;
      if (event.type === 'update') {
        if (ACTIVE_STATUSES.includes(event.data.status)) {
          setActiveOrder(event.data);
          setDismissed(false); // Re-show on status change
        } else {
          setActiveOrder(prev => prev?.id === event.id ? null : prev);
        }
      }
    });
    return () => unsub();
  }, [user]);

  if (loading || !activeOrder || dismissed) return null;

  const cfg = STATUS_CONFIG[activeOrder.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="mb-6"
      >
        <div
          className={`relative rounded-2xl border-2 border-strawberry/20 bg-gradient-to-r from-strawberry/5 to-pink-50 dark:from-strawberry/10 dark:to-pink-900/10 p-4 cursor-pointer shadow-sm`}
          onClick={() => navigate('/orders')}
        >
          {/* Dismiss button */}
          <button
            onClick={e => { e.stopPropagation(); setDismissed(true); }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 pr-6">
            {/* Animated icon */}
            <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 relative`}>
              <Icon className={`w-6 h-6 ${cfg.color}`} />
              {cfg.pulse && (
                <div className="absolute inset-0 rounded-xl animate-ping opacity-20" style={{ background: 'currentColor' }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-poppins font-bold text-sm text-foreground">
                  {language === 'es' ? 'Pedido en curso' : 'Order in progress'}
                </p>
                <Badge className={`text-xs ${cfg.color.replace('text-', 'bg-').replace('600', '100').replace('dark:', '')} ${cfg.color}`}>
                  {language === 'es' ? cfg.label_es : cfg.label_en}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {activeOrder.items?.length || 0} artículo(s) · ${activeOrder.total?.toFixed(2)}
                {activeOrder.tracking_code && ` · #${activeOrder.tracking_code}`}
              </p>
              {activeOrder.customer_address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {activeOrder.customer_address}
                </p>
              )}
              {activeOrder.status === 'on_the_way' && activeOrder.assigned_driver_name && (
                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5 font-medium">
                  <Navigation className="w-3 h-3" /> {activeOrder.assigned_driver_name} en camino
                </p>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-1">
            {['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'].map((s, i) => (
              <div
                key={s}
                className={`h-1 rounded-full flex-1 transition-all ${
                  ACTIVE_STATUSES.indexOf(activeOrder.status) >= i
                    ? 'bg-strawberry'
                    : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}