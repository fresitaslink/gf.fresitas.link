import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

const COLORS = ['#E8294A', '#5C2D0E', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6'];

export default function RevenueByProduct({ orders = [] }) {
  const data = useMemo(() => {
    const map = {};
    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.name || item.product_id;
        if (!map[key]) map[key] = { name: key, revenue: 0, qty: 0 };
        map[key].revenue += (item.price || 0) * (item.quantity || 1);
        map[key].qty += item.quantity || 1;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [orders]);

  if (data.length === 0) return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-poppins font-bold text-base mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-600" /> Ingresos por Producto
      </h3>
      <div className="text-center py-8 text-muted-foreground text-sm">Sin datos en este período</div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-poppins font-bold text-base mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-600" /> Ingresos por Producto
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={110} />
          <Tooltip
            formatter={(v, n) => [`$${Number(v).toFixed(2)}`, 'Ingresos']}
            contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          />
          <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}