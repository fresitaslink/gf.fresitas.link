import React from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Sparkles } from 'lucide-react';
import { LEVELS, getUserLevel } from '@/lib/levels';

/**
 * Shows ALL perks in the system, with locked/unlocked status per user.
 */
export default function MyPerksList({ lifetimePoints = 0, language = 'es' }) {
  const { current } = getUserLevel(lifetimePoints);
  const currentIdx = LEVELS.findIndex(l => l.key === current.key);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-poppins font-bold text-lg flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-strawberry" />
          {language === 'es' ? 'Beneficios por nivel' : 'Perks by level'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {language === 'es' ? 'Sube de nivel ganando puntos en cada pedido' : 'Level up by earning points on each order'}
        </p>
      </div>

      {LEVELS.map((level, i) => {
        const unlocked = i <= currentIdx;
        return (
          <motion.div
            key={level.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border-2 p-4 transition-all ${
              unlocked ? `${level.bgClass} ${level.borderClass}` : 'bg-muted/40 border-border opacity-60'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-3xl ${unlocked ? '' : 'grayscale'}`}>{level.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-poppins font-bold ${unlocked ? level.textClass : 'text-muted-foreground'}`}>
                    {language === 'es' ? level.name : level.name_en}
                  </h4>
                  {unlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {level.minPoints === 0 ? 'Inicio' : `${level.minPoints.toLocaleString()}+ pts`}
                  {' · '}
                  {level.pointsMultiplier}x {language === 'es' ? 'multiplicador' : 'multiplier'}
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 ml-1">
              {level.perks.map(perk => (
                <li key={perk.key} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 ${unlocked ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {unlocked ? '✓' : '○'}
                  </span>
                  <span className={unlocked ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    {language === 'es' ? perk.label_es : perk.label_en}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
}