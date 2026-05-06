import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, X, Zap, Crown, Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 0,
    description: 'Para clientes ocasionales',
    icon: '🍓',
    color: 'from-blue-500 to-cyan-500',
    perks: [
      { name: 'Compras normales', included: true },
      { name: 'Acumula puntos', included: true },
      { name: 'Envío gratis', included: false },
      { name: 'Acceso prioritario', included: false },
      { name: '2x puntos', included: false }
    ],
    multiplier: 1.0
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    priceDisplay: '$9.99/mes',
    description: 'Para amantes de Fresitas',
    icon: '⭐',
    color: 'from-amber-500 to-orange-500',
    featured: true,
    perks: [
      { name: 'Compras normales', included: true },
      { name: 'Acumula puntos', included: true },
      { name: 'Envío gratis', included: true },
      { name: 'Acceso prioritario', included: true },
      { name: '1.5x puntos', included: true }
    ],
    multiplier: 1.5,
    savings: 'Ahorra $3-5 por pedido'
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 19.99,
    priceDisplay: '$19.99/mes',
    description: 'Para superfans',
    icon: '👑',
    color: 'from-purple-500 to-pink-500',
    perks: [
      { name: 'Compras normales', included: true },
      { name: 'Acumula puntos', included: true },
      { name: 'Envío gratis', included: true },
      { name: 'Acceso prioritario', included: true },
      { name: '2x puntos', included: true }
    ],
    multiplier: 2.0,
    savings: 'Ahorra $5-8 por pedido',
    extraPerks: ['Descuento adicional 5%', 'Soporte prioritario', 'Cumpleaños especial']
  }
];

export default function Membership() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    try {
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      if (subs[0]) {
        setSubscription(subs[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'basic') {
      // Cancel subscription
      if (subscription && subscription.plan !== 'basic') {
        setProcessingPlan(planId);
        try {
          await base44.entities.Subscription.update(subscription.id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          });
          setSubscription(null);
          toast.success('Suscripción cancelada');
          await loadSubscription();
        } catch (err) {
          toast.error('Error al cancelar');
        } finally {
          setProcessingPlan(null);
        }
      }
      return;
    }

    setProcessingPlan(planId);
    try {
      // Get plan details
      const plan = PLANS.find(p => p.id === planId);

      // Create subscription record
      const newSub = await base44.entities.Subscription.create({
        user_email: user.email,
        plan: planId,
        price_monthly: plan.price,
        free_delivery: true,
        priority_access: true,
        points_multiplier: plan.multiplier,
        discount_percent: planId === 'elite' ? 5 : 0,
        status: 'active',
        started_at: new Date().toISOString(),
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_method: 'stripe',
        perks: [
          'free_delivery',
          'priority_access',
          'points_multiplier',
          planId === 'elite' ? 'exclusive_deals' : null
        ].filter(Boolean)
      });

      setSubscription(newSub);
      toast.success(`¡Bienvenido a ${plan.name}! 🎉`);

      // Redirect to Stripe checkout
      // In real world, you'd integrate with Stripe API
      navigate('/checkout?subscription=true');
    } catch (err) {
      toast.error('Error al suscribirse: ' + err.message);
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'basic';

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-poppins font-black text-4xl mb-3">Membresía Fresitas Premium</h1>
            <p className="text-lg text-muted-foreground">Disfruta de beneficios exclusivos y ahorra en cada pedido</p>
          </div>

          {/* Current subscription banner */}
          {subscription && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-strawberry/10 to-strawberry/5 border border-strawberry/30 rounded-2xl p-4 mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-strawberry flex items-center gap-2">
                    <Crown className="w-4 h-4" /> Plan Actual: {PLANS.find(p => p.id === currentPlan)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Se renueva {new Date(subscription.renews_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <Badge className="bg-strawberry text-white">Activo</Badge>
              </div>
            </motion.div>
          )}

          {/* Plans grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-3xl border-2 overflow-hidden transition-all ${
                  currentPlan === plan.id
                    ? 'border-strawberry bg-strawberry/5 shadow-lg scale-105'
                    : plan.featured
                    ? 'border-amber-500 shadow-lg'
                    : 'border-border'
                }`}
              >
                {/* Featured badge */}
                {plan.featured && (
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold py-1 text-center">
                    ⭐ MÁS POPULAR
                  </div>
                )}

                {/* Header */}
                <div className={`bg-gradient-to-br ${plan.color} text-white p-6`}>
                  <div className="text-4xl mb-2">{plan.icon}</div>
                  <h3 className="font-poppins font-bold text-2xl">{plan.name}</h3>
                  <p className="text-sm opacity-90 mt-1">{plan.description}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Price */}
                  <div className="text-center">
                    {plan.price === 0 ? (
                      <p className="font-poppins font-black text-3xl">Gratis</p>
                    ) : (
                      <>
                        <p className="font-poppins font-black text-3xl">{plan.priceDisplay}</p>
                        {plan.savings && (
                          <p className="text-xs text-green-600 font-semibold mt-1">💰 {plan.savings}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Perks */}
                  <div className="space-y-3">
                    {plan.perks.map((perk, j) => (
                      <div key={j} className="flex items-center gap-3 text-sm">
                        {perk.included ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={perk.included ? 'text-foreground' : 'text-muted-foreground'}>
                          {perk.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Extra perks for elite */}
                  {plan.extraPerks && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">BENEFICIOS EXTRA</p>
                      {plan.extraPerks.map((perk, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processingPlan === plan.id}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      currentPlan === plan.id
                        ? 'bg-gray-200 text-gray-600 cursor-default'
                        : plan.featured
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {processingPlan === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : currentPlan === plan.id ? (
                      '✓ Plan Actual'
                    ) : plan.price === 0 ? (
                      'Cancelar Suscripción'
                    ) : (
                      'Suscribirse Ahora'
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <div className="bg-card rounded-2xl border border-border p-8">
            <h2 className="font-poppins font-bold text-2xl mb-6">Preguntas Frecuentes</h2>
            <div className="space-y-4">
              {[
                {
                  q: '¿Puedo cambiar de plan en cualquier momento?',
                  a: 'Sí, puedes cambiar o cancelar tu suscripción en cualquier momento. Los cambios se reflejarán en el siguiente ciclo de facturación.'
                },
                {
                  q: '¿Cómo funciona el envío gratis?',
                  a: 'Con Premium o Elite, todos tus pedidos tendrán envío gratis, sin monto mínimo.'
                },
                {
                  q: '¿Qué es el acceso prioritario a promociones?',
                  a: 'Serás el primero en enterarte de nuevas ofertas y tendrás acceso exclusivo a promociones especiales.'
                },
                {
                  q: '¿Cómo se aplica el multiplicador de puntos?',
                  a: 'Cada compra te dará el doble (o más) de puntos de lealtad, que puedes canjear por descuentos.'
                }
              ].map((faq, i) => (
                <div key={i} className="border-b border-border pb-4 last:border-0">
                  <p className="font-semibold text-sm mb-2">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}