import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Save, Trash2, Link2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function IngredientManager({ products }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [adding, setAdding] = useState(false);
  const [newIng, setNewIng] = useState({ name: '', unit: 'piezas', stock: 10, low_stock_threshold: 5, linked_product_ids: [] });

  useEffect(() => {
    base44.entities.Ingredient.list().then(setIngredients).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newIng.name.trim()) return;
    setSaving({ new: true });
    try {
      const created = await base44.entities.Ingredient.create(newIng);
      setIngredients(prev => [...prev, created]);
      setNewIng({ name: '', unit: 'piezas', stock: 10, low_stock_threshold: 5, linked_product_ids: [] });
      setAdding(false);
      toast.success('Ingrediente agregado');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving({});
    }
  };

  const handleUpdate = async (ing, changes) => {
    setSaving(s => ({ ...s, [ing.id]: true }));
    try {
      const updated = { ...ing, ...changes };
      await base44.entities.Ingredient.update(ing.id, changes);
      setIngredients(prev => prev.map(i => i.id === ing.id ? updated : i));

      // Auto-disable products if stock hits 0
      if (changes.stock !== undefined && changes.stock <= 0 && updated.linked_product_ids?.length > 0) {
        for (const pid of updated.linked_product_ids) {
          await base44.entities.Product.update(pid, { is_available: false });
        }
        toast.warning(`⚠️ ${ing.name} agotado — ${updated.linked_product_ids.length} producto(s) desactivados`);
      } else if (changes.stock !== undefined && changes.stock > 0 && updated.linked_product_ids?.length > 0) {
        // Re-enable if stock restocked
        for (const pid of updated.linked_product_ids) {
          await base44.entities.Product.update(pid, { is_available: true });
        }
        if (changes.stock > 0) toast.success(`✅ ${ing.name} reabastecido — productos reactivados`);
      }
    } catch (err) {
      toast.error('Error al actualizar');
    } finally {
      setSaving(s => ({ ...s, [ing.id]: false }));
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Ingredient.delete(id);
    setIngredients(prev => prev.filter(i => i.id !== id));
    toast.success('Ingrediente eliminado');
  };

  const toggleProductLink = async (ing, productId) => {
    const current = ing.linked_product_ids || [];
    const updated = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    await handleUpdate(ing, { linked_product_ids: updated });
  };

  const lowStockIngredients = ingredients.filter(i => i.stock <= i.low_stock_threshold && i.stock > 0);
  const outOfStock = ingredients.filter(i => i.stock <= 0);

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-strawberry mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {outOfStock.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-sm text-red-700 dark:text-red-400">Ingredientes Agotados</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfStock.map(i => (
              <Badge key={i.id} className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">{i.name} — 0 {i.unit}</Badge>
            ))}
          </div>
        </div>
      )}

      {lowStockIngredients.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">Stock Bajo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockIngredients.map(i => (
              <Badge key={i.id} className="bg-amber-100 text-amber-800">{i.name} — {i.stock} {i.unit}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient list */}
      <div className="space-y-3">
        {ingredients.map(ing => {
          const isLow = ing.stock > 0 && ing.stock <= ing.low_stock_threshold;
          const isOut = ing.stock <= 0;
          return (
            <div key={ing.id} className={`bg-card border rounded-2xl p-4 space-y-3 ${isOut ? 'border-red-200' : isLow ? 'border-amber-200' : 'border-border'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{ing.name}</p>
                    {isOut && <Badge className="text-xs bg-red-100 text-red-700">Agotado</Badge>}
                    {isLow && <Badge className="text-xs bg-amber-100 text-amber-700">Stock Bajo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo: {ing.low_stock_threshold} {ing.unit} · {ing.linked_product_ids?.length || 0} productos vinculados</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-lg text-xs"
                    onClick={() => handleUpdate(ing, { stock: Math.max(0, (ing.stock || 0) - 1) })}
                  >-</Button>
                  <input
                    type="number"
                    value={ing.stock || 0}
                    min="0"
                    className="w-16 text-center text-sm font-bold border border-border rounded-lg py-1 bg-background"
                    onChange={e => handleUpdate(ing, { stock: parseFloat(e.target.value) || 0 })}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-lg text-xs"
                    onClick={() => handleUpdate(ing, { stock: (ing.stock || 0) + 1 })}
                  >+</Button>
                  <span className="text-xs text-muted-foreground w-12">{ing.unit}</span>
                </div>

                <button onClick={() => handleDelete(ing.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Linked products */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Vincular productos (se desactivan cuando stock = 0):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(products || []).map(prod => {
                    const linked = (ing.linked_product_ids || []).includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        onClick={() => toggleProductLink(ing, prod.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          linked ? 'bg-strawberry text-white border-strawberry' : 'border-border text-muted-foreground hover:border-strawberry/50'
                        }`}
                      >
                        {prod.name_es}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new */}
      {adding ? (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm">Nuevo Ingrediente</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))} className="rounded-xl h-8 text-sm" placeholder="Ej: Fresas, Crema..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidad</Label>
              <Input value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))} className="rounded-xl h-8 text-sm" placeholder="kg, L, piezas..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stock Inicial</Label>
              <Input type="number" value={newIng.stock} onChange={e => setNewIng(p => ({ ...p, stock: parseFloat(e.target.value) || 0 }))} className="rounded-xl h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alerta de Stock Bajo</Label>
              <Input type="number" value={newIng.low_stock_threshold} onChange={e => setNewIng(p => ({ ...p, low_stock_threshold: parseFloat(e.target.value) || 0 }))} className="rounded-xl h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl" onClick={handleAdd} disabled={saving.new}>
              {saving.new ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full rounded-xl border-dashed border-strawberry text-strawberry hover:bg-strawberry/5" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-2" /> Agregar Ingrediente
        </Button>
      )}
    </div>
  );
}