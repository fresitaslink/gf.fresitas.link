import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, Gift, Users, CheckCircle, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Referral() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [settings, setSettings] = useState({ referral_points: 50 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate deterministic code from email
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
    ]).then(([profiles, refs, setts]) => {
      if (profiles[0]) setProfile(profiles[0]);
      setReferrals(refs);
      if (setts[0]) setSettings(setts[0]);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(language === 'es' ? '¡Enlace copiado!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
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

  const completedReferrals = referrals.filter(r => r.status === 'completed');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const totalPointsEarned = completedReferrals.length * (settings.referral_points || 50);

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Hero */}
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-strawberry/10 rounded-full flex items-center justify-center">
              <Gift className="w-10 h-10 text-strawberry" />
            </div>
            <h1 className="font-poppins font-black text-3xl text-foreground mb-2">
              {language === 'es' ? 'Programa de Referidos' : 'Referral Program'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'es'
                ? `Invita amigos y ambos ganan ${settings.referral_points || 50} puntos Fresitas Club`
                : `Invite friends and you both earn ${settings.referral_points || 50} Fresitas Club points`}
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: language === 'es' ? 'Referidos Total' : 'Total Referred', value: referrals.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: language === 'es' ? 'Completados' : 'Completed', value: completedReferrals.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: language === 'es' ? 'Puntos Ganados' : 'Points Earned', value: totalPointsEarned, icon: Star, color: 'text-strawberry', bg: 'bg-strawberry/10' },
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

          {/* Points Banner */}
          <div className="bg-gradient-to-r from-strawberry to-pink-500 rounded-2xl p-6 text-white text-center shadow-lg">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-black">{settings.referral_points || 50}</p>
                <p className="text-pink-100 text-xs">{language === 'es' ? 'Puntos para ti' : 'Points for you'}</p>
              </div>
              <div className="flex items-center justify-center">
                <TrendingUp className="w-8 h-8 opacity-80" />
              </div>
              <div>
                <p className="text-3xl font-black">{settings.referral_points || 50}</p>
                <p className="text-pink-100 text-xs">{language === 'es' ? 'Puntos para tu amigo' : 'Points for friend'}</p>
              </div>
            </div>
          </div>

          {/* Your Code */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm">
              <Share2 className="w-4 h-4 text-strawberry" />
              {language === 'es' ? 'Tu Código de Referido' : 'Your Referral Code'}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{language === 'es' ? 'Comparte este código o enlace con tus amigos' : 'Share this code or link with your friends'}</p>
            
            {/* Code display */}
            <div className="bg-muted rounded-xl p-3 text-center mb-3">
              <p className="font-poppins font-black text-3xl text-strawberry tracking-widest">{referralCode}</p>
            </div>

            {/* Link */}
            <div className="flex gap-2 mb-3">
              <Input value={referralLink} readOnly className="rounded-xl text-xs bg-muted" />
              <Button
                onClick={handleCopy}
                className={`rounded-xl flex-shrink-0 ${copied ? 'bg-green-500' : 'bg-strawberry'} text-white hover:opacity-90`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={handleShare} variant="outline" className="w-full rounded-xl border-strawberry text-strawberry hover:bg-strawberry hover:text-white">
              <Share2 className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Compartir' : 'Share'}
            </Button>
          </div>

          {/* Current Points */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-strawberry/10 flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-strawberry" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{language === 'es' ? 'Tus puntos actuales' : 'Your current points'}</p>
              <p className="font-poppins font-black text-2xl text-strawberry">{profile?.loyalty_points || 0} pts</p>
            </div>
          </div>

          {/* Referral List */}
          {referrals.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-strawberry" />
                {language === 'es' ? 'Tus Referidos' : 'Your Referrals'}
              </h3>
              <div className="space-y-2">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{ref.referred_email}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ref.created_date).toLocaleDateString('es-MX')}</p>
                    </div>
                    <Badge className={ref.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }>
                      {ref.status === 'completed'
                        ? `+${ref.points_awarded || settings.referral_points || 50} pts`
                        : language === 'es' ? 'Pendiente' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-4">{language === 'es' ? '¿Cómo funciona?' : 'How it works?'}</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: language === 'es' ? 'Comparte tu código único con amigos' : 'Share your unique code with friends' },
                { step: '2', text: language === 'es' ? 'Tu amigo se registra y hace su primer pedido' : 'Your friend signs up and places their first order' },
                { step: '3', text: language === 'es' ? `¡Ambos reciben ${settings.referral_points || 50} puntos automáticamente!` : `You both receive ${settings.referral_points || 50} points automatically!` },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-strawberry text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{item.step}</div>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              💡 {language === 'es' ? '100 puntos = $5 de descuento en tu siguiente pedido' : '100 points = $5 off your next order'}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}