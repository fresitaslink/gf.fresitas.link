import React, { useState } from 'react';
import { Sparkles, Loader2, Save, ChevronDown, ChevronUp, Globe, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function ProductSeoCard({ product, onSaved }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seo, setSeo] = useState({
    slug: product.slug || product.name_es?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
    seo_title_es: product.seo_title_es || '',
    seo_description_es: product.seo_description_es || '',
    badge: product.badge || '',
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = `Eres un experto en SEO para tiendas de postres mexicanos. Genera metadatos SEO optimizados para este producto de Fresitas G&F (tienda de fresas con crema, chocolate y más en México).

Producto: ${product.name_es}
Descripción: ${product.description_es || 'Delicioso postre de fresitas con ingredientes premium'}
Categoría: ${product.category}
Precio: $${product.price}

Genera en JSON:
- slug: URL amigable (ej: fresitas-con-crema-clasicas)
- seo_title_es: Título SEO en español (máx 60 caracteres, incluye "Fresitas G&F")
- seo_description_es: Meta descripción en español (máx 155 caracteres, atractiva y con palabras clave)
- tags: Array de 5-8 etiquetas/keywords relevantes en español
- badge: Una etiqueta corta para el producto (ej: "Más Vendido", "Nuevo", "Especial")`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            seo_title_es: { type: 'string' },
            seo_description_es: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            badge: { type: 'string' },
          },
        },
      });

      setSeo(prev => ({
        ...prev,
        slug: result.slug || prev.slug,
        seo_title_es: result.seo_title_es || prev.seo_title_es,
        seo_description_es: result.seo_description_es || prev.seo_description_es,
        badge: result.badge || prev.badge,
      }));

      toast.success('SEO generado con IA');
    } catch (err) {
      toast.error('Error al generar SEO');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Product.update(product.id, seo);
      onSaved(product.id, seo);
      toast.success('SEO guardado');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const hasSeо = product.seo_title_es || product.seo_description_es;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-10 h-10 rounded-xl bg-cream overflow-hidden flex-shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={product.name_es} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-lg">🍓</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{product.name_es}</p>
          <p className="text-xs text-muted-foreground">${product.price} · {product.category}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSeо ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Globe className="w-3 h-3" /> SEO OK
            </span>
          ) : (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Sin SEO</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-7 gap-1.5"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {generating ? 'Generando...' : 'Generar con IA'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Slug URL</Label>
              <Input
                value={seo.slug}
                onChange={e => setSeo(s => ({ ...s, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                className="rounded-xl h-8 text-xs font-mono"
                placeholder="fresitas-con-crema"
              />
              <p className="text-xs text-muted-foreground">/producto/{seo.slug || 'nombre-producto'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Badge / Etiqueta</Label>
              <Input
                value={seo.badge}
                onChange={e => setSeo(s => ({ ...s, badge: e.target.value }))}
                className="rounded-xl h-8 text-xs"
                placeholder="Más Vendido, Nuevo, Especial..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center justify-between">
              <span>Título SEO (español)</span>
              <span className={`text-xs ${seo.seo_title_es.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {seo.seo_title_es.length}/60
              </span>
            </Label>
            <Input
              value={seo.seo_title_es}
              onChange={e => setSeo(s => ({ ...s, seo_title_es: e.target.value }))}
              className="rounded-xl h-8 text-xs"
              placeholder="Fresitas con Crema Clásicas | Fresitas G&F"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center justify-between">
              <span>Meta descripción (español)</span>
              <span className={`text-xs ${seo.seo_description_es.length > 155 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {seo.seo_description_es.length}/155
              </span>
            </Label>
            <Textarea
              value={seo.seo_description_es}
              onChange={e => setSeo(s => ({ ...s, seo_description_es: e.target.value }))}
              className="rounded-xl text-xs min-h-[70px]"
              placeholder="Disfruta nuestras deliciosas fresitas con crema preparadas con amor..."
            />
          </div>

          <Button
            size="sm"
            className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Save className="w-3 h-3 mr-1.5" />}
            Guardar SEO
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductSeoGenerator({ products, onProductsChange }) {
  const [filter, setFilter] = useState('all');

  const noSeo = products.filter(p => !p.seo_title_es && !p.seo_description_es);
  const withSeo = products.filter(p => p.seo_title_es || p.seo_description_es);
  const displayed = filter === 'missing' ? noSeo : filter === 'done' ? withSeo : products;

  const handleGenerateAll = async () => {
    toast('Generación masiva no disponible aún. Usa el botón individual por producto.', { duration: 3000 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-poppins font-bold text-lg">Generador SEO de Productos</h3>
          <p className="text-xs text-muted-foreground">
            {withSeo.length}/{products.length} productos con SEO completo
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'missing', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f ? 'bg-strawberry text-white border-strawberry' : 'border-border text-muted-foreground hover:border-strawberry/50'
              }`}
            >
              {f === 'all' ? `Todos (${products.length})` : f === 'missing' ? `Sin SEO (${noSeo.length})` : `Con SEO (${withSeo.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-strawberry rounded-full transition-all"
          style={{ width: `${products.length > 0 ? (withSeo.length / products.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {displayed.map(product => (
          <ProductSeoCard
            key={product.id}
            product={product}
            onSaved={(id, changes) => onProductsChange && onProductsChange(id, changes)}
          />
        ))}
        {displayed.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">No hay productos en esta categoría</p>
        )}
      </div>
    </div>
  );
}