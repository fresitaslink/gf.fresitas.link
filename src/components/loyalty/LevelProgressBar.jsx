import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, TrendingUp } from 'lucide-react';
import { getUserLevel, LEVELS } from '@/lib/levels';

/**
 * Visual horizontal tier progress bar for the user profile.
 * Shows current level, progress to next, and full tier ladder.
 */
export default function LevelProgressBar({ lifetimePoints = 0, language = 'es', compact = false }) {
  const { current, next, progressPct, pointsToNext } = getUserLevel(lifetimePoints);

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full">
        <span className="text-xl">{current.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-bold ${current.textClass}`}>{language === 'es' ? current.name : current.name_en}</span>
            {next && <span className="text-muted-foreground">{pointsToNext} pts → {next.emoji}</span>}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${current.color}, ${next?.color || current.color})` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${current.bgClass} border-2 ${current.borderClass} rounded-2xl p-5 space-y-5`}>
      {/* Current level header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-5xl"
          >
            {current.emoji}
          </motion.div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              {language === 'es' ? 'Tu nivel actual' : 'Your level'}
            </p>
            <h3 className={`font-poppins font-black text-2xl ${current.textClass}`}>
              {language === 'es' ? current.name : current.name_en}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3" /> {current.pointsMultiplier}x {language === 'es' ? 'multiplicador' : 'multiplier'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{language === 'es' ? 'Pts. de por vida' : 'Lifetime'}</p>
          <p className={`font-poppins font-black text-2xl ${current.textClass}`}>
            {lifetimePoints.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar to next */}
      {next ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium">{language === 'es' ? `Siguiente: ${next.name}` : `Next: ${next.name_en}`} {next.emoji}</span>
            <span className="text-muted-foreground font-semibold">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {pointsToNext.toLocaleString()} pts {language === 'es' ? 'para subir' : 'to go'}
            </span>
          </div>
          <div className="h-3 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full relative"
              style={{ background: `linear-gradient(90deg, ${current.color}, ${next.color})` }}
            >
              <span className="absolute inset-0 animate-pulse opacity-30 bg-white" />
            </motion.div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{current.minPoints.toLocaleString()}</span>
            <span className="font-bold">{Math.round(progressPct)}%</span>
            <span>{next.minPoints.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-yellow-200 to-amber-300 dark:from-yellow-700 dark:to-amber-700 rounded-xl p-3 text-center">
          <Crown className="w-5 h-5 inline text-yellow-700 dark:text-yellow-300 mr-1" />
          <span className="font-bold text-yellow-800 dark:text-yellow-200">
            {language === 'es' ? '¡Nivel máximo desbloqueado!' : 'Max level unlocked!'}
          </span>
        </div>
      )}

      {/* Tier ladder */}
      <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/40 dark:border-black/20">
        {LEVELS.map((l) => {
          const reached = lifetimePoints >= l.minPoints;
          const isCurrent = l.key === current.key;
          return (
            <div key={l.key} className="flex flex-col items-center flex-1 relative">
              <div className={`text-2xl transition-all ${reached ? 'opacity-100' : 'opacity-30 grayscale'} ${isCurrent ? 'scale-125' : ''}`}>
                {l.emoji}
              </div>
              <p className={`text-[9px] mt-0.5 text-center leading-tight ${isCurrent ? 'font-bold' : 'text-muted-foreground'}`}>
                {language === 'es' ? l.name.split(' ').slice(-1)[0] : l.name_en.split(' ')[0]}
              </p>
              <p className="text-[9px] text-muted-foreground">{l.minPoints >= 1000 ? `${l.minPoints/1000}k` : l.minPoints}</p>
              {isCurrent && (
                <motion.div
                  layoutId="current-indicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full"
                  style={{ background: current.color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}