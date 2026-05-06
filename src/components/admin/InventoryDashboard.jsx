import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Package, RefreshCw, Plus, Minus, BarChart2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Known ingredients with emoji icons
const INGREDIENT_ICONS = {
  fresas: '🍓',
  chocolate: '🍫',
  crema: '🥛',
  leche: '🥛',
  azucar: '🍬',
  vainilla: '🟡',
  nuez: '🥜',
  coco: '🥥',
  fresa: '🍓',
  default: '🥬',
};

function getIcon(name) {
  const key = name?.toLowerCase().replace(/\s/g, '');
  for (const k of Object.keys(INGREDIENT_ICONS)) {
    if (key?.includes(k)) return INGREDIENT_ICONS[k];
  }
  return INGREDIENT_ICONS.default;
}

export default function InventoryDashboard({ orders = [] }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    base44.entities.Ingredient.list().then(setIngredients).finally(() => setLoading(false));
  }, []);

  // Compute top used ingredients from orders
  const usageMap = useMemo(() => {
    const map = {};
    orders.filter(o => ['confirmed','preparing','on_the_way','delivered'].includes(o.status))
      .forEach(order => {
        (order.items || []).forEach(item => {
          const key = item.name?.toLowerCase() || '';
          if (key.includes('fresa') || key.includes('strawberry')) map['fresas'] = (map['fresas'] || 0) + (item.quantity || 1);
          if (key.includes('chocolate') || key.includes('choco')) map['chocolate'] = (map['chocolate'] || 0) + (item.quantity || 1);
          if (key.includes('crema') || key.includes('cream')) map['crema'] = (map['crema'] || 0) + (item.quantity || 1);
        });
      });
    return map;
  }, [orders]);

  const topUsed = Object.entries(usageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lowStock = ingredients.filter(i => (i.stock || 0) <= (i.low_stock_threshold || 5));
  const outOfStock = ingredients.filter(i => (i.stock || 0) === 0);

  const handleAdjust = async (ingredient, delta) => {
    const newStock = Math.max(0, (ingredient.stock || 0) + delta);
    setAdjusting(prev => ({ ...prev, [ingredient.id]: true }));
    await base44.entities.Ingredient.update(ingredient.id, { stock: newStock });
    setIngredients(prev => prev.map(i => i.id === ingredient.id ? { ...i, stock: newStock } : i));
    setAdjusting(prev => ({ ...prev, [ingredient.id]: false }));
  };

  const handleSendAlerts = async () => {
    if (lowStock.length === 0) { toast.info('No hay ingredientes en stock bajo'); return; }
    setSending(true);
    try {
      await base44.functions.invoke('sendStockAlert', { low_stock: lowStock.map(i => ({ name: i.name, stock: i.stock, threshold: i.low_stock_threshold })) });
      toast.success('¡Alertas de stock enviadas por email!');
    } catch {
      toast.error('Error enviando alertas');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Cargando inventario...</div>;

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {lowStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
                  {lowStock.length} ingrediente{lowStock.length > 1 ? 's' : ''} con stock bajo
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {lowStock.map(i => i.name).join(', ')}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSendAlerts}
              disabled={sending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 flex-shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              {sending ? 'Enviando...' : 'Enviar Alerta Email'}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Analytics */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-strawberry" />
            <h3 className="font-poppins font-bold">Más Usados en Pedidos</h3>
          </div>
          {topUsed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos de pedidos aún</p>
          ) : (
            <div className="space-y-3">
              {topUsed.map(([name, count], i) => (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span>{getIcon(name)}</span>
                      <span className="font-medium capitalize">{name}</span>
                    </span>
                    <span className="text-muted-foreground font-mono">{count} unidades</span>
                  </div>
                  <Progress
                    value={Math.min((count / (topUsed[0]?.[1] || 1)) * 100, 100)}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Summary */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-strawberry" />
            <h3 className="font-poppins font-bold">Resumen de Stock</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
              <p className="font-black text-2xl text-green-600">{ingredients.filter(i => i.stock > i.low_stock_threshold).length}</p>
              <p className="text-xs text-green-700 dark:text-green-300">Normal</p>
            </div>
            <div className="text-center bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <p className="font-black text-2xl text-amber-600">{lowStock.filter(i => i.stock > 0).length}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">Bajo</p>
            </div>
            <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="font-black text-2xl text-red-600">{outOfStock.length}</p>
              <p className="text-xs text-red-700 dark:text-red-300">Agotado</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
            <TrendingDown className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
            Los ingredientes agotados desactivan automáticamente los productos vinculados
          </div>
        </div>
      </div>

      {/* Ingredient List */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-poppins font-bold mb-4">Control de Stock en Tiempo Real</h3>
        {ingredients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay ingredientes. Añádelos en la pestaña 🥬 Inventario.
          </p>
        ) : (
          <div className="space-y-3">
            {ingredients.map(ing => {
              const pct = ing.low_stock_threshold > 0
                ? Math.min((ing.stock / (ing.low_stock_threshold * 3)) * 100, 100)
                : 100;
              const isLow = ing.stock <= ing.low_stock_threshold;
              const isOut = ing.stock === 0;
              return (
                <div key={ing.id} className={`flex items-center gap-4 p-3 rounded-xl border ${isOut ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : isLow ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' : 'border-border'}`}>
                  <span className="text-2xl">{getIcon(ing.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{ing.name}</p>
                      {isOut && <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Agotado</Badge>}
                      {isLow && !isOut && <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Stock Bajo</Badge>}
                    </div>
                    <Progress value={pct} className={`h-1.5 ${isOut ? '[&>div]:bg-red-500' : isLow ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`} />
                    <p className="text-xs text-muted-foreground mt-1">{ing.stock} {ing.unit} · mín. {ing.low_stock_threshold}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full"
                      onClick={() => handleAdjust(ing, -1)}
                      disabled={adjusting[ing.id]}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-10 text-center font-mono font-bold text-sm">{ing.stock}</span>
                    <Button
                      size="icon"
                      className="h-7 w-7 rounded-full bg-strawberry hover:bg-strawberry/90 text-white"
                      onClick={() => handleAdjust(ing, 1)}
                      disabled={adjusting[ing.id]}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}