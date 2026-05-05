import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const CATEGORY_COLORS = {
  recetas: 'bg-pink-100 text-pink-700',
  tips: 'bg-green-100 text-green-700',
  noticias: 'bg-blue-100 text-blue-700',
  temporada: 'bg-amber-100 text-amber-700',
  maridajes: 'bg-purple-100 text-purple-700',
};
const CATEGORY_LABELS = {
  recetas: 'Recetas', tips: 'Tips', noticias: 'Noticias', temporada: 'Temporada', maridajes: 'Maridajes',
};

export default function HomeBlogSection({ language }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    base44.entities.BlogPost.filter({ is_published: true }, '-published_at', 3).then(setPosts).catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 text-strawberry text-sm font-medium mb-2">
              <BookOpen className="w-4 h-4" />
              {language === 'es' ? 'Nuestro Blog' : 'Our Blog'}
            </div>
            <h2 className="font-poppins font-bold text-3xl text-foreground">
              {language === 'es' ? 'Recetas & Inspiración' : 'Recipes & Inspiration'}
            </h2>
          </div>
          <Link to="/blog" className="hidden sm:block">
            <Button variant="outline" className="rounded-full border-strawberry text-strawberry hover:bg-strawberry hover:text-white gap-2">
              {language === 'es' ? 'Ver todos' : 'View all'} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => {
            const title = language === 'es' ? post.title_es : (post.title_en || post.title_es);
            const excerpt = language === 'es' ? post.excerpt_es : (post.excerpt_en || post.excerpt_es);
            const catColor = CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-700';
            const catLabel = CATEGORY_LABELS[post.category] || post.category;
            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-card rounded-3xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <Link to={`/blog/${post.slug || post.id}`}>
                  <div className="relative h-44 overflow-hidden bg-cream">
                    {post.cover_image ? (
                      <img src={post.cover_image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-strawberry/10 to-pink-100">
                        <BookOpen className="w-12 h-12 text-strawberry/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${catColor} border-0 text-xs`}>{catLabel}</Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-poppins font-bold text-foreground group-hover:text-strawberry transition-colors leading-tight mb-2 line-clamp-2">
                      {title}
                    </h3>
                    {excerpt && <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{excerpt}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {post.read_time_minutes && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_time_minutes} min</span>
                      )}
                      <span className="flex items-center gap-1 text-strawberry font-medium">
                        Leer <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link to="/blog">
            <Button variant="outline" className="rounded-full border-strawberry text-strawberry hover:bg-strawberry hover:text-white gap-2">
              {language === 'es' ? 'Ver todos los artículos' : 'View all articles'} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}