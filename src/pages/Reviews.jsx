import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Check, Loader2, Upload, X, Image } from 'lucide-react';
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

function PhotoUpload({ photos, onAdd, onRemove }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, 4 - photos.length)) {
        if (!file.type.startsWith('image/')) continue;
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onAdd(file_url);
      }
      toast.success('Fotos subidas');
    } catch {
      toast.error('Error al subir foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
        <Image className="w-4 h-4 text-strawberry" />
        Fotos (opcional, máx 4)
      </p>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group border-2 border-strawberry/30">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {photos.length < 4 && (
          <label className="w-20 h-20 rounded-xl border-2 border-dashed border-strawberry/40 flex flex-col items-center justify-center cursor-pointer hover:bg-strawberry/5 transition-colors">
            {uploading
              ? <Loader2 className="w-5 h-5 text-strawberry animate-spin" />
              : <><Upload className="w-5 h-5 text-strawberry" /><span className="text-xs text-muted-foreground mt-0.5">Subir</span></>
            }
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
          </label>
        )}
      </div>
    </div>
  );
}

export default function Reviews() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [reviews, setReviews] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    const orderId = searchParams.get('order_id');
    if (!order && orderId) {
      setLoadingOrder(true);
      base44.entities.Order.filter({ user_email: user.email }).then(orders => {
        const found = orders.find(o => o.id === orderId);
        if (found) {
          setOrder(found);
          const initial = {};
          found.items?.forEach(item => {
            if (item.product_id) initial[item.product_id] = { rating: 5, comment: '', photos: [] };
          });
          setReviews(initial);
        } else {
          toast.error('Pedido no encontrado');
          navigate('/orders');
        }
      }).finally(() => setLoadingOrder(false));
    } else if (order) {
      const initial = {};
      order.items?.forEach(item => {
        if (item.product_id) initial[item.product_id] = { rating: 5, comment: '', photos: [] };
      });
      setReviews(initial);
    } else {
      navigate('/orders');
    }
  }, [user, order]);

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
          photos: review.photos || [],
        });
        // Update product's average rating
        const product = await base44.entities.Product.filter({ id: productId }).then(r => r[0]).catch(() => null);
        if (product) {
          const allReviews = await base44.entities.Review.filter({ product_id: productId });
          const avg = allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length;
          await base44.entities.Product.update(productId, {
            rating: Math.round(avg * 10) / 10,
            review_count: allReviews.length
          });
        }
      }
      await base44.entities.Order.update(order.id, {
        rating: Math.max(...Object.values(reviews).map(r => r.rating || 0))
      });
      setSubmitted(true);
      toast.success(language === 'es' ? '¡Gracias por tu reseña!' : 'Thank you for your review!');
    } catch (err) {
      toast.error(t.error + ': ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="font-poppins font-bold text-2xl text-foreground mb-2">{language === 'es' ? '¡Gracias por tu reseña!' : 'Thank you for your review!'}</h1>
          <p className="text-muted-foreground mb-6">{language === 'es' ? 'Tu opinión nos ayuda a mejorar' : 'Your feedback helps us improve'}</p>
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
                  <div className="w-14 h-14 rounded-xl bg-cream overflow-hidden flex-shrink-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🍓</div>
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">{language === 'es' ? 'Tu calificación' : 'Your rating'}</p>
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
                  <PhotoUpload
                    photos={reviews[item.product_id]?.photos || []}
                    onAdd={url => setReviews(prev => ({
                      ...prev,
                      [item.product_id]: { ...prev[item.product_id], photos: [...(prev[item.product_id]?.photos || []), url] }
                    }))}
                    onRemove={idx => setReviews(prev => ({
                      ...prev,
                      [item.product_id]: { ...prev[item.product_id], photos: prev[item.product_id].photos.filter((_, i) => i !== idx) }
                    }))}
                  />
                </div>
              </div>
            ))}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-3 font-semibold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2 fill-white" />}
              {t.submitReview}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}