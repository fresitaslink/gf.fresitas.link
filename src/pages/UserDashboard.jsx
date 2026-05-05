import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ShoppingBag, DollarSign, Star, TrendingUp, Download, FileText,
  Calendar, Package, Award, Clock, Filter, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const COLORS = ['#e8345e', '#c0392b', '#f39c12', '#27ae60', '#8e44ad', '#2980b9'];

const STATUS_LABELS = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  on_the_way: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado'
};

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
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

export default function UserDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    Promise.all([
      base44.entities.Order.filter({ user_email: user.email }, '-created_date', 200),
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
      base44.entities.LoyaltyTransaction.filter({ user_email: user.email }, '-created_date', 100),
    ]).then(([ords, profiles, loyalty]) => {
      setOrders(ords);
      setProfile(profiles[0] || null);
      setLoyaltyHistory(loyalty);
    }).finally(() => setLoading(false));
  }, [user]);

  const cutoff = useMemo(() => {
    const days = parseInt(dateRange);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }, [dateRange]);

  const filteredOrders = useMemo(() =>
    orders.filter(o => new Date(o.created_date) >= cutoff), [orders, cutoff]);

  // Spending over time
  const spendingData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const d = new Date(o.created_date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      map[d] = (map[d] || 0) + (o.total || 0);
    });
    return Object.entries(map).map(([date, total]) => ({ date, total: parseFloat(total.toFixed(2)) }));
  }, [filteredOrders]);

  // Orders by status
  const statusData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ name: STATUS_LABELS[status] || status, value: count }));
  }, [filteredOrders]);

  // Loyalty points over time
  const loyaltyData = useMemo(() => {
    let running = 0;
    return [...loyaltyHistory].reverse().map(tx => {
      running += tx.type === 'earned' ? tx.points : -tx.points;
      return {
        date: new Date(tx.created_date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        points: running,
      };
    });
  }, [loyaltyHistory]);

  // Category spending
  const categoryData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const cat = item.category || 'Otro';
        map[cat] = (map[cat] || 0) + (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [filteredOrders]);

  const totalSpent = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = filteredOrders.length ? totalSpent / filteredOrders.length : 0;
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

  const exportCSV = () => {
    const rows = filteredOrders.map(o => ({
      fecha: new Date(o.created_date).toLocaleString('es-MX'),
      codigo: o.tracking_code || '',
      total: o.total,
      estado: STATUS_LABELS[o.status] || o.status,
      metodo_pago: o.payment_method || '',
      items: o.items?.length || 0,
    }));
    if (!rows.length) { toast.error('Sin datos en este rango'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mis_pedidos_fresitas.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(232, 52, 94);
    doc.text('Fresitas G&F — Mi Reporte', 20, 20);
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Usuario: ${user?.full_name || user?.email}`, 20, 32);
    doc.text(`Periodo: últimos ${dateRange} días`, 20, 40);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 20, 48);

    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen', 20, 62);
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total de pedidos: ${filteredOrders.length}`, 20, 72);
    doc.text(`Total gastado: $${totalSpent.toFixed(2)}`, 20, 80);
    doc.text(`Promedio por pedido: $${avgOrder.toFixed(2)}`, 20, 88);
    doc.text(`Puntos de lealtad: ${profile?.loyalty_points || 0}`, 20, 96);
    doc.text(`Entregados: ${deliveredOrders.length}`, 20, 104);

    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Historial de Pedidos', 20, 118);
    let y = 128;
    filteredOrders.slice(0, 20).forEach(o => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`${new Date(o.created_date).toLocaleDateString('es-MX')}  #${o.tracking_code || '—'}  $${o.total?.toFixed(2)}  ${STATUS_LABELS[o.status] || o.status}`, 20, y);
      y += 8;
    });

    doc.save(`reporte_fresitas_${dateRange}dias.pdf`);
    toast.success('PDF descargado');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-5xl mx-auto py-8 space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-poppins font-bold text-3xl text-foreground">
                {language === 'es' ? 'Mi Dashboard' : 'My Dashboard'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {language === 'es' ? 'Tu actividad y estadísticas personales' : 'Your personal activity and stats'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 rounded-xl">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{language === 'es' ? 'Últimos 7 días' : 'Last 7 days'}</SelectItem>
                  <SelectItem value="30">{language === 'es' ? 'Últimos 30 días' : 'Last 30 days'}</SelectItem>
                  <SelectItem value="90">{language === 'es' ? 'Últimos 3 meses' : 'Last 3 months'}</SelectItem>
                  <SelectItem value="365">{language === 'es' ? 'Último año' : 'Last year'}</SelectItem>
                  <SelectItem value="9999">{language === 'es' ? 'Todo el tiempo' : 'All time'}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportCSV} variant="outline" size="sm" className="rounded-xl gap-1.5">
                <FileText className="w-4 h-4" /> CSV
              </Button>
              <Button onClick={exportPDF} variant="outline" size="sm" className="rounded-xl gap-1.5">
                <Download className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={ShoppingBag} label={language === 'es' ? 'Pedidos' : 'Orders'} value={filteredOrders.length} sub={language === 'es' ? `${deliveredOrders.length} entregados` : `${deliveredOrders.length} delivered`} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
            <StatCard icon={DollarSign} label={language === 'es' ? 'Total Gastado' : 'Total Spent'} value={`$${totalSpent.toFixed(0)}`} sub={language === 'es' ? `~$${avgOrder.toFixed(0)} promedio` : `~$${avgOrder.toFixed(0)} avg`} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
            <StatCard icon={Award} label={language === 'es' ? 'Puntos Lealtad' : 'Loyalty Pts'} value={profile?.loyalty_points || 0} sub={language === 'es' ? `= $${(((profile?.loyalty_points || 0) / 100) * 5).toFixed(2)} desc.` : `= $${(((profile?.loyalty_points || 0) / 100) * 5).toFixed(2)} off`} color="text-strawberry" bg="bg-strawberry/10" />
            <StatCard icon={TrendingUp} label={language === 'es' ? 'Total Histórico' : 'All-Time Orders'} value={orders.length} sub={language === 'es' ? 'todos tus pedidos' : 'all your orders'} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
          </div>

          {/* Charts */}
          <Tabs defaultValue="spending">
            <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto">
              <TabsTrigger value="spending" className="flex-1 rounded-lg text-xs">{language === 'es' ? 'Gastos' : 'Spending'}</TabsTrigger>
              <TabsTrigger value="status" className="flex-1 rounded-lg text-xs">{language === 'es' ? 'Estados' : 'Status'}</TabsTrigger>
              <TabsTrigger value="loyalty" className="flex-1 rounded-lg text-xs">{language === 'es' ? 'Puntos' : 'Points'}</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 rounded-lg text-xs">{language === 'es' ? 'Historial' : 'History'}</TabsTrigger>
            </TabsList>

            {/* Spending Chart */}
            <TabsContent value="spending">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-poppins font-semibold text-lg mb-6">{language === 'es' ? 'Gasto por Día' : 'Daily Spending'}</h3>
                {spendingData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={spendingData}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e8345e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#e8345e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={v => [`$${v}`, language === 'es' ? 'Gasto' : 'Spent']} />
                      <Area type="monotone" dataKey="total" stroke="#e8345e" strokeWidth={2} fill="url(#colorSpend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    {language === 'es' ? 'Sin pedidos en este periodo' : 'No orders in this period'}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Status Pie */}
            <TabsContent value="status">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-poppins font-semibold text-lg mb-6">{language === 'es' ? 'Pedidos por Estado' : 'Orders by Status'}</h3>
                {statusData.length > 0 ? (
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 min-w-[160px]">
                      {statusData.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-foreground">{s.name}</span>
                          <span className="ml-auto font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    {language === 'es' ? 'Sin pedidos en este periodo' : 'No orders in this period'}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Loyalty Points Chart */}
            <TabsContent value="loyalty">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-poppins font-semibold text-lg mb-6">{language === 'es' ? 'Evolución de Puntos' : 'Points Over Time'}</h3>
                {loyaltyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={loyaltyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [v, language === 'es' ? 'Puntos' : 'Points']} />
                      <Line type="monotone" dataKey="points" stroke="#e8345e" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    {language === 'es' ? 'Aún no tienes historial de puntos' : 'No points history yet'}
                  </div>
                )}

                {/* Loyalty breakdown */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                    <div className="font-bold text-2xl text-green-600">
                      +{loyaltyHistory.filter(t => t.type === 'earned').reduce((s, t) => s + t.points, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Puntos ganados' : 'Points earned'}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                    <div className="font-bold text-2xl text-red-500">
                      -{loyaltyHistory.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.points, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Puntos canjeados' : 'Points redeemed'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Order History Table */}
            <TabsContent value="history">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-poppins font-semibold">{language === 'es' ? 'Historial de Pedidos' : 'Order History'}</h3>
                  <Badge variant="outline">{filteredOrders.length} {language === 'es' ? 'pedidos' : 'orders'}</Badge>
                </div>
                {filteredOrders.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredOrders.map(o => (
                      <div key={o.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-strawberry/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-strawberry" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm font-mono">#{o.tracking_code || o.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${o.total?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{o.items?.length || 0} items</p>
                        </div>
                        <Badge className={`text-xs hidden sm:flex ${
                          o.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          o.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {STATUS_LABELS[o.status] || o.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center text-muted-foreground">
                    <Package className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">{language === 'es' ? 'Sin pedidos en este periodo' : 'No orders in this period'}</p>
                    <Link to="/menu">
                      <Button size="sm" className="mt-4 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
                        {language === 'es' ? 'Ver el Menú' : 'View Menu'}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}