import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, Gift, Users, CheckCircle, TrendingUp, Star, Trophy, QrCode, Ticket, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const TIER_CONFIG = [
  { min: 0, max: 1, label: 'Fresita Novata', emoji: '🌱', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  { min: 1, max: 3, label: 'Fresita Amigable', emoji: '🍓', color: 'text-strawberry', bg: 'bg-strawberry/10' },
  { min: 3, max: 7, label: 'Fresita Estrella', emoji: '⭐', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { min: 7, max: 15, label: 'Embajadora Fresitas', emoji: '👑', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { min: 15, max: Infinity, label: 'Leyenda Fresitas', emoji: '🏆', color: 'text-gold', bg: 'bg-gold/10' },
];

function getTier(count) {
  return TIER_CONFIG.find(t => count >= t.min && count < t.max) || TIER_CONFIG[0];
}

function QRCodeDisplay({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    const size = 160;
    const canvas = ref.current;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // Simple QR-like visual using canvas (decorative)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#E8294A';
    // Position markers
    [[0,0],[size-40,0],[0,size-40]].forEach(([x,y]) => {
      ctx.fillRect(x+4, y+4, 32, 32);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x+9, y+9, 22, 22);
      ctx.fillStyle = '#E8294A';
      ctx.fillRect(x+13, y+13, 14, 14);
      ctx.fillStyle = '#E8294A';
    });
    // Data modules (hash-based pattern)
    const hash = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        if (((hash * (i + 1) * (j + 1)) % 3) === 0) {
          ctx.fillRect(44 + i * 9, 44 + j * 9, 7, 7);
        }
      }
    }
    // Center text
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(55, 60, 50, 40);
    ctx.fillStyle = '#E8294A';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🍓', size/2, 78);
    ctx.fillText(value.substring(0,4), size/2, 90);
    ctx.fillText(value.substring(4), size/2, 100);
  }, [value]);
  return <canvas ref={ref} className="rounded-xl shadow-md" style={{ imageRendering: 'pixelated' }} />;
}

