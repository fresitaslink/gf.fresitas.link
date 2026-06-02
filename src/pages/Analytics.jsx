import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Star, Package, RefreshCw, Zap, ArrowLeft, GitMerge, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConversionFunnel from '@/components/analytics/ConversionFunnel';
import DeliveryAnalyticsDashboard from '@/components/admin/DeliveryAnalyticsDashboard';
import SalesReport from '@/components/analytics/SalesReport';

const COLORS = ['#E8294A', '#5C2D0E', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6'];

const CAT_LABELS = {
  fresitas_crema: 'Fresitas & Crema', chocolate: 'Chocolate', combinados: 'Combinados',
  especiales: 'Especiales', bebidas: 'Bebidas', temporada: 'Temporada', otros: 'Otros'
};

function KPI({ label, value, sub, icon: IconComp, color = 'text-strawberry', bg = 'bg-strawberry/10', trend }) {
  const Icon = IconComp;
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`font-poppins font-black text-2xl ${color}`}>{value}</div>
      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');

  useEffect(() => {
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) { navigate('/'); return; }
    Promise.all([
      base44.entities.Order.list('-created_date', 1000),
      base44.entities.Product.list(),
      base44.entities.CustomerProfile.list('-created_date', 1000),
      base44.entities.Subscription.list('-created_date', 200),
    ]).then(([ord, prods, prof, subs]) => {
      setOrders(ord);
      setProducts(prods);
      setProfiles(prof);
      setSubscriptions(subs);
    }).finally(() => setLoading(false));
  }, [user]);

  const days = parseInt(range);

  const filteredOrders = useMemo(() =>
    orders.filter(o => new Date(o.created_date) > new Date(Date.now() - days * 86400000)),
    [orders, days]
  );

  const dailySales = useMemo(() => {
    const result = [];
    for (let i = Math.min(days, 30) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOrders = orders.filter(o => {
        const d = new Date(o.created_date);
        return d.toDateString() === date.toDateString() && o.status !== 'cancelled';
      });
      result.push({
        date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        ventas: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        pedidos: dayOrders.length,
      });
    }
    return result;
  }, [orders, days]);

  const topProducts = useMemo(() => {
    const counts = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.name || item.product_id;
        if (!counts[key]) counts[key] = { name: key, cantidad: 0, revenue: 0 };
        counts[key].cantidad += item.quantity || 1;
        counts[key].revenue += item.price || 0;
      });
    });
    return Object.values(counts).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
  }, [filteredOrders]);

  const categoryRevenue = useMemo(() => {
    const cats = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const cat = product?.category || 'otros';
        if (!cats[cat]) cats[cat] = { name: CAT_LABELS[cat] || cat, value: 0 };
        cats[cat].value += item.price || 0;
      });
    });
    return Object.values(cats).sort((a, b) => b.value - a.value);
  }, [filteredOrders, products]);

  const paymentMethods = useMemo(() => {
    const methods = {};
    filteredOrders.forEach(o => {
      const m = o.payment_method || 'otro';
      methods[m] = (methods[m] || 0) + 1;
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const hourlyHeatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hora: `${h}:00`, pedidos: 0 }));
    filteredOrders.forEach(o => {
      const h = new Date(o.created_date).getHours();
      hours[h].pedidos++;
    });
    return hours.filter(h => {
      const hour = parseInt(h.hora);
      return hour >= 8 && hour <= 23;
    });
  }, [filteredOrders]);

  const customerGrowth = useMemo(() => {
    const result = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = profiles.filter(p => {
        const d = new Date(p.created_date);
        return d >= weekStart && d < weekEnd;
      }).length;
      result.push({ semana: `S${8 - i}`, clientes: count });
    }
    return result;
  }, [profiles]);

  const totalRevenue = filteredOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.filter(o => o.status !== 'cancelled').length : 0;
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-7xl mx-auto py-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !['admin', 'owner', 'manager'].includes(user.role)) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Admin
              </Button>
              <h1 className="font-poppins font-black text-3xl text-foreground">Analytics</h1>
              <p className="text-muted-foreground text-sm">Métricas de rendimiento · Fresitas G&F</p>
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-44 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="14">Últimos 14 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="metrics">
            <TabsList className="mb-6 rounded-xl bg-muted">
              <TabsTrigger value="metrics" className="rounded-lg text-xs">Métricas</TabsTrigger>
              <TabsTrigger value="report" className="rounded-lg text-xs flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Reporte Ventas
              </TabsTrigger>
              <TabsTrigger value="funnel" className="rounded-lg text-xs flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5" /> Embudo de Conversión
              </TabsTrigger>
              <TabsTrigger value="delivery" className="rounded-lg text-xs flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Entregas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="report">
              <SalesReport orders={orders} products={products} range={range} />
            </TabsContent>

            <TabsContent value="funnel">
              <ConversionFunnel orders={orders} profiles={profiles} />
            </TabsContent>

            <TabsContent value="delivery">
              <DeliveryAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="metrics">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <KPI label="Ingresos" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
            <KPI label="Pedidos" value={filteredOrders.length} icon={ShoppingBag} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <KPI label="Ticket Promedio" value={`$${avgOrderValue.toFixed(0)}`} icon={TrendingUp} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
            <KPI label="Completados" value={completedOrders} icon={Package} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
            <KPI label="Cancelados" value={cancelledOrders} sub={filteredOrders.length > 0 ? `${Math.round((cancelledOrders/filteredOrders.length)*100)}% tasa` : ''} icon={TrendingDown} color="text-red-500" bg="bg-red-50 dark:bg-red-900/20" />
            <KPI label="Suscripciones" value={activeSubscriptions} icon={Zap} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
          </div>

          {/* Daily Sales */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h3 className="font-poppins font-bold text-lg mb-4">Ventas Diarias</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8294A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#E8294A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, n) => [n === 'ventas' ? `$${Number(v).toFixed(2)}` : v, n === 'ventas' ? 'Ventas' : 'Pedidos']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Area type="monotone" dataKey="ventas" stroke="#E8294A" strokeWidth={2.5} fill="url(#gVentas)" />
                <Area type="monotone" dataKey="pedidos" stroke="#5C2D0E" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Products */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-poppins font-bold text-lg mb-4">Productos Más Vendidos</h3>
              {topProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Sin datos en este período</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={110} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
                    <Bar dataKey="cantidad" fill="#E8294A" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Pie */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-poppins font-bold text-lg mb-4">Ingresos por Categoría</h3>
              {categoryRevenue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Sin datos en este período</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categoryRevenue} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Ingresos']} contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Hourly Heatmap */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-poppins font-bold text-lg mb-4">Pedidos por Hora del Día</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyHeatmap}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hora" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
                  <Bar dataKey="pedidos" fill="#5C2D0E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Methods */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-poppins font-bold text-lg mb-4">Métodos de Pago</h3>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentMethods} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Customer Growth */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h3 className="font-poppins font-bold text-lg mb-4">Crecimiento de Clientes (8 semanas)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
                <Line type="monotone" dataKey="clientes" stroke="#E8294A" strokeWidth={2.5} dot={{ fill: '#E8294A', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subscriptions breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {['active', 'paused', 'cancelled'].map((status, i) => {
              const count = subscriptions.filter(s => s.status === status).length;
              const labels = { active: 'Suscripciones Activas', paused: 'Pausadas', cancelled: 'Canceladas' };
              const colors = { active: 'text-green-600', paused: 'text-amber-600', cancelled: 'text-red-500' };
              const bgs = { active: 'bg-green-50 dark:bg-green-900/20', paused: 'bg-amber-50 dark:bg-amber-900/20', cancelled: 'bg-red-50 dark:bg-red-900/20' };
              return (
                <div key={status} className={`${bgs[status]} rounded-2xl p-5 text-center`}>
                  <div className={`font-poppins font-black text-3xl ${colors[status]}`}>{count}</div>
                  <p className="text-sm text-muted-foreground mt-1">{labels[status]}</p>
                </div>
              );
            })}
          </div>

            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}