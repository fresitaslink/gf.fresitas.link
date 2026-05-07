import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, Mail, Loader2, RefreshCw, ArrowDown, Calendar, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const URGENCY_STYLES = {
  critical: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300', icon: AlertTriangle, label: 'CRÍTICO', emoji: '🚨' },
  warning:  { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300', icon: AlertCircle, label: 'BAJO', emoji: '⚠️' },
  attention:{ color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300', icon: TrendingUp, label: 'ATENCIÓN', emoji: '📊' },
  ok:       { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300', icon: CheckCircle2, label: 'OK', emoji: '✅' },
};

export default function StockPrediction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'owner', 'manager'].includes(user.role)) {
      toast.error('Acceso restringido');
      navigate('/');
      return;
    }
    loadPredictions();
  }, [user]);

  const loadPredictions = async (sendAlert = false) => {
    if (sendAlert) setSendingAlert(true); else setRefreshing(true);
    try {
      const res = await base44.functions.invoke('predictStockNeeds', { send_alerts: sendAlert, horizon_days: 14 });
      setData(res.data);
      if (sendAlert) {
        if (res.data?.email_alert_sent) {
          toast.success(`📧 Alerta enviada al admin (${res.data.items_alerted} items)`);
        } else {
          toast.info('No hay items críticos — no se envió alerta');
        }
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSendingAlert(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;
  }

  if (!data) return null;

  const { summary, predictions } = data;
  const chartData = predictions.slice(0, 12).map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
    stock: p.current_stock,
    needed_14d: p.predicted_14d,
    urgency: p.urgency,
  }));

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-poppins font-black text-3xl flex items-center gap-2">
              <Package className="w-7 h-7 text-strawberry" /> Predicción de Inventario
            </h1>
            <p className="text-sm text-muted-foreground">
              IA basada en {summary.total_orders_analyzed} pedidos · {summary.active_subscriptions} suscripciones · {summary.scheduled_orders} pedidos recurrentes
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadPredictions(false)} variant="outline" disabled={refreshing} className="gap-2 rounded-xl">
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Actualizar
            </Button>
            <Button onClick={() => loadPredictions(true)} disabled={sendingAlert} className="gap-2 rounded-xl bg-strawberry hover:bg-strawberry/90">
              {sendingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar alerta al admin
            </Button>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total ingredientes', value: summary.total_ingredients, icon: Package, color: 'text-foreground', bg: 'bg-card' },
            { label: 'Críticos', value: summary.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Bajo stock', value: summary.warning, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Atención', value: summary.attention, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'OK', value: summary.ok, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          ].map((s, i) => (
            <Card key={i} className={`p-4 ${s.bg} border-0`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color} opacity-70`} />
              </div>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Critical alert banner */}
        {summary.critical > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl p-4 flex items-center gap-4"
          >
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-red-700 dark:text-red-400">
                🚨 {summary.critical} ingrediente{summary.critical > 1 ? 's' : ''} en estado CRÍTICO
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Stock por debajo del buffer de seguridad. Ordena reabastecimiento de inmediato.
              </p>
            </div>
            <Button onClick={() => loadPredictions(true)} disabled={sendingAlert} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              {sendingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : '📧 Notificar'}
            </Button>
          </motion.div>
        )}

        {/* Chart */}
        <Card className="p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Stock vs. Demanda (próximos 14 días)
          </h2>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Sin datos de ingredientes</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" name="Stock actual" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => {
                    const c = { critical: '#DC2626', warning: '#F59E0B', attention: '#3B82F6', ok: '#10B981' }[d.urgency];
                    return <Cell key={i} fill={c} />;
                  })}
                </Bar>
                <Bar dataKey="needed_14d" name="Demanda prevista (14d)" fill="#E8294A" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Predictions table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Predicciones detalladas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Ingrediente</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Demanda/día</th>
                  <th className="px-4 py-3 text-right">Días supply</th>
                  <th className="px-4 py-3 text-right">14 días</th>
                  <th className="px-4 py-3 text-right">30 días</th>
                  <th className="px-4 py-3 text-right text-strawberry">Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map(p => {
                  const style = URGENCY_STYLES[p.urgency];
                  const Icon = style.icon;
                  return (
                    <tr key={p.ingredient_id} className={`border-b border-border ${style.bg} hover:opacity-90 transition-opacity`}>
                      <td className="px-4 py-3 font-semibold">
                        {p.name}
                        <p className="text-[10px] text-muted-foreground font-normal">{p.linked_product_count} producto(s) · {p.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`${style.color} ${style.bg} ${style.border} border gap-1`}>
                          <Icon className="w-3 h-3" /> {style.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{p.current_stock}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{p.daily_demand}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${style.color}`}>
                        {p.days_of_supply >= 999 ? '∞' : `${p.days_of_supply}d`}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{p.predicted_14d}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.predicted_30d}</td>
                      <td className="px-4 py-3 text-right">
                        {p.suggested_order > 0 ? (
                          <span className="font-bold text-strawberry inline-flex items-center gap-1">
                            <ArrowDown className="w-3 h-3" /> {p.suggested_order}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {predictions.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted-foreground py-12">
                    Sin ingredientes registrados. Agrega ingredientes en el panel de admin.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Methodology */}
        <Card className="p-5 bg-muted/30">
          <h3 className="font-semibold text-sm mb-2">📚 ¿Cómo funciona la predicción?</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Analiza pedidos de los últimos 30 días para calcular demanda diaria por producto</li>
            <li>Suma demanda recurrente de suscripciones activas y pedidos programados</li>
            <li>Mapea demanda de productos a ingredientes vía sus links configurados</li>
            <li>Punto de reorden = demanda durante 3 días de lead-time + buffer de seguridad</li>
            <li>Alertas se envían al admin cuando hay items críticos o bajo stock</li>
            <li>La automatización corre cada 24h y alerta automáticamente</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}