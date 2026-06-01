import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { DollarSign, TrendingUp, ShoppingBag, Clock, Award, Star, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const COLORS = ['#E8294A', '#5C2D0E', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6'];

const HOUR_LABELS = {
  8: '8am', 9: '9am', 10: '10am', 11: '11am', 12: '12pm',
  13: '1pm', 14: '2pm', 15: '3pm', 16: '4pm', 17: '5pm',
  18: '6pm', 19: '7pm', 20: '8pm', 21: '9pm', 22: '10pm', 23: '11pm'
};

function SummaryCard({ label, value, sub, icon: Icon, color, bg, trend }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`font-poppins font-black text-2xl ${color}`}>{value}</div>
      <p className="text-xs text-foreground font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function SalesReport({ orders = [], products = [], range = '30' }) {
  const days = parseInt(range);

  const filteredOrders = useMemo(() =>
    orders.filter(o => o.status !== 'cancelled' &&
      new Date(o.created_date) > new Date(Date.now() - days * 86400000)),
    [orders, days]
  );

  const prevOrders = useMemo(() =>
    orders.filter(o => o.status !== 'cancelled' &&
      new Date(o.created_date) > new Date(Date.now() - days * 2 * 86400000) &&
      new Date(o.created_date) <= new Date(Date.now() - days * 86400000)),
    [orders, days]
  );

  // KPIs
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + (o.total || 0), 0);
  const revTrend = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  const avgTicket = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
  const prevAvgTicket = prevOrders.length ? prevOrders.reduce((s,o)=>s+(o.total||0),0) / prevOrders.length : 0;
  const ticketTrend = prevAvgTicket > 0 ? Math.round(((avgTicket - prevAvgTicket) / prevAvgTicket) * 100) : null;

  const totalTips = filteredOrders.reduce((s, o) => s + (o.tip_amount || 0), 0);
  const deliveredCount = filteredOrders.filter(o => o.status === 'delivered').length;
  const completionRate = filteredOrders.length ? Math.round((deliveredCount / filteredOrders.length) * 100) : 0;

  // Top products by quantity
  const topProducts = useMemo(() => {
    const counts = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.name || item.product_id;
        if (!counts[key]) counts[key] = { name: key, qty: 0, revenue: 0, image_url: item.image_url };
        counts[key].qty += item.quantity || 1;
        counts[key].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [filteredOrders]);

  // Hourly distribution — peak hours
  const hourlyData = useMemo(() => {
    const hours = {};
    filteredOrders.forEach(o => {
      const h = new Date(o.created_date).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });
    return Array.from({ length: 16 }, (_, i) => {
      const h = i + 8;
      return { hora: HOUR_LABELS[h] || `${h}h`, pedidos: hours[h] || 0, hour: h };
    });
  }, [filteredOrders]);

  const peakHour = hourlyData.reduce((max, d) => d.pedidos > max.pedidos ? d : max, { pedidos: 0, hora: '—' });

  // Day of week
  const dowData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const counts = Array(7).fill(0);
    filteredOrders.forEach(o => { counts[new Date(o.created_date).getDay()]++; });
    return days.map((name, i) => ({ name, pedidos: counts[i] }));
  }, [filteredOrders]);

  // Payment method breakdown
  const paymentData = useMemo(() => {
    const methods = { efectivo: 0, transferencia: 0, tarjeta: 0 };
    filteredOrders.forEach(o => { if (o.payment_method) methods[o.payment_method] = (methods[o.payment_method] || 0) + 1; });
    const labels = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };
    return Object.entries(methods).filter(([,v]) => v > 0).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [filteredOrders]);

  // Daily revenue for mini trend
  const dailyRevenue = useMemo(() => {
    const result = [];
    for (let i = Math.min(days, 14) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayRevenue = filteredOrders.filter(o =>
        new Date(o.created_date).toDateString() === date.toDateString()
      ).reduce((s, o) => s + (o.total || 0), 0);
      result.push({
        date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        revenue: parseFloat(dayRevenue.toFixed(2)),
      });
    }
    return result;
  }, [filteredOrders, days]);

  // Export PDF report
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(232, 41, 74);
    doc.text('Fresitas G&F — Reporte de Ventas', 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: últimos ${range} días  ·  Generado: ${new Date().toLocaleDateString('es-MX')}`, 15, 29);

    doc.setDrawColor(232, 41, 74);
    doc.setLineWidth(0.5);
    doc.line(15, 33, 195, 33);

    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen Ejecutivo', 15, 42);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const kpis = [
      `Ingresos totales: $${totalRevenue.toFixed(2)}`,
      `Total de pedidos: ${filteredOrders.length}`,
      `Ticket promedio: $${avgTicket.toFixed(2)}`,
      `Tasa de completación: ${completionRate}%`,
      `Total de propinas: $${totalTips.toFixed(2)}`,
      `Hora pico: ${peakHour.hora} (${peakHour.pedidos} pedidos)`,
    ];
    kpis.forEach((line, i) => doc.text(line, 15, 52 + i * 8));

    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Top 10 Productos', 15, 108);
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    topProducts.forEach((p, i) => {
      if (118 + i * 7 < 270) doc.text(`${i + 1}. ${p.name}  —  ${p.qty} vendidos  —  $${p.revenue.toFixed(2)}`, 15, 118 + i * 7);
    });

    doc.save(`reporte_ventas_fresitas_${range}dias.pdf`);
    toast.success('Reporte PDF descargado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-poppins font-bold text-xl text-foreground">Reporte Completo de Ventas</h2>
          <p className="text-sm text-muted-foreground">Últimos {range} días · {filteredOrders.length} pedidos analizados</p>
        </div>
        <Button onClick={exportPDF} size="sm" className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2">
          <Download className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Ingresos Totales" value={`$${totalRevenue.toFixed(0)}`} sub={revTrend !== null ? `vs período anterior` : ''} icon={DollarSign} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" trend={revTrend} />
        <SummaryCard label="Pedidos Completados" value={deliveredCount} sub={`${completionRate}% tasa completación`} icon={ShoppingBag} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        <SummaryCard label="Ticket Promedio" value={`$${avgTicket.toFixed(0)}`} sub="por pedido" icon={TrendingUp} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" trend={ticketTrend} />
        <SummaryCard label="Propinas Totales" value={`$${totalTips.toFixed(0)}`} sub={`${filteredOrders.filter(o=>o.tip_amount>0).length} pedidos con propina`} icon={Award} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      {/* Revenue Trend */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-poppins font-bold text-base">Tendencia de Ingresos</h3>
          <Badge variant="outline" className="text-xs">Últimos {Math.min(days, 14)} días</Badge>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyRevenue}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8294A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E8294A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Ingresos']} contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Area type="monotone" dataKey="revenue" stroke="#E8294A" strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-poppins font-bold text-base mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Productos Más Populares
          </h3>
          {topProducts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Sin datos en este período</div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.slice(0, 7).map((p, i) => {
                const maxQty = topProducts[0].qty;
                const pct = Math.round((p.qty / maxQty) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`font-poppins font-black text-sm w-5 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{p.qty} uds</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-green-600 w-16 text-right">${p.revenue.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-poppins font-bold text-base mb-4">Métodos de Pago</h3>
          {paymentData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Sin datos</div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 flex-wrap justify-center">
                {paymentData.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-foreground">{p.name}</span>
                    <span className="font-bold">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-poppins font-bold text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" /> Horas Pico de Pedidos
          </h3>
          {peakHour.pedidos > 0 && (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs">
              🔥 Pico: {peakHour.hora} ({peakHour.pedidos} pedidos)
            </Badge>
          )}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hora" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
            <Bar dataKey="pedidos" radius={[4, 4, 0, 0]}>
              {hourlyData.map((entry, i) => (
                <Cell key={i} fill={entry.hora === peakHour.hora ? '#E8294A' : '#5C2D0E'} fillOpacity={entry.hora === peakHour.hora ? 1 : 0.6} />
              ))}
            </Bar>
            
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day of Week */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-poppins font-bold text-base mb-4">Pedidos por Día de la Semana</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
            <Bar dataKey="pedidos" fill="#E8294A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full top products table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-poppins font-bold text-base">Tabla Completa de Productos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ordenado por unidades vendidas</p>
        </div>
        {topProducts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Sin datos en este período</div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>#</span>
              <span className="col-span-2">Producto</span>
              <span className="text-right">Unidades</span>
            </div>
            {topProducts.map((p, i) => (
              <div key={i} className="grid grid-cols-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors">
                <span className={`font-poppins font-black text-sm ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                <div className="col-span-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-green-600 font-semibold">${p.revenue.toFixed(2)} ingresos</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">{p.qty}</span>
                  <p className="text-xs text-muted-foreground">uds.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}