import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, Star, Crown, Loader2, ArrowRight, Package, Truck, Tag, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'basic',
    name: 'Fresita Basic',
    nameEn: 'Basic Plan',
    price: 99,
    period: 'mes',
    color: '#E8294A',
    bg: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
    border: 'border-strawberry/30',
    icon: Star,
    perks: [
      '10% descuento en todos tus pedidos',
      'Envío gratis en pedidos mayores a $150',
      'Acceso prioritario a productos nuevos',
      'Puntos de lealtad x1.5',
    ],
    perksEn: [
      '10% discount on all orders',
      'Free delivery on orders over $150',
      'Priority access to new products',
      'Loyalty points x1.5',
    ],
    discount_percent: 10,
    free_delivery: false,
    delivery_min: 150,
    points_multiplier: 1.5,
  },
  {
    id: 'premium',
    name: 'Fresita Premium',
    nameEn: 'Premium Plan',
    price: 199,
    period: 'mes',
    color: '#DAA520',
    bg: 'from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30',
    border: 'border-gold/50',
    icon: Crown,
    badge: 'MÁS POPULAR',
    perks: [
      '15% descuento en todos tus pedidos',
      'Envío gratis ILIMITADO siempre',
      'Producto sorpresa mensual incluido',
      'Puntos de lealtad x2',
      'Atención prioritaria por chat',
      'Acceso a preventas exclusivas',
    ],
    perksEn: [
      '15% discount on all orders',
      'UNLIMITED free delivery always',
      'Monthly surprise product included',
      'Loyalty points x2',
      'Priority chat support',
      'Exclusive presale access',
    ],
    discount_percent: 15,
    free_delivery: true,
    delivery_min: 0,
    points_multiplier: 2,
  },
  {
    id: 'vip',
    name: 'Fresita VIP',
    nameEn: 'VIP Plan',
    price: 349,
    period: 'mes',
    color: '#8B008B',
    bg: 'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30',
    border: 'border-purple-400/50',
    icon: Zap,
    perks: [
      '20% descuento en todos tus pedidos',
      'Envío gratis ILIMITADO siempre',
      '2 productos sorpresa mensuales',
      'Puntos de lealtad x3',
      'Atención VIP 24/7',
      'Personalización gratuita en pedidos',
      'Invitaciones a eventos exclusivos',
    ],
    perksEn: [
      '20% discount on all orders',
      'UNLIMITED free delivery always',
      '2 monthly surprise products',
      'Loyalty points x3',
      '24/7 VIP support',
      'Free customization on orders',
      'Exclusive event invitations',
    ],
    discount_percent: 20,
    free_delivery: true,
    delivery_min: 0,
    points_multiplier: 3,
  },
];

