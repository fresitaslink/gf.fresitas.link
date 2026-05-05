import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Luhn algorithm for basic card validation
function luhn(num) {
  let s = 0, alt = false;
  for (let i = num.replace(/\D/g,'').length - 1; i >= 0; i--) {
    let n = parseInt(num.replace(/\D/g,'')[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    s += n; alt = !alt;
  }
  return s % 10 === 0;
}

function detectBrand(num) {
  const n = num.replace(/\D/g, '');
  if (/^4/.test(n)) return { brand: 'Visa', icon: '💳' };
  if (/^5[1-5]/.test(n)) return { brand: 'Mastercard', icon: '💳' };
  if (/^3[47]/.test(n)) return { brand: 'Amex', icon: '💳' };
  return { brand: '', icon: '💳' };
}

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const clean = val.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 3) return clean.slice(0, 2) + '/' + clean.slice(2);
  return clean;
}

export default function StripePayment({ total, onPaymentSuccess, onPaymentError, disabled }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  const brand = detectBrand(cardNumber);
  const cleanCard = cardNumber.replace(/\D/g, '');
  const isValid = cleanCard.length === 16 && luhn(cleanCard) && expiry.length === 5 && cvc.length >= 3 && name.trim().length > 1;

  const handlePay = async () => {
    if (!isValid) {
      toast.error('Por favor verifica los datos de tu tarjeta');
      return;
    }
    setProcessing(true);
    try {
      // Call backend to create payment intent and process card
      const result = await base44.functions.invoke('processStripePayment', {
        amount: Math.round(total * 100), // cents
        card_number: cleanCard,
        exp_month: expiry.split('/')[0],
        exp_year: '20' + expiry.split('/')[1],
        cvc,
        name,
      });

      if (result.data?.success) {
        setPaid(true);
        onPaymentSuccess({ payment_intent_id: result.data.payment_intent_id, last4: cleanCard.slice(-4) });
      } else {
        throw new Error(result.data?.error || 'Pago rechazado');
      }
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
        <p className="text-sm text-muted-foreground">Tarjeta terminación ••••{cleanCard.slice(-4)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-green-600" />
        <span className="text-xs text-green-700 font-medium">Pago seguro encriptado</span>
        <span className="ml-auto text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">${total?.toFixed(2)}</span></span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Nombre en la tarjeta</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value.toUpperCase())}
          placeholder="NOMBRE COMPLETO"
          className="rounded-xl font-mono tracking-wide"
          disabled={disabled || processing}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Número de tarjeta</Label>
        <div className="relative">
          <Input
            value={cardNumber}
            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            className="rounded-xl font-mono tracking-widest pr-12"
            maxLength={19}
            disabled={disabled || processing}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">{brand.icon}</span>
        </div>
        {brand.brand && <p className="text-xs text-muted-foreground">{brand.brand} detectado</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Vencimiento</Label>
          <Input
            value={expiry}
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/AA"
            className="rounded-xl font-mono"
            maxLength={5}
            disabled={disabled || processing}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CVC</Label>
          <Input
            value={cvc}
            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            className="rounded-xl font-mono"
            maxLength={4}
            type="password"
            disabled={disabled || processing}
          />
        </div>
      </div>

      <Button
        onClick={handlePay}
        disabled={!isValid || processing || disabled}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2 font-bold"
      >
        {processing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
          : <><CreditCard className="w-4 h-4" /> Pagar ${total?.toFixed(2)}</>
        }
      </Button>

      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span>🔒 SSL</span>
        <span>•</span>
        <span>Visa</span>
        <span>•</span>
        <span>Mastercard</span>
        <span>•</span>
        <span>Amex</span>
      </div>
    </div>
  );
}