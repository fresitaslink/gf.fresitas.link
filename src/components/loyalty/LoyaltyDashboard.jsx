import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, Gift, Zap, TrendingUp, Lock, CheckCircle2, ChevronRight, Award, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import LevelProgressBar from '@/components/loyalty/LevelProgressBar';
import LoyaltyLevelBadge from '@/components/loyalty/LoyaltyLevelBadge';
import PointsStreakCard from '@/components/loyalty/PointsStreakCard';
import { getUserLevel, LEVELS } from '@/lib/levels';

// Discount thresholds for the "next reward" progress
const DISCOUNT_MILESTONES = [
  { points: 200, label: '5% descuento en tu próximo pedido', icon: '🍓', discount: '5%' },
  { points: 500, label: '10% descuento + postre gratis', icon: '🍰', discount: '10%' },
  { points: 1000, label: '15% descuento + envío gratis', icon: '🎁', discount: '15%' },
  { points: 2000, label: '20% descuento + producto especial', icon: '👑', discount: '20%' },
  { points: 5000, label: 'Experiencia VIP en tienda', icon: '⭐', discount: 'VIP' },
];

function RewardMilestone({ milestone, currentPoints }) {
  const reached = currentPoints >= milestone.points;
  const pct = Math.min(100, Math.round((currentPoints / milestone.points) * 100));
  const isNext = !reached && currentPoints < milestone.points &&
    DISCOUNT_MILESTONES.findIndex(m => !( currentPoints >= m.points)) === DISCOUNT_MILESTONES.indexOf(milestone);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`rounded-xl border p-4 transition-all ${
        reached
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : isNext
          ? 'bg-strawberry/5 border-strawberry/30'
          : 'bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
          reached ? 'bg-green-100 dark:bg-green-800' : 'bg-muted'
        }`}>
          {reached ? '✅' : milestone.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-semibold ${reached ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>
              {milestone.label}
            </p>
            {isNext && <Badge className="bg-strawberry text-white text-[10px] py-0 px-1.5">Próximo</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {reached ? (
              <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Desbloqueado
              </span>
            ) : (
              <>
                <div className="flex-1 h-1.5 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-strawberry transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {currentPoints}/{milestone.points}pts
                </span>
              </>
            )}
          </div>
        </div>
        <div className={`font-poppins font-black text-sm flex-shrink-0 ${reached ? 'text-green-600' : 'text-muted-foreground'}`}>
          {milestone.discount}
        </div>
      </div>
    </motion.div>
  );
}

export default function LoyaltyDashboard({ profile, loyaltyHistory = [], orders = [], language = 'es', onRedeem }) {
  const points = profile?.loyalty_points || 0;
  const lifetimePoints = profile?.lifetime_points || profile?.loyalty_points || 0;
  const { current, next, progressPct, pointsToNext } = getUserLevel(lifetimePoints);

  // Next discount milestone
  const nextMilestone = DISCOUNT_MILESTONES.find(m => points < m.points);
  const pctToNextMilestone = nextMilestone
    ? Math.min(100, Math.round((points / nextMilestone.points) * 100))
    : 100;

  // Points history chart
  const chartData = useMemo(() => {
    let running = 0;
    return [...loyaltyHistory].reverse().map(tx => {
      running += tx.type === 'earned' ? tx.points : -tx.points;
      return {
        date: new Date(tx.created_date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        puntos: Math.max(0, running),
      };
    });
  }, [loyaltyHistory]);

  const totalEarned = loyaltyHistory.filter(t => t.type === 'earned').reduce((s, t) => s + t.points, 0);
  const totalRedeemed = loyaltyHistory.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.points, 0);
  const equivalentDiscount = ((points / 100) * 5).toFixed(2);

  return (
    <div className="space-y-5">
      {/* Main Points Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-strawberry via-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-pink-200 text-sm font-medium">
              {language === 'es' ? 'Puntos disponibles' : 'Available points'}
            </p>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="font-poppins font-black text-5xl mt-1"
            >
              {points.toLocaleString()}
            </motion.div>
            <p className="text-pink-200 text-xs mt-1">
              ≈ ${equivalentDiscount} {language === 'es' ? 'en descuentos' : 'in discounts'}
            </p>
          </div>
          <div className="text-5xl">⭐</div>
        </div>

        {/* Points stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="font-bold text-lg">+{totalEarned.toLocaleString()}</p>
            <p className="text-xs text-pink-200">{language === 'es' ? 'Ganados' : 'Earned'}</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="font-bold text-lg">-{totalRedeemed.toLocaleString()}</p>
            <p className="text-xs text-pink-200">{language === 'es' ? 'Canjeados' : 'Redeemed'}</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{lifetimePoints.toLocaleString()}</p>
            <p className="text-xs text-pink-200">{language === 'es' ? 'De por vida' : 'Lifetime'}</p>
          </div>
        </div>
      </motion.div>

      {/* Redeem CTA */}
      <div className="flex gap-3">
        <Link to="/rewards" className="flex-1">
          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-2">
            <Gift className="w-4 h-4" />
            {language === 'es' ? 'Canjear Puntos' : 'Redeem Points'}
          </Button>
        </Link>
        <Link to="/challenges" className="flex-1">
          <Button variant="outline" className="w-full rounded-xl gap-2 border-strawberry text-strawberry hover:bg-strawberry/10">
            <Flame className="w-4 h-4" />
            {language === 'es' ? 'Retos' : 'Challenges'}
          </Button>
        </Link>
      </div>

      {/* Streak card */}
      <PointsStreakCard orders={orders} language={language} />

      {/* Level Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-poppins font-semibold text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            {language === 'es' ? 'Tu Nivel' : 'Your Level'}
          </h3>
          <LoyaltyLevelBadge lifetimePoints={lifetimePoints} />
        </div>
        <LevelProgressBar lifetimePoints={lifetimePoints} language={language} />
      </div>

      {/* Next Discount Progress */}
      {nextMilestone && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-strawberry" />
            <h3 className="font-poppins font-semibold text-sm">
              {language === 'es' ? 'Próximo Descuento en Postres' : 'Next Dessert Discount'}
            </h3>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{nextMilestone.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{nextMilestone.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'es'
                  ? `Te faltan ${(nextMilestone.points - points).toLocaleString()} puntos`
                  : `${(nextMilestone.points - points).toLocaleString()} points to go`}
              </p>
            </div>
            <div className="font-poppins font-black text-lg text-strawberry">{nextMilestone.discount}</div>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pctToNextMilestone}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute h-full rounded-full bg-gradient-to-r from-strawberry to-pink-400"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow">{pctToNextMilestone}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            {points.toLocaleString()} / {nextMilestone.points.toLocaleString()} pts
          </p>
        </div>
      )}

      {/* Rewards Milestones */}
      <div>
        <h3 className="font-poppins font-semibold text-sm mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-500" />
          {language === 'es' ? 'Mapa de Recompensas' : 'Rewards Map'}
        </h3>
        <div className="space-y-2.5">
          {DISCOUNT_MILESTONES.map((m, i) => (
            <RewardMilestone key={i} milestone={m} currentPoints={points} />
          ))}
        </div>
      </div>

      {/* Points History Chart */}
      {chartData.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-poppins font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            {language === 'es' ? 'Evolución de Puntos' : 'Points Over Time'}
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => [v, language === 'es' ? 'Puntos' : 'Points']} contentStyle={{ borderRadius: '12px', background: 'hsl(var(--card))' }} />
              <Line type="monotone" dataKey="puntos" stroke="#E8294A" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      {loyaltyHistory.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-poppins font-semibold text-sm">
              {language === 'es' ? 'Últimas Transacciones' : 'Recent Transactions'}
            </h3>
            <Badge variant="outline" className="text-xs">{loyaltyHistory.length} movimientos</Badge>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {loyaltyHistory.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  tx.type === 'earned' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : tx.type === 'bonus' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {tx.type === 'redeemed' ? '-' : '+'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description || (tx.type === 'earned' ? 'Puntos ganados' : 'Puntos canjeados')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US')}</p>
                </div>
                <span className={`font-bold text-sm flex-shrink-0 ${tx.type === 'redeemed' ? 'text-red-500' : tx.type === 'bonus' ? 'text-amber-600' : 'text-green-600'}`}>
                  {tx.type === 'redeemed' ? '-' : '+'}{tx.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loyaltyHistory.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {language === 'es' ? '¡Haz tu primer pedido para ganar puntos!' : 'Place your first order to earn points!'}
          </p>
          <Link to="/menu">
            <Button size="sm" className="mt-4 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
              {language === 'es' ? 'Ver el Menú' : 'View Menu'}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}