import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Volume2, VolumeX, RefreshCw, AlertOctagon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import KDSOrderCard from '@/components/kds/KDSOrderCard';

/**
 * Kitchen Display System
 * Realtime board for kitchen staff. Three columns: Pending, Preparing, Ready.
 * Sorted by scheduled-time (if set) then created_date.
 */
export default function KDS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [oosModal, setOOSModal] = useState(null); // { item }
  const [savingOOS, setSavingOOS] = useState(false);

  // Allow kitchen, manager, admin, owner roles
  const allowed = user && ['admin', 'owner', 'manager', 'kitchen'].includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!allowed) { navigate('/'); return; }

    base44.entities.Order.filter(
      { status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } },
      '-created_date',
      100
    ).then(o => {
      setOrders(o);
      setLoading(false);
    });

    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') {
        setOrders(prev => [event.data, ...prev]);
        if (soundOn) playPing();
        toast('🍓 ¡Nuevo pedido en la cocina!', { duration: 4000 });
      } else if (event.type === 'update') {
        setOrders(prev => prev.map(o => o.id === event.id ? event.data : o));
      } else if (event.type === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== event.id));
      }
    });
    return () => unsub();
  }, [user, allowed, soundOn]);

  const playPing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  const sortByPriority = (a, b) => {
    // Scheduled orders first, then oldest first
    const aSched = a.delivery_time_preference && a.delivery_time_preference !== 'asap';
    const bSched = b.delivery_time_preference && b.delivery_time_preference !== 'asap';
    if (aSched && !bSched) return -1;
    if (bSched && !aSched) return 1;
    return new Date(a.created_date) - new Date(b.created_date);
  };

  const pending = useMemo(
    () => orders.filter(o => o.status === 'pending' || o.status === 'confirmed').sort(sortByPriority),
    [orders]
  );
  const preparing = useMemo(
    () => orders.filter(o => o.status === 'preparing').sort(sortByPriority),
    [orders]
  );
  const ready = useMemo(
    () => orders.filter(o => o.status === 'ready').sort(sortByPriority),
    [orders]
  );

  const handleMarkPreparing = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'preparing' });
    toast.success(`🍳 Pedido #${order.tracking_code} en preparación`);
  };

  const handleMarkReady = async (order) => {
    // 'ready' isn't in the current Order enum (status enum: pending, confirmed, preparing, on_the_way, delivered, cancelled).
    // Move directly to on_the_way only if a driver is assigned; otherwise keep in preparing-but-flagged.
    // Best UX: move to on_the_way if driver assigned, else show "esperando driver".
    if (order.assigned_driver_email) {
      await base44.entities.Order.update(order.id, { status: 'on_the_way' });
      toast.success(`🚗 Pedido #${order.tracking_code} entregado al repartidor`);
    } else {
      // Mark as ready (custom field) so dispatch knows it's ready for pickup
      await base44.entities.Order.update(order.id, { status: 'ready' });
      toast.success(`✅ Pedido #${order.tracking_code} listo — esperando repartidor`);
    }
  };

  const handleMarkItemOOS = (item) => setOOSModal({ item });

  const confirmOOS = async () => {
    if (!oosModal?.item?.product_id) return;
    setSavingOOS(true);
    try {
      await base44.entities.Product.update(oosModal.item.product_id, { is_available: false });
      toast.success(`${oosModal.item.name} marcado como agotado en la tienda`);
      setOOSModal(null);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSavingOOS(false);
    }
  };

  if (!user) return null;
  if (!allowed) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  const Column = ({ title, accent, items, dotColor, icon: Icon, ...rest }) => (
    <div className="flex-1 min-w-[300px] max-w-md flex flex-col">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <span className={`w-3 h-3 rounded-full ${dotColor}`} />
        <h2 className="font-poppins font-bold text-base flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />} {title}
        </h2>
        <Badge className={`ml-auto ${accent}`}>{items.length}</Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-4">
        <AnimatePresence>
          {items.map(o => (
            <KDSOrderCard
              key={o.id}
              order={o}
              {...rest}
            />
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12 italic">Vacío</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 pb-4 px-4 bg-background">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="font-poppins font-black text-2xl">Kitchen Display</h1>
              <p className="text-xs text-muted-foreground">{orders.length} pedidos en cocina · Tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundOn(s => !s)}
              className="rounded-full"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline ml-1.5">{soundOn ? 'Sonido ON' : 'Sonido OFF'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-full"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">Actualizar</span>
            </Button>
          </div>
        </div>

        {/* Columns */}
        <div className="flex-1 flex gap-4 overflow-x-auto">
          <Column
            title="Por hacer"
            accent="bg-yellow-100 text-yellow-800"
            dotColor="bg-yellow-400 animate-pulse"
            items={pending}
            onMarkPreparing={handleMarkPreparing}
            onMarkItemOOS={handleMarkItemOOS}
          />
          <Column
            title="Preparando"
            accent="bg-orange-100 text-orange-800"
            dotColor="bg-orange-500"
            items={preparing}
            onMarkReady={handleMarkReady}
            onMarkItemOOS={handleMarkItemOOS}
          />
          <Column
            title="Listos para entregar"
            accent="bg-green-100 text-green-800"
            dotColor="bg-green-500"
            items={ready}
          />
        </div>
      </div>

      {/* OOS Confirm Modal */}
      <AnimatePresence>
        {oosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setOOSModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">¿Marcar como agotado?</h3>
                  <p className="text-sm text-muted-foreground">"{oosModal.item.name}"</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Este producto se ocultará inmediatamente de la tienda y los clientes no podrán pedirlo hasta que vuelvas a marcarlo disponible.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOOSModal(null)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={confirmOOS}
                  disabled={savingOOS}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
                >
                  {savingOOS ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, agotar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}