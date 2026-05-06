import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function AutoDispatchPanel({ orders = [], drivers = [] }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(new Set());

  useEffect(() => {
    setPending(orders.filter(o => o.status === 'pending' || o.status === 'confirmed'));
  }, [orders]);

  const assignOrder = async (orderId) => {
    setDispatching(prev => new Set([...prev, orderId]));
    try {
      // Find closest available driver
      const closestDriver = drivers.filter(d => d.is_available && d.is_active)[0];
      
      if (!closestDriver) {
        toast.error('No drivers available');
        return;
      }

      await base44.functions.invoke('assignOrderToDriver', {
        orderId,
        driverId: closestDriver.id
      });

      toast.success(`✅ Asignado a ${closestDriver.full_name}`);
      setPending(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      toast.error('Error assigning order');
      console.error(err);
    } finally {
      setDispatching(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">Despacho Automático</h3>
        <Badge className="ml-auto">{pending.length} pendientes</Badge>
      </div>

      {pending.length === 0 ? (
        <div className="bg-muted rounded-xl p-8 text-center text-muted-foreground">
          ✅ Todas las órdenes asignadas
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map(order => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm">{order.customer_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {order.customer_address?.substring(0, 40)}...
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => assignOrder(order.id)}
                disabled={dispatching.has(order.id)}
                className="bg-strawberry hover:bg-strawberry/90"
              >
                {dispatching.has(order.id) ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" /> Asignando...
                  </>
                ) : (
                  '🎯 Asignar'
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}