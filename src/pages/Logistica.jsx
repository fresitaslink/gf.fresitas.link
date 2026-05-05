import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Package, CheckCircle2, Loader2, Navigation, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_LABELS = { preparing: '🍳 En Preparación', on_the_way: '🚗 En Camino', delivered: '✅ Entregado' };
const STATUS_COLORS = {
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
};

export default function Logistica() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState({});

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    // Allow admin, owner, manager, or delivery role
    if (!['admin', 'owner', 'manager', 'delivery'].includes(user.role)) {
      navigate('/');
      return;
    }
    loadOrders();
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') setOrders(prev => [event.data, ...prev]);
      if (event.type === 'update') setOrders(prev => prev.map(o => o.id === event.id ? event.data : o));
    });
    return () => unsub();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    const all = await base44.entities.Order.list('-created_date', 100);
    const active = all.filter(o => ['preparing', 'on_the_way'].includes(o.status));
    setOrders(active);
    setLoading(false);
  };

  const handleMarkDelivered = async (order) => {
    setDelivering(d => ({ ...d, [order.id]: true }));
    try {
      // Mark as delivered
      await base44.entities.Order.update(order.id, { status: 'delivered' });

      // Trigger loyalty flow for customer
      if (order.user_email) {
        const profiles = await base44.entities.CustomerProfile.filter({ user_email: order.user_email });
        const profile = profiles[0];
        const pointsEarned = order.loyalty_points_earned || Math.floor(order.total || 0);
        if (profile) {
          await base44.entities.CustomerProfile.update(profile.id, {
            loyalty_points: (profile.loyalty_points || 0) + pointsEarned,
            total_orders: (profile.total_orders || 0) + 1,
          });
        }
        // Create loyalty transaction
        await base44.entities.LoyaltyTransaction.create({
          user_email: order.user_email,
          points: pointsEarned,
          type: 'earned',
          description: `Pedido entregado #${order.tracking_code}`,
          order_id: order.id,
        });
        // Send final notification to customer
        await base44.entities.Notification.create({
          user_email: order.user_email,
          title_es: '¡Tu pedido llegó! 🍓',
          title_en: 'Your order arrived! 🍓',
          message_es: `Tu pedido #${order.tracking_code} fue entregado. ¡Ganaste ${pointsEarned} puntos de lealtad! ⭐`,
          message_en: `Order #${order.tracking_code} delivered. You earned ${pointsEarned} loyalty points! ⭐`,
          type: 'order_update',
          link: '/orders',
        });
        // Email notification
        base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'status_update' }).catch(() => {});
      }

      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success(`✅ Pedido #${order.tracking_code} marcado como entregado. Puntos enviados al cliente.`);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setDelivering(d => ({ ...d, [order.id]: false }));
    }
  };

  const handleStartDelivery = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'on_the_way' });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'on_the_way' } : o));
    toast.success('🚗 En camino activado');
    base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'status_update' }).catch(() => {});
  };

  if (!user || !['admin', 'owner', 'manager', 'delivery'].includes(user.role)) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <div className="py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Navigation className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-poppins font-black text-2xl">Logística</h1>
              <p className="text-muted-foreground text-sm">Pedidos activos para entrega</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Badge className="bg-orange-100 text-orange-700 text-xs">{orders.filter(o => o.status === 'preparing').length} En Preparación</Badge>
            <Badge className="bg-purple-100 text-purple-700 text-xs">{orders.filter(o => o.status === 'on_the_way').length} En Camino</Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
            <p className="font-semibold text-lg">¡Todo entregado!</p>
            <p className="text-sm">No hay pedidos activos en este momento</p>
            <Button onClick={loadOrders} variant="outline" className="mt-4 rounded-xl gap-2">
              <Loader2 className="w-4 h-4" /> Actualizar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {orders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-strawberry text-sm">#{order.tracking_code}</span>
                      <Badge className={`text-xs border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <span className="font-bold text-lg">${order.total?.toFixed(2)}</span>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">{order.customer_phone}</a>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p>{order.customer_address}</p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(order.customer_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Navigation className="w-3 h-3" /> Abrir en Google Maps
                        </a>
                      </div>
                    </div>
                    {order.notes && (
                      <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2">
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-800 dark:text-amber-300 italic">"{order.notes}"</p>
                      </div>
                    )}

                    {/* Items */}
                    <div className="bg-muted rounded-xl p-3 mt-1">
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Contenido del pedido:</p>
                      {order.items?.map((item, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {item.name} x{item.quantity}</p>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    {order.status === 'preparing' && (
                      <Button
                        onClick={() => handleStartDelivery(order)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2"
                      >
                        <Navigation className="w-4 h-4" /> Salir a Entregar
                      </Button>
                    )}
                    {order.status === 'on_the_way' && (
                      <Button
                        onClick={() => handleMarkDelivered(order)}
                        disabled={delivering[order.id]}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2 font-bold"
                      >
                        {delivering[order.id]
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle2 className="w-4 h-4" />
                        }
                        Marcar como Entregado
                      </Button>
                    )}
                    <a
                      href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-11 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg"
                    >
                      💬
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}