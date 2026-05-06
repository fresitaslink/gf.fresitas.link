import React, { useState } from 'react';
import { Star, Gift, Zap, Trophy, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const LEVELS = [
  { name: 'Fresita', min: 0, max: 200, color: '#E8345E', icon: '🍓', perks: ['5% descuento especiales', 'Cumpleaños sorpresa'] },
  { name: 'Choco Fan', min: 200, max: 500, color: '#8B4513', icon: '🍫', perks: ['Envío gratis en tu aniversario', '8% en combinados'] },
  { name: 'Gold Berry', min: 500, max: 1000, color: '#DAA520', icon: '⭐', perks: ['10% siempre', 'Acceso previo a temporada'] },
  { name: 'VIP Fresita', min: 1000, max: Infinity, color: '#8B008B', icon: '👑', perks: ['15% siempre', 'Producto gratis mensual', 'Atención prioritaria'] },
];

const REDEMPTION_OPTIONS = [
  { points: 100, discount: 5, label: '$5 de descuento', code_prefix: 'LYL5' },
  { points: 250, discount: 15, label: '$15 de descuento', code_prefix: 'LYL15' },
  { points: 500, discount: 35, label: '$35 de descuento', code_prefix: 'LYL35' },
];

function ProgressRing({ percent, color, size = 80, children }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={8} fill="none" className="text-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function MisRecompensas({ profile, onPointsUpdated, language = 'es' }) {
  const [redeeming, setRedeeming] = useState(null);
  const points = profile?.loyalty_points || 0;

  const currentLevel = LEVELS.findLast(l => points >= l.min) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.min > points);
  const progressToNext = nextLevel
    ? Math.round(((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100;

  const handleRedeem = async (option) => {
    if (points < option.points) {
      toast.error(language === 'es' ? 'No tienes suficientes puntos' : 'Not enough points');
      return;
    }
    setRedeeming(option.points);
    try {
      // Generate unique promo code
      const code = `${option.code_prefix}-${Date.now().toString(36).toUpperCase()}`;

      // Create promo code
      await base44.entities.PromoCode.create({
        code,
        discount_type: 'fixed',
        discount_value: option.discount,
        max_uses: 1,
        uses_count: 0,
        is_active: true,
        description_es: `Canje de ${option.points} puntos de lealtad`,
        description_en: `Redeem of ${option.points} loyalty points`,
      });

      // Deduct points
      const newPoints = points - option.points;
      if (profile?.id) {
        await base44.entities.CustomerProfile.update(profile.id, { loyalty_points: newPoints });
      }

      // Log transaction
      await base44.entities.LoyaltyTransaction.create({
        user_email: profile?.user_email,
        points: option.points,
        type: 'redeemed',
        description: `Canjeado por cupón ${option.label}`,
      });

      // Notify user
      await base44.entities.Notification.create({
        user_email: profile?.user_email,
        title_es: '🎁 ¡Cupón generado!',
        title_en: '🎁 Coupon generated!',
        message_es: `Tu código es: ${code}. Úsalo en tu próximo pedido.`,
        message_en: `Your code is: ${code}. Use it on your next order.`,
        type: 'loyalty',
        is_read: false,
      });

      toast.success(
        <div>
          <p className="font-bold">¡Cupón generado! 🎉</p>
          <p className="text-sm font-mono bg-white/20 rounded px-2 py-0.5 mt-1">{code}</p>
          <p className="text-xs mt-1">Úsalo en tu próximo pedido</p>
        </div>,
        { duration: 8000 }
      );

      onPointsUpdated(newPoints);
    } catch (err) {
      toast.error('Error al canjear puntos');
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Level card */}
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${currentLevel.color}dd, ${currentLevel.color}99)` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-80">{language === 'es' ? 'Tu nivel actual' : 'Your current level'}</p>
            <h2 className="font-poppins font-black text-2xl flex items-center gap-2">
              {currentLevel.icon} {currentLevel.name}
            </h2>
          </div>
          <ProgressRing percent={progressToNext} color="rgba(255,255,255,0.9)" size={76}>
            <div className="text-center">
              <p className="font-bold text-xs leading-none">{progressToNext}%</p>
            </div>
          </ProgressRing>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-4xl">{points.toLocaleString()}</p>
            <p className="text-xs opacity-70">{language === 'es' ? 'puntos totales' : 'total points'}</p>
          </div>
          {nextLevel && (
            <div className="text-right text-sm opacity-80">
              <p className="text-xs">{language === 'es' ? 'Para' : 'For'} <span className="font-bold">{nextLevel.icon} {nextLevel.name}</span></p>
              <p className="font-bold text-lg">{nextLevel.min - points} pts más</p>
            </div>
          )}
          {!nextLevel && (
            <div className="text-right">
              <Trophy className="w-8 h-8 opacity-80" />
              <p className="text-xs opacity-70">¡Nivel máximo!</p>
            </div>
          )}
        </div>

        {nextLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-70 mb-1">
              <span>{currentLevel.min} pts</span>
              <span>{nextLevel.min} pts</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Current level perks */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: currentLevel.color }} />
          {language === 'es' ? `Beneficios de ${currentLevel.name}` : `${currentLevel.name} Benefits`}
        </h3>
        <div className="space-y-2">
          {currentLevel.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: currentLevel.color + '20' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentLevel.color }} />
              </div>
              <span>{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All levels preview */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-3">{language === 'es' ? 'Todos los Niveles' : 'All Levels'}</h3>
        <div className="space-y-2">
          {LEVELS.map((level, i) => {
            const isActive = level.name === currentLevel.name;
            const isPassed = points >= level.min;
            return (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isActive ? 'bg-muted' : ''}`}>
                <div className={`text-xl ${isPassed ? 'opacity-100' : 'opacity-30'}`}>{level.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${isPassed ? '' : 'text-muted-foreground'}`}>{level.name}</p>
                    {isActive && <Badge className="text-xs" style={{ background: level.color + '20', color: level.color }}>Tu nivel</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{level.min}+ pts</p>
                </div>
                {isPassed ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: level.color }}>
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-40" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Redeem points */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Gift className="w-4 h-4 text-strawberry" />
          {language === 'es' ? 'Canjear Puntos por Cupones' : 'Redeem Points for Coupons'}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {language === 'es'
            ? 'Genera un código de descuento y úsalo en tu próximo pedido desde el carrito.'
            : 'Generate a discount code and use it on your next order from the cart.'}
        </p>
        <div className="space-y-3">
          {REDEMPTION_OPTIONS.map(option => {
            const canRedeem = points >= option.points;
            const isRedeeming = redeeming === option.points;
            return (
              <div
                key={option.points}
                className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                  canRedeem ? 'border-border hover:border-strawberry/50' : 'border-border opacity-50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-strawberry/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-strawberry fill-strawberry" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.points} pts</p>
                </div>
                <Button
                  size="sm"
                  className={`rounded-xl text-xs h-8 ${canRedeem ? 'bg-strawberry text-white hover:bg-strawberry/90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                  onClick={() => canRedeem && handleRedeem(option)}
                  disabled={!canRedeem || !!redeeming}
                >
                  {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Canjear'}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {language === 'es' ? '100 puntos = $5 de descuento' : '100 points = $5 discount'}
        </p>
      </div>
    </div>
  );
}