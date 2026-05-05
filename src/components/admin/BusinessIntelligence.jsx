import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, MapPin, Star, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import OrdersMap from './OrdersMap';

const COLORS = ['#E8294A', '#5C2D0E', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
const CAT_LABELS = {
  fresitas_crema: 'Fresitas & Crema', chocolate: 'Chocolate', combinados: 'Combinados',
  especiales: 'Especiales', bebidas: 'Bebidas', temporada: 'Temporada', otros: 'Otros'
};

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function KPI({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`font-poppins font-bold text-2xl ${color}`}>{value}</div>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BusinessIntelligence() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 1000),
      base44.entities.Product.list(),
      base44.entities.CustomerProfile.list('-created_date', 1000),
    ]).then(([ord, prods, prof]) => {
      setOrders(ord);
      setProducts(prods);
      setProfiles(prof);
    }).finally(() => setLoading(false));
  }, []);

  const validOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);
  const yearOrders = useMemo(() => validOrders.filter(o => new Date(o.created_date).getFullYear() === parseInt(year)), [validOrders, year]);

  // Monthly sales
  const monthlySales = useMemo(() => {
    const map = Array.from({ length: 12 }, (_, i) => ({ mes: MONTHS_ES[i], ventas: 0, pedidos: 0 }));
    yearOrders.forEach(o => {
      const m = new Date(o.created_date).getMonth();
      map[m].ventas += o.total || 0;
      map[m].pedidos += 1;
    });
    return map.map(m => ({ ...m, ventas: parseFloat(m.ventas.toFixed(2)) }));
  }, [yearOrders]);

  // Top products by category
  const productsByCategory = useMemo(() => {
    const cats = {};
    validOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const cat = product?.category || 'otros';
        if (!cats[cat]) cats[cat] = {};
        const name = item.name || 'Producto';
        cats[cat][name] = (cats[cat][name] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(cats).map(([cat, items]) => ({
      category: CAT_LABELS[cat] || cat,
      top: Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
    }));
  }, [validOrders, products]);

  // Category revenue for pie
  const categoryRevenue = useMemo(() => {
    const cats = {};
    validOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const cat = CAT_LABELS[product?.category || 'otros'];
        cats[cat] = (cats[cat] || 0) + (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [validOrders, products]);

  // Payment method distribution
  const paymentData = useMemo(() => {
    const map = {};
    validOrders.forEach(o => {
      const pm = o.payment_method || 'otro';
      map[pm] = (map[pm] || 0) + 1;
    });
    const labels = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [validOrders]);

  // Orders with geo data for map
  const geoOrders = useMemo(() => orders.filter(o => o.delivery_lat && o.delivery_lng), [orders]);

  const totalRevenue = yearOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket = yearOrders.length ? totalRevenue / yearOrders.length : 0;
  const avgRating = validOrders.filter(o => o.rating).reduce((s, o, _, a) => s + o.rating / a.length, 0);
  const todayRevenue = validOrders.filter(o => new Date(o.created_date).toDateString() === new Date().toDateString()).reduce((s, o) => s + (o.total || 0), 0);

  const years = [...new Set(orders.map(o => new Date(o.created_date).getFullYear()))].sort().reverse();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year filter */}
      <div className="flex items-center justify-between">
        <h2 className="font-poppins font-bold text-xl">Business Intelligence</h2>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.length > 0 ? years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            )) : <SelectItem value={year}>{year}</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Ingresos del Año" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" sub={`Hoy: $${todayRevenue.toFixed(0)}`} />
        <KPI label="Pedidos del Año" value={yearOrders.length} icon={ShoppingBag} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" sub={`Ticket prom: $${avgTicket.toFixed(0)}`} />
        <KPI label="Clientes Registrados" value={profiles.length} icon={Users} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
        <KPI label="Calificación Promedio" value={avgRating ? `${avgRating.toFixed(1)} ⭐` : 'N/A'} icon={Star} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="w-full rounded-xl bg-muted flex-wrap h-auto mb-4">
          <TabsTrigger value="monthly" className="flex-1 rounded-lg text-xs">Ventas Mensuales</TabsTrigger>
          <TabsTrigger value="products" className="flex-1 rounded-lg text-xs">Productos</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1 rounded-lg text-xs">Categorías</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 rounded-lg text-xs">Pagos</TabsTrigger>
          <TabsTrigger value="map" className="flex-1 rounded-lg text-xs">Mapa de Calor</TabsTrigger>
        </TabsList>

        {/* Monthly Sales */}
        <TabsContent value="monthly">
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-poppins font-bold text-lg mb-1">📈 Ventas Mensuales {year}</h3>
            <p className="text-xs text-muted-foreground mb-4">Ingresos y número de pedidos por mes</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySales} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v, name) => [name === 'ventas' ? `$${v.toFixed(2)}` : v, name === 'ventas' ? 'Ventas' : 'Pedidos']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="ventas" fill="#E8294A" radius={[6, 6, 0, 0]} name="ventas" />
                <Bar yAxisId="right" dataKey="pedidos" fill="#5C2D0E" radius={[6, 6, 0, 0]} name="pedidos" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Top Products by Category */}
        <TabsContent value="products">
          <div className="space-y-4">
            {productsByCategory.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">Sin datos de ventas aún</div>
            ) : productsByCategory.map((cat, ci) => (
              <div key={ci} className="bg-card rounded-2xl border border-border p-5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-strawberry" />
                  {cat.category}
                  <Badge variant="outline" className="text-xs">{cat.top.reduce((s, p) => s + p.qty, 0)} vendidos</Badge>
                </h4>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={cat.top} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={110} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="qty" fill={COLORS[ci % COLORS.length]} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Category Revenue Pie */}
        <TabsContent value="categories">
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-poppins font-bold text-lg mb-4">🎯 Ingresos por Categoría</h3>
            {categoryRevenue.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin datos aún</p>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryRevenue} cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} dataKey="value">
                      {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Ingresos']} contentStyle={{ borderRadius: '12px' }} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 w-full lg:w-48 flex-shrink-0">
                  {categoryRevenue.sort((a, b) => b.value - a.value).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-semibold">${c.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Payment methods */}
        <TabsContent value="payments">
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-poppins font-bold text-lg mb-4">💳 Métodos de Pago</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" outerRadius={95} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Geographic Heat Map */}
        <TabsContent value="map">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-strawberry" />
              <h3 className="font-poppins font-bold text-lg">Mapa de Calor Geográfico</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Zonas con mayor concentración de pedidos. Los círculos rojos indican densidad.
              {geoOrders.length === 0 && ' (Los pedidos mostrarán su ubicación cuando el cliente la comparta en el checkout)'}
            </p>
            <OrdersMap orders={geoOrders.length > 0 ? geoOrders : orders} />
            <div className="mt-3 flex flex-wrap gap-2">
              {['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'].map(s => (
                <div key={s} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: { pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#f97316', on_the_way: '#8b5cf6', delivered: '#22c55e' }[s] }} />
                  <span className="text-muted-foreground">{{ pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando', on_the_way: 'En Camino', delivered: 'Entregado' }[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}