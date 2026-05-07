import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChefHat, CheckCircle2, AlertOctagon, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Calculates how long order has been waiting (mins since created)
 * Returns elapsed minutes + urgency level
 */
function useElapsedMinutes(createdAt) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    }, 30000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

const URGENCY = {
  calm: 'border-green-300 bg-green-50 dark:bg-green-900/10',
  warning: 'border-amber-400 bg-amber-50 dark:bg-amber-900/10',
  critical: 'border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse',
};

export default function KDSOrderCard({ order, onMarkPreparing, onMarkReady, onMarkItemOOS }) {
  const elapsed = useElapsedMinutes(order.created_date);
  const urgency = elapsed >= 20 ? 'critical' : elapsed >= 10 ? 'warning' : 'calm';
  const isPending = order.status === 'pending' || order.status === 'confirmed';
  const isPreparing = order.status === 'preparing';

  const scheduled = order.delivery_time_preference && order.delivery_time_preference !== 'asap';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border-2 ${URGENCY[urgency]} p-4 shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono font-black text-strawberry text-lg">#{order.tracking_code || order.id?.slice(-6)}</p>
          <p className="text-xs text-muted-foreground font-medium">{order.customer_name}</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
            urgency === 'critical' ? 'bg-red-500 text-white' :
            urgency === 'warning' ? 'bg-amber-400 text-amber-900' :
            'bg-green-500 text-white'
          }`}>
            <Clock className="w-3 h-3" /> {elapsed} min
          </div>
          {scheduled && (
            <p className="text-xs text-purple-600 font-semibold mt-1">⏰ {order.delivery_time_preference}</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5 mb-3 bg-card rounded-xl p-3 border border-border">
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center justify-center bg-strawberry text-white rounded-full w-5 h-5 text-xs font-bold mr-2">{item.quantity}</span>
              <span className="font-semibold">{item.name}</span>
              {item.size && <span className="text-xs text-muted-foreground"> ({item.size})</span>}
              {item.toppings?.length > 0 && (
                <p className="text-xs text-muted-foreground ml-7 mt-0.5">+ {item.toppings.join(', ')}</p>
              )}
            </div>
            {onMarkItemOOS && item.product_id && (
              <button
                onClick={() => onMarkItemOOS(item)}
                title="Marcar producto como agotado"
                className="text-red-500 hover:bg-red-50 rounded-lg p-1 transition-colors flex-shrink-0"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg px-3 py-2 mb-3 text-xs italic">
          💬 "{order.notes}"
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer_phone}</span>
        {order.customer_address && (
          <span className="inline-flex items-center gap-1 truncate max-w-[140px]"><MapPin className="w-3 h-3" />{order.customer_address}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isPending && (
          <Button
            onClick={() => onMarkPreparing(order)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-2"
          >
            <ChefHat className="w-4 h-4" /> Empezar a preparar
          </Button>
        )}
        {isPreparing && (
          <Button
            onClick={() => onMarkReady(order)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Listo para entregar
          </Button>
        )}
      </div>
    </motion.div>
  );
}