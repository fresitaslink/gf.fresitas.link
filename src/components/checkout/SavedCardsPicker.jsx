import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Plus, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Checkout payment picker:
 * - Lists saved cards (one-tap charge via chargeWithSavedCard)
 * - Lets user add a new card (charged via processStripePayment, optionally saves it)
 *
 * Calls onPaymentSuccess({ payment_intent_id, last4 }) on success.
 */
export default function SavedCardsPicker({ total, customerEmail, orderId, onPaymentSuccess, onPaymentError }) {
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [mode, setMode] = useState(null); // 'saved' | 'new'
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paidLast4, setPaidLast4] = useState('');

  // New-card Stripe Elements
  const [stripe, setStripe] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [cardError, setCardError] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const cardMountRef = useRef(null);

  // Load saved cards on mount
  useEffect(() => {
    base44.functions.invoke('listSavedPaymentMethods', {})
      .then(r => {
        const cards = r.data?.payment_methods || [];
        setSavedCards(cards);
        setMode(cards.length > 0 ? 'saved' : 'new');
        if (cards.length > 0) setSelectedCardId(cards[0].id);
      })
      .catch(() => setMode('new'))
      .finally(() => setLoadingCards(false));
  }, []);

  // Lazy-load Stripe.js when in 'new' mode
  useEffect(() => {
    if (mode !== 'new' || stripe) return;
    (async () => {
      try {
        if (!window.Stripe) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://js.stripe.com/v3/';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        const keyRes = await base44.functions.invoke('getStripePublishableKey', {});
        const pk = keyRes.data?.publishable_key;
        if (!pk) throw new Error('Stripe key missing');
        const stripeInstance = window.Stripe(pk);
        const elements = stripeInstance.elements();
        const card = elements.create('card', {
          style: {
            base: { fontSize: '16px', color: 'hsl(var(--foreground))', fontFamily: 'Inter, sans-serif',
              '::placeholder': { color: 'hsl(var(--muted-foreground))' } },
            invalid: { color: 'hsl(var(--destructive))' },
          },
        });
        setStripe(stripeInstance);
        setCardElement(card);
        setStripeReady(true);
      } catch (e) {
        toast.error('Error: ' + e.message);
      }
    })();
  }, [mode]);

  // Mount card element
  useEffect(() => {
    if (cardElement && cardMountRef.current && mode === 'new') {
      cardElement.mount(cardMountRef.current);
      cardElement.on('change', e => setCardError(e.error?.message || ''));
      return () => { try { cardElement.unmount(); } catch {} };
    }
  }, [cardElement, mode]);

  const handlePaySaved = async () => {
    if (!selectedCardId) return;
    if (total < 10) {
      toast.error('Mínimo $10 MXN para pago con tarjeta. Usa efectivo o transferencia.');
      return;
    }
    setProcessing(true);
    try {
      const result = await base44.functions.invoke('chargeWithSavedCard', {
        amount: Math.round(total * 100),
        payment_method_id: selectedCardId,
        order_id: orderId,
        currency: 'mxn',
      });
      const data = result.data;
      if (data?.requires_action) throw new Error('Esta tarjeta requiere autenticación. Usa una tarjeta nueva.');
      if (!data?.success) throw new Error(data?.error || 'Pago rechazado');
      const card = savedCards.find(c => c.id === selectedCardId);
      setPaid(true);
      setPaidLast4(data.last4 || card?.last4 || '••••');
      onPaymentSuccess({ payment_intent_id: data.payment_intent_id, last4: data.last4 || card?.last4 });
    } catch (e) {
      toast.error('Error: ' + e.message);
      onPaymentError?.(e.message);
    } finally { setProcessing(false); }
  };

  const handlePayNew = async () => {
    if (!stripe || !cardElement) return;
    if (cardholderName.trim().length < 2) { toast.error('Ingresa el nombre en la tarjeta'); return; }
    if (total < 10) {
      toast.error('Mínimo $10 MXN para pago con tarjeta. Usa efectivo o transferencia.');
      return;
    }

    setProcessing(true);
    try {
      // 1. Tokenize card client-side
      const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: cardholderName, email: customerEmail },
      });
      if (pmErr) throw new Error(pmErr.message);

      // 2. Charge it
      const result = await base44.functions.invoke('processStripePayment', {
        amount: Math.round(total * 100),
        payment_method_id: paymentMethod.id,
        currency: 'mxn',
        order_id: orderId,
        customer_email: customerEmail,
      });
      const data = result.data;

      // 3. 3DS handling
      if (data?.requires_action && data.client_secret) {
        const { error: cErr, paymentIntent } = await stripe.confirmCardPayment(data.client_secret);
        if (cErr) throw new Error(cErr.message);
        if (paymentIntent.status !== 'succeeded') throw new Error('Authentication failed');
        await maybeSaveCard(paymentMethod.id);
        setPaid(true); setPaidLast4(paymentMethod.card?.last4 || '••••');
        onPaymentSuccess({ payment_intent_id: paymentIntent.id, last4: paymentMethod.card?.last4 });
        return;
      }
      if (!data?.success) throw new Error(data?.error || 'Pago rechazado');

      // 4. Optionally save card to customer for future
      await maybeSaveCard(paymentMethod.id);

      setPaid(true);
      setPaidLast4(data.last4 || paymentMethod.card?.last4 || '••••');
      onPaymentSuccess({ payment_intent_id: data.payment_intent_id, last4: data.last4 });
    } catch (e) {
      toast.error('Error: ' + e.message);
      onPaymentError?.(e.message);
    } finally { setProcessing(false); }
  };

  const maybeSaveCard = async (paymentMethodId) => {
    if (!saveCard) return;
    try {
      // Use SetupIntent flow to attach for future use — best effort, non-blocking
      const setupRes = await base44.functions.invoke('createSetupIntent', {});
      const cs = setupRes.data?.client_secret;
      if (!cs) return;
      // Attach this exact PM via SetupIntent confirm
      await stripe.confirmCardSetup(cs, { payment_method: paymentMethodId }).catch(() => {});
    } catch {}
  };

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="font-semibold text-green-700">¡Pago exitoso!</p>
        <p className="text-sm text-muted-foreground">Tarjeta ••••{paidLast4}</p>
      </div>
    );
  }

  if (loadingCards) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-strawberry" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-green-600" />
        <span className="text-xs text-green-700 font-medium">Pago seguro · Stripe</span>
        <span className="ml-auto text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">${total?.toFixed(2)}</span></span>
      </div>

      {savedCards.length > 0 && (
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setMode('saved')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${mode === 'saved' ? 'bg-strawberry text-white' : 'bg-muted text-muted-foreground'}`}
          >
            💳 Mis tarjetas ({savedCards.length})
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${mode === 'new' ? 'bg-strawberry text-white' : 'bg-muted text-muted-foreground'}`}
          >
            <Plus className="w-3 h-3 inline mr-1" /> Nueva tarjeta
          </button>
        </div>
      )}

      {mode === 'saved' && (
        <div className="space-y-2">
          {savedCards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedCardId === card.id ? 'border-strawberry bg-strawberry/5' : 'border-border hover:border-strawberry/40'}`}
            >
              <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-mono uppercase text-sm font-semibold">{card.brand} ••••{card.last4}</p>
                <p className="text-xs text-muted-foreground">Vence {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</p>
              </div>
              {selectedCardId === card.id && <CheckCircle2 className="w-5 h-5 text-strawberry flex-shrink-0" />}
            </button>
          ))}

          <Button
            onClick={handlePaySaved}
            disabled={!selectedCardId || processing}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2 font-bold mt-3"
          >
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Lock className="w-4 h-4" /> Pagar ${total?.toFixed(2)}</>}
          </Button>
        </div>
      )}

      {mode === 'new' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nombre en la tarjeta</label>
            <Input
              value={cardholderName}
              onChange={e => setCardholderName(e.target.value.toUpperCase())}
              placeholder="NOMBRE COMPLETO"
              className="h-10 rounded-xl font-mono tracking-wide text-sm"
              disabled={processing}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Datos de la tarjeta</label>
            <div ref={cardMountRef} className="w-full h-10 px-3 py-2.5 rounded-xl border border-input bg-transparent" />
            {!stripeReady && <p className="text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Cargando...</p>}
            {cardError && <p className="text-xs text-destructive">{cardError}</p>}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={e => setSaveCard(e.target.checked)}
              className="w-3.5 h-3.5 accent-strawberry"
            />
            Guardar tarjeta para futuras compras (con Stripe, 100% seguro)
          </label>

          <Button
            onClick={handlePayNew}
            disabled={!stripeReady || processing || cardholderName.trim().length < 2}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2 font-bold"
          >
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><CreditCard className="w-4 h-4" /> Pagar ${total?.toFixed(2)}</>}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Tus datos NUNCA tocan nuestros servidores · 256-bit SSL · PCI-DSS</span>
      </div>
    </div>
  );
}