import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#E8294A', '#5C2D0E', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

function StatCard({ label, value, icon: IconComp, trend, color = 'text-strawberry' }) {
  const Icon = IconComp;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-card rounded-2xl border border-border p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className={`font-poppins font-black text-3xl mt-1 ${color}`}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-strawberry" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs semana anterior
        </div>
      )}
    </motion.div>
  );
}

export default function AdminAnalytics() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500),
      base44.entities.Product.list(),
      base44.entities.CustomerProfile.list('-created_date', 500),
    ]).then(([ord, prods, prof]) => {
      setOrders(ord);
      setProducts(prods);
      setProfiles(prof);
    }).finally(() => setLoading(false));
  }, []);

  const dailySales = useMemo(() => {
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      const dayOrders = orders.filter(o => {
        const d = new Date(o.created_date);
        return d.toDateString() === date.toDateString() && o.status !== 'cancelled';
      });
      last14.push({
        date: dayStr,
        ventas: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        pedidos: dayOrders.length,
      });
    }
    return last14;
  }, [orders]);

  const topProducts = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.name || item.product_id;
        if (!counts[key]) counts[key] = { name: key, cantidad: 0, revenue: 0 };
        counts[key].cantidad += item.quantity || 1;
        counts[key].revenue += item.price || 0;
      });
    });
    return Object.values(counts).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6);
  }, [orders]);

  const categoryRevenue = useMemo(() => {
    const cats = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const cat = product?.category || 'otros';
        if (!cats[cat]) cats[cat] = { name: cat, value: 0 };
        cats[cat].value += item.price || 0;
      });
    });
    return Object.values(cats);
  }, [orders, products]);

  const customerGrowth = useMemo(() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = profiles.filter(p => {
        const d = new Date(p.created_date);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ semana: `S${8 - i}`, clientes: count });
    }
    return weeks;
  }, [profiles]);

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const todayRevenue = orders.filter(o => new Date(o.created_date).toDateString() === new Date().toDateString() && o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const weekRevenue = orders.filter(o => new Date(o.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const avgRating = orders.filter(o => o.rating).reduce((s, o, _, a) => s + o.rating / a.length, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const catLabels = {
    fresitas_crema: 'Fresitas & Crema', chocolate: 'Chocolate', combinados: 'Combinados',
    especiales: 'Especiales', bebidas: 'Bebidas', temporada: 'Temporada', otros: 'Otros'
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ingresos Hoy" value={`$${todayRevenue.toFixed(0)}`} icon={DollarSign} color="text-green-600" />
        <StatCard label="Esta Semana" value={`$${weekRevenue.toFixed(0)}`} icon={TrendingUp} color="text-blue-600" />
        <StatCard label="Total Clientes" value={profiles.length} icon={Users} color="text-purple-600" />
        <StatCard label="Calificación" value={avgRating ? `${avgRating.toFixed(1)}⭐` : 'N/A'} icon={Star} color="text-amber-500" />
      </div>

      {/* Daily Sales Chart */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-poppins font-bold text-lg mb-4">📈 Ventas Diarias (14 días)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailySales}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8294A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E8294A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Ventas']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
            <Area type="monotone" dataKey="ventas" stroke="#E8294A" strokeWidth={2} fill="url(#colorVentas)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-poppins font-bold text-lg mb-4">🍓 Productos Más Vendidos</h3>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="cantidad" fill="#E8294A" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Pie */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-poppins font-bold text-lg mb-4">🎯 Ingresos por Categoría</h3>
          {categoryRevenue.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryRevenue.map(c => ({ ...c, name: catLabels[c.name] || c.name }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                  {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Ingresos']} contentStyle={{ borderRadius: '12px' }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Customer Growth */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-poppins font-bold text-lg mb-4">👥 Crecimiento de Clientes (8 semanas)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={customerGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: '12px' }} />
            <Line type="monotone" dataKey="clientes" stroke="#5C2D0E" strokeWidth={2.5} dot={{ fill: '#5C2D0E', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}