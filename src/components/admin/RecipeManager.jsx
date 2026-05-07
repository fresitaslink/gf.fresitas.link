import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Plus, Trash2, Save, AlertCircle, Loader2, Package, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Admin UI: map products → ingredients with per-unit quantity.
 * - Each Recipe row says "1 unit of ProductX consumes Yqty of IngredientZ"
 * - Critical flag: if true, product auto-disables when ingredient runs out
 * - Has a "Recalculate availability" button for manual sync
 */
export default function RecipeManager() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Form for new row
  const [newRow, setNewRow] = useState({ ingredient_id: '', quantity_per_unit: 1, is_critical: true });
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, i, r] = await Promise.all([
        base44.entities.Product.list('sort_order'),
        base44.entities.Ingredient.list(),
        base44.entities.Recipe.list(undefined, 5000),
      ]);
      setProducts(p);
      setIngredients(i);
      setRecipes(r);
      if (!selectedProductId && p[0]) setSelectedProductId(p[0].id);
    } catch (e) { toast.error('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  const productRecipes = useMemo(
    () => recipes.filter(r => r.product_id === selectedProductId),
    [recipes, selectedProductId]
  );
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // For the "out-of-stock preview" of selected product
  const stockSummary = useMemo(() => {
    if (!selectedProduct || productRecipes.length === 0) return null;
    let maxSellable = Infinity;
    let blocking = null;
    for (const r of productRecipes.filter(r => r.is_critical !== false)) {
      const ing = ingredients.find(i => i.id === r.ingredient_id);
      if (!ing) continue;
      const q = r.quantity_per_unit || 1;
      const possible = q > 0 ? Math.floor((ing.stock || 0) / q) : 0;
      if (possible < maxSellable) { maxSellable = possible; blocking = ing; }
    }
    return maxSellable === Infinity ? null : { maxSellable, blocking };
  }, [selectedProduct, productRecipes, ingredients]);

  const handleAdd = async () => {
    if (!selectedProductId || !newRow.ingredient_id) { toast.error('Selecciona producto e ingrediente'); return; }
    if (newRow.quantity_per_unit <= 0) { toast.error('La cantidad debe ser mayor a 0'); return; }
    if (productRecipes.find(r => r.ingredient_id === newRow.ingredient_id)) {
      toast.error('Este ingrediente ya está en la receta');
      return;
    }
    setAdding(true);
    try {
      const product = selectedProduct;
      const ing = ingredients.find(i => i.id === newRow.ingredient_id);
      const created = await base44.entities.Recipe.create({
        product_id: selectedProductId,
        product_name: product?.name_es || '',
        ingredient_id: newRow.ingredient_id,
        ingredient_name: ing?.name || '',
        quantity_per_unit: Number(newRow.quantity_per_unit),
        is_critical: newRow.is_critical,
      });
      setRecipes(prev => [...prev, created]);
      setNewRow({ ingredient_id: '', quantity_per_unit: 1, is_critical: true });
      toast.success('Ingrediente agregado a la receta');
    } catch (e) { toast.error('Error: ' + e.message); }
    finally { setAdding(false); }
  };

  const handleUpdate = async (recipe, patch) => {
    try {
      await base44.entities.Recipe.update(recipe.id, patch);
      setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, ...patch } : r));
    } catch (e) { toast.error('Error: ' + e.message); }
  };

  const handleDelete = async (recipe) => {
    if (!confirm(`Eliminar ${recipe.ingredient_name} de la receta?`)) return;
    try {
      await base44.entities.Recipe.delete(recipe.id);
      setRecipes(prev => prev.filter(r => r.id !== recipe.id));
      toast.success('Eliminado');
    } catch (e) { toast.error('Error: ' + e.message); }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await base44.functions.invoke('recalculateProductAvailability', { notify_kitchen: true });
      const data = res.data || {};
      if (data.newly_disabled?.length > 0) {
        toast.warning(`${data.newly_disabled.length} producto(s) deshabilitado(s) automáticamente · cocina notificada`);
      } else if (data.newly_enabled?.length > 0) {
        toast.success(`${data.newly_enabled.length} producto(s) reactivado(s)`);
      } else {
        toast.success(`✅ Todo en orden — ${data.products_evaluated} productos evaluados`);
      }
      loadAll();
    } catch (e) { toast.error('Error: ' + e.message); }
    finally { setRecalculating(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-strawberry" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-poppins font-bold text-xl flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" /> Recetas — Ingredientes por Producto
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define cuánto de cada ingrediente se consume por cada unidad de producto. El sistema deshabilitará productos automáticamente al agotarse el stock.
          </p>
        </div>
        <Button onClick={handleRecalculate} disabled={recalculating} className="gap-2 rounded-xl bg-strawberry hover:bg-strawberry/90">
          {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Recalcular disponibilidad
        </Button>
      </div>

      {/* Product selector */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Label className="font-semibold flex-shrink-0">Producto:</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="rounded-xl flex-1"><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.is_available === false ? '🚫 ' : '✅ '}{p.name_es}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
            {selectedProduct.image_url && (
              <img src={selectedProduct.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{selectedProduct.name_es}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">${selectedProduct.price}</Badge>
                {selectedProduct.is_available === false ? (
                  <Badge className="bg-red-100 text-red-700 text-xs">🚫 Sin stock</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 text-xs">✅ Disponible</Badge>
                )}
                {stockSummary && (
                  <Badge variant="outline" className="text-xs">
                    {stockSummary.maxSellable >= 999 ? '∞' : stockSummary.maxSellable} unidades posibles
                  </Badge>
                )}
              </div>
              {stockSummary?.blocking && stockSummary.maxSellable < 5 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Limitado por: <b>{stockSummary.blocking.name}</b> ({stockSummary.blocking.stock} {stockSummary.blocking.unit})
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Recipe rows */}
      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-strawberry" /> Ingredientes en la receta ({productRecipes.length})
        </h3>

        {productRecipes.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Este producto aún no tiene receta. Agrega ingredientes abajo.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {productRecipes.map(r => {
              const ing = ingredients.find(i => i.id === r.ingredient_id);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ing?.name || r.ingredient_name || 'Ingrediente eliminado'}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {ing?.stock ?? '?'} {ing?.unit || ''} · Buffer: {ing?.low_stock_threshold ?? '?'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.quantity_per_unit}
                      onChange={e => handleUpdate(r, { quantity_per_unit: Number(e.target.value) || 0 })}
                      className="w-20 h-8 text-center rounded-lg text-xs"
                    />
                    <span className="text-xs text-muted-foreground w-10">{ing?.unit || 'u'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={r.is_critical !== false}
                      onCheckedChange={val => handleUpdate(r, { is_critical: val })}
                    />
                    <span className="text-xs text-muted-foreground hidden sm:inline">crítico</span>
                  </div>
                  <button onClick={() => handleDelete(r)} className="text-destructive hover:bg-destructive/10 rounded-lg p-1.5 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add new row */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Agregar ingrediente</p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <Select value={newRow.ingredient_id} onValueChange={v => setNewRow(p => ({ ...p, ingredient_id: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona ingrediente..." /></SelectTrigger>
                <SelectContent>
                  {ingredients
                    .filter(i => !productRecipes.find(r => r.ingredient_id === i.id))
                    .map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.stock || 0} {i.unit})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Cantidad"
                value={newRow.quantity_per_unit}
                onChange={e => setNewRow(p => ({ ...p, quantity_per_unit: Number(e.target.value) || 0 }))}
                className="rounded-xl"
              />
            </div>
            <div className="sm:col-span-3">
              <Button onClick={handleAdd} disabled={adding || !newRow.ingredient_id} className="w-full rounded-xl bg-strawberry hover:bg-strawberry/90 text-white gap-1.5">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-muted/30">
        <h4 className="font-semibold text-sm mb-2">📚 Cómo funciona</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li><b>Cantidad/unidad:</b> cuánto se consume del ingrediente al vender 1 unidad del producto</li>
          <li><b>Crítico:</b> si está activo, el producto se deshabilita automáticamente cuando este ingrediente se agota</li>
          <li><b>Deducción automática:</b> al crear un pedido, el stock baja automáticamente según las recetas</li>
          <li><b>Notificación a cocina:</b> se envía un email cuando un producto queda sin stock</li>
        </ul>
      </Card>
    </div>
  );
}