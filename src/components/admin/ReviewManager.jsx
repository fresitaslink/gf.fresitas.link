import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageCircle, Trash2, Edit2, Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ReviewManager() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [products, setProducts] = useState({});

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const [revs, prods] = await Promise.all([
        base44.entities.Review.list('-created_date', 100),
        base44.entities.Product.list('-created_date', 500),
      ]);
      setReviews(revs);
      const prodMap = {};
      prods.forEach(p => { prodMap[p.id] = p; });
      setProducts(prodMap);
    } finally { setLoading(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim()) { toast.error('La respuesta no puede estar vacía'); return; }
    setReplySending(true);
    try {
      const reply = {
        reply: replyText,
        reply_date: new Date().toISOString().split('T')[0],
      };
      await base44.entities.Review.update(replyingTo, reply);
      setReviews(prev => prev.map(r => r.id === replyingTo ? { ...r, ...reply } : r));
      toast.success('✅ Respuesta publicada');
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally { setReplySending(false); }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('¿Eliminar esta reseña?')) return;
    try {
      await base44.entities.Review.delete(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Reseña eliminada');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-strawberry" />
          Gestionar Reseñas ({reviews.length})
        </h3>
        <Button variant="outline" onClick={loadReviews} className="rounded-xl text-xs">
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-strawberry" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay reseñas todavía
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => {
            const product = products[review.product_id];
            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{review.customer_name || review.user_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {product?.name_es || 'Producto desconocido'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (review.rating || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-amber-600">
                      {review.rating}/5
                    </span>
                  </div>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-foreground mb-3 bg-muted/30 p-3 rounded-xl">
                    "{review.comment}"
                  </p>
                )}

                {/* Photos */}
                {review.photos?.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {review.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Foto ${idx + 1}`}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ))}
                  </div>
                )}

                {/* Owner Reply */}
                {review.reply && (
                  <div className="mb-3 bg-strawberry/5 border border-strawberry/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-strawberry mb-1">📞 Respuesta de Fresitas G&F</p>
                    <p className="text-sm text-foreground">{review.reply}</p>
                    {review.reply_date && (
                      <p className="text-xs text-muted-foreground mt-1">{review.reply_date}</p>
                    )}
                  </div>
                )}

                {/* Reply Form or Button */}
                {replyingTo === review.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Escribe tu respuesta aquí..."
                      className="rounded-xl text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReply}
                        disabled={replySending}
                        className="bg-strawberry hover:bg-strawberry/90 text-white rounded-lg text-xs flex-1"
                      >
                        {replySending ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Send className="w-3 h-3 mr-1" />
                        )}
                        Publicar Respuesta
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="rounded-lg text-xs"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => setReplyingTo(review.id)}
                      className="text-xs font-medium text-strawberry hover:bg-strawberry/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {review.reply ? 'Editar Respuesta' : 'Responder'}
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-xs text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}