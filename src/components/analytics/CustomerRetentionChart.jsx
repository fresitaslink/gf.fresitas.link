import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CustomerRetentionChart({ orders = [] }) {
  const data = useMemo(() => {
    const customerOrders = {};
    orders.filter(o => o.status !== 'cancelled' && o.user_email).forEach(o => {
      if (!customerOrders[o.user_email]) customerOrders[o.user_email] = 0;
      customerOrders[o.user_email]++;
    });
    const buckets = { '1 pedido': 0, '2-3': 0, '4-6': 0, '7+': 0 };
    Object.values(customerOrders).forEach(count => {
      if (count === 1) buckets['1 pedido']++;
      else if (count <= 3) buckets['2-3']++;
      else if (count <= 6) buckets['4-6']++;
      else buckets['7+']++;
    });
    return Object.entries(buckets).map(([name, clientes]) => ({ name, clientes }));
  }, [orders]);

  const total = data.reduce((s, d) => s + d.clientes, 0);
  const returning = data.filter(d => d.name !== '1 pedido').reduce((s, d) => s + d.clientes, 0);
  const retentionRate = total > 0 ? Math.round((returning / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-poppins font-bold text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" /> Retención de Clientes
        </h3>
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
          {retentionRate}% retención
        </Badge>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="clientes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">Distribución de frecuencia de compra por cliente</p>
    </div>
  );
}