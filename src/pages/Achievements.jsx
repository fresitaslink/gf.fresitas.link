import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Zap, Trophy, Star, Award, Flame, Target, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const ACHIEVEMENT_TEMPLATES = [
  {
    id: 'weekend_warrior',
    title_es: 'Guerrero de Fin de Semana',
    title_en: 'Weekend Warrior',
    description_es: '5 pedidos en sábado y domingo',
    description_en: '5 orders on weekends',
    icon: '🌙',
    badge_color: 'gold',
    points_multiplier: 1.5,
    category: 'delivery',
    requirement: { type: 'weekend_orders', count: 5 }
  },
  {
    id: 'streak_master',
    title_es: 'Maestro de Racha',
    title_en: 'Streak Master',
    description_es: '10 pedidos consecutivos en el mismo mes',
    description_en: '10 consecutive orders in same month',
    icon: '🔥',
    badge_color: 'platinum',
    points_multiplier: 2.0,
    category: 'delivery',
    requirement: { type: 'consecutive_orders', count: 10 }
  },
  {
    id: 'loyalty_legend',
    title_es: 'Leyenda de Lealtad',
    title_en: 'Loyalty Legend',
    description_es: '50 pedidos totales',
    description_en: '50 total orders',
    icon: '👑',
    badge_color: 'gold',
    points_multiplier: 1.3,
    category: 'loyalty',
    requirement: { type: 'total_orders', count: 50 }
  },
  {
    id: 'spender',
    title_es: 'Gran Gastador',
    title_en: 'Big Spender',
    description_es: 'Gastar $500 en un mes',
    description_en: 'Spend $500 in a month',
    icon: '💰',
    badge_color: 'gold',
    points_multiplier: 1.25,
    category: 'delivery',
    requirement: { type: 'monthly_spend', amount: 500 }
  },
  {
    id: 'midnight_owl',
    title_es: 'Búho Nocturno',
    title_en: 'Midnight Owl',
    description_es: '5 pedidos entre 10pm y 2am',
    description_en: '5 orders between 10pm-2am',
    icon: '🦉',
    badge_color: 'silver',
    points_multiplier: 1.4,
    category: 'seasonal',
    requirement: { type: 'late_night_orders', count: 5 }
  },
  {
    id: 'friend_referrer',
    title_es: 'Embajador',
    title_en: 'Ambassador',
    description_es: '3 amigos registrados',
    description_en: '3 friends referred',
    icon: '👥',
    badge_color: 'silver',
    points_multiplier: 1.5,
    category: 'social',
    requirement: { type: 'referrals', count: 3 }
  },
  {
    id: 'reviewer',
    title_es: 'Crítico Apasionado',
    title_en: 'Passionate Critic',
    description_es: '5 reseñas dejadas',
    description_en: '5 reviews written',
    icon: '⭐',
    badge_color: 'bronze',
    points_multiplier: 1.1,
    category: 'loyalty',
    requirement: { type: 'reviews_written', count: 5 }
  },
  {
    id: 'point_collector',
    title_es: 'Coleccionista de Puntos',
    title_en: 'Point Collector',
    description_es: '1000 puntos acumulados',
    description_en: '1000 points accumulated',
    icon: '🌟',
    badge_color: 'gold',
    points_multiplier: 1.1,
    category: 'loyalty',
    requirement: { type: 'total_points', amount: 1000 }
  }
];

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [userAchievements, userProfile, userOrders] = await Promise.all([
        base44.entities.Achievement.filter({ user_email: user.email }),
        base44.entities.CustomerProfile.filter({ user_email: user.email }),
        base44.entities.Order.filter({ user_email: user.email }, '-created_date')
      ]);

      setAchievements(userAchievements);
      setProfile(userProfile[0]);
      setOrders(userOrders);

      // Check and unlock achievements
      checkAndUnlockAchievements(userAchievements, userProfile[0], userOrders);
      setLoading(false);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setLoading(false);
    }
  };

  const checkAndUnlockAchievements = async (currentAchievements, prof, allOrders) => {
    for (const template of ACHIEVEMENT_TEMPLATES) {
      const existingAch = currentAchievements.find(a => a.achievement_id === template.id);

      if (!existingAch) {
        const progress = calculateProgress(template, prof, allOrders);
        const isUnlocked = progress >= 100;

        await base44.entities.Achievement.create({
          user_email: user.email,
          achievement_id: template.id,
          title_es: template.title_es,
          title_en: template.title_en,
          description_es: template.description_es,
          description_en: template.description_en,
          icon: template.icon,
          badge_color: template.badge_color,
          points_multiplier: template.points_multiplier,
          category: template.category,
          progress: progress,
          is_unlocked: isUnlocked,
          unlocked_at: isUnlocked ? new Date().toISOString() : null
        });
      } else if (!existingAch.is_unlocked) {
        // Update progress
        const newProgress = calculateProgress(template, prof, allOrders);
        if (newProgress !== existingAch.progress || (newProgress >= 100 && !existingAch.is_unlocked)) {
          await base44.entities.Achievement.update(existingAch.id, {
            progress: newProgress,
            is_unlocked: newProgress >= 100,
            unlocked_at: newProgress >= 100 ? new Date().toISOString() : existingAch.unlocked_at
          });
        }
      }
    }
  };

  const calculateProgress = (template, prof, allOrders) => {
    const { requirement } = template;

    switch (requirement.type) {
      case 'total_orders':
        return Math.min(100, (allOrders.length / requirement.count) * 100);

      case 'weekend_orders':
        const weekendOrders = allOrders.filter(o => {
          const day = new Date(o.created_date).getDay();
          return day === 0 || day === 6;
        });
        return Math.min(100, (weekendOrders.length / requirement.count) * 100);

      case 'consecutive_orders': {
        const currentMonth = new Date().getMonth();
        const monthOrders = allOrders.filter(o => new Date(o.created_date).getMonth() === currentMonth);
        return Math.min(100, (monthOrders.length / requirement.count) * 100);
      }

      case 'total_points':
        return Math.min(100, ((prof?.loyalty_points || 0) / requirement.amount) * 100);

      case 'monthly_spend': {
        const currentMonth = new Date().getMonth();
        const monthSpend = allOrders
          .filter(o => new Date(o.created_date).getMonth() === currentMonth)
          .reduce((sum, o) => sum + (o.total || 0), 0);
        return Math.min(100, (monthSpend / requirement.amount) * 100);
      }

      case 'late_night_orders':
        const lateOrders = allOrders.filter(o => {
          const hour = new Date(o.created_date).getHours();
          return hour >= 22 || hour < 2;
        });
        return Math.min(100, (lateOrders.length / requirement.count) * 100);

      case 'reviews_written':
        return Math.min(100, ((profile?.reviews_count || 0) / requirement.count) * 100);

      case 'referrals':
        return Math.min(100, ((profile?.referral_count || 0) / requirement.count) * 100);

      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const totalMultiplier = achievements
    .filter(a => a.is_unlocked)
    .reduce((sum, a) => sum + (a.points_multiplier || 1), 0) / Math.max(1, unlockedCount);

  const filtered = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedAchievements = filtered.filter(a => a.is_unlocked);
  const lockedAchievements = filtered.filter(a => !a.is_unlocked);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header with multiplier badge */}
          <div className="mb-8">
            <h1 className="font-poppins font-black text-4xl text-foreground mb-2">🏆 Tus Logros</h1>
            <p className="text-muted-foreground mb-4">Desbloquea insignias y gana multiplicadores de puntos</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-gold/20 to-gold/10 rounded-2xl border border-gold/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Insignias Desbloqueadas</p>
                <p className="font-black text-3xl text-gold">{unlockedCount}</p>
              </div>
              <div className="bg-gradient-to-br from-purple/20 to-purple/10 rounded-2xl border border-purple/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Multiplicador de Puntos</p>
                <p className="font-black text-3xl text-purple">{totalMultiplier.toFixed(1)}x</p>
              </div>
              <div className="bg-gradient-to-br from-strawberry/20 to-strawberry/10 rounded-2xl border border-strawberry/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Puntos Actuales</p>
                <p className="font-black text-3xl text-strawberry">{profile?.loyalty_points || 0}</p>
              </div>
            </div>
          </div>

          {/* Category filter */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full mb-8">
            <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="delivery">Entregas</TabsTrigger>
              <TabsTrigger value="loyalty">Lealtad</TabsTrigger>
              <TabsTrigger value="seasonal">Temporal</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="milestone">Hitos</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Unlocked achievements */}
          {unlockedAchievements.length > 0 && (
            <div className="mb-8">
              <h2 className="font-poppins font-bold text-lg mb-4">✨ Desbloqueadas ({unlockedAchievements.length})</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {unlockedAchievements.map((ach, i) => (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border-2 p-4 text-center cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br ${
                      ach.badge_color === 'gold' ? 'from-gold/20 to-gold/10 border-gold/40' :
                      ach.badge_color === 'platinum' ? 'from-slate-300/20 to-slate-300/10 border-slate-300/40' :
                      ach.badge_color === 'silver' ? 'from-slate-100/40 to-slate-100/20 border-slate-200/50' :
                      'from-orange-200/20 to-orange-100/10 border-orange-300/40'
                    }`}
                  >
                    <div className="text-4xl mb-2">{ach.icon}</div>
                    <p className="font-bold text-sm">{ach.title_es}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ach.description_es}</p>
                    {ach.points_multiplier > 1 && (
                      <Badge className="mt-2 bg-strawberry/20 text-strawberry text-xs">
                        <Zap className="w-2.5 h-2.5 mr-1" />{ach.points_multiplier}x puntos
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Locked achievements */}
          {lockedAchievements.length > 0 && (
            <div>
              <h2 className="font-poppins font-bold text-lg mb-4">🔒 Por Desbloquear ({lockedAchievements.length})</h2>
              <div className="space-y-3">
                {lockedAchievements.map((ach, i) => (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl opacity-50">{ach.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm">{ach.title_es}</p>
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{ach.description_es}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Progreso</span>
                            <span className="font-semibold">{Math.round(ach.progress || 0)}%</span>
                          </div>
                          <Progress value={ach.progress || 0} className="h-1.5" />
                        </div>
                      </div>
                      {ach.points_multiplier > 1 && (
                        <div className="text-right text-xs whitespace-nowrap">
                          <Zap className="w-3.5 h-3.5 text-amber-500 inline mr-1" />
                          <span className="font-semibold">{ach.points_multiplier}x</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}