// Fresitas Levels — Tier system based on lifetime loyalty points earned
// Each level unlocks real, enforceable perks across the app.

export const LEVELS = [
  {
    key: 'novata',
    name: 'Fresita Novata',
    name_en: 'Beginner',
    emoji: '🌱',
    minPoints: 0,
    color: '#10B981',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-300',
    pointsMultiplier: 1.0,
    perks: [
      { key: 'standard_support', label_es: 'Soporte estándar', label_en: 'Standard support' },
      { key: 'birthday_gift', label_es: 'Regalo de cumpleaños', label_en: 'Birthday gift' },
    ],
  },
  {
    key: 'amigable',
    name: 'Fresita Amigable',
    name_en: 'Friendly',
    emoji: '🍓',
    minPoints: 250,
    color: '#E8294A',
    bgClass: 'bg-pink-50 dark:bg-pink-900/20',
    textClass: 'text-pink-700 dark:text-pink-400',
    borderClass: 'border-pink-300',
    pointsMultiplier: 1.1,
    perks: [
      { key: 'free_topping', label_es: '1 topping gratis cada pedido', label_en: '1 free topping per order' },
      { key: 'multiplier_10', label_es: '+10% puntos en cada pedido', label_en: '+10% points per order' },
      { key: 'monthly_coupon', label_es: 'Cupón 5% mensual', label_en: 'Monthly 5% coupon' },
    ],
  },
  {
    key: 'estrella',
    name: 'Fresita Estrella',
    name_en: 'Star',
    emoji: '⭐',
    minPoints: 1000,
    color: '#F59E0B',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-300',
    pointsMultiplier: 1.25,
    perks: [
      { key: 'priority_support', label_es: 'Soporte prioritario 24/7', label_en: 'Priority 24/7 support' },
      { key: 'multiplier_25', label_es: '+25% puntos en cada pedido', label_en: '+25% points per order' },
      { key: 'free_delivery_5', label_es: 'Envío gratis 5x al mes', label_en: 'Free delivery 5x/month' },
      { key: 'early_access', label_es: 'Acceso anticipado a promociones', label_en: 'Early promo access' },
    ],
  },
  {
    key: 'vip',
    name: 'Embajadora VIP',
    name_en: 'VIP Ambassador',
    emoji: '👑',
    minPoints: 2500,
    color: '#A855F7',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    textClass: 'text-purple-700 dark:text-purple-400',
    borderClass: 'border-purple-300',
    pointsMultiplier: 1.5,
    perks: [
      { key: 'exclusive_products', label_es: 'Productos exclusivos VIP', label_en: 'VIP-only products' },
      { key: 'multiplier_50', label_es: '+50% puntos en cada pedido', label_en: '+50% points per order' },
      { key: 'always_free_delivery', label_es: 'Envío SIEMPRE gratis', label_en: 'Always free delivery' },
      { key: 'dedicated_chat', label_es: 'Chat dedicado con el chef', label_en: 'Direct chef chat' },
      { key: 'monthly_box', label_es: 'Caja sorpresa mensual', label_en: 'Monthly surprise box' },
    ],
  },
  {
    key: 'leyenda',
    name: 'Leyenda Fresitas',
    name_en: 'Legend',
    emoji: '🏆',
    minPoints: 5000,
    color: '#EAB308',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    textClass: 'text-yellow-700 dark:text-yellow-400',
    borderClass: 'border-yellow-400',
    pointsMultiplier: 2.0,
    perks: [
      { key: 'lifetime_vip', label_es: 'Estatus VIP de por vida', label_en: 'Lifetime VIP status' },
      { key: 'multiplier_100', label_es: 'DOBLE puntos en cada pedido', label_en: 'DOUBLE points per order' },
      { key: 'private_event', label_es: 'Evento privado anual', label_en: 'Annual private event' },
      { key: 'co_creation', label_es: 'Co-crear sabor con el chef', label_en: 'Co-create a flavor' },
      { key: 'always_free_delivery', label_es: 'Envío SIEMPRE gratis', label_en: 'Always free delivery' },
      { key: 'concierge', label_es: 'Concierge personal', label_en: 'Personal concierge' },
    ],
  },
];

/**
 * Returns { current, next, progressPct, pointsToNext }
 */
export function getUserLevel(lifetimePoints = 0) {
  const points = Math.max(0, lifetimePoints);
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) current = l;
    else break;
  }
  const idx = LEVELS.findIndex(l => l.key === current.key);
  const next = LEVELS[idx + 1] || null;
  let progressPct = 100;
  let pointsToNext = 0;
  if (next) {
    const span = next.minPoints - current.minPoints;
    const earned = points - current.minPoints;
    progressPct = Math.min(100, Math.max(0, (earned / span) * 100));
    pointsToNext = next.minPoints - points;
  }
  return { current, next, progressPct, pointsToNext, lifetimePoints: points };
}

/** Check if a perk key is unlocked at a given level */
export function hasPerk(level, perkKey) {
  if (!level?.perks) return false;
  return level.perks.some(p => p.key === perkKey);
}