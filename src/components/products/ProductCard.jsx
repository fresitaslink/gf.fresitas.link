import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Star, ShoppingCart, Eye, Clock, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { toast } from 'sonner';

export default function ProductCard({ product, onQuickView, onToggleFavorite, isFavorite }) {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);

  const name = language === 'es' ? product.name_es : (product.name_en || product.name_es);
  const description = language === 'es' ? product.description_es : (product.description_en || product.description_es);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!product.is_available) return;
    const defaultSize = product.sizes?.length ? product.sizes[0].size : null;
    addItem(product, defaultSize, []);
    toast.success(t.addedToCart, { icon: '🍓' });
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    onToggleFavorite(product);
  };

  const badgeColors = {
    'Más Vendido': 'bg-amber-500',
    'Nuevo': 'bg-green-500',
    'Especial': 'bg-purple-500',
    'Temporada': 'bg-orange-500',
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={() => onQuickView(product)}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-48 bg-cream">
        {!imgError && product.image_url ? (
          <img
            src={product.image_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-pink-100 to-red-100">
            🍓
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.badge && (
            <span className={`${badgeColors[product.badge] || 'bg-strawberry'} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
              {product.badge}
            </span>
          )}
          {product.is_new && !product.badge && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {language === 'es' ? 'Nuevo' : 'New'}
            </span>
          )}
          {!product.is_available && (
            <span className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {t.outOfStock}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFavorite}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
              isFavorite ? 'bg-strawberry text-white' : 'bg-white text-strawberry hover:bg-strawberry hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-all"
          >
            <Eye className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-poppins font-semibold text-foreground mb-1 line-clamp-1">{name}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          {product.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)}
            </span>
          )}
          {product.preparation_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {product.preparation_time_minutes} {t.mins}
            </span>
          )}
          {product.calories && (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {product.calories} {t.cal}
            </span>
          )}
        </div>

        {/* Price & Add */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-poppins font-bold text-lg text-strawberry">${product.price}</span>
            {product.sizes?.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">{t.perUnit}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!product.is_available}
            className={`rounded-full text-xs px-3 ${
              product.is_available
                ? 'bg-strawberry hover:bg-strawberry/90 text-white'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            {t.addToCart}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}