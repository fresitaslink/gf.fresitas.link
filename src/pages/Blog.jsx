import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Eye, Tag, ChevronRight, BookOpen, Leaf, Utensils, Newspaper, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

const CATEGORY_META = {
  recetas: { label: 'Recetas', icon: Utensils, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  tips: { label: 'Tips', icon: Leaf, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  noticias: { label: 'Noticias', icon: Newspaper, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  temporada: { label: 'Temporada', icon: Calendar, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  maridajes: { label: 'Maridajes', icon: Star, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

function PostCard({ post, language, featured = false }) {
  const cat = CATEGORY_META[post.category] || CATEGORY_META.noticias;
  const CatIcon = cat.icon;
  const title = language === 'es' ? post.title_es : (post.title_en || post.title_es);
  const excerpt = language === 'es' ? post.excerpt_es : (post.excerpt_en || post.excerpt_es);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${featured ? 'md:col-span-2' : ''}`}
    >
      <Link to={`/blog/${post.slug || post.id}`}>
        <div className={`relative overflow-hidden bg-cream ${featured ? 'h-64 md:h-80' : 'h-48'}`}>
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-strawberry/10 to-pink-100 dark:from-strawberry/20 dark:to-pink-900/20">
              <BookOpen className="w-16 h-16 text-strawberry/40" />
            </div>
          )}
          <div className="absolute top-4 left-4">
            <Badge className={`${cat.color} border-0 gap-1`}>
              <CatIcon className="w-3 h-3" />
              {cat.label}
            </Badge>
          </div>
        </div>
        <div className="p-5">
          <h2 className={`font-poppins font-bold text-foreground group-hover:text-strawberry transition-colors leading-tight mb-2 ${featured ? 'text-2xl' : 'text-lg'}`}>
            {title}
          </h2>
          {excerpt && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">{excerpt}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {post.read_time_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {post.read_time_minutes} min
                </span>
              )}
              {post.views > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {post.views}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-strawberry font-medium">
              Leer más <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Blog() {
  const { language } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    base44.entities.BlogPost.filter({ is_published: true }, '-published_at', 50)
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === 'all' ? posts : posts.filter(p => p.category === activeCategory);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen pt-16 bg-background">
      {/* Hero */}
      <section className="py-16 px-6 bg-gradient-to-br from-cream via-background to-pink-50 dark:from-background dark:via-card dark:to-secondary/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-strawberry/10 text-strawberry rounded-full px-4 py-2 text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              {language === 'es' ? 'Blog & Recetas' : 'Blog & Recipes'}
            </div>
            <h1 className="font-poppins font-black text-4xl sm:text-5xl text-foreground mb-4">
              {language === 'es' ? 'El Universo de las Fresas' : 'The Strawberry Universe'}
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {language === 'es'
                ? 'Recetas, tips de maridaje, novedades de temporada y todo sobre el mundo de las fresitas.'
                : 'Recipes, pairing tips, seasonal news, and everything about the world of strawberries.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-6 py-6 sticky top-16 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === 'all' ? 'bg-strawberry text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {language === 'es' ? 'Todos' : 'All'}
          </button>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === key ? 'bg-strawberry text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Posts Grid */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-card rounded-3xl border border-border overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-poppins font-bold text-xl text-foreground mb-2">
                {language === 'es' ? 'Próximamente' : 'Coming Soon'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'es' ? 'Estamos preparando contenido delicioso para ti.' : "We're preparing delicious content for you."}
              </p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featured && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <PostCard post={featured} language={language} featured />
                  {rest.slice(0, 1).map(p => <PostCard key={p.id} post={p} language={language} />)}
                </div>
              )}
              {/* Rest of posts */}
              {rest.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.slice(1).map(p => <PostCard key={p.id} post={p} language={language} />)}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}