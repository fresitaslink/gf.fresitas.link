import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns a dynamic XML sitemap for SEO
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [products, posts] = await Promise.all([
      base44.asServiceRole.entities.Product.filter({ is_available: true }),
      base44.asServiceRole.entities.BlogPost.filter({ is_published: true }),
    ]);

    const baseUrl = 'https://fresitas.app';
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/menu', priority: '0.9', changefreq: 'daily' },
      { url: '/suscripciones', priority: '0.8', changefreq: 'weekly' },
      { url: '/blog', priority: '0.7', changefreq: 'weekly' },
      { url: '/reviews', priority: '0.6', changefreq: 'weekly' },
    ];

    const categories = ['fresitas_crema', 'chocolate', 'combinados', 'especiales', 'bebidas', 'temporada'];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Category pages
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${baseUrl}/menu?category=${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Product pages
    for (const product of products) {
      const slug = product.slug || product.name_es.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const lastmod = product.updated_date ? new Date(product.updated_date).toISOString().split('T')[0] : today;
      xml += `
  <url>
    <loc>${baseUrl}/menu?producto=${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Blog posts
    for (const post of posts) {
      if (!post.slug) continue;
      const lastmod = post.updated_date ? new Date(post.updated_date).toISOString().split('T')[0] : today;
      xml += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += `\n</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});