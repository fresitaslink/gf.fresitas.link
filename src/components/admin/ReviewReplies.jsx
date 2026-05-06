import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Loader2, Star, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ReviewReplies() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const allReviews = await base44.entities.Review.list('-created_date', 100);
      setReviews(allReviews);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error('La respuesta no puede estar vacía');
      return;
    }

    setSubmitting(true);
    try {
      const review = reviews.find(r => r.id === replyingTo);
      await base44.entities.Review.update(replyingTo, {
        reply: replyText,
        reply_date: new Date().toISOString().split('T')[0]
      });

      setReviews(prev => prev.map(r => 
        r.id === replyingTo 
          ? { ...r, reply: replyText, reply_date: new Date().toISOString().split('T')[0] }
          : r
      ));

      // Notify customer of reply
      if (review?.user_email) {
        base44.entities.Notification.create({
          user_email: review.user_email,
          title_es: 'Respuesta a tu reseña',
          title_en: 'Reply to your review',
          message_es: `Fresitas respondió a tu reseña sobre ${review.product_id}`,
          message_en: `Fresitas replied to your review`,
          type: 'order_update',
          link: '/reviews'
        }).catch(() => {});
      }

      toast.success('Respuesta publicada');
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm('¿Eliminar respuesta?')) return;
    try {
      await base44.entities.Review.update(reviewId, { reply: null, reply_date: null });
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, reply: null, reply_date: null }
          : r
      ));
      toast.success('Respuesta eliminada');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div>;
  }

  const pendingReplies = reviews.filter(r => !r.reply);
  const repliedReviews = reviews.filter(r => r.reply);

  return (
    <div className="space-y-6">
      {/* Pending Replies */}
      {pendingReplies.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-strawberry" />
            Reseñas sin responder ({pendingReplies.length})
          </h3>
          <div className="space-y-3">
            {pendingReplies.map(review => (
              <motion.div key={review.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-4">
                {/* Review Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-strawberry/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-strawberry" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{review.customer_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.rating}/5</span>
                    </div>
                  </div>
                </div>

                {/* Review Comment */}
                {review.comment && (
                  <p className="text-sm text-foreground mb-3 bg-muted rounded-lg p-2">{review.comment}</p>
                )}

                {/* Photos */}
                {review.photos?.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {review.photos.map((photo, i) => (
                      <img key={i} src={photo} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === review.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Escribe tu respuesta..."
                      rows={2}
                      className="rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleReply}
                        disabled={submitting}
                        className="bg-strawberry hover:bg-strawberry/90 text-white rounded-lg"
                      >
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                        Responder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="rounded-lg"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReplyingTo(review.id)}
                    className="rounded-lg text-xs gap-1"
                  >
                    <MessageCircle className="w-3 h-3" /> Responder
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Replied Reviews */}
      {repliedReviews.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            Reseñas respondidas ({repliedReviews.length})
          </h3>
          <div className="space-y-3">
            {repliedReviews.map(review => (
              <motion.div key={review.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-green-200/50 dark:border-green-900/30 rounded-2xl p-4">
                {/* Review */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-strawberry/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-strawberry" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{review.customer_name}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && <p className="text-sm text-foreground mb-2 bg-muted rounded-lg p-2">{review.comment}</p>}

                {/* Reply */}
                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 mb-3 border border-green-100 dark:border-green-900/30">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Respuesta de Fresitas</p>
                  <p className="text-sm text-foreground">{review.reply}</p>
                  {review.reply_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.reply_date).toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteReply(review.id)}
                  className="text-destructive hover:bg-destructive/10 text-xs rounded-lg"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Eliminar respuesta
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {reviews.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">No hay reseñas aún</p>
      )}
    </div>
  );
}