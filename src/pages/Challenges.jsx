import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Trophy, Star, Clock, CheckCircle2, Crown, Users, Flame,
  Target, Loader2, Medal, TrendingUp, Bell, Gift, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CHALLENGE_ICONS = {
  order_before_time: '⏰',
  order_product: '🍓',
  order_amount: '💰',
  referral: '🤝',
  review: '⭐',
};

const TIER_CONFIG = [
  { min: 0,    max: 99,   label: 'Novata',    icon: '🌱', color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
  { min: 100,  max: 299,  label: 'Regular',   icon: '🍓', color: 'text-strawberry', bg: 'bg-strawberry/10' },
  { min: 300,  max: 599,  label: 'Fanática',  icon: '🔥', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { min: 600,  max: 999,  label: 'Experta',   icon: '⭐', color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { min: 1000, max: Infinity, label: 'Leyenda', icon: '👑', color: 'text-gold',    bg: 'bg-gold/10' },
];

function getTier(pts) {
  return TIER_CONFIG.find(t => pts >= t.min && pts <= t.max) || TIER_CONFIG[0];
}

function ChallengeCard({ challenge, completed, onClaim, claiming }) {
  const icon = CHALLENGE_ICONS[challenge.challenge_type] || '🎯';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border-2 overflow-hidden transition-all ${
        completed
          ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
          : 'border-border hover:border-strawberry/40'
      }`}
    >
      <div className="p-4 flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm ${
          completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gradient-to-br from-strawberry/20 to-pink-100 dark:from-strawberry/20 dark:to-pink-900/20'
        }`}>
          {completed ? '✅' : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-poppins font-semibold text-sm">{challenge.title_es}</h4>
              {challenge.description_es && (
                <p className="text-xs text-muted-foreground mt-0.5">{challenge.description_es}</p>
              )}
              {challenge.condition_value && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-strawberry" />
                  <span className="text-xs text-strawberry font-semibold">{challenge.condition_value}</span>
                </div>
              )}
              {challenge.completions_count > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {challenge.completions_count} personas lo completaron hoy
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-poppins font-black text-strawberry text-lg leading-none">+{challenge.points_reward}</div>
              <div className="text-xs text-muted-foreground">pts</div>
            </div>
          </div>
          {completed ? (
            <div className="mt-3 flex items-center gap-1.5 text-green-600 text-xs font-semibold bg-green-100 dark:bg-green-900/20 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4" />
              ¡Completado! +{challenge.points_reward} pts ganados 🎉
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onClaim(challenge)}
              disabled={claiming}
              className="mt-3 h-8 text-xs bg-gradient-to-r from-strawberry to-pink-500 hover:from-strawberry/90 hover:to-pink-500/90 text-white rounded-xl px-4 shadow-sm"
            >
              {claiming ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
              ¡Completé este reto!
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function WeeklyLeaderboard({ profiles, myEmail }) {
  const sorted = [...profiles]
    .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
    .slice(0, 15);

  const medals = ['🥇', '🥈', '🥉'];
  const myRank = sorted.findIndex(p => p.user_email === myEmail);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-gold/30 via-amber-100 to-gold/20 dark:from-gold/10 dark:via-amber-900/20 dark:to-gold/10 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          <h3 className="font-poppins font-bold">Ranking Top Clientes</h3>
          <Badge className="ml-auto bg-gold/20 text-amber-700 dark:text-amber-400 border border-gold/30 text-xs">
            🏆 Top {sorted.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Clasificación por puntos de lealtad acumulados</p>
      </div>

      {/* Top 3 podium */}
      {sorted.length >= 3 && (
        <div className="flex items-end justify-center gap-2 px-4 py-5 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/10">
          {/* 2nd */}
          <div className="flex-1 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl mx-auto mb-2 border-2 border-gray-300 shadow">
              {sorted[1]?.display_name?.charAt(0)?.toUpperCase() || '👤'}
            </div>
            <p className="font-semibold text-xs truncate">{sorted[1]?.display_name || sorted[1]?.user_email?.split('@')[0]}</p>
            <p className="text-xs font-bold text-muted-foreground">{sorted[1]?.loyalty_points || 0} pts</p>
            <div className="mt-1 text-lg">🥈</div>
          </div>
          {/* 1st */}
          <div className="flex-1 text-center -mt-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber-400 flex items-center justify-center text-3xl mx-auto mb-2 border-2 border-gold shadow-lg">
                {sorted[0]?.display_name?.charAt(0)?.toUpperCase() || '👑'}
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg">👑</div>
            </div>
            <p className="font-bold text-sm truncate">{sorted[0]?.display_name || sorted[0]?.user_email?.split('@')[0]}</p>
            <p className="text-sm font-black text-gold">{sorted[0]?.loyalty_points || 0} pts</p>
            <div className="mt-1 text-lg">🥇</div>
          </div>
          {/* 3rd */}
          <div className="flex-1 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl mx-auto mb-2 border-2 border-amber-400 shadow">
              {sorted[2]?.display_name?.charAt(0)?.toUpperCase() || '👤'}
            </div>
            <p className="font-semibold text-xs truncate">{sorted[2]?.display_name || sorted[2]?.user_email?.split('@')[0]}</p>
            <p className="text-xs font-bold text-muted-foreground">{sorted[2]?.loyalty_points || 0} pts</p>
            <div className="mt-1 text-lg">🥉</div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-border">
        {sorted.slice(3).map((profile, i) => {
          const rank = i + 4;
          const isMe = profile.user_email === myEmail;
          const tier = getTier(profile.loyalty_points || 0);
          return (
            <div key={profile.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-strawberry/5 dark:bg-strawberry/10' : 'hover:bg-muted/50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 bg-muted text-muted-foreground`}>
                {rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`font-semibold text-sm truncate ${isMe ? 'text-strawberry' : ''}`}>
                    {profile.display_name || profile.user_email?.split('@')[0]}
                    {isMe && <span className="ml-1 text-xs">(tú)</span>}
                  </p>
                  <span className="text-xs" title={tier.label}>{tier.icon}</span>
                </div>
                <p className="text-xs text-muted-foreground">{profile.total_orders || 0} pedidos</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm text-strawberry">{profile.loyalty_points || 0}</p>
                <p className="text-xs text-muted-foreground">pts</p>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
            Sé el primero en el ranking
          </div>
        )}
      </div>

      {/* My position if not in top 15 */}
      {myRank === -1 && myEmail && (
        <div className="border-t border-border bg-strawberry/5 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-black flex-shrink-0 text-muted-foreground">
            {profiles.findIndex(p => p.user_email === myEmail) + 1 || '?'}
          </div>
          <p className="text-sm font-medium text-strawberry flex-1">Tu posición actual</p>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default function Challenges() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState({});
  const [activeTab, setActiveTab] = useState('challenges');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadAll();

    // Real-time subscriptions
    const unsubProfile = base44.entities.CustomerProfile.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        setProfiles(prev => prev.map(p => p.id === event.data.id ? event.data : p));
        if (event.data.user_email === user.email) setMyProfile(event.data);
      }
      if (event.type === 'create' && event.data) {
        setProfiles(prev => [...prev, event.data]);
      }
    });
    const unsubComps = base44.entities.ChallengeCompletion.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === user.email) {
        setCompletions(prev => [...prev, event.data]);
      }
    });
    return () => { unsubProfile(); unsubComps(); };
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [chall, comps, allProfiles] = await Promise.all([
      base44.entities.DailyChallenge.filter({ is_active: true }),
      base44.entities.ChallengeCompletion.filter({ user_email: user.email }),
      base44.entities.CustomerProfile.list('-loyalty_points', 50),
    ]);
    const todayChalls = chall.filter(c => !c.active_date || c.active_date === today);
    setChallenges(todayChalls.length > 0 ? todayChalls : chall.slice(0, 5));
    setCompletions(comps);
    setProfiles(allProfiles);
    setMyProfile(allProfiles.find(p => p.user_email === user.email) || null);
    setLoading(false);
  };

  const handleClaim = async (challenge) => {
    const alreadyDone = completions.some(c => c.challenge_id === challenge.id);
    if (alreadyDone) { toast.error('Ya completaste este desafío'); return; }
    setClaiming(p => ({ ...p, [challenge.id]: true }));
    try {
      const completion = await base44.entities.ChallengeCompletion.create({
        challenge_id: challenge.id,
        user_email: user.email,
        points_awarded: challenge.points_reward,
        completed_at: new Date().toISOString(),
      });
      setCompletions(prev => [...prev, completion]);

      if (myProfile) {
        const newPoints = (myProfile.loyalty_points || 0) + challenge.points_reward;
        await base44.entities.CustomerProfile.update(myProfile.id, { loyalty_points: newPoints });
        setMyProfile(p => ({ ...p, loyalty_points: newPoints }));
        await base44.entities.LoyaltyTransaction.create({
          user_email: user.email,
          points: challenge.points_reward,
          type: 'bonus',
          description: `Desafío completado: ${challenge.title_es}`,
        });
      }

      await base44.entities.DailyChallenge.update(challenge.id, {
        completions_count: (challenge.completions_count || 0) + 1,
      });
      setChallenges(prev => prev.map(c => c.id === challenge.id
        ? { ...c, completions_count: (c.completions_count || 0) + 1 }
        : c
      ));

      toast.success(`🎉 +${challenge.points_reward} puntos ganados!`, { description: challenge.title_es });
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setClaiming(p => ({ ...p, [challenge.id]: false }));
    }
  };

  const myRank = profiles.findIndex(p => p.user_email === user?.email) + 1;
  const completedToday = completions.length;
  const totalChallenges = challenges.length;
  const pointsEarnable = challenges.filter(c => !completions.some(comp => comp.challenge_id === c.id)).reduce((s, c) => s + c.points_reward, 0);
  const tier = getTier(myProfile?.loyalty_points || 0);
  const nextTier = TIER_CONFIG[TIER_CONFIG.indexOf(tier) + 1];
  const tierProgress = nextTier ? Math.round(((myProfile?.loyalty_points || 0) - tier.min) / (nextTier.min - tier.min) * 100) : 100;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🏆</div>
          <Loader2 className="w-8 h-8 animate-spin text-strawberry mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Hero */}
          <div className="relative bg-gradient-to-br from-strawberry via-pink-500 to-rose-600 rounded-3xl p-6 text-white overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 opacity-10 text-9xl leading-none -mt-4 -mr-4">🏆</div>
            <div className="relative z-10">
              <h1 className="font-poppins font-black text-2xl">Desafíos Fresitas 🎯</h1>
              <p className="text-pink-100 text-sm mt-1">Completa retos diarios y sube en el ranking</p>
              {pointsEarnable > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-semibold">+{pointsEarnable} pts disponibles hoy</span>
                </div>
              )}
            </div>
          </div>

          {/* Tier card */}
          {myProfile && (
            <div className={`${tier.bg} rounded-2xl p-4 border border-transparent`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tier.icon}</span>
                  <div>
                    <p className={`font-poppins font-bold text-sm ${tier.color}`}>{tier.label}</p>
                    <p className="text-xs text-muted-foreground">{myProfile.loyalty_points || 0} puntos</p>
                  </div>
                </div>
                {nextTier && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Siguiente: {nextTier.label}</p>
                    <p className="text-xs font-semibold">{nextTier.min - (myProfile.loyalty_points || 0)} pts restantes</p>
                  </div>
                )}
              </div>
              {nextTier && <Progress value={tierProgress} className="h-2" />}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mi Ranking', value: myRank > 0 ? `#${myRank}` : '—', icon: '👑', color: 'text-gold' },
              { label: 'Mis Puntos', value: myProfile?.loyalty_points || 0, icon: '⭐', color: 'text-strawberry' },
              { label: `${completedToday}/${totalChallenges} Hoy`, value: completedToday === totalChallenges && totalChallenges > 0 ? '🏆' : `${completedToday}/${totalChallenges}`, icon: '🎯', color: 'text-green-600' },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className={`font-poppins font-black text-lg leading-none ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* All challenges completed today banner */}
          {completedToday === totalChallenges && totalChallenges > 0 && (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white text-center shadow-lg">
              <div className="text-3xl mb-1">🎊</div>
              <p className="font-poppins font-black">¡Todos los desafíos completados!</p>
              <p className="text-sm text-green-100 mt-0.5">Vuelve mañana para nuevos retos</p>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {[
              { key: 'challenges', label: '🎯 Desafíos del Día' },
              { key: 'ranking', label: '🏆 Ranking' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'challenges' ? (
              <motion.div key="challenges" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                {challenges.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No hay desafíos activos hoy</p>
                    <p className="text-xs mt-1">¡Vuelve mañana para nuevos retos!</p>
                  </div>
                ) : (
                  challenges.map(c => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      completed={completions.some(comp => comp.challenge_id === c.id)}
                      onClaim={handleClaim}
                      claiming={claiming[c.id]}
                    />
                  ))
                )}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">¡Retos renovados cada día a medianoche!</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Completa todos para ganar el bono especial del día.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="ranking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <WeeklyLeaderboard profiles={profiles} myEmail={user?.email} />
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-strawberry" /> Cómo subir en el ranking
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: '🛍️', text: '1 pt por $10 en pedidos' },
                      { icon: '🎯', text: 'Hasta 300 pts con desafíos' },
                      { icon: '🤝', text: '50 pts por referir amigos' },
                      { icon: '⭐', text: '20 pts por reseñas' },
                    ].map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted rounded-xl p-2.5 text-xs">
                        <span className="text-base">{tip.icon}</span>
                        <span className="text-muted-foreground">{tip.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}