import React from 'react';
import { motion } from 'framer-motion';

export const LEVELS = [
  { id: 'bronce', name: 'Bronce', min: 0, max: 499, color: 'from-amber-600 to-amber-400', textColor: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300', icon: '🥉', perks: ['Puntos 1x por pedido', 'Acceso a promociones básicas'] },
  { id: 'plata', name: 'Plata', min: 500, max: 1499, color: 'from-slate-400 to-slate-300', textColor: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/30', border: 'border-slate-300', icon: '🥈', perks: ['Puntos 1.5x por pedido', '5% descuento extra en pedidos', 'Acceso anticipado a lanzamientos'] },
  { id: 'oro', name: 'Oro', min: 1500, max: 2999, color: 'from-yellow-500 to-amber-400', textColor: 'text-yellow-700', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-400', icon: '🥇', perks: ['Puntos 2x por pedido', '10% descuento en todos los pedidos', 'Entrega express gratis', 'Sorpresas mensuales'] },
  { id: 'diamante', name: 'Diamante', min: 3000, max: Infinity, color: 'from-cyan-500 to-blue-400', textColor: 'text-cyan-700', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-300', icon: '💎', perks: ['Puntos 3x por pedido', '15% descuento permanente', 'Entrega gratis siempre', 'Acceso VIP total', 'Caja sorpresa cada mes'] },
];

export const BADGES = [
  { id: 'primer_pedido', name: 'Primer Bocado', icon: '🍓', desc: 'Primer pedido completado', condition: (orders) => orders >= 1 },
  { id: 'leal', name: 'Cliente Leal', icon: '❤️', desc: '5 pedidos completados', condition: (orders) => orders >= 5 },
  { id: 'fanatic', name: 'Fresita Fanática', icon: '🌟', desc: '10 pedidos completados', condition: (orders) => orders >= 10 },
  { id: 'legend', name: 'Leyenda', icon: '👑', desc: '25 pedidos completados', condition: (orders) => orders >= 25 },
  { id: 'plata_badge', name: 'Nivel Plata', icon: '🥈', desc: 'Alcanzaste 500 puntos', condition: (_, points) => points >= 500 },
  { id: 'oro_badge', name: 'Nivel Oro', icon: '🥇', desc: 'Alcanzaste 1500 puntos', condition: (_, points) => points >= 1500 },
];

export function getLevelForPoints(points) {
  return LEVELS.slice().reverse().find(l => points >= l.min) || LEVELS[0];
}

export function LoyaltyLevelCard({ points = 0, totalOrders = 0 }) {
  const level = getLevelForPoints(points);
  const nextLevel = LEVELS.find(l => l.min > points);
  const progress = nextLevel
    ? Math.min(100, ((points - level.min) / (nextLevel.min - level.min)) * 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border-2 ${level.border} ${level.bg} p-6`}
    >
      {/* Level Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center text-3xl shadow-lg`}>
          {level.icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nivel Actual</p>
          <h2 className={`font-poppins font-black text-2xl ${level.textColor}`}>{level.name}</h2>
          <p className="text-sm text-muted-foreground">{points.toLocaleString()} puntos acumulados</p>
        </div>
      </div>

      {/* Progress to next level */}
      {nextLevel && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{points} pts</span>
            <span>→ {nextLevel.name} a los {nextLevel.min} pts</span>
          </div>
          <div className="w-full h-3 bg-background/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${level.color}`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Faltan {nextLevel.min - points} puntos para {nextLevel.icon} {nextLevel.name}</p>
        </div>
      )}
      {!nextLevel && (
        <div className="mb-4 text-center py-2">
          <p className="text-sm font-semibold text-cyan-700">🏆 ¡Nivel máximo alcanzado!</p>
        </div>
      )}

      {/* Perks */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground mb-2">Beneficios de tu nivel:</p>
        {level.perks.map((perk, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${level.color}`} />
            {perk}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function BadgesGrid({ totalOrders = 0, points = 0 }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-poppins font-semibold mb-4">Mis Insignias</h3>
      <div className="grid grid-cols-3 gap-3">
        {BADGES.map(badge => {
          const unlocked = badge.condition(totalOrders, points);
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                unlocked ? 'bg-strawberry/5 border-strawberry/30' : 'bg-muted/50 border-transparent opacity-40 grayscale'
              }`}
            >
              <span className="text-2xl mb-1">{badge.icon}</span>
              <p className="text-xs font-semibold leading-tight">{badge.name}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{badge.desc}</p>
              {unlocked && <span className="text-xs text-green-600 mt-1 font-medium">✓ Obtenida</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}