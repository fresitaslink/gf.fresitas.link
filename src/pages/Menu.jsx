import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import ProductCard from '@/components/products/ProductCard';
import ProductModal from '@/components/products/ProductModal';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  fresitas_crema: '🍓',
  chocolate: '🍫',
  combinados: '🎉',
  especiales: '⭐',
  bebidas: '🥤',
  temporada: '🌸',
};

export default function Menu() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Track menu visit for funnel analytics
    const prev = parseInt(localStorage.getItem('fresitas_funnel_menu') || '0');
    localStorage.setItem('fresitas_funnel_menu', String(prev + 1));

    base44.entities.Product.list().then(prods => {
      setProducts(prods);
      const prodSlug = searchParams.get('producto');
      if (prodSlug) {
        const found = prods.find(p => p.slug === prodSlug);
        if (found) setSelectedProduct(found);
      }
    }).finally(() => setLoading(false));

    if (user) {
      base44.entities.Favorite.filter({ user_email: user.email })
        .then(favs => setFavorites(favs.map(f => f.product_id)));
    }
  }, [user, searchParams]);

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
    return cats;
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    products.forEach(p => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];
    if (selectedCategory !== 'all') result = result.filter(p => p.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name_es?.toLowerCase().includes(q) ||
        p.name_en?.toLowerCase().includes(q) ||
        p.description_es?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'popular': result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
      case 'newest': result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); break;
      case 'price_low': result.sort((a, b) => a.price - b.price); break;
      case 'price_high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    }
    return result;
  }, [products, selectedCategory, search, sortBy]);

  const handleToggleFavorite = async (product) => {
    if (!user) { toast.error('Inicia sesión para guardar favoritos'); return; }
    const isFav = favorites.includes(product.id);
    if (isFav) {
      const favs = await base44.entities.Favorite.filter({ user_email: user.email, product_id: product.id });
      if (favs[0]) await base44.entities.Favorite.delete(favs[0].id);
      setFavorites(prev => prev.filter(id => id !== product.id));
      toast.success(t.removedFromFavorites);
    } else {
      await base44.entities.Favorite.create({ user_email: user.email, product_id: product.id });
      setFavorites(prev => [...prev, product.id]);
      toast.success(t.addedToFavorites, { icon: '❤️' });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-10"
        >
          <h1 className="font-poppins font-black text-4xl sm:text-5xl text-foreground mb-3">
            {language === 'es' ? 'Nuestro Menú' : 'Our Menu'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'es' ? 'Preparadas con amor y los mejores ingredientes frescos' : 'Made with love and the finest fresh ingredients'}
          </p>
        </motion.div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-full border-border focus:border-strawberry"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48 rounded-full">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t.popular}</SelectItem>
              <SelectItem value="newest">{t.newest}</SelectItem>
              <SelectItem value="price_low">{t.priceLow}</SelectItem>
              <SelectItem value="price_high">{t.priceHigh}</SelectItem>
              <SelectItem value="rating">{t.highestRated}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-strawberry text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {cat !== 'all' && <span>{CATEGORY_ICONS[cat] || '🍓'}</span>}
              <span>
                {cat === 'all'
                  ? t.allCategories
                  : (t.categories[cat] || cat)
                }
              </span>
              <span className={`text-xs ${selectedCategory === cat ? 'text-white/80' : 'text-muted-foreground'}`}>
                ({categoryCounts[cat] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🍓</div>
            <h3 className="font-poppins font-semibold text-xl text-foreground mb-2">
              {language === 'es' ? 'No encontramos fresitas' : 'No results found'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'es' ? 'Intenta con otra búsqueda o categoría' : 'Try a different search or category'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <ProductCard
                    product={product}
                    onQuickView={setSelectedProduct}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(product.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Product Modal */}
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