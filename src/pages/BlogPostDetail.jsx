import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Eye, Calendar, User, Tag, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

const CATEGORY_META = {
  recetas: { label: 'Recetas', color: 'bg-pink-100 text-pink-700' },
  tips: { label: 'Tips', color: 'bg-green-100 text-green-700' },
  noticias: { label: 'Noticias', color: 'bg-blue-100 text-blue-700' },
  temporada: { label: 'Temporada', color: 'bg-amber-100 text-amber-700' },
  maridajes: { label: 'Maridajes', color: 'bg-purple-100 text-purple-700' },
};

export default function BlogPostDetail() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Try by slug first, then by id
      let posts = await base44.entities.BlogPost.filter({ slug, is_published: true });
      if (!posts.length) posts = await base44.entities.BlogPost.filter({ id: slug });
      if (posts[0]) {
        const p = posts[0];
        setPost(p);
        // Increment views
        base44.entities.BlogPost.update(p.id, { views: (p.views || 0) + 1 }).catch(() => {});
        // Load related
        const rel = await base44.entities.BlogPost.filter({ category: p.category, is_published: true }, '-published_at', 4);
        setRelated(rel.filter(r => r.id !== p.id).slice(0, 3));
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cream border-t-strawberry rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="font-poppins font-bold text-xl">Post no encontrado</h2>
        <Link to="/blog"><Button variant="outline">Ver todos los posts</Button></Link>
      </div>
    );
  }

  const title = language === 'es' ? post.title_es : (post.title_en || post.title_es);
  const content = language === 'es' ? post.content_es : (post.content_en || post.content_es);
  const cat = CATEGORY_META[post.category];

  return (
    <div className="min-h-screen pt-16 bg-background">
      {/* Cover */}
      {post.cover_image && (
        <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
          <img src={post.cover_image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al Blog
        </Link>

        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {cat && <Badge className={`${cat.color} border-0`}>{cat.label}</Badge>}
            {post.read_time_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {post.read_time_minutes} min de lectura
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" /> {new Date(post.published_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            {post.views > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" /> {post.views} vistas
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-poppins font-black text-3xl sm:text-4xl md:text-5xl text-foreground leading-tight mb-6">
            {title}
          </h1>

          {/* Author */}
          {post.author_name && (
            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
              {post.author_avatar ? (
                <img src={post.author_avatar} alt={post.author_name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-strawberry/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-strawberry" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-foreground">{post.author_name}</p>
                <p className="text-xs text-muted-foreground">Fresitas G&F</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-poppins prose-headings:font-bold prose-a:text-strawberry prose-strong:text-foreground prose-img:rounded-2xl">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="mt-10 pt-8 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-muted-foreground" />
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </motion.article>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border">
            <h3 className="font-poppins font-bold text-xl mb-6">Más artículos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map(rel => {
                const relTitle = language === 'es' ? rel.title_es : (rel.title_en || rel.title_es);
                return (
                  <Link key={rel.id} to={`/blog/${rel.slug || rel.id}`} className="group">
                    <div className="rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all">
                      <div className="h-28 overflow-hidden bg-cream">
                        {rel.cover_image
                          ? <img src={rel.cover_image} alt={relTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-strawberry/30" /></div>
                        }
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm text-foreground group-hover:text-strawberry line-clamp-2 transition-colors">{relTitle}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-10 text-center">
          <Link to="/blog">
            <Button variant="outline" className="rounded-full border-strawberry text-strawberry hover:bg-strawberry hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Ver todos los artículos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}