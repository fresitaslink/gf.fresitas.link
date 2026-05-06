import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, CheckCircle2, Loader2, Navigation, Package, Clock, User, RefreshCw, Bike, PhoneCall, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  on_the_way: 'bg-purple-100 text-purple-800',
};

const PRIORITY = { on_the_way: 0, preparing: 1, confirmed: 2 };

function CallButton({ phone }) {
  return (
    <a
      href={`tel:${phone}`}
      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
    >
      <PhoneCall className="w-3.5 h-3.5" />
      Llamar
    </a>
  );
}

function WhatsAppButton({ phone, name, trackingCode }) {
  const msg = encodeURIComponent(`Hola ${name}, soy el repartidor de Fresitas G&F 🍓. Tu pedido #${trackingCode} está en camino. ¿Me puedes confirmar tu ubicación?`);
  return (
    <a
      href={`https://wa.me/${phone?.replace(/\D/g, '')}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
    >
      <MessageSquare className="w-3.5 h-3.5" />
      WhatsApp
    </a>
  );
}

export default function DriverApp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    if (!['admin', 'owner', 'manager', 'delivery'].includes(user.role)) { navigate('/'); return; }
    loadOrders();
    startTracking();

    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' && ['confirmed', 'preparing'].includes(event.data?.status)) {
        setOrders(prev => [event.data, ...prev]);
        toast('🆕 Nuevo pedido llegó!', { duration: 5000 });
      }
      if (event.type === 'update') {
        setOrders(prev => {
          const updated = prev.map(o => o.id === event.id ? event.data : o);
          return updated.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status));
        });
      }
    });

    return () => {
      unsub();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [user]);

  const startTracking = () => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadOrders = async () => {
    setLoading(true);
    const all = await base44.entities.Order.list('-created_date', 100);
    const active = all.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status));
    active.sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));
    setOrders(active);
    setLoading(false);
  };

  const handleStartDelivery = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'on_the_way' });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'on_the_way' } : o));
    toast.success('🚗 ¡En camino!');
    base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'status_update' }).catch(() => {});
    if (order.user_email) {
      base44.entities.Notification.create({
        user_email: order.user_email,
        title_es: '🚗 Tu pedido va en camino',
        title_en: '🚗 Your order is on the way',
        message_es: `Tu pedido #${order.tracking_code} está en camino. ¡Pronto llegará!`,
        message_en: `Order #${order.tracking_code} is on the way!`,
        type: 'order_update',
        link: '/orders',
      }).catch(() => {});
    }
  };

  const handleMarkDelivered = async (order) => {
    setDelivering(d => ({ ...d, [order.id]: true }));
    try {
      await base44.entities.Order.update(order.id, { status: 'delivered' });
      if (order.user_email) {
        base44.entities.Notification.create({
          user_email: order.user_email,
          title_es: '✅ ¡Tu pedido llegó!',
          title_en: '✅ Order delivered!',
          message_es: `Pedido #${order.tracking_code} entregado. ¡Disfrútalo! 🍓`,
          message_en: `Order #${order.tracking_code} delivered. Enjoy! 🍓`,
          type: 'order_update',
          link: '/orders',
        }).catch(() => {});
        base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'status_update' }).catch(() => {});
      }
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success(`✅ Pedido #${order.tracking_code} entregado!`);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setDelivering(d => ({ ...d, [order.id]: false }));
    }
  };

  const openMaps = (order) => {
    const coords = order.delivery_lat && order.delivery_lng
      ? `${order.delivery_lat},${order.delivery_lng}`
      : encodeURIComponent(order.customer_address);
    const driverCoords = driverLocation ? `${driverLocation.lat},${driverLocation.lng}` : '';
    const url = driverCoords
      ? `https://www.google.com/maps/dir/${driverCoords}/${coords}`
      : `https://maps.google.com/?q=${coords}`;
    window.open(url, '_blank');
  };

  const onWay = orders.filter(o => o.status === 'on_the_way');
  const preparing = orders.filter(o => o.status === 'preparing');
  const confirmed = orders.filter(o => o.status === 'confirmed');

  return (
    <div className="min-h-screen pt-20 pb-16 px-3 bg-background">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Bike className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-poppins font-black text-xl">App Repartidor</h1>
              <p className="text-xs text-muted-foreground">{user?.full_name || user?.email}</p>
            </div>
          </div>
          <Button onClick={loadOrders} variant="outline" size="icon" className="rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Location status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs ${driverLocation ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700'}`}>
          <div className={`w-2 h-2 rounded-full ${driverLocation ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          {driverLocation
            ? `📍 GPS activo · ${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}`
            : locationError ? '⚠️ GPS no disponible — rutas sin coordenadas exactas' : '📡 Obteniendo ubicación...'}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'En camino', value: onWay.length, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Preparando', value: preparing.length, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Por recoger', value: confirmed.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
              <p className={`font-black text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-40" />
            <p className="font-semibold text-lg">¡Todo entregado! 🎉</p>
            <p className="text-sm mt-1">No hay pedidos activos</p>
            <Button onClick={loadOrders} variant="outline" className="mt-4 rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {orders.map((order, idx) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -120 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-card rounded-2xl border-2 overflow-hidden shadow-sm ${
                    order.status === 'on_the_way' ? 'border-purple-300 dark:border-purple-700' :
                    order.status === 'preparing' ? 'border-orange-300 dark:border-orange-700' :
                    'border-border'
                  }`}
                >
                  {/* Top bar */}
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    order.status === 'on_the_way' ? 'bg-purple-50 dark:bg-purple-900/20' :
                    order.status === 'preparing' ? 'bg-orange-50 dark:bg-orange-900/20' :
                    'bg-muted'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-strawberry text-sm">#{order.tracking_code}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
                        {order.status === 'on_the_way' ? '🚗 En Camino' : order.status === 'preparing' ? '🍳 Preparando' : '✅ Listo p/recoger'}
                      </Badge>
                    </div>
                    <span className="font-bold">${order.total?.toFixed(2)}</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Customer */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-sm">{order.customer_name}</span>
                    </div>

                    {/* Address with maps link */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-strawberry flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{order.customer_address}</p>
                        <button
                          onClick={() => openMaps(order)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                        >
                          <Navigation className="w-3 h-3" />
                          {driverLocation ? 'Ruta desde mi ubicación' : 'Abrir en Google Maps'}
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">"{order.notes}"</p>
                      </div>
                    )}

                    {/* Items summary */}
                    <div className="bg-muted rounded-xl p-2.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">{order.items?.length} producto(s)</span>
                      </div>
                      <div className="space-y-0.5">
                        {order.items?.slice(0, 3).map((item, i) => (
                          <p key={i} className="text-xs text-foreground">• {item.name} x{item.quantity}</p>
                        ))}
                        {(order.items?.length || 0) > 3 && (
                          <p className="text-xs text-muted-foreground">+{order.items.length - 3} más...</p>
                        )}
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Pago: {order.payment_method === 'efectivo' ? '💵 Efectivo' : order.payment_method === 'transferencia' ? '📱 Transferencia' : '💳 Tarjeta'}</span>
                      {order.payment_method === 'efectivo' && (
                        <span className="ml-auto font-semibold text-orange-600">¡Cobrar ${order.total?.toFixed(2)}!</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <CallButton phone={order.customer_phone} />
                      <WhatsAppButton phone={order.customer_phone} name={order.customer_name} trackingCode={order.tracking_code} />
                      <div className="flex-1" />
                      {order.status === 'preparing' || order.status === 'confirmed' ? (
                        <Button
                          onClick={() => handleStartDelivery(order)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5 text-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Salir
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkDelivered(order)}
                          disabled={delivering[order.id]}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1.5 text-xs font-bold"
                        >
                          {delivering[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Entregado
                        </Button>
                      )}
                    </div>
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