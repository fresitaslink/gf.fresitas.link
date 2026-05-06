import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, TrendingUp, MapPin, Users, Clock, AlertCircle, Download, BarChart3, Route } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#E8294A', '#5C2D0E', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6', '#06B6D4'];

function KPICard({ icon: IconComponent, label, value, unit = '', color = 'text-strawberry', bg = 'bg-strawberry/10' }) {
  const Icon = IconComponent;
  return (
    <motion.div whileHover={{ y: -2 }} className={`${bg} rounded-2xl p-4 border border-border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className={`font-black text-2xl ${color}`}>{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
        <Icon className={`w-5 h-5 ${color} opacity-60`} />
      </div>
    </motion.div>
  );
}

function ZonePerformanceCard({ zone, data }) {
  const successRate = data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(1) : 0;
  const avgTime = data.delivered > 0 ? (data.total_time / data.delivered).toFixed(1) : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">{zone}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.total} pedidos</p>
        </div>
        <Badge className={`text-xs ${parseFloat(successRate) >= 95 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
          {successRate}%
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted rounded-lg p-2">
          <p className="text-muted-foreground">Entregados</p>
          <p className="font-bold text-strawberry">{data.delivered}</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-muted-foreground">Promedio min</p>
          <p className="font-bold">{avgTime}</p>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryAnalyticsDashboard() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverRatings, setDriverRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500),
      base44.entities.Driver.list('-average_rating'),
      base44.entities.DriverRating.list('-created_date', 200),
    ]).then(([ord, drv, rat]) => {
      setOrders(ord);
      setDrivers(drv);
      setDriverRatings(rat);
    }).finally(() => setLoading(false));
  }, []);

  const days = parseInt(range);
  const filteredOrders = useMemo(() =>
    orders.filter(o => new Date(o.created_date) > new Date(Date.now() - days * 86400000) && o.status === 'delivered'),
    [orders, days]
  );

  // Métricas por zona
  const zoneMetrics = useMemo(() => {
    const zones = {};
    filteredOrders.forEach(o => {
      const lat = o.delivery_lat || 0;
      const lng = o.delivery_lng || 0;
      const latZone = Math.floor(lat * 2);
      const lngZone = Math.floor(lng * 2);
      const zone = `Z${latZone}_${lngZone}`;

      if (!zones[zone]) zones[zone] = { total: 0, delivered: 0, cancelled: 0, total_time: 0, count: 0 };
      zones[zone].total++;
      zones[zone].delivered++;

      const created = new Date(o.created_date);
      const updated = new Date(o.updated_date);
      const timeMinutes = (updated - created) / (1000 * 60);
      zones[zone].total_time += timeMinutes;
      zones[zone].count++;
    });

    return Object.entries(zones)
      .map(([z, d]) => ({ zone: z, ...d }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  // Ranking de conductores
  const driverRanking = useMemo(() => {
    return drivers
      .filter(d => d.is_active && d.total_deliveries > 0)
      .map(d => {
        const driverDeliveries = filteredOrders.filter(o => o.user_email === d.user_email);
        const avgTime = driverDeliveries.length > 0
          ? driverDeliveries.reduce((sum, o) => {
              const minutes = (new Date(o.updated_date) - new Date(o.created_date)) / (1000 * 60);
              return sum + minutes;
            }, 0) / driverDeliveries.length
          : 0;

        return {
          name: d.full_name,
          email: d.user_email,
          rating: d.average_rating || 5,
          deliveries: d.total_deliveries,
          recent_deliveries: driverDeliveries.length,
          avg_time_minutes: avgTime.toFixed(1),
          efficiency_score: (
            (d.average_rating / 5) * 40 +
            Math.min(d.acceptance_rate || 100, 100) / 100 * 30 +
            (100 - Math.min(d.cancellation_rate || 0, 100)) / 100 * 30
          ).toFixed(1),
        };
      })
      .sort((a, b) => parseFloat(b.efficiency_score) - parseFloat(a.efficiency_score));
  }, [drivers, filteredOrders]);

  // Tendencia de tiempo de entrega
  const deliveryTimeTrend = useMemo(() => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOrders = orders.filter(o => {
        const d = new Date(o.created_date);
        return d.toDateString() === date.toDateString() && o.status === 'delivered';
      });
      const avgTime = dayOrders.length > 0
        ? dayOrders.reduce((sum, o) => {
            const minutes = (new Date(o.updated_date) - new Date(o.created_date)) / (1000 * 60);
            return sum + minutes;
          }, 0) / dayOrders.length
        : 0;

      result.push({
        date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        minutes: avgTime.toFixed(1),
        count: dayOrders.length,
      });
    }
    return result;
  }, [orders, days]);

  // Tasa de éxito por zona
  const zoneSuccessData = useMemo(() => {
    return zoneMetrics.map(z => ({
      name: z.zone,
      rate: ((z.delivered / z.total) * 100).toFixed(1),
      total: z.total,
    }));
  }, [zoneMetrics]);

  const handleOptimizeRoutes = async () => {
    setOptimizing(true);
    try {
      const result = await base44.functions.invoke('optimizeDeliveryRoutes', {
        order_ids: orders
          .filter(o => o.status === 'confirmed' || o.status === 'preparing')
          .map(o => o.id)
      });
      
      if (result.data?.optimized_routes?.length > 0) {
        toast.success(`Rutas optimizadas: ${result.data.optimized_routes.length} clusters creados`);
      } else {
        toast.info('No hay pedidos activos para optimizar');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const totalDelivered = filteredOrders.length;
  const avgDeliveryTime = filteredOrders.length > 0
    ? (filteredOrders.reduce((sum, o) => {
        const minutes = (new Date(o.updated_date) - new Date(o.created_date)) / (1000 * 60);
        return sum + minutes;
      }, 0) / filteredOrders.length).toFixed(1)
    : 0;

  const successRate = orders.filter(o => o.status === 'delivered').length / orders.length * 100;

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-poppins font-bold text-2xl">Analítica de Entregas</h2>
          <p className="text-sm text-muted-foreground">Rendimiento, zonas y eficiencia de conductores</p>
        </div>
        <div className="flex gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleOptimizeRoutes}
            disabled={optimizing}
            className="bg-gradient-to-r from-strawberry to-orange-500 hover:from-strawberry/90 hover:to-orange-600 text-white gap-2 rounded-lg"
          >
            {optimizing ? <Zap className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
            Optimizar Rutas
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Entregas" value={totalDelivered} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
        <KPICard icon={Clock} label="Tiempo Promedio" value={avgDeliveryTime} unit="min" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        <KPICard icon={AlertCircle} label="Tasa Éxito" value={successRate.toFixed(1)} unit="%" color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
        <KPICard icon={MapPin} label="Zonas" value={zoneMetrics.length} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de tiempo de entrega */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-poppins font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Tendencia de Tiempo
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={deliveryTimeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
                formatter={(v) => [`${v} min`, 'Promedio']}
              />
              <Line type="monotone" dataKey="minutes" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tasa de éxito por zona */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-poppins font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" /> Éxito por Zona
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={zoneSuccessData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }}
                formatter={(v) => [`${v}%`, 'Tasa de Éxito']}
              />
              <Bar dataKey="rate" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Ranking de conductores */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-poppins font-bold text-lg mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-strawberry" /> Ranking de Eficiencia
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Conductor</th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Calificación</th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Entregas</th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Tiempo Prom</th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {driverRanking.slice(0, 10).map((driver, i) => (
                <tr key={driver.email} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-semibold">{i + 1}. {driver.name}</p>
                      <p className="text-xs text-muted-foreground">{driver.recent_deliveries} entregas en período</p>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30">
                      ⭐ {driver.rating.toFixed(1)}
                    </Badge>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="font-semibold">{driver.deliveries}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs font-mono">{driver.avg_time_minutes} min</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <div className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg px-3 py-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="font-bold text-sm">{driver.efficiency_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Desempeño por zona */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="font-poppins font-bold text-lg mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-strawberry" /> Rendimiento por Zona
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zoneMetrics.slice(0, 9).map(zone => (
            <ZonePerformanceCard key={zone.zone} zone={zone.zone} data={zone} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}