import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Plus, Edit2, Trash2, Package, AlertTriangle, CheckCircle,
  Save, X, Loader2, Star, TrendingDown, BarChart2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMPTY_FORM = {
  name_es: '', description_es: '', image_url: '',
  points_cost: 100, stock: 10, category: 'producto', is_active: true,
};

const CATEGORY_LABELS = {
  producto: '🍓 Producto', descuento: '🎟️ Descuento',
  experiencia: '✨ Experiencia', merch: '👕 Merch',
};

const STOCK_THRESHOLDS = { critical: 2, low: 5 };

function StockBadge({ stock }) {
  if (stock === 0) return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Agotado</Badge>;
  if (stock <= STOCK_THRESHOLDS.critical) return <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />{stock}</Badge>;
  if (stock <= STOCK_THRESHOLDS.low)  return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 text-xs">{stock} ⚠️</Badge>;
  return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 text-xs"><CheckCircle className="w-2.5 h-2.5 inline mr-0.5" />{stock}</Badge>;
}

export default function RewardsManager() {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // reward id or 'new'
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'redemptions'
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadAll();
    const unsub = base44.entities.RewardItem.subscribe((event) => {
      if (event.type === 'create' && event.data) setRewards(p => [event.data, ...p]);
      if (event.type === 'update' && event.data) setRewards(p => p.map(r => r.id === event.data.id ? event.data : r));
      if (event.type === 'delete') setRewards(p => p.filter(r => r.id !== event.id));
    });
    const unsubRed = base44.entities.RewardRedemption.subscribe((event) => {
      if (event.type === 'create' && event.data) setRedemptions(p => [event.data, ...p]);
      if (event.type === 'update' && event.data) setRedemptions(p => p.map(r => r.id === event.data.id ? event.data : r));
    });
    return () => { unsub(); unsubRed(); };
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [rews, reds] = await Promise.all([
      base44.entities.RewardItem.list('-created_date', 100),
      base44.entities.RewardRedemption.list('-created_date', 100),
    ]);
    setRewards(rews);
    setRedemptions(reds);
    setLoading(false);
  };

  const startEdit = (reward) => {
    setEditing(reward.id);
    setForm({
      name_es: reward.name_es || '',
      description_es: reward.description_es || '',
      image_url: reward.image_url || '',
      points_cost: reward.points_cost || 100,
      stock: reward.stock ?? 10,
      category: reward.category || 'producto',
      is_active: reward.is_active !== false,
    });
  };

  const startNew = () => {
    setEditing('new');
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name_es || !form.points_cost) { toast.error('Nombre y puntos son requeridos'); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await base44.entities.RewardItem.create(form);
        setRewards(p => [created, ...p]);
        toast.success('¡Premio creado!');
      } else {
        await base44.entities.RewardItem.update(editing, form);
        setRewards(p => p.map(r => r.id === editing ? { ...r, ...form } : r));
        toast.success('Premio actualizado');
      }
      setEditing(null);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este premio?')) return;
    setDeletingId(id);
    await base44.entities.RewardItem.delete(id);
    setRewards(p => p.filter(r => r.id !== id));
    setDeletingId(null);
    toast.success('Premio eliminado');
  };

  const handleToggleActive = async (reward) => {
    await base44.entities.RewardItem.update(reward.id, { is_active: !reward.is_active });
    setRewards(p => p.map(r => r.id === reward.id ? { ...r, is_active: !r.is_active } : r));
  };

  const handleRestockBy = async (reward, amount) => {
    const newStock = Math.max(0, (reward.stock || 0) + amount);
    await base44.entities.RewardItem.update(reward.id, { stock: newStock });
    setRewards(p => p.map(r => r.id === reward.id ? { ...r, stock: newStock } : r));
    toast.success(`Stock actualizado: ${newStock}`);
  };

  const handleUpdateRedemption = async (redemption, newStatus) => {
    await base44.entities.RewardRedemption.update(redemption.id, { status: newStatus });
    setRedemptions(p => p.map(r => r.id === redemption.id ? { ...r, status: newStatus } : r));
    if (newStatus === 'delivered') {
      await base44.entities.Notification.create({
        user_email: redemption.user_email,
        title_es: '🎁 ¡Tu premio llegó!',
        title_en: '🎁 Your reward was delivered!',
        message_es: `Tu premio "${redemption.reward_name}" ha sido entregado. ¡Disfrútalo!`,
        message_en: `Your reward "${redemption.reward_name}" has been delivered!`,
        type: 'loyalty', link: '/rewards',
      }).catch(() => {});
    }
    toast.success(`Estado → ${newStatus}`);
  };

  // Stats
  const totalRewards = rewards.length;
  const activeRewards = rewards.filter(r => r.is_active).length;
  const lowStockCount = rewards.filter(r => (r.stock ?? 0) <= STOCK_THRESHOLDS.low && r.stock > 0).length;
  const outOfStock = rewards.filter(r => (r.stock ?? 0) === 0).length;
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending').length;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Premios Activos', value: activeRewards, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Stock Bajo', value: lowStockCount, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Agotados', value: outOfStock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Canjes Pendientes', value: pendingRedemptions, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-3 text-center border border-transparent`}>
            <p className={`font-poppins font-black text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        {[
          { key: 'inventory', label: '📦 Inventario de Premios' },
          { key: 'redemptions', label: `🎁 Canjes (${pendingRedemptions} pendientes)` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'inventory' ? (
          <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-poppins font-bold text-base">Premios ({totalRewards})</h3>
              <div className="flex gap-2">
                <Button onClick={loadAll} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                  <RefreshCw className="w-3 h-3" /> Actualizar
                </Button>
                <Button onClick={startNew} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Nuevo Premio
                </Button>
              </div>
            </div>

            {/* Edit / Create Form */}
            <AnimatePresence>
              {editing && (
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  className="bg-card border-2 border-strawberry/30 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">{editing === 'new' ? '✨ Nuevo Premio' : '✏️ Editar Premio'}</h4>
                    <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre (Español) *</Label>
                      <Input value={form.name_es} onChange={e => setForm(p => ({ ...p, name_es: e.target.value }))} placeholder="ej. Fresita Gratis" className="rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Categoría</Label>
                      <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                        <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descripción</Label>
                      <Input value={form.description_es} onChange={e => setForm(p => ({ ...p, description_es: e.target.value }))} placeholder="Descripción breve..." className="rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL de Imagen</Label>
                      <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." className="rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Costo en Puntos *</Label>
                      <Input type="number" value={form.points_cost} onChange={e => setForm(p => ({ ...p, points_cost: parseInt(e.target.value) || 0 }))} className="rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stock Disponible</Label>
                      <Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} className="rounded-xl text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                    <Label className="text-xs">Premio activo (visible para clientes)</Label>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setEditing(null)} className="flex-1 rounded-xl">Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {editing === 'new' ? 'Crear Premio' : 'Guardar'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rewards Table */}
            {rewards.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No hay premios creados</p>
                <p className="text-xs mt-1">Crea tu primer premio con el botón de arriba</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rewards.map(reward => (
                  <motion.div key={reward.id} layout
                    className={`bg-card rounded-2xl border-2 overflow-hidden transition-all ${
                      !reward.is_active ? 'border-border opacity-60' :
                      (reward.stock || 0) === 0 ? 'border-red-200 dark:border-red-900' :
                      (reward.stock || 0) <= STOCK_THRESHOLDS.low ? 'border-amber-200 dark:border-amber-900' :
                      'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 p-4">
                      {reward.image_url ? (
                        <img src={reward.image_url} alt={reward.name_es} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-strawberry/10 flex items-center justify-center text-2xl flex-shrink-0">
                          {reward.category === 'descuento' ? '🎟️' : reward.category === 'experiencia' ? '✨' : reward.category === 'merch' ? '👕' : '🍓'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{reward.name_es}</p>
                            {reward.description_es && <p className="text-xs text-muted-foreground truncate">{reward.description_es}</p>}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={`text-xs ${reward.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                {reward.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Badge className="text-xs bg-muted text-muted-foreground">{CATEGORY_LABELS[reward.category]}</Badge>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-gold fill-gold" />
                                <span className="text-xs font-bold text-strawberry">{reward.points_cost} pts</span>
                              </div>
                            </div>
                          </div>
                          <StockBadge stock={reward.stock ?? 0} />
                        </div>
                        {/* Stock controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Stock:</span>
                          <button onClick={() => handleRestockBy(reward, -1)} className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-xs font-bold flex items-center justify-center">−</button>
                          <span className="text-sm font-bold w-8 text-center">{reward.stock ?? 0}</span>
                          <button onClick={() => handleRestockBy(reward, 1)} className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-xs font-bold flex items-center justify-center">+</button>
                          <button onClick={() => handleRestockBy(reward, 10)} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded-full px-2 py-0.5 font-medium">+10</button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Switch checked={reward.is_active !== false} onCheckedChange={() => handleToggleActive(reward)} />
                        <button onClick={() => startEdit(reward)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(reward.id)} disabled={deletingId === reward.id} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                          {deletingId === reward.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="redemptions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <h3 className="font-poppins font-bold text-base">Historial de Canjes ({redemptions.length})</h3>
            {redemptions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay canjes aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {redemptions.map(r => (
                  <div key={r.id} className={`bg-card rounded-2xl border-2 p-4 ${
                    r.status === 'pending' ? 'border-amber-200 dark:border-amber-800' :
                    r.status === 'processing' ? 'border-blue-200 dark:border-blue-800' :
                    r.status === 'delivered' ? 'border-green-200 dark:border-green-800' :
                    'border-border'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">{r.reward_name}</p>
                          <Badge className={`text-xs ${
                            r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            r.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {r.status === 'pending' ? '⏳ Pendiente' : r.status === 'processing' ? '🔄 Procesando' : r.status === 'delivered' ? '✅ Entregado' : '❌ Cancelado'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.user_email}</p>
                        {r.delivery_address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">📍 {r.delivery_address}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {r.points_spent} pts</p>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {r.status === 'pending' && (
                          <button onClick={() => handleUpdateRedemption(r, 'processing')}
                            className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded-xl px-2.5 py-1.5 font-medium hover:bg-blue-200 transition-colors">
                            → Procesando
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'processing') && (
                          <button onClick={() => handleUpdateRedemption(r, 'delivered')}
                            className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 rounded-xl px-2.5 py-1.5 font-medium hover:bg-green-200 transition-colors">
                            ✅ Entregado
                          </button>
                        )}
                        {r.status !== 'delivered' && r.status !== 'cancelled' && (
                          <button onClick={() => handleUpdateRedemption(r, 'cancelled')}
                            className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl px-2.5 py-1.5 font-medium hover:bg-red-100 transition-colors">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}