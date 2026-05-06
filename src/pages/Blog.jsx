import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Eye, ChevronRight, BookOpen, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

const CATEGORY_META = {
  recetas:   { label_es: 'Recetas',   label_en: 'Recipes',   color: 'bg-pink-500',   light: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',  svgIcon: '🍓' },
  tips:      { label_es: 'Tips',      label_en: 'Tips',      color: 'bg-green-500',  light: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', svgIcon: '💡' },
  noticias:  { label_es: 'Noticias',  label_en: 'News',      color: 'bg-blue-500',   light: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   svgIcon: '📰' },
  temporada: { label_es: 'Temporada', label_en: 'Seasonal',  color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', svgIcon: '🌱' },
  maridajes: { label_es: 'Maridajes', label_en: 'Pairings',  color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', svgIcon: '✨' },
};

function PostCard({ post, language, size = 'normal' }) {
  const cat = CATEGORY_META[post.category] || CATEGORY_META.noticias;
  const title = language === 'es' ? post.title_es : (post.title_en || post.title_es);
  const excerpt = language === 'es' ? post.excerpt_es : (post.excerpt_en || post.excerpt_es);
  const catLabel = language === 'es' ? cat.label_es : cat.label_en;

  if (size === 'hero') {
    return (
      <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="group relative bg-card rounded-3xl overflow-hidden border border-border hover:shadow-2xl transition-all duration-500 md:col-span-2">
        <Link to={`/blog/${post.slug || post.id}`} className="block">
          <div className="relative h-72 md:h-96 bg-gradient-to-br from-strawberry/10 to-pink-100 dark:from-strawberry/20 dark:to-pink-900/20 overflow-hidden">
            {post.cover_image ? (
              <img src={post.cover_image} alt={title} className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">🍓</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-5 left-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${cat.color}`}>
                {cat.svgIcon} {catLabel}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="font-poppins font-black text-2xl md:text-3xl leading-tight mb-2 group-hover:text-pink-200 transition-colors">{title}</h2>
              {excerpt && <p className="text-white/70 text-sm line-clamp-2">{excerpt}</p>}
              <div className="flex items-center gap-4 mt-3 text-white/60 text-xs">
                {post.read_time_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_time_minutes} min</span>}
                {post.views > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>}
                {post.author_name && <span>{post.author_name}</span>}
                <span className="ml-auto flex items-center gap-1 text-pink-300 font-semibold">
                  {language === 'es' ? 'Leer más' : 'Read more'} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      <Link to={`/blog/${post.slug || post.id}`} className="flex flex-col flex-1">
        <div className="relative h-48 bg-gradient-to-br from-strawberry/5 to-pink-50 dark:from-strawberry/10 dark:to-pink-900/10 overflow-hidden flex-shrink-0">
          {post.cover_image ? (
            <img src={post.cover_image} alt={title} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🍓</div>
          )}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${cat.color}`}>
              {cat.svgIcon} {catLabel}
            </span>
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h2 className="font-poppins font-bold text-foreground group-hover:text-strawberry transition-colors leading-tight mb-2 text-base line-clamp-2">
            {title}
          </h2>
          {excerpt && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4 flex-1">{excerpt}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
            <div className="flex items-center gap-3">
              {post.read_time_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_time_minutes} min</span>}
              {post.views > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>}
            </div>
            <span className="flex items-center gap-1 text-strawberry font-semibold">
              {language === 'es' ? 'Leer más' : 'Read more'} <ChevronRight className="w-3 h-3" />
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
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.BlogPost.filter({ is_published: true }, '-published_at', 50)
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(p => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = language === 'es' ? p.title_es : (p.title_en || p.title_es);
      const excerpt = language === 'es' ? p.excerpt_es : (p.excerpt_en || p.excerpt_es);
      if (!title?.toLowerCase().includes(q) && !excerpt?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hero = filtered[0];
  const rest = filtered.slice(1);

  const TABS = [
    { key: 'all', label_es: 'Todos', label_en: 'All', icon: '📖' },
    ...Object.entries(CATEGORY_META).map(([key, m]) => ({ key, label_es: m.label_es, label_en: m.label_en, icon: m.svgIcon })),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-strawberry/5 via-background to-pink-50/50 dark:from-strawberry/10 dark:via-background dark:to-secondary/20" />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-strawberry/10 text-strawberry rounded-full px-5 py-2 text-sm font-semibold mb-5 border border-strawberry/20">
              <BookOpen className="w-4 h-4" />
              {language === 'es' ? 'Blog & Recetas Fresitas' : 'Fresitas Blog & Recipes'}
            </div>
            <h1 className="font-poppins font-black text-4xl sm:text-5xl lg:text-6xl text-foreground mb-4 leading-tight">
              {language === 'es' ? 'El Universo de las' : 'The World of'}{' '}
              <span className="text-strawberry">🍓 Fresas</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              {language === 'es'
                ? 'Recetas únicas, tips de temporada, novedades y todo sobre el arte de las fresitas.'
                : 'Unique recipes, seasonal tips, news and everything about the art of strawberries.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Sticky Filter Bar */}
      <section className="sticky top-14 z-20 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 pb-0.5">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === tab.key
                    ? 'bg-strawberry text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <span>{tab.icon}</span>
                {language === 'es' ? tab.label_es : tab.label_en}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-shrink-0 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
              className="rounded-full h-8 pl-8 pr-4 text-xs w-40 bg-muted border-0"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="text-7xl mb-5">🍓</div>
            <h3 className="font-poppins font-bold text-xl text-foreground mb-2">
              {language === 'es' ? 'Próximamente' : 'Coming Soon'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'es' ? 'Estamos preparando contenido delicioso para ti.' : "We're preparing delicious content for you."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hero post */}
            {hero && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PostCard post={hero} language={language} size="hero" />
                {rest[0] && <PostCard post={rest[0]} language={language} />}
              </div>
            )}
            {/* Rest */}
            {rest.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.slice(1).map(p => <PostCard key={p.id} post={p} language={language} />)}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}