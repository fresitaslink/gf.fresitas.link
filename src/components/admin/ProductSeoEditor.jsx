import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function toSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function ProductSeoEditor({ products, onProductsChange }) {
  const [saving, setSaving] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [edits, setEdits] = useState({});

  const getEdit = (product) => {
    return edits[product.id] || {
      slug: product.slug || toSlug(product.name_es),
      seo_title_es: product.seo_title_es || `${product.name_es} | Fresitas G&F`,
      seo_description_es: product.seo_description_es || product.description_es || '',
    };
  };

  const setEdit = (productId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [productId]: { ...getEdit({ id: productId, ...products.find(p => p.id === productId) }), [field]: value },
    }));
  };

  const handleSave = async (product) => {
    const edit = getEdit(product);
    if (!edit.slug) { toast.error('El slug no puede estar vacío'); return; }
    setSaving(prev => ({ ...prev, [product.id]: true }));
    try {
      await base44.entities.Product.update(product.id, {
        slug: edit.slug,
        seo_title_es: edit.seo_title_es,
        seo_description_es: edit.seo_description_es,
      });
      onProductsChange && onProductsChange(product.id, edit);
      toast.success(`SEO guardado para "${product.name_es}"`);
      setExpanded(null);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(prev => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-strawberry" />
        <div>
          <h3 className="font-poppins font-semibold text-base">SEO de Productos</h3>
          <p className="text-xs text-muted-foreground">Edita slugs de URL y metatags para mejorar el posicionamiento en buscadores.</p>
        </div>
      </div>

      {products.map(product => {
        const edit = getEdit(product);
        const isExpanded = expanded === product.id;
        return (
          <div key={product.id} className="border border-border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : product.id)}
            >
              {product.image_url && (
                <img src={product.image_url} alt={product.name_es} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name_es}</p>
                <p className="text-xs text-muted-foreground font-mono">{edit.slug || '— sin slug —'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(product.slug && product.seo_description_es) && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border p-4 bg-muted/20 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Slug URL <span className="text-muted-foreground font-normal">(e.g. fresitas-con-crema)</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={edit.slug}
                      onChange={e => setEdit(product.id, 'slug', e.target.value)}
                      className="rounded-xl text-sm font-mono"
                      placeholder="fresitas-con-crema"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 rounded-xl text-xs"
                      onClick={() => setEdit(product.id, 'slug', toSlug(product.name_es))}
                    >
                      Auto
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">URL: /menu?producto={edit.slug}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Título SEO (meta title)</Label>
                  <Input
                    value={edit.seo_title_es}
                    onChange={e => setEdit(product.id, 'seo_title_es', e.target.value)}
                    className="rounded-xl text-sm"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{edit.seo_title_es?.length || 0}/60 caracteres</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descripción SEO (meta description)</Label>
                  <Textarea
                    value={edit.seo_description_es}
                    onChange={e => setEdit(product.id, 'seo_description_es', e.target.value)}
                    className="rounded-xl text-sm"
                    rows={2}
                    maxLength={160}
                    placeholder="Describe el producto en 1-2 oraciones para los buscadores..."
                  />
                  <p className="text-xs text-muted-foreground">{edit.seo_description_es?.length || 0}/160 caracteres</p>
                </div>

                <Button
                  onClick={() => handleSave(product)}
                  disabled={saving[product.id]}
                  size="sm"
                  className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl w-full"
                >
                  {saving[product.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  Guardar SEO
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}