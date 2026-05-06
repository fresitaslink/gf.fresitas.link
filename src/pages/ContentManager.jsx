import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, FileText, Tag, Settings, Image, Star, Package,
  Plus, Trash2, Edit2, Eye, EyeOff, Archive, RotateCcw, Save,
  Loader2, CheckCircle2, Search, Filter, ChevronDown, ChevronUp,
  Crown, Globe, Palette, BookOpen, Gift, Zap, Users, BarChart2, X, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CATEGORY_OPTIONS = [
  { value: 'fresitas_crema', label: '🍓 Fresitas con Crema' },
  { value: 'chocolate', label: '🍫 Chocolate' },
  { value: 'combinados', label: '🎭 Combinados' },
  { value: 'especiales', label: '⭐ Especiales' },
  { value: 'bebidas', label: '🥤 Bebidas' },
  { value: 'temporada', label: '🌸 Temporada' },
];

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

// Reusable search + filter bar
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pl-9 rounded-xl" />
    </div>
  );
}

// Product Manager
function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await base44.entities.Product.list('-created_date', 200);
    setProducts(data);
    setLoading(false);
  };

  const blankProduct = () => ({
    name_es: '', price: 0, category: 'fresitas_crema',
    description_es: '', image_url: '', is_available: true, is_featured: false, is_new: false,
    badge: '', sort_order: 0,
  });

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({ ...product });
    setIsCreating(false);
  };

  const startCreate = () => {
    setForm(blankProduct());
    setEditingId('new');
    setIsCreating(true);
  };

  const cancelEdit = () => { setEditingId(null); setForm({}); setIsCreating(false); };

  const handleSave = async () => {
    if (!form.name_es || !form.price) { toast.error('Nombre y precio son requeridos'); return; }
    setSaving(true);
    try {
      if (isCreating) {
        const created = await base44.entities.Product.create(form);
        setProducts(prev => [created, ...prev]);
        toast.success('Producto creado ✅');
      } else {
        await base44.entities.Product.update(editingId, form);
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...form } : p));
        toast.success('Producto actualizado ✅');
      }
      cancelEdit();
    } finally { setSaving(false); }
  };

  const toggleAvailable = async (product) => {
    await base44.entities.Product.update(product.id, { is_available: !product.is_available });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
    toast.success(`Producto ${product.is_available ? 'ocultado' : 'publicado'}`);
  };

  const toggleFeatured = async (product) => {
    await base44.entities.Product.update(product.id, { is_featured: !product.is_featured });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: !p.is_featured } : p));
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name_es}"?`)) return;
    await base44.entities.Product.delete(product.id);
    setProducts(prev => prev.filter(p => p.id !== product.id));
    toast.success('Producto eliminado');
  };

  const filtered = products.filter(p =>
    p.name_es?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const ProductForm = () => (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted rounded-2xl p-5 mb-4 border-2 border-strawberry/30">
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-strawberry" />
        {isCreating ? 'Nuevo Producto' : `Editando: ${form.name_es}`}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre (ES) *</Label>
          <Input value={form.name_es || ''} onChange={e => setForm(p => ({ ...p, name_es: e.target.value }))} className="rounded-xl text-sm" placeholder="Fresitas con Crema" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nombre (EN)</Label>
          <Input value={form.name_en || ''} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} className="rounded-xl text-sm" placeholder="Strawberries with Cream" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Precio ($) *</Label>
          <Input type="number" value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) }))} className="rounded-xl text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Categoría</Label>
          <Select value={form.category || 'fresitas_crema'} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Descripción (ES)</Label>
          <Textarea value={form.description_es || ''} onChange={e => setForm(p => ({ ...p, description_es: e.target.value }))} className="rounded-xl text-sm" rows={2} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">URL Imagen</Label>
          <Input value={form.image_url || ''} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} className="rounded-xl text-sm" placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Badge (ej: Más Vendido)</Label>
          <Input value={form.badge || ''} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} className="rounded-xl text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Orden de Aparición</Label>
          <Input type="number" value={form.sort_order || 0} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) }))} className="rounded-xl text-sm" />
        </div>
        <div className="flex items-center gap-6 sm:col-span-2 flex-wrap">
          {[
            { key: 'is_available', label: 'Disponible' },
            { key: 'is_featured', label: 'Destacado' },
            { key: 'is_new', label: 'Nuevo' },
          ].map(field => (
            <div key={field.key} className="flex items-center gap-2">
              <Switch checked={!!form[field.key]} onCheckedChange={v => setForm(p => ({ ...p, [field.key]: v }))} />
              <Label className="text-xs">{field.label}</Label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={handleSave} disabled={saving} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {isCreating ? 'Crear' : 'Guardar'}
        </Button>
        <Button variant="outline" onClick={cancelEdit} className="rounded-xl"><X className="w-4 h-4" /></Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar productos..." />
        <Button onClick={startCreate} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </Button>
      </div>

      {(editingId === 'new') && <ProductForm />}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} productos</p>
          {filtered.map(p => (
            <div key={p.id}>
              {editingId === p.id && <ProductForm />}
              <div className={`flex items-center gap-3 p-3 bg-card border rounded-xl transition-all ${editingId === p.id ? 'hidden' : ''}`}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name_es} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-strawberry/10 flex items-center justify-center flex-shrink-0 text-xl">🍓</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{p.name_es}</p>
                    {p.is_featured && <Badge className="text-xs bg-gold/20 text-amber-700">⭐ Destacado</Badge>}
                    {p.is_new && <Badge className="text-xs bg-blue-100 text-blue-700">🆕 Nuevo</Badge>}
                    {!p.is_available && <Badge className="text-xs bg-red-100 text-red-700">👁️ Oculto</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.category} · ${p.price}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleAvailable(p)} title={p.is_available ? 'Ocultar' : 'Publicar'} className={`p-1.5 rounded-lg transition-colors ${p.is_available ? 'text-green-600 hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'}`}>
                    {p.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleFeatured(p)} title="Destacar" className={`p-1.5 rounded-lg transition-colors ${p.is_featured ? 'text-gold' : 'text-muted-foreground hover:bg-muted'}`}>
                    <Star className="w-4 h-4" />
                  </button>
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Blog Manager
function BlogManager() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadPosts(); }, []);
  const loadPosts = async () => {
    setLoading(true);
    const data = await base44.entities.BlogPost.list('-created_date', 100);
    setPosts(data);
    setLoading(false);
  };

  const blankPost = () => ({ title_es: '', content_es: '', excerpt_es: '', category: 'tips', is_published: false, author_name: '', cover_image: '' });

  const handleSave = async () => {
    if (!form.title_es || !form.content_es) { toast.error('Título y contenido son requeridos'); return; }
    setSaving(true);
    try {
      const dataToSave = { ...form };
      if (!dataToSave.slug) {
        dataToSave.slug = form.title_es.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      if (form.is_published && !dataToSave.published_at) {
        dataToSave.published_at = new Date().toISOString().split('T')[0];
      }
      if (!form.is_published) {
        dataToSave.published_at = null;
      }
      if (editingId === 'new') {
        const created = await base44.entities.BlogPost.create(dataToSave);
        setPosts(prev => [created, ...prev]);
        toast.success('Post creado y ' + (form.is_published ? 'publicado' : 'guardado como borrador'));
      } else {
        await base44.entities.BlogPost.update(editingId, dataToSave);
        setPosts(prev => prev.map(p => p.id === editingId ? { ...p, ...dataToSave } : p));
        toast.success('Post actualizado' + (form.is_published ? ' y publicado' : ''));
      }
      setEditingId(null); setForm({});
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally { setSaving(false); }
  };

  const handlePublishToggle = async (post) => {
    try {
      const update = { 
        is_published: !post.is_published, 
        published_at: !post.is_published ? new Date().toISOString().split('T')[0] : null 
      };
      await base44.entities.BlogPost.update(post.id, update);
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...update } : p));
      toast.success(!post.is_published ? 'Post publicado en vivo' : 'Guardado como borrador');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`¿Eliminar "${post.title_es}"?`)) return;
    await base44.entities.BlogPost.delete(post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
    toast.success('Post eliminado');
  };

  const filtered = posts.filter(p => p.title_es?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar posts..." />
        <Button onClick={() => { setForm(blankPost()); setEditingId('new'); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Nuevo Post
        </Button>
      </div>

      {editingId && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted rounded-2xl p-5 border-2 border-strawberry/30 space-y-3">
          <h4 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-strawberry" />{editingId === 'new' ? 'Nuevo Post' : 'Editando Post'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Título (ES) *</Label><Input value={form.title_es || ''} onChange={e => setForm(p => ({ ...p, title_es: e.target.value }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Extracto</Label><Textarea value={form.excerpt_es || ''} onChange={e => setForm(p => ({ ...p, excerpt_es: e.target.value }))} className="rounded-xl text-sm" rows={2} /></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Contenido (Markdown)</Label><Textarea value={form.content_es || ''} onChange={e => setForm(p => ({ ...p, content_es: e.target.value }))} className="rounded-xl text-sm" rows={6} /></div>
            <div className="space-y-1"><Label className="text-xs">Categoría</Label>
              <Select value={form.category || 'tips'} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['recetas','tips','noticias','temporada','maridajes'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Autor</Label><Input value={form.author_name || ''} onChange={e => setForm(p => ({ ...p, author_name: e.target.value }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">URL Imagen de Portada</Label><Input value={form.cover_image || ''} onChange={e => setForm(p => ({ ...p, cover_image: e.target.value }))} className="rounded-xl text-sm" placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.is_published} onCheckedChange={v => setForm(p => ({ ...p, is_published: v }))} /><Label className="text-xs">Publicado</Label></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl"><Save className="w-4 h-4 mr-1" />{editingId === 'new' ? 'Crear' : 'Guardar'}</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setForm({}); }} className="rounded-xl"><X className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {filtered.map(post => (
            <div key={post.id} className="flex items-center gap-3 p-3 bg-card border rounded-xl">
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title_es} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{post.title_es}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`text-xs ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                     {post.is_published ? 'Publicado' : 'Borrador'}
                   </Badge>
                  <span className="text-xs text-muted-foreground">{post.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handlePublishToggle(post)} title={post.is_published ? 'Archivar' : 'Publicar'} className={`p-1.5 rounded-lg transition-colors ${post.is_published ? 'text-green-600 hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'}`}>
                  {post.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditingId(post.id); setForm({ ...post }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(post)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay posts</p>}
        </div>
      )}
    </div>
  );
}

// Rewards Manager
function RewardsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [redemptions, setRedemptions] = useState([]);

  useEffect(() => { loadAll(); }, []);
  const loadAll = async () => {
    setLoading(true);
    const [its, reds] = await Promise.all([
      base44.entities.RewardItem.list('-created_date', 100),
      base44.entities.RewardRedemption.list('-created_date', 50),
    ]);
    setItems(its);
    setRedemptions(reds);
    setLoading(false);
  };

  const blankItem = () => ({ name_es: '', description_es: '', points_cost: 100, stock: 10, category: 'producto', is_active: true, image_url: '' });

  const handleSave = async () => {
    if (!form.name_es || !form.points_cost) { toast.error('Nombre y puntos requeridos'); return; }
    setSaving(true);
    try {
      if (editingId === 'new') {
        const created = await base44.entities.RewardItem.create(form);
        setItems(prev => [created, ...prev]);
        toast.success('Premio creado');
      } else {
        await base44.entities.RewardItem.update(editingId, form);
        setItems(prev => prev.map(r => r.id === editingId ? { ...r, ...form } : r));
        toast.success('Premio actualizado');
      }
      setEditingId(null); setForm({});
    } finally { setSaving(false); }
  };

  const handleUpdateRedemptionStatus = async (red, newStatus) => {
    await base44.entities.RewardRedemption.update(red.id, { status: newStatus });
    setRedemptions(prev => prev.map(r => r.id === red.id ? { ...r, status: newStatus } : r));
    if (red.user_email) {
      base44.entities.Notification.create({
        user_email: red.user_email,
        title_es: newStatus === 'delivered' ? '¡Tu premio fue entregado!' : 'Tu premio está en proceso',
        title_en: newStatus === 'delivered' ? 'Your reward was delivered!' : 'Your reward is being processed',
        message_es: `Tu canje de "${red.reward_name}" está ${newStatus === 'delivered' ? 'entregado' : 'en proceso'}. ¡Gracias!`,
        message_en: `Your "${red.reward_name}" redemption is ${newStatus}.`,
        type: 'loyalty',
      }).catch(() => {});
    }
    toast.success('Estado actualizado');
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Button onClick={() => { setForm(blankItem()); setEditingId('new'); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Nuevo Premio
        </Button>
      </div>

      {editingId && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted rounded-2xl p-5 border-2 border-strawberry/30 space-y-3">
          <h4 className="font-semibold flex items-center gap-2"><Gift className="w-4 h-4 text-strawberry" />{editingId === 'new' ? 'Nuevo Premio' : 'Editando Premio'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Nombre *</Label><Input value={form.name_es || ''} onChange={e => setForm(p => ({ ...p, name_es: e.target.value }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Puntos Costo *</Label><Input type="number" value={form.points_cost || ''} onChange={e => setForm(p => ({ ...p, points_cost: parseInt(e.target.value) }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Descripción</Label><Textarea value={form.description_es || ''} onChange={e => setForm(p => ({ ...p, description_es: e.target.value }))} className="rounded-xl text-sm" rows={2} /></div>
            <div className="space-y-1"><Label className="text-xs">Stock</Label><Input type="number" value={form.stock || ''} onChange={e => setForm(p => ({ ...p, stock: parseInt(e.target.value) }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Categoría</Label>
              <Select value={form.category || 'producto'} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="producto">Producto</SelectItem>
                  <SelectItem value="descuento">Descuento</SelectItem>
                  <SelectItem value="experiencia">Experiencia</SelectItem>
                  <SelectItem value="merch">Merch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">URL Imagen</Label><Input value={form.image_url || ''} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} className="rounded-xl text-sm" placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><Label className="text-xs">Activo</Label></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl"><Save className="w-4 h-4 mr-1" />{editingId === 'new' ? 'Crear' : 'Guardar'}</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setForm({}); }} className="rounded-xl"><X className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Premios ({items.length})</h4>
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-card border rounded-xl">
              <div className="w-10 h-10 bg-strawberry/10 rounded-xl flex items-center justify-center flex-shrink-0">
                {item.category === 'producto' ? <span className="text-lg">🍓</span> : item.category === 'descuento' ? <Tag className="w-5 h-5 text-amber-600" /> : item.category === 'experiencia' ? <Star className="w-5 h-5 text-purple-600" /> : <ShoppingBag className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.name_es}</p>
                <p className="text-xs text-muted-foreground">{item.points_cost} pts · stock: {item.stock}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {!item.is_active && <Badge className="text-xs bg-red-100 text-red-600">Inactivo</Badge>}
                <button onClick={() => { setEditingId(item.id); setForm({ ...item }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><Edit2 className="w-4 h-4" /></button>
                <button onClick={async () => { await base44.entities.RewardItem.delete(item.id); setItems(prev => prev.filter(r => r.id !== item.id)); toast.success('Eliminado'); }} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {redemptions.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-sm mb-3">Solicitudes de Canje ({redemptions.length})</h4>
              <div className="space-y-2">
                {redemptions.map(red => (
                  <div key={red.id} className="flex items-center gap-3 p-3 bg-card border rounded-xl">
                    <Gift className="w-8 h-8 text-strawberry flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{red.reward_name}</p>
                      <p className="text-xs text-muted-foreground">{red.user_email} · {red.points_spent} pts</p>
                      {red.delivery_address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {red.delivery_address}</p>}
                    </div>
                    <Select value={red.status} onValueChange={(v) => handleUpdateRedemptionStatus(red, v)}>
                      <SelectTrigger className="w-32 rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="processing">Procesando</SelectItem>
                          <SelectItem value="delivered">Entregado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Challenges Manager
function ChallengesManager() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadChallenges(); }, []);
  const loadChallenges = async () => {
    setLoading(true);
    const data = await base44.entities.DailyChallenge.list('-created_date', 50);
    setChallenges(data);
    setLoading(false);
  };

  const blank = () => ({ title_es: '', description_es: '', icon: '🍓', points_reward: 50, challenge_type: 'order_before_time', condition_value: '14:00', active_date: new Date().toISOString().split('T')[0], is_active: true });

  const handleSave = async () => {
    if (!form.title_es) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      if (editingId === 'new') {
        const created = await base44.entities.DailyChallenge.create(form);
        setChallenges(prev => [created, ...prev]);
        toast.success('Desafío creado');
      } else {
        await base44.entities.DailyChallenge.update(editingId, form);
        setChallenges(prev => prev.map(c => c.id === editingId ? { ...c, ...form } : c));
        toast.success('Desafío actualizado');
      }
      setEditingId(null); setForm({});
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => { setForm(blank()); setEditingId('new'); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2">
        <Plus className="w-4 h-4" /> Nuevo Desafío
      </Button>

      {editingId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-muted rounded-2xl p-5 border-2 border-strawberry/30 space-y-3">
          <h4 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> {editingId === 'new' ? 'Nuevo Desafío' : 'Editando Desafío'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Título *</Label><Input value={form.title_es || ''} onChange={e => setForm(p => ({ ...p, title_es: e.target.value }))} className="rounded-xl text-sm" placeholder="Haz un pedido con fresas y chocolate antes de las 2pm" /></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Descripción</Label><Textarea value={form.description_es || ''} onChange={e => setForm(p => ({ ...p, description_es: e.target.value }))} className="rounded-xl text-sm" rows={2} /></div>
            <div className="space-y-1"><Label className="text-xs">Tipo</Label>
              <Select value={form.challenge_type || 'order_before_time'} onValueChange={v => setForm(p => ({ ...p, challenge_type: v }))}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_before_time">Pedir antes de hora</SelectItem>
                  <SelectItem value="order_product">Pedir producto específico</SelectItem>
                  <SelectItem value="order_amount">Gastar monto mínimo</SelectItem>
                  <SelectItem value="referral">Referir amigo</SelectItem>
                  <SelectItem value="review">Dejar reseña</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Valor Condición (hora, producto, monto)</Label><Input value={form.condition_value || ''} onChange={e => setForm(p => ({ ...p, condition_value: e.target.value }))} className="rounded-xl text-sm" placeholder="14:00 / Chocolate / $200" /></div>
            <div className="space-y-1"><Label className="text-xs">Puntos de Recompensa</Label><Input type="number" value={form.points_reward || 50} onChange={e => setForm(p => ({ ...p, points_reward: parseInt(e.target.value) }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Fecha Activa</Label><Input type="date" value={form.active_date || ''} onChange={e => setForm(p => ({ ...p, active_date: e.target.value }))} className="rounded-xl text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Ícono (emoji)</Label><Input value={form.icon || '🍓'} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} className="rounded-xl text-sm w-20" /></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><Label className="text-xs">Activo</Label></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl"><Save className="w-4 h-4 mr-1" />{editingId === 'new' ? 'Crear' : 'Guardar'}</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setForm({}); }} className="rounded-xl"><X className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {challenges.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-card border rounded-xl">
              <div className="w-10 h-10 bg-strawberry/10 rounded-xl flex items-center justify-center flex-shrink-0"><Zap className="w-5 h-5 text-amber-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{c.title_es}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">+{c.points_reward} pts</span>
                  {c.active_date && <span className="text-xs text-muted-foreground">· {c.active_date}</span>}
                  <Badge className={`text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={async () => { await base44.entities.DailyChallenge.update(c.id, { is_active: !c.is_active }); setChallenges(prev => prev.map(ch => ch.id === c.id ? { ...ch, is_active: !ch.is_active } : ch)); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><Switch checked={!!c.is_active} /></button>
                <button onClick={() => { setEditingId(c.id); setForm({ ...c }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><Edit2 className="w-4 h-4" /></button>
                <button onClick={async () => { await base44.entities.DailyChallenge.delete(c.id); setChallenges(prev => prev.filter(ch => ch.id !== c.id)); toast.success('Eliminado'); }} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {challenges.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay desafíos</p>}
        </div>
      )}
    </div>
  );
}

// Main Component
export default function ContentManager() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) navigate('/');
  }, [user]);

  if (!user || !['admin', 'owner', 'manager'].includes(user.role)) return null;

  const tabs = [
    { value: 'products', label: 'Productos', icon: ShoppingBag },
    { value: 'blog', label: 'Blog', icon: FileText },
    { value: 'rewards', label: 'Premios', icon: Gift },
    { value: 'challenges', label: 'Desafíos', icon: Zap },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-3 py-8">
            <div className="w-10 h-10 bg-strawberry/10 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-strawberry" />
            </div>
            <div>
              <h1 className="font-poppins font-black text-2xl">Gestor de Contenido</h1>
              <p className="text-muted-foreground text-sm">Administra todo el contenido de la tienda</p>
            </div>
          </div>

          <Tabs defaultValue="products">
            <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
              {tabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="rounded-lg text-xs flex items-center gap-1.5 flex-1">
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="bg-card rounded-2xl border border-border p-6">
              <TabsContent value="products"><ProductManager /></TabsContent>
              <TabsContent value="blog"><BlogManager /></TabsContent>
              <TabsContent value="rewards"><RewardsManager /></TabsContent>
              <TabsContent value="challenges"><ChallengesManager /></TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}