import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, Gift, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    base44.entities.CustomerProfile.filter({ user_email: user.email })
      .then(p => { if (p[0]) setProfile(p[0]); });
  }, [user]);

  const referralCode = user?.email ? btoa(user.email).replace(/=/g, '').substring(0, 12).toUpperCase() : '';
  const referralLink = `${window.location.origin}?ref=${referralCode}&email=${encodeURIComponent(user?.email || '')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(language === 'es' ? '¡Enlace copiado!' : 'Link copied!', { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: '🍓 Fresitas G&F',
        text: language === 'es'
          ? '¡Prueba las mejores fresitas con crema! Usa mi enlace y ambos ganamos 50 puntos 🍓'
          : 'Try the best strawberries and cream! Use my link and we both earn 50 points 🍓',
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Hero */}
          <div className="text-center py-10">
            <div className="text-7xl mb-4">🍓</div>
            <h1 className="font-poppins font-black text-3xl text-foreground mb-2">
              {language === 'es' ? 'Comparte el Amor' : 'Share the Love'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'es'
                ? 'Invita a tus amigos y ambos ganan 50 puntos Fresitas Club'
                : 'Invite your friends and you both earn 50 Fresitas Club points'}
            </p>
          </div>

          {/* Points Banner */}
          <div className="bg-gradient-to-r from-strawberry to-pink-500 rounded-2xl p-6 text-white text-center mb-6 shadow-lg">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-black">50</p>
                <p className="text-pink-100 text-xs">{language === 'es' ? 'Puntos para ti' : 'Points for you'}</p>
              </div>
              <div className="flex items-center justify-center text-3xl">🤝</div>
              <div>
                <p className="text-3xl font-black">50</p>
                <p className="text-pink-100 text-xs">{language === 'es' ? 'Puntos para tu amigo' : 'Points for friend'}</p>
              </div>
            </div>
          </div>

          {/* Your Link */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-strawberry" />
              {language === 'es' ? 'Tu Enlace de Referido' : 'Your Referral Link'}
            </h3>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="rounded-xl text-xs bg-muted"
              />
              <Button
                onClick={handleCopy}
                className={`rounded-xl flex-shrink-0 ${copied ? 'bg-green-500' : 'bg-strawberry'} text-white hover:opacity-90`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full mt-3 rounded-xl border-strawberry text-strawberry hover:bg-strawberry hover:text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Compartir Enlace' : 'Share Link'}
            </Button>
          </div>

          {/* Your Points */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-strawberry/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-strawberry" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'es' ? 'Tus puntos actuales' : 'Your current points'}</p>
                <p className="font-poppins font-black text-2xl text-strawberry">{profile?.loyalty_points || 0} pts</p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-4">{language === 'es' ? '¿Cómo funciona?' : 'How it works?'}</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: language === 'es' ? 'Comparte tu enlace único con amigos' : 'Share your unique link with friends' },
                { step: '2', text: language === 'es' ? 'Tu amigo se registra y hace su primer pedido' : 'Your friend signs up and places their first order' },
                { step: '3', text: language === 'es' ? '¡Ambos reciben 50 puntos automáticamente!' : 'You both receive 50 points automatically!' },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-strawberry text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
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