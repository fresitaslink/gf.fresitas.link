import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, ChevronLeft, ChevronRight, Sparkles, Package, Heart, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import ProductCard from '@/components/products/ProductCard';
import ProductModal from '@/components/products/ProductModal';
import SkeletonCard from '@/components/ui/SkeletonCard';
import RealStats from '@/components/home/RealStats';
import HowItWorks from '@/components/home/HowItWorks';
import LoyaltyClubSection from '@/components/home/LoyaltyClubSection';
import HomeBlogSection from '@/components/home/HomeBlogSection';
import { toast } from 'sonner';

export default function Home() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [seasonalProducts, setSeasonalProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    // Capture referral code from URL and save to localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('fresitas_ref', refCode);
    }

    Promise.all([
      base44.entities.Product.filter({ is_featured: true, is_available: true }),
      base44.entities.Product.filter({ category: 'temporada', is_available: true }),
      base44.entities.Review.list('-created_date', 10),
      base44.entities.StoreSettings.list(),
    ]).then(([featured, seasonal, revs, settingsList]) => {
      setFeaturedProducts(featured);
      setSeasonalProducts(seasonal);
      setReviews(revs);
      setSettings(settingsList[0] || null);
    }).finally(() => setLoading(false));

    if (user) {
      base44.entities.Favorite.filter({ user_email: user.email })
        .then(favs => setFavorites(favs.map(f => f.product_id)));
    }
  }, [user]);

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
      toast.success(t.addedToFavorites);
    }
  };

  const galleryImages = [
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=400&fit=crop',
  ];

  return (
    <div className="min-h-screen">
      {/* Announcement Banner */}
      {settings?.announcement_es && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-strawberry text-white text-center py-2.5 px-4 text-sm font-medium"
        >
          {language === 'es' ? settings.announcement_es : (settings.announcement_en || settings.announcement_es)}
        </motion.div>
      )}

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-background to-pink-50 dark:from-background dark:via-card dark:to-secondary/20 pt-16">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full bg-strawberry/5 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-chocolate/5 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/2 w-80 h-80 rounded-full bg-pink-200/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-strawberry/10 text-strawberry rounded-full px-4 py-2 text-sm font-medium mb-6">
              <span className={`w-2 h-2 rounded-full ${settings?.is_open !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span>Fresitas G&amp;F — {settings?.is_open !== false ? t.open : t.closed}</span>
            </div>

            <h1 className="font-poppins font-black text-5xl sm:text-6xl md:text-7xl text-foreground mb-6 leading-tight">
              {language === 'es' ? (
                <>Fresas con <span className="text-strawberry">Amor</span>,<br />Sabor <span className="text-chocolate">Premium</span></>
              ) : (
                <>Strawberries with <span className="text-strawberry">Love</span>,<br /><span className="text-chocolate">Premium</span> Flavor</>
              )}
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {t.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/menu">
                <Button className="bg-strawberry hover:bg-strawberry/90 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg shadow-strawberry/30 hover:shadow-xl hover:shadow-strawberry/40 transition-all gap-2">
                  <Sparkles className="w-4 h-4" /> {t.orderNow}
                </Button>
              </Link>
              <Link to="/menu">
                <Button variant="outline" className="border-2 border-strawberry text-strawberry hover:bg-strawberry hover:text-white font-semibold px-8 py-4 rounded-full text-lg transition-all">
                  {t.seeMenu}
                </Button>
              </Link>
            </div>

            {/* Real Stats from database */}
            <RealStats />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-border flex items-start justify-center pt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-poppins font-bold text-3xl sm:text-4xl text-foreground mb-3">
              {t.featuredProducts}
            </h2>
            <p className="text-muted-foreground">{t.featuredSubtitle}</p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-strawberry/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'es' ? 'Pronto habrá productos destacados' : 'Featured products coming soon'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
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

          <div className="text-center mt-10">
            <Link to="/menu">
              <Button variant="outline" className="border-2 border-strawberry text-strawberry hover:bg-strawberry hover:text-white rounded-full px-8">
                {language === 'es' ? 'Ver Todo el Menú' : 'See Full Menu'} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* Seasonal Specials */}
      {seasonalProducts.length > 0 && (
        <section className="py-20 px-6 bg-gradient-to-r from-chocolate to-amber-900 text-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <span className="flex items-center justify-center gap-1 text-amber-300 text-sm font-medium uppercase tracking-wider"><Star className="w-4 h-4" /> {language === 'es' ? 'Solo por tiempo limitado' : 'Limited time only'}</span>
              <h2 className="font-poppins font-bold text-3xl sm:text-4xl mt-2">{t.seasonalSpecials}</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {seasonalProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/10 backdrop-blur rounded-2xl p-4 cursor-pointer hover:bg-white/20 transition-colors"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="h-40 rounded-xl overflow-hidden mb-4 bg-white/20">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name_es} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center bg-strawberry/10">
                         <Package className="w-12 h-12 text-strawberry/40" />
                       </div>
                    )}
                  </div>
                  <h3 className="font-poppins font-semibold text-lg">{language === 'es' ? product.name_es : (product.name_en || product.name_es)}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-xl">${product.price}</span>
                    <Button size="sm" className="bg-white text-chocolate hover:bg-amber-100 rounded-full" onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}>
                      {t.addToCart}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-poppins font-bold text-3xl text-foreground mb-2">
              {language === 'es' ? 'Galería de Amor' : 'Gallery of Love'}
            </h2>
            <p className="text-muted-foreground">{language === 'es' ? 'Cada bocado, una obra de arte' : 'Every bite, a work of art'}</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((url, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`overflow-hidden rounded-2xl ${i === 0 ? 'row-span-2' : ''} aspect-square`}
              >
                <img src={url} alt="Fresitas" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-20 px-6 bg-cream dark:bg-secondary/10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="font-poppins font-bold text-3xl text-foreground mb-2">
                {language === 'es' ? 'Lo Que Dicen Nuestros Clientes' : 'What Our Customers Say'}
              </h2>
            </motion.div>
            <div className="relative">
              <div className="bg-card rounded-3xl p-8 shadow-lg text-center">
                <div className="flex justify-center mb-4">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-6 h-6 ${i <= (reviews[reviewIndex]?.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-lg text-foreground italic mb-6 leading-relaxed">
                  "{reviews[reviewIndex]?.comment || 'Increíbles fresitas, las mejores que he probado!'}"
                </p>
                <div className="font-semibold text-foreground">
                  {reviews[reviewIndex]?.customer_name || 'Cliente Feliz'}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="ghost" size="icon" onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === reviewIndex ? 'w-6 bg-strawberry' : 'bg-muted-foreground/30'}`}
                  />
                ))}
                <Button variant="ghost" size="icon" onClick={() => setReviewIndex(Math.min(reviews.length - 1, reviewIndex + 1))}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Blog preview section */}
      <HomeBlogSection language={language} />

      <LoyaltyClubSection />

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