import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Star, Gift, Clock, CheckCircle2, Lock, Crown, Users, Flame, Target, Loader2 } from 'lucide-react';
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

function WeeklyLeaderboard({ profiles }) {
  const top = [...profiles]
    .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
    .slice(0, 10);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-gold/20 to-amber-100 dark:from-gold/10 dark:to-amber-900/20 p-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-gold" />
        <h3 className="font-poppins font-bold">Ranking de la Semana</h3>
        <Badge className="ml-auto bg-gold/20 text-amber-700 text-xs">Top 10</Badge>
      </div>
      <div className="divide-y divide-border">
        {top.map((profile, i) => (
          <div key={profile.id} className={`flex items-center gap-3 px-4 py-3 ${i < 3 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
              i === 0 ? 'bg-gold text-white' :
              i === 1 ? 'bg-gray-300 text-gray-700' :
              i === 2 ? 'bg-amber-700 text-white' :
              'bg-muted text-muted-foreground'
            }`}>
              {medals[i] || i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{profile.display_name || profile.user_email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">{profile.total_orders || 0} pedidos</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-strawberry text-sm">{profile.loyalty_points || 0}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        ))}
        {top.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Aún no hay participantes</div>
        )}
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, completed, onClaim, claiming }) {
  const icon = CHALLENGE_ICONS[challenge.challenge_type] || '🎯';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border-2 overflow-hidden transition-all ${
        completed ? 'border-green-300 dark:border-green-700' : 'border-border'
      }`}
    >
      <div className={`p-4 flex items-start gap-4`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
          completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-strawberry/10'
        }`}>
          {completed ? '✅' : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm">{challenge.title_es}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{challenge.description_es}</p>
              {challenge.condition_value && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-strawberry" />
                  <span className="text-xs text-strawberry font-medium">{challenge.condition_value}</span>
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-poppins font-black text-strawberry">+{challenge.points_reward}</div>
              <div className="text-xs text-muted-foreground">pts</div>
            </div>
          </div>
          {completed ? (
            <div className="mt-2 flex items-center gap-1.5 text-green-600 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ¡Completado! +{challenge.points_reward} pts ganados
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onClaim(challenge)}
              disabled={claiming}
              className="mt-2 h-7 text-xs bg-strawberry hover:bg-strawberry/90 text-white rounded-lg px-3"
            >
              {claiming ? <Loader2 className="w-3 h-3 animate-spin" /> : '¡Completé este reto!'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
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
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [chall, comps, allProfiles] = await Promise.all([
      base44.entities.DailyChallenge.filter({ is_active: true }),
      base44.entities.ChallengeCompletion.filter({ user_email: user.email }),
      base44.entities.CustomerProfile.list('-loyalty_points', 50),
    ]);
    // Filter to today's or any active challenge
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

      // Award points
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

      // Update challenge completion count
      await base44.entities.DailyChallenge.update(challenge.id, {
        completions_count: (challenge.completions_count || 0) + 1,
      });

      toast.success(`🎉 +${challenge.points_reward} puntos ganados!`);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setClaiming(p => ({ ...p, [challenge.id]: false }));
    }
  };

  const myRank = profiles.findIndex(p => p.user_email === user?.email) + 1;
  const completedToday = completions.length;
  const totalRewardable = challenges.length;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Hero */}
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🏆</div>
            <h1 className="font-poppins font-black text-2xl">Desafíos Fresitas</h1>
            <p className="text-muted-foreground text-sm mt-1">Completa retos y gana puntos extra cada día</p>
          </div>

          {/* My Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mi Ranking', value: myRank > 0 ? `#${myRank}` : '—', icon: Crown, color: 'text-gold', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Mis Puntos', value: myProfile?.loyalty_points || 0, icon: Star, color: 'text-strawberry', bg: 'bg-strawberry/10' },
              { label: 'Hoy Completados', value: `${completedToday}/${totalRewardable}`, icon: Target, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center">
                <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-1.5`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`font-poppins font-black text-lg ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {[
              { key: 'challenges', label: '🎯 Desafíos' },
              { key: 'ranking', label: '🏆 Ranking' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === t.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'challenges' ? (
              <motion.div key="challenges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
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
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
                  <Zap className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Los desafíos se renuevan cada día a medianoche. ¡Completa todos para el bono especial!
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WeeklyLeaderboard profiles={profiles} />
                {myRank > 0 && (
                  <div className="mt-3 bg-strawberry/10 rounded-2xl p-4 text-center">
                    <p className="text-sm font-semibold text-strawberry">Tu posición actual: #{myRank}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">¡Sigue pidiendo para subir en el ranking!</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}