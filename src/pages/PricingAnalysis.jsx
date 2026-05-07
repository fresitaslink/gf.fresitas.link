import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Settings2, Save, Loader2, AlertCircle, Clock, MapPin, Zap, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import HeatmapDashboard from '@/components/admin/HeatmapDashboard';

const TIME_BUCKETS = Array.from({ length: 24 }, (_, h) => h);

export default function PricingAnalysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'owner', 'manager'].includes(user.role)) {
      toast.error('Acceso restringido');
      navigate('/');
      return;
    }
    loadData();
    const i = setInterval(loadData, 60000); // refresh every 60s
    return () => clearInterval(i);
  }, [user]);

  const loadData = async () => {
    try {
      const [o, d, s] = await Promise.all([
        base44.entities.Order.list('-created_date', 500),
        base44.entities.Driver.list(),
        base44.entities.StoreSettings.list(),
      ]);
      setOrders(o);
      setDrivers(d);
      const st = s[0] || {};
      setSettings(st);
      setDraft({
        delivery_fee: st.delivery_fee ?? 30,
        free_delivery_min: st.free_delivery_min ?? 200,
        surge_enabled: st.surge_enabled !== false,
        surge_threshold_low:  st.surge_threshold_low  ?? 4,
        surge_threshold_med:  st.surge_threshold_med  ?? 7,
        surge_threshold_high: st.surge_threshold_high ?? 11,
        surge_multiplier_low:  st.surge_multiplier_low  ?? 1.25,
        surge_multiplier_med:  st.surge_multiplier_med  ?? 1.5,
        surge_multiplier_high: st.surge_multiplier_high ?? 2.0,
        peak_hour_multiplier:  st.peak_hour_multiplier  ?? 1.15,
      });
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  // Hourly order density (today vs last 7 days)
  const hourlyData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const buckets = TIME_BUCKETS.map(h => ({ hour: `${h}:00`, today: 0, avg: 0 }));
    orders.forEach(o => {
      const d = new Date(o.created_date);
      if (d < weekAgo) return;
      const h = d.getHours();
      if (d >= todayStart) buckets[h].today++;
      else buckets[h].avg += 1 / 7;
    });
    return buckets.map(b => ({ ...b, avg: Math.round(b.avg * 10) / 10 }));
  }, [orders]);

  // Revenue by hour
  const revenueData = useMemo(() => {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const buckets = TIME_BUCKETS.map(h => ({ hour: `${h}:00`, revenue: 0, surge: 0 }));
    orders.forEach(o => {
      if (new Date(o.created_date).getTime() < last24h) return;
      if (o.status === 'cancelled') return;
      const h = new Date(o.created_date).getHours();
      buckets[h].revenue += o.total || 0;
      if ((o.delivery_fee || 0) > (settings?.delivery_fee || 30)) {
        buckets[h].surge += (o.delivery_fee || 0) - (settings?.delivery_fee || 30);
      }
    });
    return buckets.map(b => ({ ...b, revenue: Math.round(b.revenue), surge: Math.round(b.surge) }));
  }, [orders, settings]);

  // Live demand stats
  const liveStats = useMemo(() => {
    const pending = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
    const onWay = orders.filter(o => o.status === 'on_the_way');
    const availDrivers = drivers.filter(d => d.is_available);
    const ratio = availDrivers.length > 0 ? pending.length / availDrivers.length : pending.length;
    const surgeRevenue = orders
      .filter(o => new Date(o.created_date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
      .reduce((s, o) => s + Math.max(0, (o.delivery_fee || 0) - (settings?.delivery_fee || 30)), 0);
    return { pending: pending.length, onWay: onWay.length, drivers: availDrivers.length, ratio, surgeRevenue };
  }, [orders, drivers, settings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await base44.entities.StoreSettings.update(settings.id, draft);
      toast.success('✅ Precios actualizados — aplica a nuevos pedidos al instante');
      setSettings({ ...settings, ...draft });
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  const isDirty = settings && Object.keys(draft).some(k => draft[k] !== (settings[k] ?? draft[k]));

  if (loading || !settings) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <div>
              <h1 className="font-poppins font-black text-3xl flex items-center gap-2">
                <TrendingUp className="w-7 h-7 text-strawberry" /> Análisis de Precios
              </h1>
              <p className="text-sm text-muted-foreground">Surge dinámico · Heatmap en tiempo real · Configuración instantánea</p>
            </div>
            {isDirty && (
              <Button onClick={handleSave} disabled={saving} className="bg-strawberry hover:bg-strawberry/90 text-white gap-2 rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </Button>
            )}
          </div>
        </motion.div>

        {/* Live stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Pedidos pendientes', value: liveStats.pending, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'En camino', value: liveStats.onWay, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Repartidores activos', value: liveStats.drivers, icon: Zap, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Ratio demanda/repartidor', value: liveStats.ratio.toFixed(1), icon: Flame, color: liveStats.ratio > 2 ? 'text-red-600' : 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Surge ingresado (7d)', value: `$${liveStats.surgeRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-strawberry', bg: 'bg-strawberry/10' },
          ].map((s, i) => (
            <Card key={i} className={`p-4 ${s.bg} border-0`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color} opacity-60`} />
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Surge pricing controls */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Configuración de Surge Pricing
            </h2>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Surge global</Label>
              <Switch
                checked={draft.surge_enabled}
                onCheckedChange={v => setDraft(d => ({ ...d, surge_enabled: v }))}
              />
            </div>
          </div>

          {!draft.surge_enabled && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Surge desactivado · todos los pedidos pagan tarifa base.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base fees */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tarifa Base</h3>
              <div>
                <Label>Tarifa de envío base ($)</Label>
                <Input
                  type="number" step="1" min="0"
                  value={draft.delivery_fee}
                  onChange={e => setDraft(d => ({ ...d, delivery_fee: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Envío gratis a partir de ($)</Label>
                <Input
                  type="number" step="10" min="0"
                  value={draft.free_delivery_min}
                  onChange={e => setDraft(d => ({ ...d, free_delivery_min: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Multiplicador hora pico (11-14h y 18-20h)</Label>
                <Input
                  type="number" step="0.05" min="1" max="3"
                  value={draft.peak_hour_multiplier}
                  onChange={e => setDraft(d => ({ ...d, peak_hour_multiplier: parseFloat(e.target.value) || 1 }))}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground mt-1">Ej. 1.15 = +15% durante hora pico</p>
              </div>
            </div>

            {/* Demand thresholds */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Umbrales de Demanda</h3>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">🟡 MEDIA</span>
                  <span className="text-xs text-muted-foreground">{draft.surge_multiplier_low.toFixed(2)}x</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="1" placeholder="# pedidos" value={draft.surge_threshold_low} onChange={e => setDraft(d => ({ ...d, surge_threshold_low: parseInt(e.target.value) || 0 }))} className="rounded-xl text-sm h-9" />
                  <Input type="number" step="0.05" min="1" placeholder="x" value={draft.surge_multiplier_low} onChange={e => setDraft(d => ({ ...d, surge_multiplier_low: parseFloat(e.target.value) || 1 }))} className="rounded-xl text-sm h-9" />
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">🟠 ALTA</span>
                  <span className="text-xs text-muted-foreground">{draft.surge_multiplier_med.toFixed(2)}x</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="1" value={draft.surge_threshold_med} onChange={e => setDraft(d => ({ ...d, surge_threshold_med: parseInt(e.target.value) || 0 }))} className="rounded-xl text-sm h-9" />
                  <Input type="number" step="0.05" min="1" value={draft.surge_multiplier_med} onChange={e => setDraft(d => ({ ...d, surge_multiplier_med: parseFloat(e.target.value) || 1 }))} className="rounded-xl text-sm h-9" />
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">🔴 CRÍTICA</span>
                  <span className="text-xs text-muted-foreground">{draft.surge_multiplier_high.toFixed(2)}x</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="1" value={draft.surge_threshold_high} onChange={e => setDraft(d => ({ ...d, surge_threshold_high: parseInt(e.target.value) || 0 }))} className="rounded-xl text-sm h-9" />
                  <Input type="number" step="0.05" min="1" value={draft.surge_multiplier_high} onChange={e => setDraft(d => ({ ...d, surge_multiplier_high: parseFloat(e.target.value) || 1 }))} className="rounded-xl text-sm h-9" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            💡 Los cambios aplican al siguiente pedido. Tarifa final = base × multiplicador × multiplicador hora pico.
          </p>
        </Card>

        {/* Hourly density chart */}
        <Card className="p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Densidad de Pedidos por Hora</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="today" name="Hoy" fill="hsl(var(--strawberry))" radius={[4, 4, 0, 0]}>
                {hourlyData.map((d, i) => {
                  const isPeak = (i >= 11 && i <= 14) || (i >= 18 && i <= 20);
                  return <Cell key={i} fill={isPeak ? '#F97316' : 'hsl(var(--strawberry))'} />;
                })}
              </Bar>
              <Bar dataKey="avg" name="Promedio 7 días" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">🔶 Naranja = horas pico (multiplicador automático)</p>
        </Card>

        {/* Revenue chart */}
        <Card className="p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5" /> Ingresos por Hora (últimas 24h)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="hsl(var(--strawberry))" strokeWidth={2} />
              <Line type="monotone" dataKey="surge" name="Surge" stroke="#F97316" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Heatmap */}
        <Card className="p-6">
          <HeatmapDashboard />
        </Card>
      </div>
    </div>
  );
}