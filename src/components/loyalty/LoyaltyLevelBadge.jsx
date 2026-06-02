import React from 'react';
import { getUserLevel, LEVELS } from '@/lib/levels';
import { Badge } from '@/components/ui/badge';

export default function LoyaltyLevelBadge({ lifetimePoints = 0, size = 'sm' }) {
  const { current } = getUserLevel(lifetimePoints);
  if (!current) return null;

  const sizeClasses = size === 'lg'
    ? 'text-sm px-3 py-1.5 gap-2'
    : 'text-xs px-2 py-0.5 gap-1';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${sizeClasses}`}
      style={{ background: `${current.color}15`, borderColor: `${current.color}40`, color: current.color }}>
      <span>{current.emoji}</span>
      <span>{current.name}</span>
    </span>
  );
}