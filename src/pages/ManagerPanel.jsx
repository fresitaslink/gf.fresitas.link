import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Package, MessageCircle, Star, BarChart2, Tag, Loader2, Phone, Mail, ShoppingBag, TrendingUp, DollarSign, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminAnalytics from './AdminAnalytics';
import ChatBubble from '@/components/chat/ChatBubble';
import AvatarUpload from '@/components/chat/AvatarUpload';

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];
const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando', on_the_way: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  on_the_way: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ManagerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [perms, setPerms] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatReplies, setChatReplies] = useState({});
  const [replyTexts, setReplyTexts] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'manager') { navigate('/'); return; }
    loadAll();
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') setOrders(prev => [event.data, ...prev]);
      if (event.type === 'update') setOrders(prev => prev.map(o => o.id === event.id ? event.data : o));
    });
    return () => unsubscribe();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const permsList = await base44.entities.ManagerPermissions.filter({ user_email: user.email, is_active: true });
    const p = permsList[0] || {};
    setPerms(p);

    const loads = [];
    if (p.can_manage_orders !== false) loads.push(base44.entities.Order.list('-created_date', 100));
    else loads.push(Promise.resolve([]));
    if (p.can_manage_products) loads.push(base44.entities.Product.list());
    else loads.push(Promise.resolve([]));
    if (p.can_reply_reviews) loads.push(base44.entities.Review.list('-created_date', 50));
    else loads.push(Promise.resolve([]));
    if (p.can_chat_customers) loads.push(base44.entities.ChatMessage.list('-created_date', 100));
    else loads.push(Promise.resolve([]));
    if (p.can_manage_promos) loads.push(base44.entities.PromoCode.list());
    else loads.push(Promise.resolve([]));

    const [ord, prods, revs, chats, promos] = await Promise.all(loads);
    setOrders(ord);
    setProducts(prods);
    setReviews(revs);
    setChatMessages(chats);
    setPromoCodes(promos);

    setLoading(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    await base44.entities.Order.update(orderId, { status: newStatus });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`Pedido → ${STATUS_LABELS[newStatus]}`);
    base44.functions.invoke('sendOrderEmail', { order_id: orderId, event_type: 'status_update' }).catch(() => {});
  };

  const handleSendChatReply = async (userEmail) => {
    const msg = chatReplies[userEmail];
    if (!msg?.trim()) return;
    const created = await base44.entities.ChatMessage.create({
      user_email: userEmail,
      message: msg,
      is_admin: true,
      sender_name: user.full_name || user.email,
      sender_role: user.role,
    });
    setChatMessages(prev => [...prev, created]);
    setChatReplies(prev => ({ ...prev, [userEmail]: '' }));
  };

  const handleReplyReview = async (review) => {
    const reply = replyTexts[review.id];
    if (!reply?.trim()) return;
    await base44.entities.Review.update(review.id, { reply, reply_date: new Date().toISOString() });
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, reply } : r));
    setReplyTexts(prev => ({ ...prev, [review.id]: '' }));
    toast.success('Respuesta enviada');
  };

  const exportCSV = (rows, filename) => {
    if (!rows.length) { toast.error('Sin datos'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  if (loading) {
    return <div className="min-h-screen pt-20 px-4"><div className="max-w-7xl mx-auto py-8 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;
  }

  if (!perms) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-poppins font-bold text-2xl mb-2">Acceso Pendiente</h2>
          <p className="text-muted-foreground">Tu cuenta de Manager aún no tiene permisos asignados. Contacta al Owner.</p>
        </div>
      </div>
    );
  }

  const todayOrders = orders.filter(o => new Date(o.created_date).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const conversations = [...new Set(chatMessages.filter(m => !m.is_admin).map(m => m.user_email))];

  // Build visible tabs based on permissions
  const tabs = [];
  if (perms.can_manage_orders !== false) tabs.push({ value: 'orders', label: 'Pedidos', icon: Package });
  if (perms.can_manage_products) tabs.push({ value: 'products', label: 'Productos', icon: ShoppingBag });
  if (perms.can_chat_customers) tabs.push({ value: 'chat', label: 'Chat', icon: MessageCircle });
  if (perms.can_reply_reviews) tabs.push({ value: 'reviews', label: 'Reseñas', icon: Star });
  if (perms.can_view_analytics) tabs.push({ value: 'analytics', label: 'Analytics', icon: BarChart2 });
  if (perms.can_manage_promos) tabs.push({ value: 'promos', label: 'Cupones', icon: Tag });
  if (perms.can_export_data) tabs.push({ value: 'export', label: 'Exportar', icon: Download });

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between py-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-6 h-6 text-purple-500" />
                <h1 className="font-poppins font-bold text-3xl">Manager Panel</h1>
              </div>
              <p className="text-muted-foreground text-sm">Bienvenido, {user?.full_name || user?.email}</p>
            </div>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 px-3 py-1">
              <Shield className="w-3 h-3 mr-1" /> MANAGER
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-3">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div className="font-poppins font-bold text-2xl text-blue-600">{todayOrders.length}</div>
              <p className="text-xs text-muted-foreground">Pedidos Hoy</p>
            </div>
            {perms.can_view_analytics && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <div className="w-9 h-9 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-3">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="font-poppins font-bold text-2xl text-green-600">${todayRevenue.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Ingresos Hoy</p>
              </div>
            )}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="w-9 h-9 bg-strawberry/10 rounded-xl flex items-center justify-center mb-3">
                <Package className="w-4 h-4 text-strawberry" />
              </div>
              <div className="font-poppins font-bold text-2xl text-strawberry">{orders.filter(o => ['pending','confirmed','preparing','on_the_way'].includes(o.status)).length}</div>
              <p className="text-xs text-muted-foreground">Activos Ahora</p>
            </div>
          </div>

          {tabs.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tienes permisos habilitados. Solicita acceso al Owner.</p>
            </div>
          ) : (
            <Tabs defaultValue={tabs[0]?.value}>
              <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg text-xs flex items-center gap-1">
                    <tab.icon className="w-3 h-3" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ORDERS */}
              <TabsContent value="orders">
                <div className="space-y-3">
                  {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
                    <div key={order.id} className="bg-card rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-sm text-strawberry">#{order.tracking_code}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</Badge>
                          </div>
                          <p className="font-semibold text-sm">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {order.customer_phone}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_address}</p>
                          {order.notes && <p className="text-xs italic text-muted-foreground">"{order.notes}"</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-strawberry">${order.total?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{order.items?.length} items</p>
                          <p className="text-xs text-muted-foreground">{order.payment_method}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {STATUS_ORDER.indexOf(order.status) < STATUS_ORDER.length - 1 && (
                          <Button size="sm" className="text-xs h-7 bg-strawberry text-white hover:bg-strawberry/90 rounded-full"
                            onClick={() => handleUpdateStatus(order.id, STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1])}>
                            → {STATUS_LABELS[STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1]]}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 text-red-600 rounded-full"
                          onClick={() => handleUpdateStatus(order.id, 'cancelled')}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">No hay pedidos activos</div>
                  )}
                </div>
              </TabsContent>

              {/* PRODUCTS */}
              <TabsContent value="products">
                <div className="space-y-3">
                  {products.map(product => (
                    <div key={product.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-cream overflow-hidden flex-shrink-0">
                        {product.image_url ? <img src={product.image_url} alt={product.name_es} className="w-full h-full object-cover" /> : <ShoppingBag className="w-4 h-4 m-auto text-strawberry mt-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{product.name_es}</p>
                        <p className="text-xs text-muted-foreground">${product.price} · {product.category}</p>
                      </div>
                      <Switch
                        checked={product.is_available !== false}
                        onCheckedChange={async () => {
                          await base44.entities.Product.update(product.id, { is_available: !product.is_available });
                          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* CHAT */}
              <TabsContent value="chat">
                <div className="space-y-6">
                  {conversations.map(email => {
                    const msgs = chatMessages.filter(m => m.user_email === email).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                    const lastCustomer = msgs.find(m => !m.is_admin && !m.is_willfy);
                    return (
                      <div key={email} className="bg-card rounded-2xl border border-border overflow-hidden">
                        {/* Conversation header with customer info */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-strawberry/20 to-pink-200 flex items-center justify-center flex-shrink-0">
                            {lastCustomer?.sender_avatar
                              ? <img src={lastCustomer.sender_avatar} alt={email} className="w-full h-full rounded-full object-cover" />
                              : <span className="text-sm font-bold text-strawberry">{(lastCustomer?.sender_name || email)[0].toUpperCase()}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{lastCustomer?.sender_name || email}</p>
                            <p className="text-xs text-muted-foreground truncate">{email}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{msgs.length} msgs</span>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto p-4">
                          {msgs.map(msg => (
                            <ChatBubble
                              key={msg.id}
                              msg={msg}
                              isOwn={msg.is_admin && !msg.is_willfy}
                              viewerRole={user.role}
                              compact={false}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 px-4 py-3 border-t border-border">
                          <Input
                            placeholder="Responder como equipo Fresitas…"
                            value={chatReplies[email] || ''}
                            onChange={e => setChatReplies(prev => ({ ...prev, [email]: e.target.value }))}
                            className="rounded-xl text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleSendChatReply(email)}
                          />
                          <Button size="sm" className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl" onClick={() => handleSendChatReply(email)}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {conversations.length === 0 && <p className="text-center text-muted-foreground py-8">No hay mensajes</p>}
                </div>
              </TabsContent>

              {/* REVIEWS */}
              <TabsContent value="reviews">
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">{review.customer_name}</span>
                        <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground mb-3">"{review.comment}"</p>}
                      {review.reply ? (
                        <div className="bg-strawberry/5 border border-strawberry/20 rounded-xl p-3 text-sm">
                          <p className="font-medium text-xs text-strawberry mb-1">Tu respuesta:</p>
                          <p>{review.reply}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input placeholder="Responder..." value={replyTexts[review.id] || ''} onChange={e => setReplyTexts(prev => ({ ...prev, [review.id]: e.target.value }))} className="rounded-xl text-sm" />
                          <Button size="sm" className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl" onClick={() => handleReplyReview(review)}>Enviar</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {reviews.length === 0 && <p className="text-center text-muted-foreground py-8">No hay reseñas</p>}
                </div>
              </TabsContent>

              {/* ANALYTICS */}
              <TabsContent value="analytics">
                <AdminAnalytics />
              </TabsContent>

              {/* PROMOS */}
              <TabsContent value="promos">
                <div className="space-y-3">
                  {promoCodes.map(promo => (
                    <div key={promo.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${promo.is_active ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : 'border-border bg-muted opacity-60'}`}>
                      <div className="flex-1">
                        <span className="font-mono font-bold text-sm">{promo.code}</span>
                        <Badge className={`ml-2 text-xs ${promo.discount_type === 'percent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `$${promo.discount_value}`}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{promo.uses_count || 0} usos {promo.max_uses ? `/ ${promo.max_uses}` : ''}</p>
                      </div>
                      <Switch checked={promo.is_active} onCheckedChange={async () => {
                        await base44.entities.PromoCode.update(promo.id, { is_active: !promo.is_active });
                        setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
                      }} />
                    </div>
                  ))}
                  {promoCodes.length === 0 && <p className="text-center text-muted-foreground py-8">No hay cupones</p>}
                </div>
              </TabsContent>

              {/* EXPORT */}
              <TabsContent value="export">
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <h3 className="font-semibold">Exportar Datos</h3>
                  <Button onClick={() => exportCSV(orders.map(o => ({ tracking_code: o.tracking_code, customer: o.customer_name, total: o.total, status: o.status })), 'pedidos.csv')} className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-xl">
                    <Download className="w-4 h-4 mr-2" /> Exportar Pedidos CSV
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </div>
    </div>
  );
}