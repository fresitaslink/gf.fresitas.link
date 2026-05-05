import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, Tag, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Cart() {
  const { t, language } = useLanguage();
  const { items, removeItem, updateQuantity, subtotal, itemCount } = useCart();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [settings, setSettings] = useState({ delivery_fee: 30, free_delivery_min: 200 });

  useEffect(() => {
    base44.entities.StoreSettings.list().then(s => { if (s[0]) setSettings(s[0]); });
  }, []);

  const deliveryFee = subtotal >= settings.free_delivery_min ? 0 : settings.delivery_fee;
  const discount = appliedPromo
    ? appliedPromo.discount_type === 'percent'
      ? (subtotal * appliedPromo.discount_value) / 100
      : appliedPromo.discount_value
    : 0;
  const total = subtotal + deliveryFee - discount;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const codes = await base44.entities.PromoCode.filter({ code: promoCode.toUpperCase(), is_active: true });
      if (!codes.length) {
        toast.error(language === 'es' ? 'Código no válido' : 'Invalid code');
        return;
      }
      const code = codes[0];
      if (code.min_order && subtotal < code.min_order) {
        toast.error(language === 'es' ? `Pedido mínimo: $${code.min_order}` : `Minimum order: $${code.min_order}`);
        return;
      }
      if (code.max_uses && code.uses_count >= code.max_uses) {
        toast.error(language === 'es' ? 'Código agotado' : 'Code limit reached');
        return;
      }
      setAppliedPromo(code);
      toast.success(language === 'es' ? '¡Código aplicado!' : 'Code applied!', { icon: '🎉' });
    } finally {
      setPromoLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="font-poppins font-bold text-2xl text-foreground mb-2">{t.emptyCart}</h2>
          <p className="text-muted-foreground mb-8">{t.emptyCartDesc}</p>
          <Link to="/menu">
            <Button className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full px-8">
              {t.goToMenu} 🍓
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-poppins font-bold text-3xl text-foreground py-8">{t.myCart} ({itemCount})</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {items.map(item => (
                  <motion.div
                    key={item.cartKey}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-card rounded-2xl border border-border p-4 flex gap-4"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name_es} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🍓</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-1">
                        {language === 'es' ? item.name_es : (item.name_en || item.name_es)}
                      </h3>
                      {item.size && <p className="text-xs text-muted-foreground">{t.size}: {t[item.size] || item.size}</p>}
                      {item.toppings?.length > 0 && (
                        <p className="text-xs text-muted-foreground">{t.toppings}: {item.toppings.join(', ')}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1">
                          <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-strawberry">${(item.unit_price * item.quantity).toFixed(2)}</span>
                          <button onClick={() => removeItem(item.cartKey)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              {/* Promo Code */}
              <div className="bg-card rounded-2xl border border-border p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-strawberry" /> {t.promoCode}
                </h3>
                {appliedPromo ? (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl p-3 text-sm">
                    <span>🎉 {appliedPromo.code}</span>
                    <button onClick={() => { setAppliedPromo(null); setPromoCode(''); }} className="ml-auto">
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="FRESITAS10"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value.toUpperCase())}
                      className="rounded-xl text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                    />
                    <Button
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={promoLoading}
                      className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl"
                    >
                      {t.apply}
                    </Button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <h3 className="font-semibold">{t.orderSummary}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.subtotal}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.deliveryFee}</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                      {deliveryFee === 0 ? t.free : `$${deliveryFee}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t.discount}</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                    <span>{t.total}</span>
                    <span className="text-strawberry">${total.toFixed(2)}</span>
                  </div>
                </div>

                {subtotal < settings.free_delivery_min && (
                  <p className="text-xs text-muted-foreground bg-cream dark:bg-secondary/20 rounded-xl p-2 text-center">
                    🚚 {t.freeDelivery} ${settings.free_delivery_min}!
                  </p>
                )}

                <Button
                  className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-3 font-semibold"
                  onClick={() => navigate('/checkout', { state: { promo: appliedPromo, total, deliveryFee, discount } })}
                >
                  {t.checkout} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}