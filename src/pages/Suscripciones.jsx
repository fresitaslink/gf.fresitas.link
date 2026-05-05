import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, ShoppingBag, CalendarDays, RefreshCw, Star, Loader2, Plus, Minus, Trash2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    discount: 10,
    color: 'border-blue-300 bg-blue-50 dark:bg-blue-900/10',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'basic',
    perks: ['10% descuento en cada pedido', 'Entrega programada', 'Acceso prioritario a nuevos productos'],
  },
  {
    id: 'premium',
    name: 'Premium',
    discount: 15,
    color: 'border-purple-300 bg-purple-50 dark:bg-purple-900/10',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'premium',
    perks: ['15% descuento', 'Entrega express gratis', 'Productos exclusivos', 'Chat prioritario'],
    popular: true,
  },
  {
    id: 'vip',
    name: 'VIP',
    discount: 20,
    color: 'border-amber-300 bg-amber-50 dark:bg-amber-900/10',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'vip',
    perks: ['20% descuento', 'Entrega gratis siempre', 'Caja sorpresa mensual', 'Acceso VIP total', 'Puntos 2x'],
  },
];

const DAYS_ES = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
const FREQ_ES = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };

export default function Suscripciones() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('plan'); // plan | products | schedule | confirm
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    plan: 'basic',
    selectedItems: [],
    frequency: 'monthly',
    delivery_day: 'monday',
    delivery_address: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [subs, prods, profiles] = await Promise.all([
      base44.entities.Subscription.filter({ user_email: user.email }),
      base44.entities.Product.filter({ is_available: true }),
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
    ]);
    setSubscription(subs[0] || null);
    setProducts(prods);
    if (profiles[0]) {
      setProfile(profiles[0]);
      setForm(f => ({ ...f, delivery_address: profiles[0].addresses?.find(a => a.is_default)?.address || '' }));
    }
    setLoading(false);
  };

  const selectedPlan = PLANS.find(p => p.id === form.plan);

  const addProduct = (product) => {
    const existing = form.selectedItems.find(i => i.product_id === product.id);
    if (existing) {
      setForm(f => ({ ...f, selectedItems: f.selectedItems.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i) }));
    } else {
      setForm(f => ({ ...f, selectedItems: [...f.selectedItems, { product_id: product.id, name: product.name_es, quantity: 1, price: product.price }] }));
    }
  };

  const removeProduct = (productId) => {
    setForm(f => ({ ...f, selectedItems: f.selectedItems.filter(i => i.product_id !== productId) }));
  };

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) { removeProduct(productId); return; }
    setForm(f => ({ ...f, selectedItems: f.selectedItems.map(i => i.product_id === productId ? { ...i, quantity: qty } : i) }));
  };

  const subtotal = form.selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = subtotal * (selectedPlan?.discount || 0) / 100;
  const totalMonthly = subtotal - discount;

  const handleSubscribe = async () => {
    if (!form.selectedItems.length) { toast.error('Selecciona al menos un producto'); return; }
    if (!form.delivery_address) { toast.error('Ingresa dirección de entrega'); return; }
    setSaving(true);
    try {
      const nextDelivery = new Date();
      nextDelivery.setDate(nextDelivery.getDate() + 7);
      const data = {
        user_email: user.email,
        customer_name: profile?.display_name || user.full_name || '',
        plan: form.plan,
        items: form.selectedItems,
        delivery_address: form.delivery_address,
        delivery_day: form.delivery_day,
        frequency: form.frequency,
        status: 'active',
        discount_percent: selectedPlan?.discount || 10,
        total_monthly: totalMonthly,
        next_delivery: nextDelivery.toISOString().split('T')[0],
        notes: form.notes,
      };
      if (subscription) {
        await base44.entities.Subscription.update(subscription.id, data);
        toast.success('Suscripción actualizada');
      } else {
        const created = await base44.entities.Subscription.create(data);
        setSubscription(created);
        toast.success('¡Suscripción activada!');
        // Notification
        await base44.entities.Notification.create({
          user_email: user.email,
          title_es: '¡Suscripción activada!',
          title_en: 'Subscription activated!',
          message_es: `Tu plan ${form.plan.toUpperCase()} está activo. Recibirás tu próxima entrega el ${nextDelivery.toLocaleDateString('es-MX')}`,
          message_en: `Your ${form.plan.toUpperCase()} plan is active.`,
          type: 'loyalty',
        });
      }
      setStep('plan');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    await base44.entities.Subscription.update(subscription.id, { status: 'cancelled' });
    setSubscription(null);
    toast.success('Suscripción cancelada');
    await loadData();
  };

  if (loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;
  }

  // Active subscription view
  if (subscription && subscription.status === 'active' && step === 'plan') {
    const plan = PLANS.find(p => p.id === subscription.plan) || PLANS[0];
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="py-8">
              <h1 className="font-poppins font-black text-3xl text-foreground">Mi Suscripción</h1>
              <p className="text-muted-foreground">Gestiona tu plan recurrente</p>
            </div>
            <div className={`rounded-3xl border-2 p-6 mb-6 ${plan.color}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center flex-shrink-0">
                    {plan.icon === 'vip' ? <Crown className="w-5 h-5 text-amber-600" /> : plan.icon === 'premium' ? <Star className="w-5 h-5 text-purple-600" /> : <ShoppingBag className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <h2 className="font-poppins font-black text-2xl">Plan {plan.name}</h2>
                    <Badge className={plan.badge}>{plan.discount}% descuento</Badge>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">Activo</Badge>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm"><CalendarDays className="w-4 h-4 text-muted-foreground" /><span>{FREQ_ES[subscription.frequency]} · {DAYS_ES[subscription.delivery_day]}</span></div>
                <div className="flex items-center gap-2 text-sm"><ShoppingBag className="w-4 h-4 text-muted-foreground" /><span>{subscription.items?.length} producto(s)</span></div>
                {subscription.next_delivery && <div className="flex items-center gap-2 text-sm"><RefreshCw className="w-4 h-4 text-muted-foreground" /><span>Próxima entrega: {new Date(subscription.next_delivery).toLocaleDateString('es-MX')}</span></div>}
              </div>
              <div className="border-t border-border/30 pt-4">
                <p className="text-2xl font-bold">${subscription.total_monthly?.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 mb-6">
              <h3 className="font-semibold mb-3">Productos en tu suscripción</h3>
              <div className="space-y-2">
                {subscription.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep('products')} className="flex-1 bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" /> Modificar Plan
              </Button>
              <Button onClick={handleCancel} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl">
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="py-8 text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 text-gold border border-gold/20 rounded-full px-4 py-1 text-sm mb-4">
              <Zap className="w-4 h-4" /> Plan de Suscripción
            </div>
            <h1 className="font-poppins font-black text-3xl text-foreground mb-2">Fresitas Recurrentes</h1>
            <p className="text-muted-foreground">Programa tus entregas y obtén descuentos exclusivos</p>
          </div>

          {/* Step: Plan Selection */}
          {step === 'plan' && (
            <div className="space-y-4">
              {PLANS.map(plan => (
                <motion.button
                  key={plan.id}
                  onClick={() => setForm(f => ({ ...f, plan: plan.id }))}
                  className={`w-full text-left rounded-3xl border-2 p-6 transition-all relative ${form.plan === plan.id ? plan.color + ' border-opacity-100' : 'border-border bg-card hover:border-strawberry/40'}`}
                  whileHover={{ scale: 1.01 }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-strawberry text-white text-xs px-3 gap-1"><Star className="w-3 h-3" /> Más Popular</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center flex-shrink-0">
                        {plan.icon === 'vip' ? <Crown className="w-5 h-5 text-amber-600" /> : plan.icon === 'premium' ? <Star className="w-5 h-5 text-purple-600" /> : <ShoppingBag className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div>
                        <h3 className="font-poppins font-bold text-lg">{plan.name}</h3>
                        <Badge className={plan.badge}>{plan.discount}% descuento</Badge>
                      </div>
                    </div>
                    {form.plan === plan.id && <Check className="w-6 h-6 text-strawberry" />}
                  </div>
                  <div className="space-y-1">
                    {plan.perks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" /> {perk}
                      </div>
                    ))}
                  </div>
                </motion.button>
              ))}
              <Button onClick={() => setStep('products')} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl py-3">
                Continuar con Plan {selectedPlan?.name} →
              </Button>
            </div>
          )}

          {/* Step: Product Selection */}
          {step === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-poppins font-bold text-xl">Elige tus Productos</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep('plan')}>← Atrás</Button>
              </div>
              {form.selectedItems.length > 0 && (
                <div className="bg-strawberry/5 border border-strawberry/20 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm mb-2">Seleccionados:</h3>
                  {form.selectedItems.map(item => (
                    <div key={item.product_id} className="flex items-center justify-between text-sm py-1">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus className="w-3 h-3" /></button>
                        <span className="w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeProduct(item.product_id)}><Trash2 className="w-3 h-3 text-red-500" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border/30 mt-2 pt-2">
                    <p className="text-sm font-bold">Subtotal: ${subtotal.toFixed(2)} · Con descuento: <span className="text-green-600">${totalMonthly.toFixed(2)}</span></p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(product => {
                  const isSelected = form.selectedItems.some(i => i.product_id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-strawberry bg-strawberry/5' : 'border-border bg-card hover:border-strawberry/40'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-cream overflow-hidden flex-shrink-0">
                          {product.image_url ? <img src={product.image_url} alt={product.name_es} className="w-full h-full object-cover" /> : <ShoppingBag className="w-4 h-4 m-auto text-strawberry mt-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name_es}</p>
                          <p className="text-sm text-strawberry font-bold">${product.price}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-strawberry flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button onClick={() => setStep('schedule')} disabled={form.selectedItems.length === 0} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl py-3">
                Programar Entregas ({form.selectedItems.length} producto(s)) →
              </Button>
            </div>
          )}

          {/* Step: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-poppins font-bold text-xl">Programa tu Entrega</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep('products')}>← Atrás</Button>
              </div>
              <div className="space-y-1">
                <Label>Frecuencia de Entrega</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Día de Entrega Preferido</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Object.entries(DAYS_ES).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, delivery_day: val }))}
                      className={`p-2 rounded-xl border-2 text-xs transition-all ${form.delivery_day === val ? 'border-strawberry bg-strawberry/5 text-strawberry' : 'border-border hover:border-strawberry/40'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Dirección de Entrega *</Label>
                <Input value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} className="rounded-xl" placeholder="Calle, número, colonia..." />
              </div>
              <div className="space-y-1">
                <Label>Notas adicionales</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" placeholder="Instrucciones especiales..." />
              </div>
              <Button onClick={() => setStep('confirm')} disabled={!form.delivery_address} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl py-3">
                Revisar y Confirmar →
              </Button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-poppins font-bold text-xl">Confirmar Suscripción</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep('schedule')}>← Atrás</Button>
              </div>
              <div className={`rounded-3xl border-2 p-6 ${selectedPlan?.color}`}>
                <h3 className="font-bold text-lg mb-3">Plan {selectedPlan?.name} · {selectedPlan?.discount}% descuento</h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-muted-foreground" /><span>{form.selectedItems.length} producto(s) seleccionados</span></div>
                  <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-muted-foreground" /><span>Frecuencia: {FREQ_ES[form.frequency]}</span></div>
                  <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground" /><span>Día: {DAYS_ES[form.delivery_day]}</span></div>
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-muted-foreground" /><span>{form.delivery_address}</span></div>
                </div>
                <div className="border-t border-border/30 pt-4 space-y-1">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-green-600"><span>Descuento {selectedPlan?.discount}%</span><span>-${discount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total/mes</span><span className="text-strawberry">${totalMonthly.toFixed(2)}</span></div>
                </div>
              </div>
              <Button onClick={handleSubscribe} disabled={saving} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl py-3 font-bold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {subscription ? 'Actualizar Suscripción' : 'Activar Suscripción'}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}