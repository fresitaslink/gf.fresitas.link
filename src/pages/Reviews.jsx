import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

function StarRating({ rating, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`w-8 h-8 ${star <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order;

  const [reviews, setReviews] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !order) { navigate('/orders'); return; }
    const initial = {};
    order.items?.forEach(item => {
      if (item.product_id) initial[item.product_id] = { rating: 5, comment: '', photoFile: null };
    });
    setReviews(initial);
  }, [order]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      for (const [productId, review] of Object.entries(reviews)) {
        if (!review.rating) continue;
        await base44.entities.Review.create({
          product_id: productId,
          order_id: order.id,
          user_email: user.email,
          customer_name: user.full_name || 'Cliente',
          rating: review.rating,
          comment: review.comment,
          photos: [],
        });
      }
      // Mark order as reviewed
      await base44.entities.Order.update(order.id, { rating: Math.max(...Object.values(reviews).map(r => r.rating)) });
      setSubmitted(true);
      toast.success(language === 'es' ? '¡Gracias por tu reseña!' : 'Thank you for your review!', { icon: '⭐' });
    } catch (err) {
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-7xl mb-4">⭐</div>
          <h1 className="font-poppins font-bold text-2xl text-foreground mb-2">{language === 'es' ? '¡Gracias por tu reseña!' : 'Thank you for your review!'}</h1>
          <p className="text-muted-foreground mb-6">{language === 'es' ? 'Tu opinión nos ayuda a mejorar para ti' : 'Your feedback helps us improve for you'}</p>
          <Button onClick={() => navigate('/orders')} className="bg-strawberry text-white hover:bg-strawberry/90 rounded-full px-8">
            {t.myOrders}
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!order) return null;

  const uniqueItems = order.items?.filter((item, idx, self) => idx === self.findIndex(i => i.product_id === item.product_id)) || [];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="py-8">
            <h1 className="font-poppins font-bold text-3xl text-foreground">{t.leaveReview}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {language === 'es' ? `Pedido #${order.tracking_code}` : `Order #${order.tracking_code}`}
            </p>
          </div>

          <div className="space-y-6">
            {uniqueItems.map(item => (
              <div key={item.product_id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-cream overflow-hidden">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍓</div>}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">{t.stars}</p>
                    <StarRating
                      rating={reviews[item.product_id]?.rating || 5}
                      onChange={val => setReviews(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], rating: val } }))}
                    />
                  </div>
                  <Textarea
                    placeholder={t.writeReview}
                    value={reviews[item.product_id]?.comment || ''}
                    onChange={e => setReviews(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], comment: e.target.value } }))}
                    className="rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            ))}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-3 font-semibold"
            >
              {submitting ? '...' : t.submitReview} ⭐
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}