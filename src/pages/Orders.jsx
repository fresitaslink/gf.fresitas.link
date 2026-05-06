import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RotateCcw, Star, MessageCircle, Package, Clock, CheckCircle, ChefHat, Truck, Home, XCircle, MapPin, Phone, ShoppingBag, CalendarClock, Receipt, AlertCircle, TrendingUp } from 'lucide-react';
import OrderReceipt from '@/components/orders/OrderReceipt';
import LiveDeliveryTracker from '@/components/orders/LiveDeliveryTracker';
import EnhancedOrderTracking from '@/components/orders/EnhancedOrderTracking';
import DeliveryChat from '@/components/orders/DeliveryChat';
import CustomerReviewSection from '@/components/orders/CustomerReviewSection';
import DriverRatingComponent from '@/components/orders/DriverRatingComponent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { showPushNotification } from '@/components/ui/PushNotificationButton';

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  preparing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  on_the_way: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_SVG_ICONS = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: ChefHat,
  on_the_way: Truck,
  delivered: Home,
  cancelled: XCircle,
};

function OrderTracker({ status }) {
  const { t } = useLanguage();
  const currentIndex = STATUS_STEPS.indexOf(status);
  if (status === 'cancelled') return null;

  return (
    <div className="flex items-center gap-1 my-4">
      {STATUS_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
              i <= currentIndex ? 'bg-strawberry text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {i <= currentIndex ? '✓' : i + 1}
            </div>
            <span className="text-xs mt-1 text-muted-foreground text-center hidden sm:block" style={{ maxWidth: '60px' }}>
              {t.orderStatus[s]}
            </span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 transition-all ${i < currentIndex ? 'bg-strawberry' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Orders() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [chatOpen, setChatOpen] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    base44.entities.Order.filter({ user_email: user.email }, '-created_date')
      .then(setOrders)
      .finally(() => setLoading(false));

    // Real-time order status notifications
    const unsubscribeOrders = base44.entities.Order.subscribe((event) => {
      if (event.type === 'update' && event.data?.user_email === user.email) {
        setOrders(prev => prev.map(o => o.id === event.id ? event.data : o));
        const statusMsg = { confirmed: 'Confirmado', preparing: 'En preparación', on_the_way: '¡En camino!', delivered: '¡Entregado!' };
        const msg = statusMsg[event.data?.status];
        if (msg) {
          toast.success(`Pedido ${msg}`, { duration: 5000 });
          showPushNotification('Fresitas G&F', `Tu pedido está: ${msg}`, '/orders');
        }
      }
    });
    return () => unsubscribeOrders();
  }, [user]);

  const handleReorder = async (order) => {
    if (!order.items?.length) return;
    for (const item of order.items) {
      addItem({
        product_id: item.product_id,
        name_es: item.name,
        name_en: item.name,
        image_url: item.image_url,
        price: item.price / (item.quantity || 1),
        quantity: item.quantity,
      });
    }
    toast.success(language === 'es' ? '¡Items agregados al carrito!' : 'Items added to cart!');
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-3xl mx-auto py-8 space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (orders.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="font-poppins font-bold text-2xl text-foreground mb-2">{t.noOrders}</h2>
          <p className="text-muted-foreground mb-8">{t.noOrdersDesc}</p>
          <Button onClick={() => navigate('/menu')} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full px-8">
            {t.goToMenu}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      {receiptOrder && <OrderReceipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
      {chatOpen && (
        <DeliveryChat 
          order={orders.find(o => o.id === chatOpen)}
          driver={{}}
          isOpen={!!chatOpen}
          onClose={() => setChatOpen(null)}
        />
      )}
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-poppins font-bold text-3xl text-foreground py-8">{t.myOrders}</h1>

          <div className="space-y-4">
            {orders.map(order => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  {(() => { const Icon = STATUS_SVG_ICONS[order.status] || Package; return <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-strawberry" /></div>; })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-poppins font-semibold text-sm">#{order.tracking_code}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
                        {t.orderStatus[order.status] || order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.items?.length} {language === 'es' ? 'artículo(s)' : 'item(s)'} · ${order.total?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-muted-foreground">
                    {expanded === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {expanded === order.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                        {/* Tracker */}
                         <OrderTracker status={order.status} />

                         {/* Enhanced tracking with driver info, PIN verification, and live map */}
                          {['confirmed', 'preparing', 'on_the_way', 'delivered'].includes(order.status) && (
                            <EnhancedOrderTracking order={order} />
                          )}

                         {/* Driver Rating */}
                         {order.status === 'delivered' && (
                           <DriverRatingComponent 
                             order={order}
                             onRatingSubmit={() => {
                               // Refresh order to check if rating was already submitted
                               base44.entities.Order.get(order.id).then(updated => {
                                 setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
                               });
                             }}
                           />
                         )}

                         {/* Review Section */}
                         {['delivered', 'confirmed', 'preparing', 'on_the_way'].includes(order.status) && (
                           <CustomerReviewSection orderId={order.id} orderStatus={order.status} />
                         )}

                         {/* Items */}
                        <div className="space-y-2">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-cream overflow-hidden flex-shrink-0">
                                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-strawberry" /></div>}
                              </div>
                              <div className="flex-1 text-sm">
                                <p className="font-medium">{item.name}</p>
                                {item.size && <p className="text-xs text-muted-foreground">{item.size}</p>}
                              </div>
                              <p className="text-sm font-semibold">x{item.quantity}</p>
                              <p className="text-sm font-semibold text-strawberry">${item.price?.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Delivery info */}
                        <div className="bg-muted rounded-xl p-3 text-sm space-y-1.5">
                          <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />{order.customer_address}</p>
                          <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />{order.customer_phone}</p>
                          {order.notes && <p className="flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />{order.notes}</p>}
                          {order.delivery_time_preference && order.delivery_time_preference !== 'asap' && (
                            <p className="flex items-center gap-2"><CalendarClock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /><span className="text-xs">{language === 'es' ? 'Entrega programada:' : 'Scheduled:'} {order.delivery_time_preference}</span></p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs border-strawberry text-strawberry"
                            onClick={() => handleReorder(order)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> {t.reorder}
                          </Button>
                          {order.status === 'delivered' && !order.rating && (
                            <Button
                              size="sm"
                              className="rounded-full text-xs bg-amber-500 hover:bg-amber-600 text-white"
                              onClick={() => navigate('/reviews', { state: { order } })}
                            >
                              <Star className="w-3 h-3 mr-1" /> {t.leaveReview}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="rounded-full text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setReceiptOrder(order)}
                          >
                            <Receipt className="w-3 h-3 mr-1" /> Recibo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            onClick={() => navigate('/chat')}
                          >
                            <MessageCircle className="w-3 h-3 mr-1" /> {t.contactSupport}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}