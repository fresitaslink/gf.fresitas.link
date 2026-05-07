import React, { useState } from 'react';
import { Share2, Copy, CheckCircle2, Gift, MessageCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Compact referral link card for the user profile.
 * Wraps the heavier /referral page features into a quick-access card.
 */
export default function ReferralLinkCard({ user, settings, completedCount = 0, language = 'es' }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!user?.email) return null;

  const referralCode = btoa(user.email).replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const points = settings?.referral_points || 50;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(language === 'es' ? '¡Enlace copiado!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWA = () => {
    const text = encodeURIComponent(
      language === 'es'
        ? `🍓 ¡Hola! Te recomiendo Fresitas G&F. Usa mi código *${referralCode}* en tu primer pedido y AMBOS ganamos ${points} puntos + cupón 10%! ${referralLink}`
        : `🍓 Hi! Try Fresitas G&F. Use my code *${referralCode}* on your first order and we BOTH get ${points} points + 10% off! ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({
        title: '🍓 Fresitas G&F',
        text: language === 'es'
          ? `Usa mi código ${referralCode} y ambos ganamos ${points} puntos`
          : `Use my code ${referralCode} and we both earn ${points} points`,
        url: referralLink,
      }).catch(() => {});
    } else copyLink();
  };

  return (
    <div className="bg-gradient-to-br from-strawberry/10 via-pink-50 to-purple-50 dark:from-strawberry/20 dark:via-pink-900/10 dark:to-purple-900/10 rounded-2xl border border-strawberry/30 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-strawberry rounded-2xl flex items-center justify-center text-2xl">🎁</div>
          <div>
            <h3 className="font-poppins font-bold flex items-center gap-2">
              {language === 'es' ? 'Invita y gana' : 'Invite & earn'}
              {completedCount > 0 && (
                <span className="text-xs bg-strawberry text-white px-2 py-0.5 rounded-full">{completedCount}</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === 'es' ? `Ambos ganan ${points} pts + cupón 10%` : `Both earn ${points} pts + 10% off`}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/referral')} className="text-strawberry hover:opacity-70 transition-opacity">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Code box */}
      <button
        onClick={copyLink}
        className="w-full bg-white dark:bg-black/30 rounded-xl border-2 border-dashed border-strawberry/40 hover:border-strawberry transition-colors p-3 group"
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {language === 'es' ? 'Tu código' : 'Your code'}
        </p>
        <p className="font-poppins font-black text-2xl text-strawberry tracking-[0.3em]">{referralCode}</p>
      </button>

      {/* Link + copy */}
      <div className="flex gap-2">
        <Input value={referralLink} readOnly className="rounded-xl text-xs bg-white dark:bg-black/30" />
        <Button
          onClick={copyLink}
          className={`rounded-xl flex-shrink-0 px-3 ${copied ? 'bg-green-500' : 'bg-strawberry'} text-white hover:opacity-90`}
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={shareWA} className="rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </Button>
        <Button onClick={shareNative} variant="outline" className="rounded-xl border-strawberry text-strawberry text-xs gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          {language === 'es' ? 'Compartir' : 'Share'}
        </Button>
      </div>

      <button
        onClick={() => navigate('/referral')}
        className="w-full text-xs text-strawberry hover:underline flex items-center justify-center gap-1"
      >
        <Gift className="w-3 h-3" /> {language === 'es' ? 'Ver historial completo de referidos' : 'See full referral history'}
      </button>
    </div>
  );
}