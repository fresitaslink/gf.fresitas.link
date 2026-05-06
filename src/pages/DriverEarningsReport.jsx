import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Package, Users, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DriverEarningsReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      navigate('/');
      return;
    }
    Promise.all([
      base44.entities.Driver.list(),
      base44.entities.Order.filter({ status: 'delivered' }, '-created_date', 1000),
    ]).then(([d, o]) => {
      setDrivers(d);
      setOrders(o);
      setLoading(false);
    });
  }, [user]);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (period === 'year') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    return new Date(0);
  }, [period]);

  const filtered = orders.filter(o => new Date(o.created_date) >= periodStart);

  // Per-driver breakdown
  const driverStats = drivers.map(d => {
    const dOrders = filtered.filter(o => o.assigned_driver_email === d.user_email);
    const deliveryFees = dOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
    const tips = dOrders.reduce((s, o) => s + (o.tip_amount || 0), 0);
    const earnings = deliveryFees + tips;
    return {
      driver_email: d.user_email,
      full_name: d.full_name,
      photo_url: d.photo_url,
      deliveries: dOrders.length,
      delivery_fees: deliveryFees,
      tips,
      earnings,
      avg_per_delivery: dOrders.length ? earnings / dOrders.length : 0,
    };
  }).filter(s => s.deliveries > 0).sort((a, b) => b.earnings - a.earnings);

  const totalEarnings = driverStats.reduce((s, d) => s + d.earnings, 0);
  const totalDeliveries = driverStats.reduce((s, d) => s + d.deliveries, 0);
  const totalTips = driverStats.reduce((s, d) => s + d.tips, 0);

  const chartData = driverStats.slice(0, 10).map(d => ({
    name: d.full_name?.split(' ')[0] || 'Driver',
    Tarifa: d.delivery_fees,
    Propinas: d.tips,
  }));

  const exportCSV = () => {
    const headers = ['Conductor', 'Email', 'Entregas', 'Tarifas', 'Propinas', 'Total', 'Promedio'];
    const rows = driverStats.map(d => [
      d.full_name, d.driver_email, d.deliveries,
      d.delivery_fees.toFixed(2), d.tips.toFixed(2),
      d.earnings.toFixed(2), d.avg_per_delivery.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganancias-conductores-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <div className="min-h-screen pt-20 flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="font-poppins font-bold text-3xl">Reporte de Ganancias</h1>
              <p className="text-muted-foreground text-sm">Ganancias por conductor y periodo</p>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Últimos 7 días</SelectItem>
                  <SelectItem value="month">Últimos 30 días</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                  <SelectItem value="all">Todo</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-strawberry" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Ganancias</p>
                  <p className="font-bold text-xl">${totalEarnings.toFixed(2)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Entregas</p>
                  <p className="font-bold text-xl">{totalDeliveries}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Propinas</p>
                  <p className="font-bold text-xl">${totalTips.toFixed(2)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Conductores Activos</p>
                  <p className="font-bold text-xl">{driverStats.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-4 mb-6">
            <h3 className="font-semibold mb-4">Top 10 Conductores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Tarifa" stackId="a" fill="hsl(var(--strawberry))" />
                <Bar dataKey="Propinas" stackId="a" fill="hsl(var(--gold))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Detailed breakdown */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Desglose por Conductor</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Conductor</th>
                    <th className="py-2 text-center">Entregas</th>
                    <th className="py-2 text-right">Tarifa</th>
                    <th className="py-2 text-right">Propinas</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {driverStats.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sin entregas en este periodo</td></tr>
                  ) : driverStats.map(d => (
                    <tr key={d.driver_email} className="border-b border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {d.photo_url && <img src={d.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />}
                          <div>
                            <p className="font-medium">{d.full_name}</p>
                            <p className="text-xs text-muted-foreground">{d.driver_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{d.deliveries}</td>
                      <td className="text-right">${d.delivery_fees.toFixed(2)}</td>
                      <td className="text-right text-gold">${d.tips.toFixed(2)}</td>
                      <td className="text-right font-bold text-strawberry">${d.earnings.toFixed(2)}</td>
                      <td className="text-right text-muted-foreground">${d.avg_per_delivery.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}