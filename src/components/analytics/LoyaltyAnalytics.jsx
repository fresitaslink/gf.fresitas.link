import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LoyaltyAnalytics({ profiles = [], loyaltyTransactions = [] }) {
  const stats = useMemo(() => {
    const totalPoints = profiles.reduce((s, p) => s + (p.loyalty_points || 0), 0);
    const totalLifetime = profiles.reduce((s, p) => s + (p.lifetime_points || 0), 0);
    const enrolled = profiles.filter(p => (p.lifetime_points || 0) > 0).length;
    const levels = { novata: 0, amigable: 0, estrella: 0, vip: 0, leyenda: 0 };
    profiles.forEach(p => { if (p.current_level && levels[p.current_level] !== undefined) levels[p.current_level]++; });

    // Points issued over past 14 days
    const daily = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayPts = loyaltyTransactions
        .filter(t => new Date(t.created_date).toDateString() === date.toDateString() && t.type !== 'redeemed')
        .reduce((s, t) => s + t.points, 0);
      daily.push({ date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }), puntos: dayPts });
    }

    return { totalPoints, totalLifetime, enrolled, levels, daily };
  }, [profiles, loyaltyTransactions]);

  const levelColors = { novata: 'bg-gray-100 text-gray-700', amigable: 'bg-green-100 text-green-700', estrella: 'bg-blue-100 text-blue-700', vip: 'bg-purple-100 text-purple-700', leyenda: 'bg-amber-100 text-amber-700' };
  const levelEmojis = { novata: '🌱', amigable: '⭐', estrella: '🌟', vip: '👑', leyenda: '🏆' };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <h3 className="font-poppins font-bold text-base flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Analytics de Lealtad
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted rounded-xl p-3 text-center">
          <p className="font-poppins font-black text-xl text-amber-600">{stats.totalPoints.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Puntos activos</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <p className="font-poppins font-black text-xl text-green-600">{stats.totalLifetime.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Puntos históricos</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <p className="font-poppins font-black text-xl text-blue-600">{stats.enrolled}</p>
          <p className="text-xs text-muted-foreground">Clientes inscritos</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Distribución por Nivel</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.levels).map(([level, count]) => (
            <Badge key={level} className={`text-xs ${levelColors[level]}`}>
              {levelEmojis[level]} {level}: {count}
            </Badge>
          ))}
        </div>
      </div>

      {stats.daily.some(d => d.puntos > 0) && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Puntos emitidos (14 días)
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={stats.daily}>
              <defs>
                <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
              <Area type="monotone" dataKey="puntos" stroke="#F59E0B" strokeWidth={2} fill="url(#ptGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}