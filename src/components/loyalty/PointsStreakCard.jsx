import React, { useMemo } from 'react';
import { Flame, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PointsStreakCard({ orders = [], language = 'es' }) {
  const { streak, lastOrderDate, orderDays } = useMemo(() => {
    if (!orders.length) return { streak: 0, lastOrderDate: null, orderDays: 0 };

    const sortedOrders = [...orders]
      .filter(o => o.status === 'delivered')
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    if (!sortedOrders.length) return { streak: 0, lastOrderDate: null, orderDays: 0 };

    const lastOrderDate = new Date(sortedOrders[0].created_date);
    const uniqueDays = new Set(sortedOrders.map(o => new Date(o.created_date).toDateString()));
    const orderDays = uniqueDays.size;

    // Calculate weekly streak
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const hasOrder = sortedOrders.some(o => {
        const d = new Date(o.created_date);
        return d >= weekStart && d < weekEnd;
      });
      if (hasOrder) streak++;
      else break;
    }

    return { streak, lastOrderDate, orderDays };
  }, [orders]);

  if (!orders.length) return null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
          <Flame className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <p className="font-poppins font-bold text-sm">
            {language === 'es' ? 'Racha de pedidos' : 'Order Streak'}
          </p>
          <p className="text-xs text-muted-foreground">
            {streak > 0
              ? `${streak} ${language === 'es' ? 'semanas consecutivas' : 'consecutive weeks'}`
              : language === 'es' ? 'Pide esta semana para comenzar tu racha' : 'Order this week to start your streak'}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-poppins font-black text-2xl text-orange-600">{streak}</div>
          <div className="flex items-center gap-1 justify-end">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{orderDays} días totales</span>
          </div>
        </div>
      </div>
    </div>
  );
}