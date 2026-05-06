import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, ShoppingBag, CheckCircle2, Loader2, Package, Lock, Sparkles, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CATEGORY_LABELS = { producto: '🍓 Productos', descuento: '🎟️ Descuentos', experiencia: '✨ Experiencias', merch: '👕 Merch' };
const CATEGORY_COLORS = {
  producto: 'bg-strawberry/10 text-strawberry',
  descuento: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  experiencia: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  merch: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
};

function RewardCard({ reward, myPoints, onRedeem, redeeming }) {
  const canAfford = myPoints >= reward.points_cost;
  const outOfStock = (reward.stock || 0) === 0;
  const disabled = !canAfford || outOfStock || redeeming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border-2 overflow-hidden transition-all ${
        canAfford && !outOfStock ? 'border-strawberry/30' : 'border-border opacity-70'
      }`}
    >
      {reward.image_url ? (
        <div className="h-40 bg-muted overflow-hidden">
          <img src={reward.image_url} alt={reward.name_es} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-strawberry/10 to-pink-100 dark:from-strawberry/20 dark:to-pink-900/20 flex items-center justify-center text-5xl">
          {reward.category === 'producto' ? '🍓' : reward.category === 'descuento' ? '🎟️' : reward.category === 'experiencia' ? '✨' : '👕'}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-semibold text-sm">{reward.name_es}</h4>
            {reward.description_es && <p className="text-xs text-muted-foreground mt-0.5">{reward.description_es}</p>}
          </div>
          <Badge className={`text-xs flex-shrink-0 ${CATEGORY_COLORS[reward.category]}`}>
            {CATEGORY_LABELS[reward.category]?.split(' ')[0]}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-gold fill-gold" />
            <span className="font-poppins font-black text-lg text-strawberry">{reward.points_cost}</span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
          {outOfStock ? (
            <Badge className="text-xs bg-red-100 text-red-600">Sin stock</Badge>
          ) : (
            <Badge className="text-xs bg-muted text-muted-foreground">{reward.stock} disponibles</Badge>
          )}
        </div>

        {!canAfford && !outOfStock && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            Te faltan {reward.points_cost - myPoints} pts
            <div className="ml-auto w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-strawberry rounded-full" style={{ width: `${Math.min(100, (myPoints / reward.points_cost) * 100)}%` }} />
            </div>
          </div>
        )}

        <Button
          onClick={() => onRedeem(reward)}
          disabled={disabled}
          className={`w-full mt-3 rounded-xl text-sm font-semibold ${
            canAfford && !outOfStock
              ? 'bg-strawberry hover:bg-strawberry/90 text-white'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {redeeming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
          {outOfStock ? 'Agotado' : !canAfford ? 'Puntos insuficientes' : 'Canjear Premio'}
        </Button>
      </div>
    </motion.div>
  );
}

export default function RewardsStore() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [confirmReward, setConfirmReward] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadAll();

    // Real-time: reflect reward stock changes and redemption updates
    const unsubRewards = base44.entities.RewardItem.subscribe((event) => {
      if (event.data) {
        setRewards(prev => prev.map(r => r.id === event.data.id ? event.data : r));
      }
    });
    const unsubProfile = base44.entities.CustomerProfile.subscribe((event) => {
      if (event.data?.user_email === user.email) setMyProfile(event.data);
    });
    return () => { unsubRewards(); unsubProfile(); };
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [rews, reds, profiles] = await Promise.all([
      base44.entities.RewardItem.filter({ is_active: true }),
      base44.entities.RewardRedemption.filter({ user_email: user.email }, '-created_date', 20),
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
    ]);
    setRewards(rews.sort((a, b) => a.points_cost - b.points_cost));
    setRedemptions(reds);
    setMyProfile(profiles[0] || null);
    setLoading(false);
  };

  const handleRedeem = async (reward) => {
    setConfirmReward(reward);
  };

  const confirmRedeem = async () => {
    if (!confirmReward || !myProfile) return;
    setRedeeming(p => ({ ...p, [confirmReward.id]: true }));
    try {
      const newPoints = (myProfile.loyalty_points || 0) - confirmReward.points_cost;
      if (newPoints < 0) { toast.error('Puntos insuficientes'); return; }

      await base44.entities.CustomerProfile.update(myProfile.id, { loyalty_points: newPoints });
      setMyProfile(p => ({ ...p, loyalty_points: newPoints }));

      await base44.entities.LoyaltyTransaction.create({
        user_email: user.email,
        points: confirmReward.points_cost,
        type: 'redeemed',
        description: `Canje: ${confirmReward.name_es}`,
      });

      const redemption = await base44.entities.RewardRedemption.create({
        user_email: user.email,
        reward_id: confirmReward.id,
        reward_name: confirmReward.name_es,
        points_spent: confirmReward.points_cost,
        status: 'pending',
        delivery_address: deliveryAddress,
      });
      setRedemptions(prev => [redemption, ...prev]);

      if (confirmReward.stock > 0) {
        await base44.entities.RewardItem.update(confirmReward.id, { stock: confirmReward.stock - 1 });
        setRewards(prev => prev.map(r => r.id === confirmReward.id ? { ...r, stock: r.stock - 1 } : r));
      }

      await base44.entities.Notification.create({
        user_email: user.email,
        title_es: '🎁 ¡Premio canjeado!',
        title_en: '🎁 Reward redeemed!',
        message_es: `Canjeaste "${confirmReward.name_es}" por ${confirmReward.points_cost} puntos. ¡Lo procesaremos pronto!`,
        message_en: `You redeemed "${confirmReward.name_es}" for ${confirmReward.points_cost} points!`,
        type: 'loyalty',
        link: '/rewards',
      });

      setConfirmReward(null);
      setDeliveryAddress('');
      toast.success(`🎁 ¡Premio canjeado! Te contactaremos pronto.`);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setRedeeming(p => ({ ...p, [confirmReward?.id]: false }));
    }
  };

  const categories = ['all', ...new Set(rewards.map(r => r.category))];
  const filtered = selectedCategory === 'all' ? rewards : rewards.filter(r => r.category === selectedCategory);
  const myPoints = myProfile?.loyalty_points || 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Header */}
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🎁</div>
            <h1 className="font-poppins font-black text-2xl">Tienda de Premios</h1>
            <p className="text-muted-foreground text-sm mt-1">Canjea tus puntos por premios reales</p>
          </div>

          {/* Points balance */}
          <div className="bg-gradient-to-r from-strawberry to-pink-500 rounded-2xl p-5 text-white text-center shadow-lg">
            <p className="text-pink-100 text-sm mb-1">Tus puntos disponibles</p>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-6 h-6 fill-white" />
              <span className="font-poppins font-black text-4xl">{myPoints}</span>
              <span className="text-pink-100 text-sm self-end pb-1">pts</span>
            </div>
            <p className="text-pink-100 text-xs mt-2">= ${((myPoints / 100) * 10).toFixed(2)} en premios</p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-strawberry text-white shadow'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat === 'all' ? '🎯 Todos' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Rewards Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay premios en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(reward => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  myPoints={myPoints}
                  onRedeem={handleRedeem}
                  redeeming={redeeming[reward.id]}
                />
              ))}
            </div>
          )}

          {/* My Redemptions */}
          {redemptions.length > 0 && (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Package className="w-4 h-4 text-strawberry" />
                <h3 className="font-semibold text-sm">Mis Canjes</h3>
              </div>
              <div className="divide-y divide-border">
                {redemptions.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 bg-strawberry/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 text-strawberry" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.reward_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-strawberry">-{r.points_spent} pts</p>
                      <Badge className={`text-xs ${
                        r.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        r.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status === 'pending' ? '⏳ Pendiente' : r.status === 'processing' ? '🔄 Procesando' : r.status === 'delivered' ? '✅ Entregado' : '❌ Cancelado'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to earn more */}
          <div className="bg-muted rounded-2xl p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" /> Cómo ganar más puntos
            </h4>
            <div className="space-y-2">
              {[
                { icon: '🛍️', text: '1 punto por cada $10 en pedidos' },
                { icon: '🤝', text: `${50} puntos por referir a un amigo` },
                { icon: '⭐', text: '20 puntos por dejar una reseña' },
                { icon: '🎯', text: 'Hasta 200 pts con desafíos diarios' },
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>

      {/* Confirm Redeem Modal */}
      <AnimatePresence>
        {confirmReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmReward(null); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🎁</div>
                <h3 className="font-poppins font-bold">Confirmar Canje</h3>
                <p className="text-sm text-muted-foreground mt-1">{confirmReward.name_es}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-gold fill-gold" />
                  <span className="font-bold text-strawberry">{confirmReward.points_cost} puntos</span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Dirección de entrega (si aplica)</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Calle, número, colonia..."
                    className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                  💡 Te quedarán <strong>{myPoints - confirmReward.points_cost} puntos</strong> después del canje. Te contactaremos en 24-48h para coordinar la entrega.
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmReward(null)}>Cancelar</Button>
                <Button
                  className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl"
                  onClick={confirmRedeem}
                  disabled={redeeming[confirmReward.id]}
                >
                  {redeeming[confirmReward.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : '¡Canjear!'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}