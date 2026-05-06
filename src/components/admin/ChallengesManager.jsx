import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Edit2, Trash2, Save, X, Loader2, Target, Bell, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMPTY_FORM = {
  title_es: '', description_es: '', icon: '🎯',
  points_reward: 50, challenge_type: 'order_before_time',
  condition_value: '', active_date: '', is_active: true,
};

const CHALLENGE_TYPES = {
  order_before_time: '⏰ Pedir antes de hora',
  order_product: '🍓 Pedir producto específico',
  order_amount: '💰 Gastar cierta cantidad',
  referral: '🤝 Referir a alguien',
  review: '⭐ Dejar una reseña',
};

const ICONS = ['🎯', '⏰', '🍓', '💰', '🤝', '⭐', '🔥', '🏆', '✨', '🎁', '🚀', '💎'];

export default function ChallengesManager() {
  const [challenges, setChallenges] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [chall, comps] = await Promise.all([
      base44.entities.DailyChallenge.list('-created_date', 100),
      base44.entities.ChallengeCompletion.list('-created_date', 200),
    ]);
    setChallenges(chall);
    setCompletions(comps);
    setLoading(false);
  };

  const startEdit = (challenge) => {
    setEditing(challenge.id);
    setForm({
      title_es: challenge.title_es || '',
      description_es: challenge.description_es || '',
      icon: challenge.icon || '🎯',
      points_reward: challenge.points_reward || 50,
      challenge_type: challenge.challenge_type || 'order_before_time',
      condition_value: challenge.condition_value || '',
      active_date: challenge.active_date || '',
      is_active: challenge.is_active !== false,
    });
  };

  const handleSave = async () => {
    if (!form.title_es) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await base44.entities.DailyChallenge.create({ ...form, completions_count: 0 });
        setChallenges(p => [created, ...p]);
        toast.success('¡Desafío creado!');
      } else {
        await base44.entities.DailyChallenge.update(editing, form);
        setChallenges(p => p.map(c => c.id === editing ? { ...c, ...form } : c));
        toast.success('Desafío actualizado');
      }
      setEditing(null);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este desafío?')) return;
    await base44.entities.DailyChallenge.delete(id);
    setChallenges(p => p.filter(c => c.id !== id));
    toast.success('Desafío eliminado');
  };

  const handleToggle = async (challenge) => {
    await base44.entities.DailyChallenge.update(challenge.id, { is_active: !challenge.is_active });
    setChallenges(p => p.map(c => c.id === challenge.id ? { ...c, is_active: !c.is_active } : c));
  };

  // Send push notifications to all customers about today's challenges
  const handleNotifyAll = async () => {
    const todayActive = challenges.filter(c => c.is_active && (!c.active_date || c.active_date === new Date().toISOString().split('T')[0]));
    if (!todayActive.length) { toast.error('No hay desafíos activos hoy'); return; }
    setNotifying(true);
    try {
      const profiles = await base44.entities.CustomerProfile.list('-created_date', 1000);
      const notifs = profiles.map(p => base44.entities.Notification.create({
        user_email: p.user_email,
        title_es: '🎯 ¡Nuevos desafíos del día!',
        title_en: '🎯 New daily challenges!',
        message_es: `Tienes ${todayActive.length} desafío(s) hoy. ¡Complétalos y gana hasta ${todayActive.reduce((s, c) => s + c.points_reward, 0)} puntos!`,
        message_en: `You have ${todayActive.length} challenge(s) today. Earn up to ${todayActive.reduce((s, c) => s + c.points_reward, 0)} points!`,
        type: 'loyalty', link: '/challenges',
      }).catch(() => {}));
      await Promise.allSettled(notifs);
      toast.success(`✅ Notificación enviada a ${profiles.length} clientes`);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setNotifying(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayActive = challenges.filter(c => c.is_active && (!c.active_date || c.active_date === today));
  const totalCompletionsToday = completions.filter(c => c.completed_at?.startsWith(today)).length;

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Activos Hoy', value: todayActive.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Total Desafíos', value: challenges.length, color: 'text-strawberry', bg: 'bg-strawberry/10' },
          { label: 'Completados Hoy', value: totalCompletionsToday, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-3 text-center`}>
            <p className={`font-poppins font-black text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => { setEditing('new'); setForm(EMPTY_FORM); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Nuevo Desafío
        </Button>
        <Button onClick={handleNotifyAll} disabled={notifying} variant="outline" className="rounded-xl gap-1.5 text-xs border-purple-300 text-purple-700">
          {notifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
          Notificar Clientes
        </Button>
        <Button onClick={loadAll} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-card border-2 border-strawberry/30 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">{editing === 'new' ? '✨ Nuevo Desafío' : '✏️ Editar Desafío'}</h4>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            {/* Icon picker */}
            <div className="mb-3">
              <Label className="text-xs mb-1 block">Ícono</Label>
              <div className="flex gap-1.5 flex-wrap">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))}
                    className={`w-9 h-9 rounded-xl text-lg transition-all ${form.icon === ic ? 'bg-strawberry/20 ring-2 ring-strawberry' : 'bg-muted hover:bg-muted/80'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título (Español) *</Label>
                <Input value={form.title_es} onChange={e => setForm(p => ({ ...p, title_es: e.target.value }))} placeholder="ej. Pide antes de las 2pm" className="rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Desafío</Label>
                <Select value={form.challenge_type} onValueChange={v => setForm(p => ({ ...p, challenge_type: v }))}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHALLENGE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Input value={form.description_es} onChange={e => setForm(p => ({ ...p, description_es: e.target.value }))} placeholder="Descripción del reto..." className="rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor de Condición (ej: "14:00", "$200")</Label>
                <Input value={form.condition_value} onChange={e => setForm(p => ({ ...p, condition_value: e.target.value }))} placeholder="ej. 14:00" className="rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Puntos de Recompensa</Label>
                <Input type="number" value={form.points_reward} onChange={e => setForm(p => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} className="rounded-xl text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha Activa (vacío = siempre)</Label>
                <Input type="date" value={form.active_date} onChange={e => setForm(p => ({ ...p, active_date: e.target.value }))} className="rounded-xl text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs">Desafío activo</Label>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1 rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing === 'new' ? 'Crear' : 'Guardar'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {challenges.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay desafíos</p>
          <p className="text-xs mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => {
            const compsCount = completions.filter(comp => comp.challenge_id === c.id).length;
            return (
              <motion.div key={c.id} layout className={`bg-card rounded-2xl border-2 p-4 transition-all ${
                c.is_active ? 'border-border' : 'border-border opacity-60'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    c.is_active ? 'bg-strawberry/10' : 'bg-muted'
                  }`}>
                    {c.icon || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{c.title_es}</p>
                        {c.description_es && <p className="text-xs text-muted-foreground">{c.description_es}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                            {c.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Badge className="text-xs bg-strawberry/10 text-strawberry">+{c.points_reward} pts</Badge>
                          {c.active_date && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30"><Calendar className="w-2.5 h-2.5 inline mr-0.5" />{c.active_date}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{compsCount} completados</span>
                        </div>
                        {c.condition_value && (
                          <p className="text-xs text-muted-foreground mt-0.5">Condición: {c.condition_value}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Switch checked={c.is_active !== false} onCheckedChange={() => handleToggle(c)} />
                        <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}