export default function Referral() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [settings, setSettings] = useState({ referral_points: 50 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  const referralCode = user?.email
    ? btoa(user.email).replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase()
    : '';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    Promise.all([
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
      base44.entities.ReferralRecord.filter({ referrer_email: user.email }),
      base44.entities.StoreSettings.list(),
      base44.entities.ReferralRecord.list('-created_date', 100),
    ]).then(([profiles, refs, setts, allRefs]) => {
      if (profiles[0]) setProfile(profiles[0]);
      setReferrals(refs);
      if (setts[0]) setSettings(setts[0]);
      // Compute top referrers
      const countMap = {};
      allRefs.filter(r => r.status === 'completed').forEach(r => {
        countMap[r.referrer_email] = (countMap[r.referrer_email] || 0) + 1;
      });
      const top = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => ({ email, count }));
      setTopReferrers(top);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(language === 'es' ? '¡Enlace copiado!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('¡Código copiado!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: '🍓 Fresitas G&F',
        text: language === 'es'
          ? `¡Prueba las mejores fresitas con crema! Usa mi código ${referralCode} y ambos ganamos ${settings.referral_points || 50} puntos 🍓`
          : `Try the best strawberries! Use my code ${referralCode} and we both earn ${settings.referral_points || 50} points 🍓`,
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🍓 ¡Hola! Te recomiendo Fresitas G&F. Usa mi código *${referralCode}* en tu primer pedido y ¡AMBOS ganamos ${settings.referral_points || 50} puntos Fresitas Club! 🎁\n\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const totalPointsEarned = completedReferrals.length * (settings.referral_points || 50);
  const tier = getTier(completedReferrals.length);
  const nextTier = TIER_CONFIG.find(t => t.min > completedReferrals.length);
  const progressToNext = nextTier
    ? ((completedReferrals.length - tier.min) / (nextTier.min - tier.min)) * 100
    : 100;

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Hero */}
          <div className="text-center py-8">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              className="text-5xl mb-4"
            >🎁</motion.div>
            <h1 className="font-poppins font-black text-3xl text-foreground mb-2">
              {language === 'es' ? 'Programa de Referidos' : 'Referral Program'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'es'
                ? `Invita amigos y ambos ganan ${settings.referral_points || 50} puntos + cupón de descuento`
                : `Invite friends and you both earn ${settings.referral_points || 50} points + discount coupon`}
            </p>
          </div>

          {/* Tier Badge */}
          <div className={`${tier.bg} border border-border rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tier.emoji}</span>
                <div>
                  <p className={`font-poppins font-bold text-sm ${tier.color}`}>{tier.label}</p>
                  <p className="text-xs text-muted-foreground">{completedReferrals.length} referidos completados</p>
                </div>
              </div>
              {nextTier && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Siguiente nivel</p>
                  <p className="text-xs font-medium">{nextTier.min - completedReferrals.length} más</p>
                </div>
              )}
            </div>
            {nextTier && (
              <Progress value={progressToNext} className="h-2" />
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: language === 'es' ? 'Referidos' : 'Referred', value: referrals.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: language === 'es' ? 'Completados' : 'Completed', value: completedReferrals.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: language === 'es' ? 'Pts Ganados' : 'Pts Earned', value: totalPointsEarned, icon: Star, color: 'text-strawberry', bg: 'bg-strawberry/10' },
            ].map((stat, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 text-center">
                <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className={`font-poppins font-black text-xl ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Rewards Banner */}
          <div className="bg-gradient-to-r from-strawberry via-pink-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg">
            <p className="font-poppins font-bold text-center mb-4">
              {language === 'es' ? '¿Qué ganan ambos?' : 'What do both get?'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <Star className="w-6 h-6 mx-auto mb-1" />
                <p className="font-black text-xl">{settings.referral_points || 50} pts</p>
                <p className="text-pink-100 text-xs">Puntos Fresitas Club</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <Ticket className="w-6 h-6 mx-auto mb-1" />
                <p className="font-black text-xl">10% OFF</p>
                <p className="text-pink-100 text-xs">Cupón automático</p>
              </div>
            </div>
          </div>

          {/* Your Code + QR */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Share2 className="w-4 h-4 text-strawberry" />
              {language === 'es' ? 'Tu Código Único' : 'Your Unique Code'}
            </h3>

            {/* Code */}
            <div
              className="bg-gradient-to-r from-strawberry/10 to-pink-100 dark:from-strawberry/20 dark:to-pink-900/20 rounded-xl p-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleCopyCode}
              title="Clic para copiar"
            >
              <p className="font-poppins font-black text-4xl text-strawberry tracking-widest">{referralCode}</p>
              <p className="text-xs text-muted-foreground mt-1">Clic para copiar</p>
            </div>

            {/* QR Toggle */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 text-xs border-strawberry text-strawberry"
                onClick={() => setShowQR(v => !v)}
              >
                <QrCode className="w-3.5 h-3.5" />
                {showQR ? 'Ocultar QR' : 'Ver Código QR'}
              </Button>
            </div>

            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <QRCodeDisplay value={referralCode} />
                  <p className="text-xs text-muted-foreground">Muestra este QR a tus amigos</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Link */}
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="rounded-xl text-xs bg-muted" />
              <Button
                onClick={handleCopy}
                className={`rounded-xl flex-shrink-0 ${copied ? 'bg-green-500' : 'bg-strawberry'} text-white hover:opacity-90`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleShare} variant="outline" className="rounded-xl border-strawberry text-strawberry text-xs gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                {language === 'es' ? 'Compartir' : 'Share'}
              </Button>
              <Button onClick={handleShareWhatsApp} className="rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Current Points */}
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-strawberry/10 flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-strawberry" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{language === 'es' ? 'Tus puntos actuales' : 'Your current points'}</p>
              <p className="font-poppins font-black text-2xl text-strawberry">{profile?.loyalty_points || 0} pts</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => navigate('/dashboard')}>
              Ver Dashboard
            </Button>
          </div>

          {/* Top Referrers Leaderboard */}
          {topReferrers.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-poppins font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold" />
                {language === 'es' ? 'Top Referidoras' : 'Top Referrers'}
              </h3>
              <div className="space-y-2">
                {topReferrers.map((r, i) => (
                  <div key={r.email} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0 ? 'bg-gold text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i === 0 ? '👑' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.email === user?.email ? `${r.email} (Tú) ⭐` : r.email.replace(/(.{2}).*@/, '$1***@')}
                      </p>
                    </div>
                    <Badge className={`text-xs ${i === 0 ? 'bg-gold/20 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                      {r.count} refs
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral List */}
          {referrals.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-strawberry" />
                {language === 'es' ? 'Tus Referidos' : 'Your Referrals'}
                <Badge className="text-xs">{referrals.length}</Badge>
              </h3>
              <div className="space-y-2">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{ref.referred_email.replace(/(.{2}).*@/, '$1***@')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ref.created_date).toLocaleDateString('es-MX')}</p>
                    </div>
                    <Badge className={ref.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }>
                      {ref.status === 'completed'
                        ? `+${ref.points_awarded || settings.referral_points || 50} pts + cupón`
                        : language === 'es' ? '⏳ Pendiente' : '⏳ Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-poppins font-bold mb-4">{language === 'es' ? '¿Cómo funciona?' : 'How it works?'}</h3>
            <div className="space-y-4">
              {[
                { step: '1', emoji: '📲', text: language === 'es' ? 'Comparte tu código único o enlace con amigos por WhatsApp, Instagram o en persona' : 'Share your unique code or link with friends' },
                { step: '2', emoji: '🛍️', text: language === 'es' ? 'Tu amigo se registra y hace su PRIMER pedido usando tu código' : 'Your friend signs up and places their first order using your code' },
                { step: '3', emoji: '🎁', text: language === 'es' ? `¡Ambos reciben ${settings.referral_points || 50} puntos Y un cupón de 10% automáticamente!` : `You both receive ${settings.referral_points || 50} points AND a 10% coupon automatically!` },
                { step: '4', emoji: '🏆', text: language === 'es' ? 'Sube de nivel según tus referidos: Novata → Estrella → Leyenda' : 'Level up based on your referrals: Beginner → Star → Legend' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-strawberry text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{item.step}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="mr-1">{item.emoji}</span>{item.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              💡 {language === 'es' ? '100 puntos = $10 de descuento · El cupón de referido se aplica automáticamente en el siguiente pedido' : '100 points = $10 off · Referral coupon applied automatically on next order'}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}