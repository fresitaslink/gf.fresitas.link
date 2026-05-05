import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Clock, Flame, Plus, Minus, ShoppingCart, Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { toast } from 'sonner';

export default function ProductModal({ product, onClose, isFavorite, onToggleFavorite }) {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0]?.size || null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  const name = language === 'es' ? product.name_es : (product.name_en || product.name_es);
  const description = language === 'es' ? product.description_es : (product.description_en || product.description_es);

  const getSizePrice = () => {
    if (!selectedSize || !product.sizes?.length) return product.price;
    const s = product.sizes.find(s => s.size === selectedSize);
    return s ? s.price : product.price;
  };

  const getToppingPrice = () => {
    return selectedToppings.reduce((sum, t) => {
      const tp = (product.toppings || []).find(tp => tp.name_es === t || tp.name_en === t);
      return sum + (tp ? tp.price : 0);
    }, 0);
  };

  const totalPrice = (getSizePrice() + getToppingPrice()) * quantity;

  const toggleTopping = (toppingName) => {
    setSelectedToppings(prev =>
      prev.includes(toppingName) ? prev.filter(t => t !== toppingName) : [...prev, toppingName]
    );
  };

  const handleAddToCart = () => {
    addItem(product, selectedSize, selectedToppings, quantity);
    toast.success(t.addedToCart, { icon: '🍓' });
    onClose();
  };

  const sizeLabels = { small: t.small, medium: t.medium, large: t.large };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="relative h-56 bg-cream overflow-hidden">
            {!imgError && product.image_url ? (
              <img src={product.image_url} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-pink-100 to-red-100">🍓</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleFavorite(product)}
              className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${isFavorite ? 'bg-strawberry text-white' : 'bg-white/90 text-strawberry hover:bg-strawberry hover:text-white'}`}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {product.badge && (
              <div className="absolute bottom-4 left-4">
                <span className="bg-strawberry text-white text-xs font-bold px-3 py-1 rounded-full">{product.badge}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <div>
              <h2 className="font-poppins font-bold text-2xl text-foreground">{name}</h2>
              {description && <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>}

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {product.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
                    <span>({product.review_count || 0})</span>
                  </span>
                )}
                {product.preparation_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {product.preparation_time_minutes} {t.mins}
                  </span>
                )}
                {product.calories && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4" /> {product.calories} {t.cal}
                  </span>
                )}
              </div>
            </div>

            {/* Sizes */}
            {product.sizes?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">{t.size}</h3>
                <div className="flex gap-2">
                  {product.sizes.map(s => (
                    <button
                      key={s.size}
                      onClick={() => setSelectedSize(s.size)}
                      className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        selectedSize === s.size
                          ? 'border-strawberry bg-strawberry/10 text-strawberry'
                          : 'border-border hover:border-strawberry/50'
                      }`}
                    >
                      <div>{sizeLabels[s.size] || s.size}</div>
                      <div className="text-xs text-muted-foreground">${s.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toppings */}
            {product.toppings?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">{t.toppings}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.toppings.map((topping, i) => {
                    const tName = language === 'es' ? topping.name_es : (topping.name_en || topping.name_es);
                    const isSelected = selectedToppings.includes(topping.name_es);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleTopping(topping.name_es)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                          isSelected ? 'border-strawberry bg-strawberry/10 text-strawberry' : 'border-border hover:border-strawberry/50'
                        }`}
                      >
                        <span>{tName}</span>
                        {topping.price > 0 && <span className="text-xs text-muted-foreground">+${topping.price}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Allergens */}
            {product.allergens?.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
                ⚠️ Alérgenos: {product.allergens.join(', ')}
              </div>
            )}

            {/* Quantity & Add */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-3 bg-muted rounded-full px-4 py-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-foreground hover:text-strawberry transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="text-foreground hover:text-strawberry transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={!product.is_available}
                className="flex-1 bg-strawberry hover:bg-strawberry/90 text-white rounded-full py-3 font-semibold"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Agregar — ${totalPrice.toFixed(2)}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}