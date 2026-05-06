import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Rate driver after delivery complete
 */
export default function DriverRatingComponent({ order, onRatingSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedRating, setExpandedRating] = useState(null);

  if (!order || order.status !== 'delivered' || !order.assigned_driver_email) {
    return null;
  }

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.DriverRating.create({
        order_id: order.id,
        driver_email: order.assigned_driver_email,
        customer_email: order.user_email,
        rating: rating,
        comment: comment,
        punctuality_rating: expandedRating?.punctuality || rating,
        professionalism_rating: expandedRating?.professionalism || rating,
        vehicle_cleanliness_rating: expandedRating?.cleanliness || rating,
        food_care_rating: expandedRating?.foodCare || rating,
      });

      // Update driver average rating
      const driverRatings = await base44.entities.DriverRating.filter({ driver_email: order.assigned_driver_email });
      if (driverRatings.length > 0) {
        const avgRating = driverRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / driverRatings.length;
        const drivers = await base44.entities.Driver.filter({ user_email: order.assigned_driver_email });
        if (drivers[0]) {
          await base44.entities.Driver.update(drivers[0].id, {
            average_rating: parseFloat(avgRating.toFixed(2)),
            rating_count: driverRatings.length
          });
        }
      }

      toast.success('¡Gracias por tu calificación!');
      setSubmitted(true);
      onRatingSubmit?.();
    } catch (err) {
      toast.error('Error al enviar calificación');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center"
      >
        <div className="text-4xl mb-3">⭐</div>
        <p className="font-semibold text-sm text-green-700 dark:text-green-300 mb-1">¡Gracias por tu opinión!</p>
        <p className="text-xs text-green-600 dark:text-green-400">Tu calificación ayuda a mejorar el servicio</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/20 p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {order.assigned_driver_photo && (
          <img
            src={order.assigned_driver_photo}
            alt={order.assigned_driver_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <p className="font-semibold text-sm">¿Cómo fue tu entrega?</p>
          <p className="text-xs text-muted-foreground">{order.assigned_driver_name}</p>
        </div>
      </div>

      {/* Star Rating */}
      <div className="space-y-3">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <motion.button
              key={star}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-all"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </motion.button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-sm font-semibold">
            {rating === 1 && '😞 Muy malo'}
            {rating === 2 && '😐 Malo'}
            {rating === 3 && '🙂 Normal'}
            {rating === 4 && '😊 Bueno'}
            {rating === 5 && '😍 Excelente'}
          </p>
        )}
      </div>

      {/* Detailed Ratings (Optional) */}
      {rating >= 3 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 pt-3 border-t border-border"
        >
          <p className="text-xs font-semibold text-muted-foreground">Calificaciones detalladas (opcional):</p>
          {[
            { key: 'punctuality', label: '⏰ Puntualidad', icon: '⏱️' },
            { key: 'professionalism', label: '👔 Profesionalismo', icon: '🎯' },
            { key: 'cleanliness', label: '🧹 Limpieza del vehículo', icon: '✨' },
            { key: 'foodCare', label: '🍓 Cuidado del pedido', icon: '📦' }
          ].map(detail => (
            <div key={detail.key} className="space-y-1">
              <label className="text-xs font-medium">{detail.label}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setExpandedRating(prev => ({ ...prev, [detail.key]: star }))}
                    className="transition-all"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= (expandedRating?.[detail.key] || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Comment */}
      {rating > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2 pt-3 border-t border-border"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <label className="text-xs font-semibold">Comentario (opcional)</label>
          </div>
          <Textarea
            placeholder="Cuéntanos más sobre tu experiencia..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="text-sm min-h-20 resize-none"
          />
        </motion.div>
      )}

      {/* Submit Button */}
      {rating > 0 && (
        <Button
          onClick={handleSubmitRating}
          disabled={loading}
          className="w-full bg-strawberry hover:bg-strawberry/90 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Calificación
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
}