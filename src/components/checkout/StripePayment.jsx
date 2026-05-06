import React, { useState, useEffect, useRef } from 'react';
import { Lock, Loader2, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * PCI-COMPLIANT Stripe payment using Stripe Elements.
 * Card details NEVER touch our backend — they go straight to Stripe.
 * Backend only receives a payment_method_id token.
 */
export default function StripePayment({ total, onPaymentSuccess, onPaymentError, disabled, orderId, customerEmail }) {
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paidLast4, setPaidLast4] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const [cardError, setCardError] = useState('');
  const cardMountRef = useRef(null);

  // Load Stripe.js + publishable key
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Load Stripe.js script if not already loaded
        if (!window.Stripe) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Fetch publishable key from backend
        const keyRes = await base44.functions.invoke('getStripePublishableKey', {});
        const pk = keyRes.data?.publishable_key;
        if (!pk) throw new Error('Stripe publishable key missing');

        if (!mounted) return;

        const stripeInstance = window.Stripe(pk);
        const elementsInstance = stripeInstance.elements();
        const card = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: 'hsl(var(--foreground))',
              fontFamily: 'Inter, sans-serif',
              '::placeholder': { color: 'hsl(var(--muted-foreground))' },
            },
            invalid: { color: 'hsl(var(--destructive))' },
          },
        });

        setStripe(stripeInstance);
        setElements(elementsInstance);
        setCardElement(card);
        setStripeReady(true);
      } catch (err) {
        console.error('Stripe init error:', err);
        toast.error('Error iniciando pago: ' + err.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Mount card element once ref + card are ready
  useEffect(() => {
    if (cardElement && cardMountRef.current) {
      cardElement.mount(cardMountRef.current);
      cardElement.on('change', (e) => setCardError(e.error?.message || ''));
      return () => cardElement.unmount();
    }
  }, [cardElement]);

  const handlePay = async () => {
    if (!stripe || !cardElement) return;
    if (cardholderName.trim().length < 2) {
      toast.error('Ingresa el nombre en la tarjeta');
      return;
    }

    setProcessing(true);
    try {
      // 1. Tokenize card client-side (PCI-safe)
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: cardholderName, email: customerEmail },
      });

      if (pmError) throw new Error(pmError.message);

      // 2. Send token to backend (NO card data)
      const result = await base44.functions.invoke('processStripePayment', {
        amount: Math.round(total * 100),
        payment_method_id: paymentMethod.id,
        currency: 'mxn',
        order_id: orderId,
        customer_email: customerEmail,
      });

      const data = result.data;

      // 3. Handle 3D Secure
      if (data?.requires_action && data.client_secret) {
        const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(data.client_secret);
        if (confirmErr) throw new Error(confirmErr.message);
        if (paymentIntent.status !== 'succeeded') throw new Error('Authentication failed');
        setPaid(true);
        setPaidLast4(paymentMethod.card?.last4 || '••••');
        onPaymentSuccess({ payment_intent_id: paymentIntent.id, last4: paymentMethod.card?.last4 });
        return;
      }

      if (!data?.success) throw new Error(data?.error || 'Pago rechazado');

      setPaid(true);
      setPaidLast4(data.last4 || paymentMethod.card?.last4 || '••••');
      onPaymentSuccess({
        payment_intent_id: data.payment_intent_id,
        last4: data.last4,
        receipt_url: data.receipt_url,
      });
    } catch (err) {
      toast.error('Error en el pago: ' + err.message);
      onPaymentError?.(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="font-semibold text-green-700">¡Pago exitoso!</p>
        <p className="text-sm text-muted-foreground">Tarjeta terminación ••••{paidLast4}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-green-600" />
        <span className="text-xs text-green-700 font-medium">Pago seguro · Stripe</span>
        <span className="ml-auto text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">${total?.toFixed(2)}</span></span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Nombre en la tarjeta</label>
        <input
          value={cardholderName}
          onChange={e => setCardholderName(e.target.value.toUpperCase())}
          placeholder="NOMBRE COMPLETO"
          className="w-full h-10 px-3 rounded-xl border border-input bg-transparent font-mono tracking-wide text-sm"
          disabled={disabled || processing}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Datos de la tarjeta</label>
        <div
          ref={cardMountRef}
          className="w-full h-10 px-3 py-2.5 rounded-xl border border-input bg-transparent"
        />
        {!stripeReady && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Cargando Stripe...
          </p>
        )}
        {cardError && <p className="text-xs text-destructive">{cardError}</p>}
      </div>

      <Button
        onClick={handlePay}
        disabled={!stripeReady || processing || disabled || cardholderName.trim().length < 2}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2 font-bold"
      >
        {processing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
          : <><CreditCard className="w-4 h-4" /> Pagar ${total?.toFixed(2)}</>
        }
      </Button>

      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Tus datos NUNCA tocan nuestros servidores · 256-bit SSL · PCI-DSS</span>
      </div>
    </div>
  );
}