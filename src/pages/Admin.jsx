import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { Package, TrendingUp, Users, MessageCircle, Settings, Loader2, Star, BarChart2, DollarSign, Download, ShoppingBag, Phone, Mail, Crown, ExternalLink, Navigation, Map } from 'lucide-react';
import AdminAnalytics from './AdminAnalytics';
import BusinessIntelligence from '@/components/admin/BusinessIntelligence';
import OrdersMap from '@/components/admin/OrdersMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  on_the_way: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando', on_the_way: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado' };

function KanbanColumn({ status, orders, onUpdateStatus }) {
  const filtered = orders.filter(o => o.status === status);
  return (
    <div className="bg-muted rounded-2xl p-3 min-w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
        <Badge className={`text-xs ${STATUS_COLORS[status]}`}>{filtered.length}</Badge>
      </div>
      <div className="space-y-2">
        {filtered.map(order => (
          <div key={order.id} className="bg-card rounded-xl p-3 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-strawberry">#{order.tracking_code}</span>
              <span className="font-bold text-sm">${order.total?.toFixed(2)}</span>
            </div>
            <p className="text-xs font-medium">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground truncate">{order.customer_address}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {order.customer_phone}</p>
            <p className="text-xs text-muted-foreground">{order.items?.length} items · {order.payment_method}</p>
            {order.notes && <p className="text-xs italic text-muted-foreground mt-1">"{order.notes}"</p>}
            {status !== 'delivered' && status !== 'cancelled' && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {STATUS_ORDER.indexOf(status) < STATUS_ORDER.length - 1 && (
                  <Button
                    size="sm"
                    className="text-xs h-6 px-2 bg-strawberry text-white hover:bg-strawberry/90 rounded-full"
                    onClick={() => onUpdateStatus(order.id, STATUS_ORDER[STATUS_ORDER.indexOf(status) + 1])}
                  >
                    → {STATUS_LABELS[STATUS_ORDER[STATUS_ORDER.indexOf(status) + 1]]}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6 px-2 border-red-300 text-red-600 rounded-full"
                  onClick={() => onUpdateStatus(order.id, 'cancelled')}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Sin pedidos</p>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [replyTexts, setReplyTexts] = useState({});
  const [chatReplies, setChatReplies] = useState({});

  const [settingsForm, setSettingsForm] = useState({
    is_open: true,
    delivery_fee: 30,
    free_delivery_min: 200,
    announcement_es: '',
    announcement_en: '',
    whatsapp_number: '',
    closed_message_es: '',
    admin_email: '',
  });

  useEffect(() => {
    if (!user || !['admin', 'owner'].includes(user.role)) { navigate('/'); return; }
    Promise.all([
      base44.entities.Order.list('-created_date', 100),
      base44.entities.Product.list(),
      base44.entities.Review.list('-created_date', 50),
      base44.entities.ChatMessage.list('-created_date', 100),
      base44.entities.StoreSettings.list(),
    ]).then(([ord, prods, revs, chats, settingsList]) => {
      setOrders(ord);
      setProducts(prods);
      setReviews(revs);
      setChatMessages(chats);
      if (settingsList[0]) {
        setSettings(settingsList[0]);
        setSettingsForm({
          is_open: settingsList[0].is_open !== false,
          delivery_fee: settingsList[0].delivery_fee || 30,
          free_delivery_min: settingsList[0].free_delivery_min || 200,
          announcement_es: settingsList[0].announcement_es || '',
          announcement_en: settingsList[0].announcement_en || '',
          whatsapp_number: settingsList[0].whatsapp_number || '',
          closed_message_es: settingsList[0].closed_message_es || '',
          admin_email: settingsList[0].admin_email || '',
        });
      }
    }).finally(() => setLoading(false));

    // Real-time order updates
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') setOrders(prev => [event.data, ...prev]);
      if (event.type === 'update') setOrders(prev => prev.map(o => o.id === event.id ? event.data : o));
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    await base44.entities.Order.update(orderId, { status: newStatus });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`Pedido → ${STATUS_LABELS[newStatus]}`);
    // Send email notification to customer
    base44.functions.invoke('sendOrderEmail', { order_id: orderId, event_type: 'status_update' }).catch(() => {});
  };

  const handleToggleProduct = async (product) => {
    await base44.entities.Product.update(product.id, { is_available: !product.is_available });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
  };

  const handleReplyReview = async (review) => {
    const reply = replyTexts[review.id];
    if (!reply?.trim()) return;
    await base44.entities.Review.update(review.id, { reply, reply_date: new Date().toISOString() });
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, reply, reply_date: new Date().toISOString() } : r));
    setReplyTexts(prev => ({ ...prev, [review.id]: '' }));
    toast.success('Respuesta enviada');
  };

  const handleSendChatReply = async (userEmail) => {
    const msg = chatReplies[userEmail];
    if (!msg?.trim()) return;
    await base44.entities.ChatMessage.create({ user_email: userEmail, message: msg, is_admin: true });
    setChatMessages(prev => [...prev, { user_email: userEmail, message: msg, is_admin: true, created_date: new Date().toISOString(), id: Date.now().toString() }]);
    setChatReplies(prev => ({ ...prev, [userEmail]: '' }));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      if (settings) {
        await base44.entities.StoreSettings.update(settings.id, settingsForm);
      } else {
        const created = await base44.entities.StoreSettings.create(settingsForm);
        setSettings(created);
      }
      toast.success('Configuración guardada');
    } finally {
      setSavingSettings(false);
    }
  };

  const exportCSV = (rows, filename) => {
    if (!rows.length) { toast.error('Sin datos para exportar'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} exportado`);
  };

  const handleExportOrders = () => {
    const rows = orders.map(o => ({
      tracking_code: o.tracking_code || '',
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      total: o.total,
      status: o.status,
      payment_method: o.payment_method,
      created_date: new Date(o.created_date).toLocaleString('es-MX'),
      notes: o.notes || '',
    }));
    exportCSV(rows, 'pedidos_fresitas.csv');
  };

  const handleExportCustomers = async () => {
    const profiles = await base44.entities.CustomerProfile.list('-created_date', 1000);
    const rows = profiles.map(p => ({
      email: p.user_email,
      name: p.display_name || '',
      phone: p.phone || '',
      loyalty_points: p.loyalty_points || 0,
      total_orders: p.total_orders || 0,
      created_date: new Date(p.created_date).toLocaleString('es-MX'),
    }));
    exportCSV(rows, 'clientes_fresitas.csv');
  };

  if (!user || !['admin', 'owner'].includes(user.role)) return null;

  const todayOrders = orders.filter(o => new Date(o.created_date).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const weekOrders = orders.filter(o => new Date(o.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Chat conversations
  const conversations = [...new Set(chatMessages.filter(m => !m.is_admin).map(m => m.user_email))];

  if (loading) {
    return <div className="min-h-screen pt-20 px-4"><div className="max-w-7xl mx-auto py-8 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between py-8">
            <div>
              <h1 className="font-poppins font-bold text-3xl text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">Fresitas G&F — Dashboard</p>
              {user?.role === 'owner' && (
                <a href="/owner" className="inline-flex items-center gap-1 text-xs text-gold hover:underline mt-1">
                  <Crown className="w-3 h-3" /> Ir al Owner Panel <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <a href="/logistica" className="inline-flex items-center gap-1.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 rounded-full px-3 py-1.5 hover:opacity-80">
                <Navigation className="w-3 h-3" /> Logística Repartidores
              </a>
              <span className="text-sm text-muted-foreground">Tienda:</span>
              <Switch
                checked={settingsForm.is_open}
                onCheckedChange={async (val) => {
                  setSettingsForm(p => ({ ...p, is_open: val }));
                  if (settings) await base44.entities.StoreSettings.update(settings.id, { is_open: val });
                  toast.success(val ? 'Tienda Abierta' : 'Tienda Cerrada');
                }}
              />
              <span className={`text-sm font-medium ${settingsForm.is_open ? 'text-green-600' : 'text-red-600'}`}>
                {settingsForm.is_open ? 'Abierta' : 'Cerrada'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Pedidos Hoy', value: todayOrders.length, Icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Ingresos Hoy', value: `$${todayRevenue.toFixed(0)}`, Icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'Esta Semana', value: `$${weekRevenue.toFixed(0)}`, Icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Total Pedidos', value: orders.length, Icon: Package, color: 'text-strawberry', bg: 'bg-strawberry/10' },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4">
                <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <stat.Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className={`font-poppins font-bold text-2xl ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="orders">
            <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto">
              <TabsTrigger value="orders" className="flex-1 rounded-lg text-xs">Pedidos</TabsTrigger>
              <TabsTrigger value="mapa" className="flex-1 rounded-lg text-xs">🗺 Mapa</TabsTrigger>
              <TabsTrigger value="products" className="flex-1 rounded-lg text-xs">Productos</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1 rounded-lg text-xs">Reseñas</TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 rounded-lg text-xs">Chat</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 rounded-lg text-xs">Config</TabsTrigger>
              <TabsTrigger value="bi" className="flex-1 rounded-lg text-xs">📊 BI</TabsTrigger>
              <TabsTrigger value="export" className="flex-1 rounded-lg text-xs">Exportar</TabsTrigger>
            </TabsList>

            {/* Orders Kanban */}
            <TabsContent value="orders">
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'].map(status => (
                    <KanbanColumn key={status} status={status} orders={orders} onUpdateStatus={handleUpdateOrderStatus} />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="mapa">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-strawberry" />
                  <h3 className="font-poppins font-bold text-lg">Mapa de Pedidos Activos</h3>
                </div>
                <p className="text-xs text-muted-foreground">Los pedidos con coordenadas GPS del cliente aparecen en el mapa. El tamaño del círculo indica concentración.</p>
                <OrdersMap orders={orders.filter(o => ['pending','confirmed','preparing','on_the_way'].includes(o.status))} />
              </div>
            </TabsContent>

            {/* Products */}
            <TabsContent value="products">
              <div className="space-y-3">
                {products.map(product => (
                  <div key={product.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cream overflow-hidden flex-shrink-0">
                      {product.image_url ? <img src={product.image_url} alt={product.name_es} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-strawberry" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{product.name_es}</p>
                      <p className="text-xs text-muted-foreground">${product.price} · {product.category}</p>
                    </div>
                    {product.is_featured && <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Destacado</Badge>}
                    <Switch checked={product.is_available !== false} onCheckedChange={() => handleToggleProduct(product)} />
                    <span className="text-xs text-muted-foreground">{product.is_available !== false ? 'Disponible' : 'No disp.'}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Reviews */}
            <TabsContent value="reviews">
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{review.customer_name}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
                        </div>
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground mb-3">"{review.comment}"</p>}
                    {review.reply ? (
                      <div className="bg-strawberry/5 border border-strawberry/20 rounded-xl p-3 text-sm">
                        <p className="font-medium text-xs text-strawberry mb-1">Tu respuesta:</p>
                        <p>{review.reply}</p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Responder esta reseña..."
                          value={replyTexts[review.id] || ''}
                          onChange={e => setReplyTexts(prev => ({ ...prev, [review.id]: e.target.value }))}
                          className="rounded-xl text-sm"
                        />
                        <Button size="sm" className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl" onClick={() => handleReplyReview(review)}>
                          Enviar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {reviews.length === 0 && <p className="text-center text-muted-foreground py-8">No hay reseñas aún</p>}
              </div>
            </TabsContent>

            {/* Chat */}
            <TabsContent value="chat">
              <div className="space-y-6">
                {conversations.map(email => {
                  const convoMessages = chatMessages.filter(m => m.user_email === email).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                  return (
                    <div key={email} className="bg-card rounded-2xl border border-border p-4">
                      <p className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {email}</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {convoMessages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs text-xs rounded-xl px-3 py-2 ${msg.is_admin ? 'bg-strawberry text-white' : 'bg-muted text-foreground'}`}>
                              {msg.message}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Responder..."
                          value={chatReplies[email] || ''}
                          onChange={e => setChatReplies(prev => ({ ...prev, [email]: e.target.value }))}
                          className="rounded-xl text-sm"
                          onKeyDown={e => e.key === 'Enter' && handleSendChatReply(email)}
                        />
                        <Button size="sm" className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl" onClick={() => handleSendChatReply(email)}>
                          Enviar
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {conversations.length === 0 && <p className="text-center text-muted-foreground py-8">No hay mensajes de clientes</p>}
              </div>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h3 className="font-poppins font-semibold text-lg">Configuración de la Tienda</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Costo de Envío ($)</Label>
                    <Input type="number" value={settingsForm.delivery_fee} onChange={e => setSettingsForm(p => ({ ...p, delivery_fee: parseFloat(e.target.value) }))} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Envío Gratis desde ($)</Label>
                    <Input type="number" value={settingsForm.free_delivery_min} onChange={e => setSettingsForm(p => ({ ...p, free_delivery_min: parseFloat(e.target.value) }))} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>WhatsApp</Label>
                    <Input value={settingsForm.whatsapp_number} onChange={e => setSettingsForm(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="525512345678" className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email del Admin (notificaciones)</Label>
                    <Input value={settingsForm.admin_email || ''} onChange={e => setSettingsForm(p => ({ ...p, admin_email: e.target.value }))} placeholder="tu@email.com" type="email" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Anuncio (Español)</Label>
                  <Textarea value={settingsForm.announcement_es} onChange={e => setSettingsForm(p => ({ ...p, announcement_es: e.target.value }))} className="rounded-xl" rows={2} placeholder="Ej: ¡Envío gratis este fin de semana!" />
                </div>
                <div className="space-y-1">
                  <Label>Announcement (English)</Label>
                  <Textarea value={settingsForm.announcement_en} onChange={e => setSettingsForm(p => ({ ...p, announcement_en: e.target.value }))} className="rounded-xl" rows={2} placeholder="E.g. Free delivery this weekend!" />
                </div>
                <div className="space-y-1">
                  <Label>Mensaje Cerrado (Español)</Label>
                  <Input value={settingsForm.closed_message_es} onChange={e => setSettingsForm(p => ({ ...p, closed_message_es: e.target.value }))} className="rounded-xl" placeholder="Estamos cerrados, regresamos mañana" />
                </div>
                <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Guardar Configuración
                </Button>
              </div>
            </TabsContent>
            {/* Business Intelligence */}
            <TabsContent value="bi">
              <BusinessIntelligence />
            </TabsContent>

            {/* CSV Export */}
            <TabsContent value="export">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <h3 className="font-poppins font-semibold text-lg">Exportar Datos a CSV</h3>
                <p className="text-sm text-muted-foreground">Descarga tus datos en formato CSV para análisis externo o reportes.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-border rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Pedidos</p>
                        <p className="text-xs text-muted-foreground">{orders.length} registros</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Incluye: código, cliente, dirección, total, estado, método de pago.</p>
                    <Button onClick={handleExportOrders} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl" size="sm">
                      <Download className="w-4 h-4 mr-2" /> Descargar Pedidos CSV
                    </Button>
                  </div>
                  <div className="border border-border rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Clientes</p>
                        <p className="text-xs text-muted-foreground">Todos los perfiles registrados</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Incluye: email, nombre, teléfono, puntos de lealtad, total de pedidos.</p>
                    <Button onClick={handleExportCustomers} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl" size="sm">
                      <Download className="w-4 h-4 mr-2" /> Descargar Clientes CSV
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}