export default function Suscripciones() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubs] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    base44.entities.Subscription.filter({ user_email: user.email }).then(subs => {
      const active = subs.find(s => s.status === 'active');
      setSubscription(active || null);
    }).finally(() => setLoading(false));

    // Show success toast on return from Stripe Checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      toast.success('🎉 ¡Suscripción activada! Tu pago se procesó correctamente.');
      window.history.replaceState({}, '', '/suscripciones');
      // Refetch subscription after webhook processes (give it a moment)
      setTimeout(() => {
        base44.entities.Subscription.filter({ user_email: user.email }).then(subs => {
          const active = subs.find(s => s.status === 'active');
          setSubscription(active || null);
        });
      }, 2500);
    } else if (params.get('cancelled') === '1') {
      toast.info('Pago cancelado. Puedes intentarlo de nuevo cuando quieras.');
      window.history.replaceState({}, '', '/suscripciones');
    }
  }, [user]);

  const handleSubscribe = async (plan) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSubs(plan.id);
    try {
      // Real Stripe Checkout subscription flow
      const result = await base44.functions.invoke('createStripeSubscription', { plan: plan.id });
      if (result.data?.checkout_url) {
        // Redirect to Stripe-hosted checkout (PCI-safe)
        window.location.href = result.data.checkout_url;
        return;
      }
      throw new Error(result.data?.error || 'No se pudo iniciar el pago');
    } catch (err) {
      toast.error('Error: ' + err.message);
      setSubs(null);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    setCancelling(true);
    try {
      const result = await base44.functions.invoke('cancelStripeSubscription', { subscription_id: subscription.id });
      if (!result.data?.success) throw new Error(result.data?.error || 'Falló');
      setSubscription(null);
      toast.success('Suscripción cancelada · benefits hasta fin de período');
    } catch (err) {
      toast.error('Error al cancelar: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const activePlan = PLANS.find(p => p.id === subscription?.plan);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-5xl mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="text-center py-10">
            <div className="inline-flex items-center gap-2 bg-strawberry/10 text-strawberry px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Crown className="w-4 h-4" /> Fresitas Club Premium
            </div>
            <h1 className="font-poppins font-black text-4xl text-foreground mb-3">
              {language === 'es' ? 'Planes de Membresía' : 'Membership Plans'}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {language === 'es'
                ? 'Suscríbete y ahorra en cada pedido con descuentos exclusivos, envío gratis y más beneficios.'
                : 'Subscribe and save on every order with exclusive discounts, free shipping and more.'}
            </p>
          </div>

          {/* Active subscription banner */}
          {subscription && activePlan && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-5 flex items-center gap-4 flex-wrap"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: activePlan.color + '20' }}>
                <activePlan.icon className="w-6 h-6" style={{ color: activePlan.color }} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-800 dark:text-green-300">
                  {language === 'es' ? 'Plan activo:' : 'Active plan:'} {activePlan.name}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  {activePlan.discount_percent}% {language === 'es' ? 'de descuento en cada pedido' : 'off every order'}
                  {activePlan.free_delivery && (language === 'es' ? ' · Envío gratis ilimitado' : ' · Unlimited free delivery')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                {language === 'es' ? 'Cancelar plan' : 'Cancel plan'}
              </Button>
            </motion.div>
          )}

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {PLANS.map((plan, i) => {
              const PlanIcon = plan.icon;
              const isActive = subscription?.plan === plan.id && subscription?.status === 'active';
              const isSubscribing = subscribing === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative bg-gradient-to-br ${plan.bg} border-2 ${isActive ? 'border-green-400' : plan.border} rounded-3xl p-6 flex flex-col ${plan.badge ? 'shadow-xl scale-[1.02]' : ''}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                      {plan.badge}
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Activo
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: plan.color + '20' }}>
                      <PlanIcon className="w-6 h-6" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3 className="font-poppins font-bold text-lg">{language === 'es' ? plan.name : plan.nameEn}</h3>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="font-poppins font-black text-4xl" style={{ color: plan.color }}>${plan.price}</span>
                      <span className="text-muted-foreground text-sm">/{language === 'es' ? plan.period : 'mo'}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {(language === 'es' ? plan.perks : plan.perksEn).map((perk, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full rounded-2xl font-bold py-3 text-white"
                    style={{ background: plan.color }}
                    onClick={() => !isActive && handleSubscribe(plan)}
                    disabled={isActive || !!subscribing}
                  >
                    {isSubscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : isActive ? (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    {isActive
                      ? (language === 'es' ? 'Plan Activo' : 'Active Plan')
                      : isSubscribing
                      ? (language === 'es' ? 'Activando...' : 'Activating...')
                      : (language === 'es' ? 'Suscribirme' : 'Subscribe')}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="bg-card border border-border rounded-3xl p-8">
            <h3 className="font-poppins font-bold text-xl text-center mb-6">
              {language === 'es' ? '¿Cómo funciona?' : 'How does it work?'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: Crown, title: language === 'es' ? 'Elige tu plan' : 'Choose your plan', desc: language === 'es' ? 'Selecciona el plan que mejor se adapte a ti.' : 'Pick the plan that suits you best.' },
                { icon: Tag, title: language === 'es' ? 'Descuento automático' : 'Auto discount', desc: language === 'es' ? 'Tu descuento se aplica automáticamente en cada pedido.' : 'Your discount applies automatically to every order.' },
                { icon: Truck, title: language === 'es' ? 'Envío preferencial' : 'Priority delivery', desc: language === 'es' ? 'Planes Premium y VIP incluyen envío gratis en todos tus pedidos.' : 'Premium and VIP plans include free delivery on all orders.' },
              ].map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="text-center space-y-3">
                  <div className="w-12 h-12 bg-strawberry/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Icon className="w-6 h-6 text-strawberry" />
                  </div>
                  <h4 className="font-semibold">{title}</h4>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}