import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, DollarSign, Package, Clock, Award, Loader2, Calendar, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DriverStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Get driver profile
      const drivers = await base44.entities.Driver.filter({ user_email: user.email });
      if (!drivers[0]) {
        navigate('/');
        return;
      }

      const driverData = drivers[0];
      setDriver(driverData);

      // Get earnings
      const earningsData = await base44.entities.DriverEarnings.filter({ driver_email: user.email });
      if (earningsData[0]) setEarnings(earningsData[0]);

      // Get ratings
      const ratingsData = await base44.entities.DriverRating.filter({ driver_email: user.email }, '-created_date', 100);
      setRatings(ratingsData);

      // Get orders
      const ordersData = await base44.entities.DriverAssignment.filter({ driver_email: user.email }, '-assigned_at', 50);
      setOrders(ordersData);

      // Calculate daily stats for last 30 days
      const dailyMap = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap[dateStr] = { date: dateStr, deliveries: 0, earnings: 0 };
      }

      ordersData.forEach(order => {
        const dateStr = new Date(order.assigned_at).toISOString().split('T')[0];
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].deliveries++;
        }
      });

      setDailyStats(Object.values(dailyMap));
      setLoading(false);
    } catch (err) {
      console.error('Error loading driver stats:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  if (!driver) return null;

  const completedOrders = orders.filter(o => o.assignment_status === 'completed').length;
  const avgDeliveryTime = driver.average_delivery_time || 35;
  const acceptanceRate = driver.acceptance_rate || 100;
  const cancellationRate = driver.cancellation_rate || 0;

  const stats = [
    { label: 'Balance Actual', value: `$${earnings?.balance?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Ganancia Total', value: `$${earnings?.total_earned?.toFixed(0) || '0'}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Entregas', value: driver.total_deliveries || 0, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Calificación', value: `${driver.average_rating?.toFixed(1) || '5.0'} ⭐`, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  const performanceMetrics = [
    { label: 'Tasa de Aceptación', value: `${acceptanceRate}%`, color: 'text-green-600' },
    { label: 'Tiempo Promedio', value: `${avgDeliveryTime} min`, color: 'text-blue-600' },
    { label: 'Tasa Cancelación', value: `${cancellationRate}%`, color: 'text-red-600' },
    { label: 'Promedio por Entrega', value: `$${(earnings?.avg_earnings_per_delivery || 8).toFixed(2)}`, color: 'text-green-600' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            {driver.photo_url && (
              <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover border-4 border-strawberry" />
            )}
            <div>
              <h1 className="font-poppins font-bold text-3xl">{driver.full_name}</h1>
              <p className="text-muted-foreground text-sm">🚗 {driver.vehicle_model} · {driver.vehicle_plate}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={driver.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {driver.is_available ? '🟢 Disponible' : '🔴 No disponible'}
                </Badge>
                <Badge variant="outline">{driver.is_active ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${stat.bg} rounded-2xl border border-border p-4`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className={`font-black text-2xl ${stat.color}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`w-5 h-5 ${stat.color} opacity-60`} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Performance Metrics */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-8">
            <h2 className="font-poppins font-bold text-xl mb-4">Métricas de Desempeño</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, i) => (
                <div key={i} className="text-center p-4 bg-muted rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                  <p className={`font-bold text-lg ${metric.color}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="daily" className="flex-1">Entregas Diarias</TabsTrigger>
              <TabsTrigger value="ratings" className="flex-1">Calificaciones</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1">Historial</TabsTrigger>
            </TabsList>

            {/* Daily Deliveries Chart */}
            <TabsContent value="daily">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">Últimos 30 Días</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [value, 'Entregas']} />
                    <Line type="monotone" dataKey="deliveries" stroke="var(--strawberry)" strokeWidth={2} dot={{ fill: 'var(--strawberry)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Ratings Distribution */}
            <TabsContent value="ratings">
              <div className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold mb-4">Distribución de Calificaciones ({ratings.length} total)</h3>
                  {ratings.length > 0 ? (
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = ratings.filter(r => r.rating === star).length;
                        const percent = (count / ratings.length) * 100;
                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="w-8 text-sm font-semibold">{star}⭐</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-strawberry" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-sm font-medium w-12">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sin calificaciones aún</p>
                  )}
                </div>

                {/* Recent Reviews */}
                {ratings.slice(0, 5).length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-semibold mb-4">Reseñas Recientes</h3>
                    <div className="space-y-3">
                      {ratings.slice(0, 5).map((review, i) => (
                        <div key={i} className="border-b border-border pb-3 last:border-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <p className="text-sm font-medium">{review.customer_email?.split('@')[0]}</p>
                              <p className="text-xs text-muted-foreground">{new Date(review.created_date).toLocaleDateString('es-MX')}</p>
                            </div>
                            <span className="text-lg">{'⭐'.repeat(review.rating)}</span>
                          </div>
                          {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Orders History */}
            <TabsContent value="orders">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">Últimas Entregas</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.slice(0, 20).map((order, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-bold text-strawberry">#{order.order_id?.substring(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.assigned_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      <Badge className={
                        order.assignment_status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.assignment_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {order.assignment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}