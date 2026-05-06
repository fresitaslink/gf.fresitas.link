import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CustomerReviewSection({ orderId, orderStatus }) {
  const [reviews, setReviews] = useState([]);
  const [driverRating, setDriverRating] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Fetch reviews for this order
    base44.entities.Review.filter({ order_id: orderId }).then(setReviews).catch(() => {});

    // Fetch driver rating
    base44.entities.DriverRating.filter({ order_id: orderId }).then(ratings => {
      if (ratings.length > 0) setDriverRating(ratings[0]);
    }).catch(() => {});

    // Subscribe to new reviews
    const unsub = base44.entities.Review.subscribe((event) => {
      if ((event.type === 'create' || event.type === 'update') && event.data?.order_id === orderId) {
        setReviews(prev => {
          const existing = prev.findIndex(r => r.id === event.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = event.data;
            return updated;
          }
          return [event.data, ...prev];
        });
      }
    });

    return () => unsub();
  }, [orderId]);

  const isDelivered = orderStatus === 'delivered';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Calificaciones
        </h3>
        {isDelivered && reviews.length === 0 && (
          <Badge className="bg-amber-100 text-amber-700">Pendiente de reseña</Badge>
        )}
      </div>

      {/* Product Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{review.customer_name}</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && <p className="text-xs text-foreground">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Driver Rating */}
      {driverRating && (
        <div className="bg-gradient-to-r from-strawberry/10 to-accent/10 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            🚗 Calificación del Repartidor
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(driverRating.rating) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">{driverRating.rating.toFixed(1)}/5</span>
          </div>
          {driverRating.comment && (
            <p className="text-xs text-foreground">{driverRating.comment}</p>
          )}
        </div>
      )}

      {isDelivered && reviews.length === 0 && !showReviewForm && (
        <Button
          onClick={() => setShowReviewForm(true)}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1" />
          Escribir Reseña
        </Button>
      )}

      {showReviewForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-border pt-4"
        >
          <p className="text-xs text-muted-foreground mb-2">Gracias por tu compra! Comparte tu experiencia.</p>
          <Button
            onClick={() => {
              setShowReviewForm(false);
            }}
            className="w-full bg-strawberry hover:bg-strawberry/90"
            size="sm"
          >
            Ir a Reseñas Detalladas
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}