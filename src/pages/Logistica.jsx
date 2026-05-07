import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Package, CheckCircle2, Loader2, Navigation, Clock, User, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DeliveryVerificationModal from '@/components/driver/DeliveryVerificationModal';

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
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [overrideOrder, setOverrideOrder] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

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

  // Drivers/owners use the same verification flow (PIN + photo) as the driver app.
  const handleMarkDelivered = (order) => {
    setVerifyingOrder(order);
  };

  // Owner/admin override: marks delivered WITHOUT PIN/photo, but logs reason for fraud audit.
  // Reserved for emergencies (driver phone died, customer not at door, etc).
  const handleOverrideDelivered = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 10) {
      toast.error('La razón debe tener al menos 10 caracteres (es un registro de auditoría)');
      return;
    }
    setSubmittingOverride(true);
    try {
      const order = overrideOrder;
      await base44.entities.Order.update(order.id, { status: 'delivered' });
      // Audit record — non-verified delivery, who did it, why
      await base44.entities.DeliveryVerification.create({
        order_id: order.id,
        driver_email: order.assigned_driver_email || '',
        customer_email: order.user_email || '',
        verification_pin: order.verification_pin || '',
        pin_verified: false,
        verification_status: 'failed',
        delivery_condition: 'minor_issue',
        customer_notes: `OVERRIDE por ${user.email} (${user.role}): ${overrideReason.trim()}`,
      });
      if (order.user_email) {
        await base44.entities.Notification.create({
          user_email: order.user_email,
          title_es: 'Tu pedido fue marcado como entregado',
          title_en: 'Your order was marked as delivered',
          message_es: `Pedido #${order.tracking_code} cerrado por ${user.role}. Si no lo recibiste, contáctanos.`,
          message_en: `Order #${order.tracking_code} closed by ${user.role}. If you didn't receive it, contact us.`,
          type: 'order_update',
          link: '/orders',
        });
        base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'status_update' }).catch(() => {});
      }
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success(`Pedido #${order.tracking_code} cerrado por override (registrado para auditoría)`);
      setOverrideOrder(null);
      setOverrideReason('');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubmittingOverride(false);
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
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    <div className="flex gap-2">
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
                          <CheckCircle2 className="w-4 h-4" />
                          Verificar y Entregar (PIN + Foto)
                        </Button>
                      )}
                      <a
                        href={`https://wa.me/${order.customer_phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-11 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl"
                        aria-label="WhatsApp"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                    {/* Owner/admin override — only for staff, not for delivery role */}
                    {order.status === 'on_the_way' && ['admin', 'owner', 'manager'].includes(user.role) && (
                      <button
                        onClick={() => setOverrideOrder(order)}
                        className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 self-end"
                      >
                        <ShieldAlert className="w-3 h-3" /> Cerrar sin verificación (override)
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Verification Modal — same flow as driver */}
      {verifyingOrder && (
        <DeliveryVerificationModal
          order={verifyingOrder}
          onComplete={() => {
            setOrders(prev => prev.filter(o => o.id !== verifyingOrder.id));
            setVerifyingOrder(null);
            // Send post-delivery notification + email
            if (verifyingOrder.user_email) {
              base44.entities.Notification.create({
                user_email: verifyingOrder.user_email,
                title_es: '¡Tu pedido llegó!',
                title_en: 'Your order arrived!',
                message_es: `Tu pedido #${verifyingOrder.tracking_code} fue entregado. ¡Disfrútalo!`,
                message_en: `Order #${verifyingOrder.tracking_code} delivered. Enjoy!`,
                type: 'order_update',
                link: '/orders',
              }).catch(() => {});
              base44.functions.invoke('sendOrderEmail', { order_id: verifyingOrder.id, event_type: 'status_update' }).catch(() => {});
            }
          }}
        />
      )}

      {/* Override Modal — only available to admin/owner/manager */}
      <AnimatePresence>
        {overrideOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !submittingOverride && setOverrideOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-poppins font-bold">Cerrar pedido sin verificación</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acción reservada para emergencias. Se registra para auditoría con tu nombre, hora y razón.
                  </p>
                </div>
              </div>

              <div className="bg-muted rounded-xl p-3 text-xs">
                <p className="font-semibold">Pedido #{overrideOrder.tracking_code}</p>
                <p className="text-muted-foreground mt-1">{overrideOrder.customer_name} · ${overrideOrder.total?.toFixed(2)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Razón del override (mínimo 10 caracteres)</label>
                <Textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Ej: El repartidor no pudo abrir la app, el cliente confirmó por teléfono..."
                  className="rounded-xl text-sm"
                  rows={4}
                  disabled={submittingOverride}
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                Esta acción quedará registrada con tu email (<b>{user.email}</b>) y será visible para auditorías. El cliente recibirá un aviso de que el pedido se cerró sin verificación.
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setOverrideOrder(null); setOverrideReason(''); }}
                  disabled={submittingOverride}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleOverrideDelivered}
                  disabled={submittingOverride || overrideReason.trim().length < 10}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                >
                  {submittingOverride ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar override'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}