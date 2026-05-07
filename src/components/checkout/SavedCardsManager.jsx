import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Plus, Trash2, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const BRAND_LOGOS = {
  visa: '💳', mastercard: '💳', amex: '💳', discover: '💳', unknown: '💳',
};

/**
 * Manage saved payment methods using Stripe SetupIntent (PCI-safe).
 * User can add/remove cards. Cards are stored on Stripe Customer object.
 */
export default function SavedCardsManager() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const cardMountRef = useRef(null);

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('listSavedPaymentMethods', {});
      setCards(res.data?.payment_methods || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCards(); }, []);

  const initStripe = async () => {
    if (stripe) return stripe;
    if (!window.Stripe) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }
    const keyRes = await base44.functions.invoke('getStripePublishableKey', {});
    const pk = keyRes.data?.publishable_key;
    const s = window.Stripe(pk);
    const e = s.elements();
    const card = e.create('card', {
      style: {
        base: { fontSize: '16px', color: 'hsl(var(--foreground))', fontFamily: 'Inter, sans-serif',
          '::placeholder': { color: 'hsl(var(--muted-foreground))' } },
        invalid: { color: 'hsl(var(--destructive))' },
      },
    });
    setStripe(s); setElements(e); setCardElement(card); setStripeReady(true);
    return s;
  };

  const handleAddCard = async () => {
    setAdding(true);
    await initStripe();
    setTimeout(() => { if (cardMountRef.current && cardElement) cardElement.mount(cardMountRef.current); }, 100);
  };

  useEffect(() => {
    if (cardElement && cardMountRef.current && adding) {
      cardElement.mount(cardMountRef.current);
      return () => { try { cardElement.unmount(); } catch {} };
    }
  }, [cardElement, adding]);

  const handleSaveCard = async () => {
    if (!stripe || !cardElement) return;
    setSubmitting(true);
    try {
      // 1. Create SetupIntent on backend
      const setupRes = await base44.functions.invoke('createSetupIntent', {});
      const clientSecret = setupRes.data?.client_secret;
      if (!clientSecret) throw new Error(setupRes.data?.error || 'No client_secret');

      // 2. Confirm card setup client-side (PCI-safe)
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (result.error) throw new Error(result.error.message);

      toast.success('💳 Tarjeta guardada de forma segura');
      setAdding(false);
      try { cardElement.unmount(); } catch {}
      await loadCards();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally { setSubmitting(false); }
  };

  const handleDeleteCard = async (pmId) => {
    if (!confirm('¿Eliminar esta tarjeta?')) return;
    try {
      const res = await base44.functions.invoke('deleteSavedPaymentMethod', { payment_method_id: pmId });
      if (!res.data?.success) throw new Error(res.data?.error);
      toast.success('Tarjeta eliminada');
      setCards(prev => prev.filter(c => c.id !== pmId));
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-strawberry" />
          <h3 className="font-semibold text-sm">Tarjetas guardadas</h3>
          <Lock className="w-3 h-3 text-green-600" />
        </div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={handleAddCard} className="gap-1.5 rounded-xl text-xs">
            <Plus className="w-3 h-3" /> Agregar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-strawberry" /></div>
      ) : cards.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aún no tienes tarjetas guardadas</p>
      ) : (
        <div className="space-y-2">
          {cards.map(card => (
            <div key={card.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{BRAND_LOGOS[card.brand] || '💳'}</div>
                <div>
                  <p className="font-mono text-sm font-semibold uppercase">{card.brand} ••••{card.last4}</p>
                  <p className="text-xs text-muted-foreground">Vence {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</p>
                </div>
              </div>
              <button onClick={() => handleDeleteCard(card.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="border border-strawberry/30 rounded-xl p-4 space-y-3 bg-strawberry/5">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <Lock className="w-3 h-3" /> Stripe · Tus datos NUNCA tocan nuestros servidores
          </div>
          <div ref={cardMountRef} className="h-10 px-3 py-2.5 bg-background rounded-xl border border-input" />
          {!stripeReady && <p className="text-xs text-muted-foreground"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Cargando...</p>}
          <div className="flex gap-2">
            <Button onClick={handleSaveCard} disabled={!stripeReady || submitting} className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Guardar tarjeta
            </Button>
            <Button onClick={() => { setAdding(false); try { cardElement?.unmount(); } catch {} }} variant="outline" className="rounded-xl">Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}