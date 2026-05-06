import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, Clock, CreditCard, FileText, Loader2, Zap, PartyPopper, MessageCircle, Package, Sparkles, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import DeliveryMap from '@/components/checkout/DeliveryMap';
import StripePayment from '@/components/checkout/StripePayment';
import ScheduledDelivery from '@/components/checkout/ScheduledDelivery';

const STEPS = ['delivery', 'customize', 'payment', 'confirm'];

export default function Checkout() {
  const { t, language } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { promo, total: cartTotal, deliveryFee = 30, discount = 0 } = location.state || {};

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [stripePaymentData, setStripePaymentData] = useState(null);
  const [settings, setSettings] = useState({ delivery_fee: 30, free_delivery_min: 200, whatsapp_number: '525512345678' });
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);

  const [form, setForm] = useState({
    customer_name: user?.full_name || '',
    customer_phone: '',
    customer_address: '',
    notes: '',
    delivery_time_preference: '',
    payment_method: 'efectivo',
  });

  useEffect(() => {
    base44.entities.StoreSettings.list().then(s => { if (s[0]) setSettings(s[0]); });
    if (user) {
      Promise.all([
        base44.entities.CustomerProfile.filter({ user_email: user.email }),
        base44.entities.Subscription.filter({ user_email: user.email }),
      ]).then(([profiles, subs]) => {
        if (profiles[0]) {
          setProfile(profiles[0]);
          setAvailablePoints(profiles[0].loyalty_points || 0);
          setForm(prev => ({
            ...prev,
            customer_name: profiles[0].display_name || user.full_name || '',
            customer_phone: profiles[0].phone || '',
            customer_address: profiles[0].addresses?.find(a => a.is_default)?.address || '',
          }));
        }
        const activeSub = subs.find(s => s.status === 'active');
        if (activeSub) setSubscription(activeSub);
      });
    }
  }, [user]);

  // Track checkout visit for funnel analytics (only once per mount)
  useEffect(() => {
    const prev = parseInt(localStorage.getItem('fresitas_funnel_checkout') || '0');
    localStorage.setItem('fresitas_funnel_checkout', String(prev + 1));
  }, []);

  if (items.length === 0 && !orderPlaced) {
    navigate('/cart');
    return null;
  }

  // Apply subscription discount if active
  const subDiscount = subscription ? subtotal * (subscription.discount_percent || 10) / 100 : 0;
  // Points: 100 points = $10 discount
  const pointsDiscount = Math.min(pointsToRedeem / 10, subtotal * 0.5); // max 50% of subtotal
  const totalDiscount = discount + subDiscount + pointsDiscount;
  const total = cartTotal ? cartTotal - subDiscount - pointsDiscount : subtotal + (subtotal >= settings.free_delivery_min ? 0 : settings.delivery_fee) - totalDiscount;
  const actualDeliveryFee = subtotal >= settings.free_delivery_min ? 0 : (deliveryFee || settings.delivery_fee);
  // Earn 1 point per $10 spent
  const pointsEarned = Math.floor(total / 10);

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const trackingCode = 'FRE' + Date.now().toString(36).toUpperCase();
      const orderItems = items.map(item => ({
        product_id: item.product_id,
        name: language === 'es' ? item.name_es : (item.name_en || item.name_es),
        quantity: item.quantity,
        size: item.size,
        toppings: item.toppings,
        price: item.unit_price * item.quantity,
        image_url: item.image_url,
      }));

      const order = await base44.entities.Order.create({
        user_email: user?.email || '',
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_address: form.customer_address,
        delivery_lat: form.delivery_lat || null,
        delivery_lng: form.delivery_lng || null,
        items: orderItems,
        subtotal,
        delivery_fee: actualDeliveryFee,
        discount: totalDiscount,
        total,
        status: 'pending',
        payment_method: form.payment_method,
        payment_status: stripePaymentData ? 'paid' : 'pending',
        payment_intent_id: stripePaymentData?.payment_intent_id || '',
        card_last4: stripePaymentData?.last4 || '',
        delivery_time_preference: form.delivery_time_preference,
        notes: form.notes,
        promo_code: promo?.code || '',
        subscription_id: subscription?.id || '',
        tracking_code: trackingCode,
        loyalty_points_earned: pointsEarned,
      });

      // Update profile stats
      if (user) {
        const profiles = await base44.entities.CustomerProfile.filter({ user_email: user.email });
        if (profiles[0]) {
          const newPoints = (profiles[0].loyalty_points || 0) + pointsEarned - pointsToRedeem;
          await base44.entities.CustomerProfile.update(profiles[0].id, {
            loyalty_points: Math.max(0, newPoints),
            total_orders: (profiles[0].total_orders || 0) + 1,
          });
          await base44.entities.LoyaltyTransaction.create({
            user_email: user.email,
            points: pointsEarned,
            type: 'earned',
            description: `Pedido #${trackingCode} — $${total.toFixed(0)} gastados`,
            order_id: order.id,
          });
          if (pointsToRedeem > 0) {
            await base44.entities.LoyaltyTransaction.create({
              user_email: user.email,
              points: -pointsToRedeem,
              type: 'redeemed',
              description: `Canje de ${pointsToRedeem} puntos — $${pointsDiscount.toFixed(0)} de descuento`,
              order_id: order.id,
            });
          }
        }

        // Create notification
        await base44.entities.Notification.create({
          user_email: user.email,
          title_es: '¡Pedido recibido!',
          title_en: 'Order received!',
          message_es: `Tu pedido ${trackingCode} está siendo procesado con amor.`,
          message_en: `Your order ${trackingCode} is being processed with love.`,
          type: 'order_update',
          link: '/orders',
        });
      }

      clearCart();
      setOrderPlaced({ ...order, trackingCode });

      // Send email notification
      base44.functions.invoke('sendOrderEmail', { order_id: order.id, event_type: 'new_order' }).catch(() => {});

      // Handle referral if present — check URL param OR localStorage (persists through login flow)
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref') || localStorage.getItem('fresitas_ref');
      if (refCode && user?.email) {
        // Look for a user whose referral code matches
        const allProfiles = await base44.entities.CustomerProfile.list();
        const referrerProfile = allProfiles.find(p => {
          if (!p.user_email) return false;
          const code = btoa(p.user_email).replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
          return code === refCode;
        });
        if (referrerProfile && referrerProfile.user_email !== user.email) {
          base44.functions.invoke('handleReferral', {
            referrer_email: referrerProfile.user_email,
            new_user_email: user.email,
            order_id: order.id,
            referral_code: refCode,
          }).catch(() => {});
          localStorage.removeItem('fresitas_ref'); // clear after use
        }
      }

      // Confetti!
      confetti({ particleCount: 150, spread: 80, colors: ['#E8294A', '#5C2D0E', '#FDE8EC', '#FFD700'], origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, colors: ['#E8294A', '#FFD700'] }), 300);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, colors: ['#E8294A', '#FFD700'] }), 600);
    } catch (err) {
      toast.error(t.error + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'efectivo', label: t.efectivo },
    { value: 'transferencia', label: t.transferencia },
    { value: 'tarjeta', label: t.tarjeta },
  ];

  const canPlaceOrder = step < 3 || form.payment_method !== 'tarjeta' || stripePaymentData;

  const stepLabels = [t.deliveryInfo, t.customize, t.payment, t.confirm];

  if (orderPlaced) {
    const whatsappMsg = encodeURIComponent(
      `🍓 *Nuevo Pedido Fresitas G&F*\n\n*Código:* ${orderPlaced.trackingCode}\n*Cliente:* ${form.customer_name}\n*Tel:* ${form.customer_phone}\n*Dirección:* ${form.customer_address}\n*Total:* $${total.toFixed(2)}\n*Pago:* ${form.payment_method}\n\n${items.map(i => `• ${i.name_es} x${i.quantity}`).join('\n')}`
    );
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="font-poppins font-black text-3xl text-foreground mb-3">{t.orderPlaced}</h1>
          <p className="text-muted-foreground mb-4">
            {language === 'es' ? '¡Tu pedido fue recibido con mucho amor!' : 'Your order was received with lots of love!'}
          </p>
          <div className="bg-strawberry/10 border border-strawberry/30 rounded-2xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">{t.trackingCode}</p>
            <p className="font-poppins font-black text-2xl text-strawberry">{orderPlaced.trackingCode}</p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${settings.whatsapp_number || '525512345678'}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl gap-2">
                <MessageCircle className="w-4 h-4" /> {t.whatsappConfirm}
              </Button>
            </a>
            <Button
              variant="outline"
              className="w-full rounded-xl border-strawberry text-strawberry"
              onClick={() => navigate('/orders')}
            >
              {t.myOrders}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="py-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < step ? 'bg-strawberry text-white' : i === step ? 'bg-strawberry text-white ring-4 ring-strawberry/30' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 hidden sm:block">{stepLabels[i]}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${i < step ? 'bg-strawberry' : 'bg-border'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="font-poppins font-bold text-xl">{t.deliveryInfo}</h2>
                <div className="space-y-1">
                  <Label>{t.name} *</Label>
                  <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>{t.phone} *</Label>
                  <Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} type="tel" className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>{t.address} *</Label>
                  {profile?.addresses?.filter(a => a.address).length > 0 && (
                    <div className="flex flex-col gap-2 mb-2">
                      {profile.addresses.map((addr, i) => (
                        <button
                          key={i}
                          onClick={() => setForm(p => ({ ...p, customer_address: addr.address }))}
                          className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${form.customer_address === addr.address ? 'border-strawberry bg-strawberry/5' : 'border-border hover:border-strawberry/50'}`}
                        >
                          <MapPin className="w-3 h-3 inline mr-1" />{addr.label && <span className="font-medium">{addr.label}: </span>}{addr.address}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} className="rounded-xl" placeholder={language === 'es' ? 'Calle, número, colonia...' : 'Street, number, area...'} />
                </div>
                {/* Delivery Map */}
                <DeliveryMap
                  onLocationSelect={(latlng) => {
                    setForm(p => ({ ...p, delivery_lat: latlng[0], delivery_lng: latlng[1] }));
                  }}
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="font-poppins font-bold text-xl">{t.customize}</h2>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-strawberry" />{t.deliveryTime}</Label>
                  <ScheduledDelivery
                    value={form.delivery_time_preference}
                    onChange={v => setForm(p => ({ ...p, delivery_time_preference: v }))}
                    language={language}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t.notes}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder={language === 'es' ? 'Sin gluten, extra crema, toque especial...' : 'No gluten, extra cream, special touch...'}
                    className="rounded-xl"
                    rows={3}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="font-poppins font-bold text-xl">{t.payment}</h2>

                {/* Loyalty Points Redemption */}
                {availablePoints >= 100 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⭐</span>
                        <div>
                          <p className="font-semibold text-sm">Tus Puntos: {availablePoints}</p>
                          <p className="text-xs text-muted-foreground">100 pts = $10 de descuento</p>
                        </div>
                      </div>
                      <p className="font-bold text-amber-600 text-sm">-${pointsDiscount.toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={Math.min(availablePoints, Math.floor(subtotal * 0.5) * 10)}
                        step={100}
                        value={pointsToRedeem}
                        onChange={e => setPointsToRedeem(Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-sm font-bold text-amber-700 w-16 text-right">{pointsToRedeem} pts</span>
                    </div>
                    {pointsToRedeem > 0 && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">✅ Ahorras ${pointsDiscount.toFixed(0)} en este pedido</p>
                    )}
                  </div>
                )}

                {subscription && (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 text-sm">
                    <Zap className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-800 dark:text-green-300">
                      Suscripción {subscription.plan?.toUpperCase()} activa — {subscription.discount_percent}% descuento aplicado 🎉
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map(pm => (
                    <button
                      key={pm.value}
                      onClick={() => { setForm(p => ({ ...p, payment_method: pm.value })); setStripePaymentData(null); }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${form.payment_method === pm.value ? 'border-strawberry bg-strawberry/5' : 'border-border hover:border-strawberry/40'}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        {pm.value === 'tarjeta' ? <CreditCard className="w-5 h-5 text-muted-foreground" /> : pm.value === 'transferencia' ? <FileText className="w-5 h-5 text-muted-foreground" /> : <Package className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <span className="font-semibold">{pm.label}</span>
                      {form.payment_method === pm.value && <Check className="ml-auto w-5 h-5 text-strawberry" />}
                    </button>
                  ))}
                </div>
                {form.payment_method === 'tarjeta' && !stripePaymentData && (
                  <div className="border border-border rounded-2xl p-4 mt-2">
                    <StripePayment
                      total={total}
                      onPaymentSuccess={(data) => { setStripePaymentData(data); toast.success('¡Pago con tarjeta autorizado! ✅'); }}
                      onPaymentError={(err) => toast.error(err)}
                    />
                  </div>
                )}
                {form.payment_method === 'tarjeta' && stripePaymentData && (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-800 dark:text-green-300">
                      Tarjeta ••••{stripePaymentData.last4} autorizada. Procede a confirmar el pedido.
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <h2 className="font-poppins font-bold text-xl">{t.orderSummary}</h2>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.cartKey} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-xl bg-cream overflow-hidden flex-shrink-0">
                        {item.image_url ? <img src={item.image_url} alt={item.name_es} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🍓</div>}
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{language === 'es' ? item.name_es : (item.name_en || item.name_es)} x{item.quantity}</p>
                        {item.size && <p className="text-muted-foreground text-xs">{t[item.size] || item.size}</p>}
                      </div>
                      <p className="font-semibold">${(item.unit_price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t.subtotal}</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t.deliveryFee}</span><span>{actualDeliveryFee === 0 ? t.free : `$${actualDeliveryFee}`}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>{t.discount} (promo)</span><span>-${discount.toFixed(2)}</span></div>}
                  {subDiscount > 0 && <div className="flex justify-between text-green-600"><span>Desc. suscripción ({subscription?.discount_percent}%)</span><span>-${subDiscount.toFixed(2)}</span></div>}
                  {pointsDiscount > 0 && <div className="flex justify-between text-amber-600"><span>⭐ Puntos canjeados ({pointsToRedeem} pts)</span><span>-${pointsDiscount.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>{t.total}</span><span className="text-strawberry">${total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-amber-600 mt-1"><span>⭐ Puntos que ganarás</span><span>+{pointsEarned} pts</span></div>
                </div>
                <div className="bg-muted rounded-xl p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span>{form.customer_address}</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span>{form.customer_phone}</span></div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{form.delivery_time_preference === 'asap' || !form.delivery_time_preference
                      ? (language === 'es' ? 'Lo antes posible' : 'As soon as possible')
                      : `${language === 'es' ? 'Programada:' : 'Scheduled:'} ${form.delivery_time_preference}`
                    }</span>
                  </div>
                  <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span>{paymentMethods.find(p => p.value === form.payment_method)?.label}</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl">
              {t.back}
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 0 && (!form.customer_name || !form.customer_phone || !form.customer_address)) {
                  toast.error(language === 'es' ? 'Por favor completa todos los campos' : 'Please fill all fields');
                  return;
                }
                setStep(s => s + 1);
              }}
              className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl"
            >
              {t.next}
            </Button>
          ) : (
            <Button
              onClick={handlePlaceOrder}
              disabled={loading || (form.payment_method === 'tarjeta' && !stripePaymentData)}
              className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-3 font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {form.payment_method === 'tarjeta' && !stripePaymentData ? 'Autoriza el pago primero' : t.placeOrder}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}