import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, CheckCircle2, Loader2, Navigation, Package,
  Clock, User, RefreshCw, Bike, PhoneCall, MessageSquare,
  AlertCircle, Zap, ChevronDown, ChevronUp, Signal, Map, Route
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DriverLiveMap from '@/components/driver/DriverLiveMap';
import OptimizedRouteOverlay from '@/components/driver/OptimizedRouteOverlay';
import RealtimeChatWidget from '@/components/orders/RealtimeChatWidget';
import DeliveryVerificationModal from '@/components/driver/DeliveryVerificationModal';

const STATUS_COLORS = {
  confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  preparing:  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  on_the_way: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const PRIORITY = { on_the_way: 0, preparing: 1, confirmed: 2 };

function OrderCard({ order, driverLocation, onStartDelivery, onMarkDelivered, delivering, onChat }) {
  const [expanded, setExpanded] = useState(order.status === 'on_the_way');

  const openGoogleMaps = () => {
    const dest = order.delivery_lat && order.delivery_lng
      ? `${order.delivery_lat},${order.delivery_lng}`
      : encodeURIComponent(order.customer_address);
    const origin = driverLocation ? `${driverLocation.lat},${driverLocation.lng}` : '';
    const url = origin
      ? `https://www.google.com/maps/dir/${origin}/${dest}`
      : `https://maps.google.com/?q=${dest}`;
    window.open(url, '_blank');
  };

  const callUrl = `tel:${order.customer_phone}`;
  const waMsg = encodeURIComponent(`Hola ${order.customer_name} 👋, soy el repartidor de Fresitas G&F 🍓. Tu pedido #${order.tracking_code} está en camino. ¡Llego pronto!`);
  const waUrl = `https://wa.me/${(order.customer_phone || '').replace(/\D/g, '')}?text=${waMsg}`;

  const borderColor =
    order.status === 'on_the_way' ? 'border-purple-400 dark:border-purple-600' :
    order.status === 'preparing'  ? 'border-orange-400 dark:border-orange-600' :
                                     'border-blue-300 dark:border-blue-700';
  const headerBg =
    order.status === 'on_the_way' ? 'bg-purple-50 dark:bg-purple-900/25' :
    order.status === 'preparing'  ? 'bg-orange-50 dark:bg-orange-900/25' :
                                     'bg-blue-50 dark:bg-blue-900/20';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -120, scale: 0.9 }}
      className={`bg-card rounded-2xl border-2 overflow-hidden shadow-md ${borderColor}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${headerBg} text-left`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-black text-strawberry text-sm">#{order.tracking_code}</span>
          <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
            {order.status === 'on_the_way' ? '🚗 En Camino' :
             order.status === 'preparing'  ? '🍳 Preparando' : '✅ Listo'}
          </Badge>
          {order.payment_method === 'efectivo' && (
            <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              💵 Cobrar
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm">${order.total?.toFixed(2)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{order.customer_name}</span>
          <span className="mx-1">·</span>
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-strawberry" />
          <span className="truncate">{order.customer_address}</span>
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* Customer */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm">{order.customer_name}</span>
                {order.customer_phone && (
                  <span className="text-xs text-muted-foreground ml-auto">{order.customer_phone}</span>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-strawberry flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{order.customer_address}</p>
                  <button
                    onClick={openGoogleMaps}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                  >
                    <Navigation className="w-3 h-3" />
                    {driverLocation ? 'Ruta desde mi ubicación →' : 'Abrir en Google Maps →'}
                  </button>
                </div>
              </div>

              {/* Embedded map if coords available - using full react-leaflet */}
              {order.delivery_lat && order.delivery_lng && (
                <div className="rounded-xl overflow-hidden border border-border mt-2" style={{ height: 160 }}>
                  <iframe
                    title={`Mapa ${order.customer_name}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.delivery_lng-0.005}%2C${order.delivery_lat-0.005}%2C${order.delivery_lng+0.005}%2C${order.delivery_lat+0.005}&layer=mapnik&marker=${order.delivery_lat}%2C${order.delivery_lng}`}
                    width="100%" height="160" style={{ border: 0 }} loading="lazy"
                  />
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 italic">"{order.notes}"</p>
                </div>
              )}

              {/* Items */}
              <div className="bg-muted rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">{order.items?.length || 0} producto(s)</span>
                </div>
                <div className="space-y-0.5">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>• {item.name}</span>
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${
                order.payment_method === 'efectivo'
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 font-semibold'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>Pago: {order.payment_method === 'efectivo' ? '💵 Efectivo' : order.payment_method === 'transferencia' ? '📱 Transferencia' : '💳 Tarjeta'}</span>
                {order.payment_method === 'efectivo' && (
                  <span className="ml-auto font-black">¡Cobrar ${order.total?.toFixed(2)}!</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={callUrl}
                  className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  <PhoneCall className="w-4 h-4" /> Llamar
                </a>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </a>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => onChat(order.id)}
                  className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5 text-xs"
                >
                  💬 Chat
                </Button>

                <Button
                  onClick={openGoogleMaps}
                  variant="outline"
                  className="flex-1 rounded-xl gap-1.5 text-xs"
                >
                  <Navigation className="w-3.5 h-3.5" /> Navegar
                </Button>

                {(order.status === 'preparing' || order.status === 'confirmed') ? (
                  <Button
                    onClick={() => onStartDelivery(order)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5 text-sm font-bold"
                  >
                    <Zap className="w-4 h-4" /> Salir a entregar
                  </Button>
                ) : (
                  <Button
                    onClick={() => onMarkDelivered(order)}
                    disabled={delivering[order.id]}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1.5 text-sm font-bold"
                  >
                    {delivering[order.id]
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                    ¡Entregado!
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const watchRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    // Only delivery role can access driver app
    if (user.role !== 'delivery' && !['admin', 'owner', 'manager'].includes(user.role)) { 
      toast.error('Solo repartidores pueden acceder aquí');
      navigate('/'); 
      return; 
    }

    loadOrders();
    startTracking();

    // Real-time subscription
    const unsub = base44.entities.Order.subscribe((event) => {
      setLastUpdate(new Date());
      if (event.type === 'create') {
        const d = event.data;
        if (d && ['confirmed', 'preparing', 'on_the_way'].includes(d.status)) {
          setOrders(prev => {
            if (prev.find(o => o.id === d.id)) return prev;
            toast('🆕 ¡Nuevo pedido!', { description: `#${d.tracking_code} — ${d.customer_name}`, duration: 6000 });
            return [d, ...prev].sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));
          });
        }
      }
      if (event.type === 'update' && event.data) {
        const d = event.data;
        setOrders(prev => {
          const updated = prev.map(o => o.id === d.id ? d : o)
            .filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status));
          return updated.sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));
        });
      }
      if (event.type === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== event.id));
      }
    });

    return () => {
      unsub();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [user]);

  const startTracking = () => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const loadOrders = async () => {
    setLoading(true);
    const all = await base44.entities.Order.list('-created_date', 200);
    const active = all
      .filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status))
      .sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));
    setOrders(active);
    setLastUpdate(new Date());
    setLoading(false);
  };

  const handleStartDelivery = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'on_the_way' });
    setOrders(prev =>
      prev.map(o => o.id === order.id ? { ...o, status: 'on_the_way' } : o)
        .sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9))
    );
    toast.success('🚗 ¡Saliste a entregar!');
    if (order.user_email) {
      Promise.all([
        base44.entities.Notification.create({
          user_email: order.user_email,
          title_es: '🚗 Tu pedido va en camino',
          title_en: '🚗 Your order is on the way',
          message_es: `Tu pedido #${order.tracking_code} está en camino. ¡Llega pronto! 🍓`,
          message_en: `Order #${order.tracking_code} is on the way!`,
          type: 'order_update', link: '/orders',
        }),
        base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'status_update' }),
      ]).catch(() => {});
    }
  };

  const handleMarkDelivered = async (order) => {
    // Open verification modal instead of directly marking delivered
    setVerifyingOrder(order);
  };

  const onWay     = orders.filter(o => o.status === 'on_the_way');
  const prep      = orders.filter(o => o.status === 'preparing');
  const confirmed = orders.filter(o => o.status === 'confirmed');
  const [showMap, setShowMap] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);
  const [verifyingOrder, setVerifyingOrder] = useState(null);

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      const result = await base44.functions.invoke('optimizeDeliveryRoutes', {
        order_ids: orders.map(o => o.id)
      });
      if (result.data?.optimized_routes?.[0]) {
        setOptimizedRoute(result.data.optimized_routes[0]);
        toast.success('✨ Ruta optimizada', {
          description: `${result.data.optimized_routes[0].sequence} pedidos · ${result.data.optimized_routes[0].total_distance_km} km`
        });
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  if (!user || !['admin', 'owner', 'manager', 'delivery'].includes(user.role)) return null;

  return (
    <div className="min-h-screen pt-14 pb-20 bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bike className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-poppins font-black text-base leading-tight">App Repartidor</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user?.full_name || user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* GPS status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              driverLocation
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700'
            }`}>
              <Signal className={`w-3 h-3 ${driverLocation ? 'text-green-500' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">{driverLocation ? 'GPS' : locationError ? 'Sin GPS' : '...'}</span>
            </div>
            <Button
              onClick={handleOptimizeRoute}
              disabled={optimizing || orders.length === 0}
              variant={optimizedRoute ? 'default' : 'outline'}
              size="icon"
              className={`rounded-xl h-8 w-8 ${optimizedRoute ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}
              title="Optimizar Ruta"
            >
              {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
            </Button>
            <Button
              onClick={() => setShowMap(v => !v)}
              variant={showMap ? 'default' : 'outline'}
              size="icon"
              className={`rounded-xl h-8 w-8 ${showMap ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}`}
              title="Mapa General"
            >
              <Map className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={loadOrders} variant="outline" size="icon" className="rounded-xl h-8 w-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="max-w-lg mx-auto mt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'En camino', value: onWay.length, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { label: 'Preparando', value: prep.length, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
            { label: 'Listos',     value: confirmed.length, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl py-2 text-center`}>
              <p className={`font-black text-xl leading-none ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live indicator */}
      <div className="max-w-lg mx-auto px-4 mt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <span>En vivo · Actualizado {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      {/* Live Map Overview */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-lg mx-auto px-4 mt-3 overflow-hidden"
          >
            <div className="bg-card rounded-2xl border border-border p-3 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-sm">Mapa General — {orders.length} pedidos activos</h3>
                {driverLocation && (
                  <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Tu pos.
                  </span>
                )}
              </div>
              <DriverLiveMap orders={orders} driverLocation={driverLocation} />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                🚗 Tu posición &nbsp;·&nbsp; 📦 Pedidos activos (toca para ver detalles)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimized Route Overlay */}
      <div className="max-w-lg mx-auto px-4 mt-3">
        <OptimizedRouteOverlay route={optimizedRoute} onClose={() => setOptimizedRoute(null)} driverLocation={driverLocation} />
      </div>

      {/* Orders list - show in optimized sequence if available */}
      <div className="max-w-lg mx-auto px-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-strawberry" />
            <p className="text-sm text-muted-foreground">Cargando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-40" />
            <p className="font-semibold text-lg">¡Todo entregado! 🎉</p>
            <p className="text-sm mt-1">No hay pedidos activos en este momento</p>
            <Button onClick={loadOrders} variant="outline" className="mt-4 rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {(optimizedRoute?.orders?.map(o => o.id) || orders.map(o => o.id)).map(orderId => {
              const order = orders.find(o => o.id === orderId);
              return order ? (
                <OrderCard
                   key={order.id}
                   order={order}
                   driverLocation={driverLocation}
                   onStartDelivery={handleStartDelivery}
                   onMarkDelivered={handleMarkDelivered}
                   delivering={delivering}
                   onChat={setChatOrder}
                 />
              ) : null;
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Real-time chat widget */}
       {chatOrder && (
         <RealtimeChatWidget 
           order={orders.find(o => o.id === chatOrder)}
           driver={user}
           onClose={() => setChatOrder(null)}
         />
       )}

       {/* Delivery Verification Modal */}
       {verifyingOrder && (
         <DeliveryVerificationModal
           order={verifyingOrder}
           onComplete={() => {
             setOrders(prev => prev.filter(o => o.id !== verifyingOrder.id));
             setVerifyingOrder(null);
           }}
         />
       )}
      </div>
      );
      }