import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import ProductCard from '@/components/products/ProductCard';
import ProductModal from '@/components/products/ProductModal';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Favoritos() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    base44.entities.Favorite.filter({ user_email: user.email }).then(async (favs) => {
      setFavorites(favs.map(f => f.product_id));
      const productIds = favs.map(f => f.product_id);
      if (productIds.length > 0) {
        const allProducts = await base44.entities.Product.list();
        setProducts(allProducts.filter(p => productIds.includes(p.id)));
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleToggleFavorite = async (product) => {
    const isFav = favorites.includes(product.id);
    if (isFav) {
      const favs = await base44.entities.Favorite.filter({ user_email: user.email, product_id: product.id });
      if (favs[0]) await base44.entities.Favorite.delete(favs[0].id);
      setFavorites(prev => prev.filter(id => id !== product.id));
      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast.success(t.removedFromFavorites);
    } else {
      await base44.entities.Favorite.create({ user_email: user.email, product_id: product.id });
      setFavorites(prev => [...prev, product.id]);
      toast.success(t.addedToFavorites, { icon: '❤️' });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="py-8 flex items-center gap-3">
            <Heart className="w-7 h-7 text-strawberry fill-strawberry" />
            <h1 className="font-poppins font-bold text-3xl text-foreground">{t.myFavorites}</h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-6">💔</div>
              <h2 className="font-poppins font-bold text-2xl text-foreground mb-2">{t.noFavorites}</h2>
              <p className="text-muted-foreground mb-8">{t.noFavoritesDesc}</p>
              <Button onClick={() => navigate('/menu')} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full px-8">
                {t.goToMenu} 🍓
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                  <ProductCard
                    product={product}
                    onQuickView={setSelectedProduct}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(product.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isFavorite={favorites.includes(selectedProduct.id)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}