import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Users, MessageCircle, Settings, Plus, ToggleLeft, ToggleRight, Loader2, Star, CheckCircle } from 'lucide-react';
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
            <p className="text-xs text-muted-foreground mt-1">📱 {order.customer_phone}</p>
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
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
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

  if (!user || user.role !== 'admin') return null;

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
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Tienda:</span>
              <Switch
                checked={settingsForm.is_open}
                onCheckedChange={async (val) => {
                  setSettingsForm(p => ({ ...p, is_open: val }));
                  if (settings) await base44.entities.StoreSettings.update(settings.id, { is_open: val });
                  toast.success(val ? '✅ Tienda Abierta' : '❌ Tienda Cerrada');
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
              { label: 'Pedidos Hoy', value: todayOrders.length, icon: '📦', color: 'text-blue-600' },
              { label: 'Ingresos Hoy', value: `$${todayRevenue.toFixed(0)}`, icon: '💰', color: 'text-green-600' },
              { label: 'Esta Semana', value: `$${weekRevenue.toFixed(0)}`, icon: '📈', color: 'text-purple-600' },
              { label: 'Total Pedidos', value: orders.length, icon: '🍓', color: 'text-strawberry' },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className={`font-poppins font-bold text-2xl ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="orders">
            <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto">
              <TabsTrigger value="orders" className="flex-1 rounded-lg text-xs">Pedidos</TabsTrigger>
              <TabsTrigger value="products" className="flex-1 rounded-lg text-xs">Productos</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1 rounded-lg text-xs">Reseñas</TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 rounded-lg text-xs">Chat</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 rounded-lg text-xs">Config</TabsTrigger>
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

            {/* Products */}
            <TabsContent value="products">
              <div className="space-y-3">
                {products.map(product => (
                  <div key={product.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cream overflow-hidden flex-shrink-0">
                      {product.image_url ? <img src={product.image_url} alt={product.name_es} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🍓</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{product.name_es}</p>
                      <p className="text-xs text-muted-foreground">${product.price} · {product.category}</p>
                    </div>
                    {product.is_featured && <Badge className="text-xs bg-amber-100 text-amber-700">⭐ Destacado</Badge>}
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
                      <p className="font-semibold text-sm mb-3">📧 {email}</p>
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
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}