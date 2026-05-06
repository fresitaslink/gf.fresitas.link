import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Download, Loader2, TrendingUp, Users, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AnalyticsAdvanced() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [driverRatings, setDriverRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // week, month, year

  useEffect(() => {
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      navigate('/');
      return;
    }

    loadAnalyticsData();
  }, [user, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      const [ordersData, productsData, ratingsData] = await Promise.all([
        base44.entities.Order.filter({ status: 'delivered' }, '-created_date', 1000),
        base44.entities.Product.list('-created_date', 200),
        base44.entities.DriverRating.filter({}, '-created_date', 500)
      ]);

      setOrders(ordersData);
      setProducts(productsData);
      setDriverRatings(ratingsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setLoading(false);
    }
  };

  // Calculate monthly revenue
  const monthlyRevenue = () => {
    const data = {};
    orders.forEach(order => {
      const date = new Date(order.created_date);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      data[key] = (data[key] || 0) + order.total;
    });

    return Object.entries(data)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([key, value]) => ({ month: key, revenue: value.toFixed(2) }));
  };

  // Conversion rate by category
  const conversionByCategory = () => {
    const categoryStats = {};

    products.forEach(product => {
      if (!categoryStats[product.category]) {
        categoryStats[product.category] = {
          total: 0,
          sold: 0
        };
      }
      categoryStats[product.category].total++;

      const productOrders = orders.filter(o =>
        o.items.some(item => item.product_id === product.id)
      );
      categoryStats[product.category].sold += productOrders.length;
    });

    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      conversion: stats.total > 0 ? ((stats.sold / stats.total) * 100).toFixed(1) : 0,
      views: stats.total,
      sales: stats.sold
    }));
  };

  // Average delivery time by zone
  const deliveryTimeByZone = () => {
    const zoneStats = {};

    orders.forEach(order => {
      const zone = getZoneFromCoords(order.delivery_lat, order.delivery_lng);
      if (!zoneStats[zone]) {
        zoneStats[zone] = { times: [], count: 0 };
      }

      if (order.created_date && order.updated_date) {
        const time = Math.floor(
          (new Date(order.updated_date) - new Date(order.created_date)) / 60000
        ); // minutes
        if (time > 0 && time < 200) { // Filter outliers
          zoneStats[zone].times.push(time);
        }
      }
    });

    return Object.entries(zoneStats)
      .map(([zone, stats]) => ({
        zone,
        avgTime: stats.times.length > 0
          ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(0)
          : 0,
        orders: stats.count
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 8);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const data = {
      'Ingresos Mensuales': monthlyRevenue(),
      'Conversión por Categoría': conversionByCategory(),
      'Entrega por Zona': deliveryTimeByZone()
    };

    let csv = '';

    // Monthly revenue
    csv += 'INGRESOS MENSUALES\nMes,Ingresos\n';
    data['Ingresos Mensuales'].forEach(row => {
      csv += `${row.month},$${row.revenue}\n`;
    });
    csv += '\n\n';

    // Conversion
    csv += 'CONVERSIÓN POR CATEGORÍA\nCategoría,Conversión %,Vistas,Ventas\n';
    data['Conversión por Categoría'].forEach(row => {
      csv += `${row.category},${row.conversion}%,${row.views},${row.sales}\n`;
    });
    csv += '\n\n';

    // Delivery time
    csv += 'TIEMPO PROMEDIO ENTREGA\nZona,Minutos Promedio,Pedidos\n';
    data['Entrega por Zona'].forEach(row => {
      csv += `${row.zone},${row.avgTime},${row.orders}\n`;
    });

    // Download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('Reporte descargado ✅');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  const revenueData = monthlyRevenue();
  const conversionData = conversionByCategory();
  const deliveryData = deliveryTimeByZone();
  const totalRevenue = revenueData.reduce((sum, d) => sum + parseFloat(d.revenue), 0);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-poppins font-black text-3xl">📊 Analítica Avanzada</h1>
              <p className="text-muted-foreground mt-1">Métricas detalladas de negocio</p>
            </div>
            <Button
              onClick={handleExportCSV}
              className="bg-strawberry hover:bg-strawberry/90 text-white gap-2 rounded-xl"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Total Ingresos
              </p>
              <p className="font-black text-2xl text-strawberry">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Órdenes
              </p>
              <p className="font-black text-2xl text-blue-600">{orders.length}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Productos
              </p>
              <p className="font-black text-2xl text-purple-600">{products.length}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Promedio Entrega
              </p>
              <p className="font-black text-2xl text-orange-600">
                {deliveryData.length > 0
                  ? Math.round(deliveryData.reduce((sum, d) => sum + parseInt(d.avgTime), 0) / deliveryData.length)
                  : 0}
                min
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Revenue */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Ingresos Mensuales</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--strawberry))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--strawberry))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Conversion by Category */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Tasa Conversión por Categoría</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" stroke="var(--muted-foreground)" angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="conversion" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery Time by Zone Table */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-bold text-lg mb-4">Tiempo Promedio Entrega por Zona</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-bold">Zona</th>
                    <th className="text-right py-3 px-4 font-bold">Promedio (min)</th>
                    <th className="text-right py-3 px-4 font-bold">Pedidos</th>
                    <th className="text-right py-3 px-4 font-bold">Velocidad</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryData.map((zone, i) => {
                    const speed = parseInt(zone.avgTime) < 35 ? '🟢 Rápida' : 
                                  parseInt(zone.avgTime) < 50 ? '🟡 Normal' : '🔴 Lenta';
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-semibold">{zone.zone}</td>
                        <td className="py-3 px-4 text-right font-bold text-strawberry">{zone.avgTime}</td>
                        <td className="py-3 px-4 text-right">{zone.orders}</td>
                        <td className="py-3 px-4 text-right">{speed}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function getZoneFromCoords(lat, lng) {
  if (!lat || !lng) return 'Sin ubicación';
  // Simple zone mapping
  const latZone = Math.floor(lat / 0.1) * 0.1;
  const lngZone = Math.floor(lng / 0.1) * 0.1;
  return `${latZone.toFixed(1)}, ${lngZone.toFixed(1)}`;
}