import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, ShoppingBag, FileText, Tag, Settings, Image, Star,
  Package, Plus, Trash2, Edit2, Eye, EyeOff, Archive, RotateCcw,
  Save, Loader2, Search, X, Globe, Gift, Zap, Users, Shield,
  Palette, Mail, Bell, Map, BarChart2, Camera, Type, Layout,
  Lock, Unlock, CheckCircle2, AlertTriangle, Download, Upload,
  BookOpen, Heart, Receipt, Award, RefreshCw, ExternalLink,
  ToggleLeft, ToggleRight, Phone, DollarSign, Clock, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

// ─── Sidebar Sections ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'products',     label: 'Productos',        icon: ShoppingBag,  group: 'Catálogo' },
  { id: 'blog',         label: 'Blog Posts',        icon: FileText,     group: 'Catálogo' },
  { id: 'promos',       label: 'Cupones & Ofertas', icon: Tag,          group: 'Catálogo' },
  { id: 'reviews',      label: 'Reseñas',           icon: Star,         group: 'Catálogo' },
  { id: 'rewards',      label: 'Premios',           icon: Gift,         group: 'Catálogo' },
  { id: 'challenges',   label: 'Desafíos',          icon: Zap,          group: 'Catálogo' },
  { id: 'subscriptions',label: 'Suscripciones',     icon: Package,      group: 'Clientes' },
  { id: 'users',        label: 'Usuarios & Roles',  icon: Users,        group: 'Clientes' },
  { id: 'permissions',  label: 'Permisos Managers', icon: Shield,       group: 'Clientes' },
  { id: 'settings',     label: 'Config Tienda',     icon: Settings,     group: 'Sistema' },
  { id: 'branding',     label: 'Colores & Logo',    icon: Palette,      group: 'Sistema' },
  { id: 'emails',       label: 'Emails & Notif.',   icon: Mail,         group: 'Sistema' },
  { id: 'receipts',     label: 'Recibos & Canjes',  icon: Receipt,      group: 'Sistema' },
  { id: 'gallery',      label: 'Galería Imágenes',  icon: Camera,       group: 'Sistema' },
];

const PERM_LABELS = {
  can_manage_orders: 'Gestionar Pedidos',
  can_manage_products: 'Gestionar Productos',
  can_view_analytics: 'Ver Analytics',
  can_manage_settings: 'Cambiar Configuración',
  can_manage_promos: 'Gestionar Cupones',
  can_chat_customers: 'Chat con Clientes',
  can_reply_reviews: 'Responder Reseñas',
  can_export_data: 'Exportar Datos',
  can_manage_users: 'Gestionar Usuarios',
};

const CATEGORY_OPTIONS = [
  { value: 'fresitas_crema', label: 'Fresitas con Crema' },
  { value: 'chocolate',      label: 'Chocolate' },
  { value: 'combinados',     label: 'Combinados' },
  { value: 'especiales',     label: 'Especiales' },
  { value: 'bebidas',        label: 'Bebidas' },
  { value: 'temporada',      label: 'Temporada' },
];

// ─── Inline edit form helper ─────────────────────────────────────────────────
function FormRow({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function InlineForm({ title, fields, values, onChange, onSave, onCancel, saving, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-muted border-2 border-strawberry/30 rounded-2xl p-5 mb-3 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-strawberry" />}
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(f => (
          <FormRow key={f.key} label={f.label}>
            {f.type === 'textarea' ? (
              <Textarea rows={3} value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} className="rounded-xl text-sm" placeholder={f.placeholder} />
            ) : f.type === 'select' ? (
              <Select value={values[f.key] || f.options[0]?.value} onValueChange={v => onChange(f.key, v)}>
                <SelectTrigger className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.type === 'toggle' ? (
              <div className="flex items-center gap-2 mt-1">
                <Switch checked={!!values[f.key]} onCheckedChange={v => onChange(f.key, v)} />
                <span className="text-xs text-muted-foreground">{values[f.key] ? 'Sí' : 'No'}</span>
              </div>
            ) : f.type === 'number' ? (
              <Input type="number" value={values[f.key] ?? ''} onChange={e => onChange(f.key, parseFloat(e.target.value) || 0)} className="rounded-xl text-sm" placeholder={f.placeholder} />
            ) : (
              <Input value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} className={`rounded-xl text-sm ${f.mono ? 'font-mono' : ''}`} placeholder={f.placeholder} />
            )}
          </FormRow>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={onSave} disabled={saving} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl"><X className="w-4 h-4" /></Button>
      </div>
    </motion.div>
  );
}

// ─── Record Row ──────────────────────────────────────────────────────────────
function RecordRow({ thumb, title, sub, status, badges = [], onEdit, onDelete, onToggle, toggleValue, toggleLabel, extraActions = [], archived }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${archived ? 'opacity-50 bg-muted border-border' : 'bg-card border-border hover:border-strawberry/30'}`}>
      {thumb && (
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted flex-shrink-0">
          {typeof thumb === 'string' && thumb.startsWith('http') ?
            <img src={thumb} alt={title} className="w-full h-full object-cover" /> :
            <div className="w-full h-full flex items-center justify-center text-lg">{thumb}</div>}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        {badges.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-0.5">
            {badges.map((b, i) => <Badge key={i} className={`text-xs ${b.cls}`}>{b.label}</Badge>)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onToggle && (
          <div className="flex items-center gap-1 mr-1">
            <Switch checked={!!toggleValue} onCheckedChange={onToggle} />
            {toggleLabel && <span className="text-xs text-muted-foreground hidden sm:block">{toggleValue ? toggleLabel[0] : toggleLabel[1]}</span>}
          </div>
        )}
        {extraActions.map((a, i) => (
          <button key={i} onClick={a.action} title={a.label} className={`p-1.5 rounded-lg transition-colors ${a.cls || 'text-muted-foreground hover:bg-muted'}`}>
            <a.icon className="w-3.5 h-3.5" />
          </button>
        ))}
        {onEdit && (
          <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section Loaders ─────────────────────────────────────────────────────────
function useEntityCRUD(entityName, sort = '-created_date', limit = 200) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const data = await base44.entities[entityName].list(sort, limit);
    setItems(data); setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  const create = async (data) => { const r = await base44.entities[entityName].create(data); setItems(p => [r, ...p]); return r; };
  const update = async (id, data) => { await base44.entities[entityName].update(id, data); setItems(p => p.map(i => i.id === id ? { ...i, ...data } : i)); };
  const remove = async (id) => { await base44.entities[entityName].delete(id); setItems(p => p.filter(i => i.id !== id)); };
  return { items, loading, reload, create, update, remove, setItems };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Products
// ═══════════════════════════════════════════════════════════════════════════════
function ProductsSection() {
  const { items, loading, create, update, remove } = useEntityCRUD('Product');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const blank = () => ({ name_es: '', name_en: '', price: 0, category: 'fresitas_crema', description_es: '', image_url: '', is_available: true, is_featured: false, is_new: false, badge: '', sort_order: 0 });

  const startEdit = (item) => { setEditing(item?.id || 'new'); setForm(item ? { ...item } : blank()); };
  const cancel = () => { setEditing(null); setForm({}); };
  const change = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name_es || !form.price) { toast.error('Nombre y precio requeridos'); return; }
    setSaving(true);
    try {
      if (editing === 'new') { await create(form); toast.success('Producto creado ✅'); }
      else { await update(editing, form); toast.success('Producto guardado ✅'); }
      cancel();
    } finally { setSaving(false); }
  };

  const filtered = items.filter(p => {
    const matchSearch = p.name_es?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'available' && p.is_available) || (filter === 'hidden' && !p.is_available) || (filter === 'featured' && p.is_featured);
    return matchSearch && matchFilter;
  });

  const PRODUCT_FIELDS = [
    { key: 'name_es', label: 'Nombre (ES) *', placeholder: 'Fresitas con Crema' },
    { key: 'name_en', label: 'Name (EN)', placeholder: 'Strawberries with Cream' },
    { key: 'price', label: 'Precio ($) *', type: 'number', placeholder: '25' },
    { key: 'category', label: 'Categoría', type: 'select', options: CATEGORY_OPTIONS },
    { key: 'description_es', label: 'Descripción (ES)', type: 'textarea', placeholder: 'Descripción del producto...' },
    { key: 'image_url', label: 'URL Imagen', placeholder: 'https://...' },
    { key: 'badge', label: 'Badge (Más Vendido, Nuevo…)', placeholder: 'Más Vendido' },
    { key: 'sort_order', label: 'Orden', type: 'number', placeholder: '0' },
    { key: 'is_available', label: 'Disponible / Activo', type: 'toggle' },
    { key: 'is_featured', label: 'Destacado en Inicio', type: 'toggle' },
    { key: 'is_new', label: 'Marcar como Nuevo', type: 'toggle' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar productos..." className="pl-9 rounded-xl" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponibles</SelectItem>
            <SelectItem value="hidden">Ocultos</SelectItem>
            <SelectItem value="featured">Destacados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => startEdit(null)} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5 flex-shrink-0">
          <Plus className="w-4 h-4" /> Nuevo
        </Button>
      </div>

      {editing === 'new' && (
        <InlineForm title="Nuevo Producto" icon={ShoppingBag} fields={PRODUCT_FIELDS} values={form} onChange={change} onSave={save} onCancel={cancel} saving={saving} />
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} productos</p>
          {filtered.map(p => (
            <div key={p.id}>
              {editing === p.id && (
                <InlineForm title={`Editando: ${p.name_es}`} icon={ShoppingBag} fields={PRODUCT_FIELDS} values={form} onChange={change} onSave={save} onCancel={cancel} saving={saving} />
              )}
              {editing !== p.id && (
                <RecordRow
                  thumb={p.image_url || '🍓'}
                  title={p.name_es}
                  sub={`$${p.price} · ${p.category}`}
                  badges={[
                    ...(p.is_featured ? [{ label: '⭐ Destacado', cls: 'bg-gold/20 text-amber-700' }] : []),
                    ...(p.is_new ? [{ label: '🆕 Nuevo', cls: 'bg-blue-100 text-blue-700' }] : []),
                    ...(!p.is_available ? [{ label: '👁️ Oculto', cls: 'bg-red-100 text-red-700' }] : []),
                  ]}
                  onToggle={(v) => update(p.id, { is_available: v }).then(() => toast.success(v ? 'Publicado' : 'Oculto'))}
                  toggleValue={p.is_available !== false}
                  toggleLabel={['Visible', 'Oculto']}
                  extraActions={[
                    { icon: p.is_featured ? Star : Star, label: 'Destacar', cls: p.is_featured ? 'text-gold' : 'text-muted-foreground hover:bg-muted', action: () => update(p.id, { is_featured: !p.is_featured }) },
                  ]}
                  onEdit={() => startEdit(p)}
                  onDelete={() => { if (window.confirm(`¿Eliminar "${p.name_es}"?`)) remove(p.id).then(() => toast.success('Eliminado')); }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Blog Posts
// ═══════════════════════════════════════════════════════════════════════════════
function BlogSection() {
  const { items, loading, create, update, remove } = useEntityCRUD('BlogPost');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const change = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const BLOG_FIELDS = [
    { key: 'title_es', label: 'Título (ES) *', placeholder: 'Receta de Fresitas...' },
    { key: 'title_en', label: 'Title (EN)', placeholder: 'Strawberry Recipe...' },
    { key: 'excerpt_es', label: 'Extracto corto', type: 'textarea', placeholder: 'Descripción breve...' },
    { key: 'content_es', label: 'Contenido completo (Markdown)', type: 'textarea', placeholder: '## Titulo\n\nContenido...' },
    { key: 'category', label: 'Categoría', type: 'select', options: ['recetas','tips','noticias','temporada','maridajes'].map(c => ({ value: c, label: c })) },
    { key: 'author_name', label: 'Autor', placeholder: 'Fresitas G&F' },
    { key: 'cover_image', label: 'URL Imagen Portada', placeholder: 'https://...' },
    { key: 'read_time_minutes', label: 'Tiempo de lectura (min)', type: 'number', placeholder: '3' },
    { key: 'is_published', label: 'Publicado (visible en blog)', type: 'toggle' },
  ];

  const save = async () => {
    if (!form.title_es) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      const slug = (form.title_es || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 60);
      if (editing === 'new') {
        await create({ ...form, slug, published_at: form.is_published ? new Date().toISOString().split('T')[0] : null });
        toast.success('Post creado ✅');
      } else {
        await update(editing, { ...form, published_at: form.is_published ? (form.published_at || new Date().toISOString().split('T')[0]) : null });
        toast.success('Post guardado ✅');
      }
      setEditing(null); setForm({});
    } finally { setSaving(false); }
  };

  const filtered = filter === 'all' ? items : filter === 'published' ? items.filter(p => p.is_published) : items.filter(p => !p.is_published);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({items.length})</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditing('new'); setForm({ is_published: false, category: 'tips', read_time_minutes: 3 }); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5 ml-auto">
          <Plus className="w-4 h-4" /> Nuevo Post
        </Button>
      </div>

      {editing === 'new' && (
        <InlineForm title="Nuevo Post" icon={FileText} fields={BLOG_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {filtered.map(post => (
            <div key={post.id}>
              {editing === post.id && (
                <InlineForm title={`Editando: ${post.title_es}`} icon={FileText} fields={BLOG_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
              )}
              {editing !== post.id && (
                <RecordRow
                  thumb={post.cover_image || '📝'}
                  title={post.title_es}
                  sub={`${post.category} · ${post.author_name || 'Sin autor'} · ${post.read_time_minutes || 3} min`}
                  badges={[
                    { label: post.is_published ? '✅ Publicado' : '📝 Borrador', cls: post.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600' },
                  ]}
                  onToggle={async (v) => {
                    await update(post.id, { is_published: v, published_at: v ? new Date().toISOString().split('T')[0] : null });
                    toast.success(v ? '📢 Publicado' : '📝 Borrador');
                  }}
                  toggleValue={post.is_published}
                  toggleLabel={['Publicado', 'Borrador']}
                  onEdit={() => { setEditing(post.id); setForm({ ...post }); }}
                  onDelete={() => { if (window.confirm(`¿Eliminar "${post.title_es}"?`)) remove(post.id).then(() => toast.success('Post eliminado')); }}
                />
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay posts</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Promo Codes
// ═══════════════════════════════════════════════════════════════════════════════
function PromosSection() {
  const { items, loading, create, update, remove } = useEntityCRUD('PromoCode', '-created_date', 200);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const change = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const PROMO_FIELDS = [
    { key: 'code', label: 'Código *', placeholder: 'FRESITAS20', mono: true },
    { key: 'discount_type', label: 'Tipo', type: 'select', options: [{ value: 'percent', label: 'Porcentaje (%)' }, { value: 'fixed', label: 'Monto Fijo ($)' }] },
    { key: 'discount_value', label: 'Valor *', type: 'number', placeholder: '20' },
    { key: 'min_order', label: 'Pedido Mínimo ($)', type: 'number', placeholder: '0' },
    { key: 'max_uses', label: 'Usos Máximos (vacío = ∞)', type: 'number', placeholder: '100' },
    { key: 'valid_until', label: 'Válido Hasta', type: 'text', placeholder: 'YYYY-MM-DD' },
    { key: 'description_es', label: 'Descripción interna', placeholder: 'Cupón de apertura...' },
    { key: 'is_active', label: 'Activo / Habilitado', type: 'toggle' },
  ];

  const save = async () => {
    if (!form.code || !form.discount_value) { toast.error('Código y descuento requeridos'); return; }
    setSaving(true);
    try {
      const data = { ...form, code: (form.code || '').toUpperCase(), discount_value: parseFloat(form.discount_value), min_order: parseFloat(form.min_order) || 0, max_uses: form.max_uses ? parseInt(form.max_uses) : null };
      if (editing === 'new') { await create({ ...data, uses_count: 0 }); toast.success('Cupón creado ✅'); }
      else { await update(editing, data); toast.success('Cupón guardado ✅'); }
      setEditing(null); setForm({});
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing('new'); setForm({ discount_type: 'percent', discount_value: 10, min_order: 0, is_active: true }); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Nuevo Cupón
        </Button>
      </div>
      {editing === 'new' && (
        <InlineForm title="Nuevo Cupón" icon={Tag} fields={PROMO_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
      )}
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {items.map(promo => (
            <div key={promo.id}>
              {editing === promo.id && (
                <InlineForm title={`Editando: ${promo.code}`} icon={Tag} fields={PROMO_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
              )}
              {editing !== promo.id && (
                <RecordRow
                  thumb="🎟️"
                  title={promo.code}
                  sub={`${promo.discount_type === 'percent' ? `${promo.discount_value}%` : `$${promo.discount_value}`} off · ${promo.uses_count || 0}/${promo.max_uses || '∞'} usos · vence: ${promo.valid_until || '—'}`}
                  badges={[{ label: promo.is_active ? '✅ Activo' : '⏸️ Inactivo', cls: promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600' }]}
                  onToggle={v => update(promo.id, { is_active: v }).then(() => toast.success(v ? 'Activado' : 'Desactivado'))}
                  toggleValue={promo.is_active}
                  toggleLabel={['Activo', 'Inactivo']}
                  onEdit={() => { setEditing(promo.id); setForm({ ...promo }); }}
                  onDelete={() => { if (window.confirm('¿Eliminar este cupón?')) remove(promo.id).then(() => toast.success('Eliminado')); }}
                />
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay cupones</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Reviews
// ═══════════════════════════════════════════════════════════════════════════════
function ReviewsSection() {
  const { items, loading, update, remove } = useEntityCRUD('Review');
  const [replies, setReplies] = useState({});
  const [filter, setFilter] = useState('all');

  const handleReply = async (review) => {
    const reply = replies[review.id]?.trim();
    if (!reply) return;
    await update(review.id, { reply, reply_date: new Date().toISOString() });
    setReplies(p => ({ ...p, [review.id]: '' }));
    toast.success('Respuesta enviada ✅');
  };

  const handleDelete = async (review) => {
    if (!window.confirm('¿Eliminar esta reseña?')) return;
    await remove(review.id);
    toast.success('Reseña eliminada');
  };

  const filtered = items.filter(r => filter === 'all' || (filter === 'replied' && r.reply) || (filter === 'pending' && !r.reply) || (filter === 'low' && r.rating <= 3));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ({items.length})</SelectItem>
            <SelectItem value="pending">Sin Respuesta</SelectItem>
            <SelectItem value="replied">Respondidas</SelectItem>
            <SelectItem value="low">Bajas (≤3★)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-3">
          {filtered.map(review => (
            <div key={review.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{review.customer_name || review.user_email}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{new Date(review.created_date).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(review)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {review.comment && <p className="text-sm text-muted-foreground italic">"{review.comment}"</p>}
              {review.reply ? (
                <div className="bg-strawberry/5 border border-strawberry/20 rounded-xl p-3">
                  <p className="text-xs text-strawberry font-semibold mb-1">✅ Tu respuesta ({new Date(review.reply_date).toLocaleDateString('es-MX')}):</p>
                  <p className="text-sm">{review.reply}</p>
                  <button onClick={() => update(review.id, { reply: null, reply_date: null }).then(() => toast.success('Respuesta eliminada'))} className="text-xs text-muted-foreground hover:text-destructive mt-1">Eliminar respuesta</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Responder a esta reseña..." value={replies[review.id] || ''} onChange={e => setReplies(p => ({ ...p, [review.id]: e.target.value }))} className="rounded-xl text-sm" onKeyDown={e => e.key === 'Enter' && handleReply(review)} />
                  <Button size="sm" className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl" onClick={() => handleReply(review)}>Enviar</Button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay reseñas</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Rewards
// ═══════════════════════════════════════════════════════════════════════════════
function RewardsSection() {
  const { items, loading, create, update, remove } = useEntityCRUD('RewardItem');
  const { items: redemptions, update: updateRedemption } = useEntityCRUD('RewardRedemption');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('items');
  const change = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const REWARD_FIELDS = [
    { key: 'name_es', label: 'Nombre *', placeholder: 'Fresitas Gratis' },
    { key: 'description_es', label: 'Descripción', type: 'textarea', placeholder: 'Porción personal de fresitas...' },
    { key: 'points_cost', label: 'Puntos Costo *', type: 'number', placeholder: '200' },
    { key: 'stock', label: 'Stock disponible', type: 'number', placeholder: '10' },
    { key: 'category', label: 'Categoría', type: 'select', options: [{ value: 'producto', label: '🍓 Producto' }, { value: 'descuento', label: '🎟️ Descuento' }, { value: 'experiencia', label: '✨ Experiencia' }, { value: 'merch', label: '👕 Merch' }] },
    { key: 'image_url', label: 'URL Imagen', placeholder: 'https://...' },
    { key: 'is_active', label: 'Activo / Visible', type: 'toggle' },
  ];

  const save = async () => {
    if (!form.name_es || !form.points_cost) { toast.error('Nombre y puntos requeridos'); return; }
    setSaving(true);
    try {
      if (editing === 'new') { await create(form); toast.success('Premio creado ✅'); }
      else { await update(editing, form); toast.success('Premio guardado ✅'); }
      setEditing(null); setForm({});
    } finally { setSaving(false); }
  };

  const STATUS_OPTS = [{ value: 'pending', label: '⏳ Pendiente' }, { value: 'processing', label: '🔄 Procesando' }, { value: 'delivered', label: '✅ Entregado' }, { value: 'cancelled', label: '❌ Cancelado' }];

  return (
    <div className="space-y-4">
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        {[{ k: 'items', l: 'Premios disponibles' }, { k: 'redemptions', l: `Canjes (${redemptions.length})` }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.k ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => { setEditing('new'); setForm({ stock: 10, is_active: true, category: 'producto' }); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5">
              <Plus className="w-4 h-4" /> Nuevo Premio
            </Button>
          </div>
          {editing === 'new' && (
            <InlineForm title="Nuevo Premio" icon={Gift} fields={REWARD_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
          )}
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id}>
                  {editing === item.id && (
                    <InlineForm title={`Editando: ${item.name_es}`} icon={Gift} fields={REWARD_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
                  )}
                  {editing !== item.id && (
                    <RecordRow
                      thumb={item.image_url || (item.category === 'producto' ? '🍓' : item.category === 'descuento' ? '🎟️' : item.category === 'experiencia' ? '✨' : '👕')}
                      title={item.name_es}
                      sub={`${item.points_cost} pts · stock: ${item.stock}`}
                      badges={[{ label: item.is_active ? '✅ Activo' : '⏸️ Inactivo', cls: item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600' }]}
                      onToggle={v => update(item.id, { is_active: v })}
                      toggleValue={item.is_active}
                      onEdit={() => { setEditing(item.id); setForm({ ...item }); }}
                      onDelete={() => { if (window.confirm('¿Eliminar este premio?')) remove(item.id).then(() => toast.success('Premio eliminado')); }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'redemptions' && (
        <div className="space-y-2">
          {redemptions.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Gift className="w-8 h-8 text-strawberry flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{r.reward_name}</p>
                <p className="text-xs text-muted-foreground">{r.user_email} · {r.points_spent} pts · {new Date(r.created_date).toLocaleDateString('es-MX')}</p>
                {r.delivery_address && <p className="text-xs text-muted-foreground">📍 {r.delivery_address}</p>}
              </div>
              <Select value={r.status} onValueChange={v => updateRedemption(r.id, { status: v }).then(() => toast.success('Estado actualizado'))}>
                <SelectTrigger className="w-36 rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          {redemptions.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay solicitudes de canje</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Challenges
// ═══════════════════════════════════════════════════════════════════════════════
function ChallengesSection() {
  const { items, loading, create, update, remove } = useEntityCRUD('DailyChallenge');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const change = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const CHALLENGE_FIELDS = [
    { key: 'title_es', label: 'Título del desafío *', placeholder: '¡Pide antes de las 2pm!' },
    { key: 'description_es', label: 'Descripción', type: 'textarea', placeholder: 'Haz un pedido con fresas y chocolate...' },
    { key: 'icon', label: 'Ícono (emoji)', placeholder: '🍓' },
    { key: 'challenge_type', label: 'Tipo', type: 'select', options: [{ value: 'order_before_time', label: '⏰ Antes de hora' }, { value: 'order_product', label: '🍓 Producto específico' }, { value: 'order_amount', label: '💰 Monto mínimo' }, { value: 'referral', label: '🤝 Referir amigo' }, { value: 'review', label: '⭐ Dejar reseña' }] },
    { key: 'condition_value', label: 'Condición (hora/producto/monto)', placeholder: '14:00 / chocolate / $200' },
    { key: 'points_reward', label: 'Puntos recompensa', type: 'number', placeholder: '50' },
    { key: 'active_date', label: 'Fecha activa (YYYY-MM-DD)', placeholder: new Date().toISOString().split('T')[0] },
    { key: 'is_active', label: 'Activo / Visible', type: 'toggle' },
  ];

  const save = async () => {
    if (!form.title_es) { toast.error('Título requerido'); return; }
    setSaving(true);
    try {
      if (editing === 'new') { await create({ ...form, completions_count: 0 }); toast.success('Desafío creado ✅'); }
      else { await update(editing, form); toast.success('Desafío guardado ✅'); }
      setEditing(null); setForm({});
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing('new'); setForm({ is_active: true, points_reward: 50, icon: '🎯', challenge_type: 'order_before_time', active_date: new Date().toISOString().split('T')[0] }); }} className="bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Nuevo Desafío
        </Button>
      </div>
      {editing === 'new' && (
        <InlineForm title="Nuevo Desafío" icon={Zap} fields={CHALLENGE_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
      )}
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {items.map(c => (
            <div key={c.id}>
              {editing === c.id && (
                <InlineForm title={`Editando: ${c.title_es}`} icon={Zap} fields={CHALLENGE_FIELDS} values={form} onChange={change} onSave={save} onCancel={() => { setEditing(null); setForm({}); }} saving={saving} />
              )}
              {editing !== c.id && (
                <RecordRow
                  thumb={c.icon || '🎯'}
                  title={c.title_es}
                  sub={`+${c.points_reward} pts · ${c.active_date || 'siempre'} · completados: ${c.completions_count || 0}`}
                  badges={[{ label: c.is_active ? '✅ Activo' : '⏸️ Inactivo', cls: c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600' }]}
                  onToggle={v => update(c.id, { is_active: v })}
                  toggleValue={c.is_active}
                  onEdit={() => { setEditing(c.id); setForm({ ...c }); }}
                  onDelete={() => { if (window.confirm('¿Eliminar este desafío?')) remove(c.id).then(() => toast.success('Eliminado')); }}
                />
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay desafíos</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Subscriptions
// ═══════════════════════════════════════════════════════════════════════════════
function SubscriptionsSection() {
  const { items, loading, update } = useEntityCRUD('Subscription');
  const [filter, setFilter] = useState('active');

  const filtered = filter === 'all' ? items : items.filter(s => s.status === filter);
  const STATUS_OPTS = [{ value: 'active', label: '✅ Activa' }, { value: 'paused', label: '⏸️ Pausada' }, { value: 'cancelled', label: '❌ Cancelada' }];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ({items.length})</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto text-xs text-muted-foreground">
          <span>MRR: <strong className="text-green-600">${items.filter(s => s.status === 'active').reduce((s, sub) => s + (sub.total_monthly || 0), 0).toFixed(2)}</strong></span>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {filtered.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
              <div className={`w-2 h-10 rounded-full flex-shrink-0 ${sub.status === 'active' ? 'bg-green-500' : sub.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{sub.customer_name || sub.user_email}</p>
                  <Badge className={`text-xs ${sub.plan === 'vip' ? 'bg-gold/20 text-amber-700' : sub.plan === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {sub.plan?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{sub.user_email} · {sub.frequency} · {sub.delivery_day}</p>
                <p className="text-xs text-muted-foreground">Próx. entrega: {sub.next_delivery || '—'} · ${sub.total_monthly?.toFixed(2) || '0'}/mes</p>
              </div>
              <Select value={sub.status} onValueChange={v => update(sub.id, { status: v }).then(() => toast.success('Estado actualizado'))}>
                <SelectTrigger className="w-36 rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay suscripciones en este filtro</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Users & Permissions
// ═══════════════════════════════════════════════════════════════════════════════
function UsersSection() {
  const { items: users, loading, reload } = useEntityCRUD('User', '-created_date', 500);
  const { items: perms, create: createPerm, update: updatePerm, setItems: setPerms } = useEntityCRUD('ManagerPermissions');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const { user: me } = useAuth();

  const handleChangeRole = async (u, newRole) => {
    await base44.entities.User.update(u.id, { role: newRole });
    toast.success(`Rol cambiado a ${newRole}`);
    reload();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
    } catch (e) { toast.error(e.message); }
    finally { setInviting(false); }
  };

  const getPerms = (email) => perms.find(p => p.user_email === email) || {};

  const togglePerm = async (email, permKey) => {
    const existing = perms.find(p => p.user_email === email);
    const currentVal = existing ? !!existing[permKey] : false;
    if (existing) {
      await updatePerm(existing.id, { [permKey]: !currentVal });
    } else {
      const blank = { user_email: email, [permKey]: true, is_active: true, granted_by: me?.email };
      const created = await createPerm(blank);
      setPerms(p => [...p, created]);
    }
    toast.success('Permiso actualizado');
  };

  const filtered = users.filter(u => {
    const matchSearch = (u.full_name || u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const managers = users.filter(u => u.role === 'manager');

  return (
    <div className="space-y-5">
      {/* Invite */}
      <div className="bg-muted rounded-2xl p-4 flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[180px] space-y-1">
          <Label className="text-xs">Email a invitar</Label>
          <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" className="rounded-xl" onKeyDown={e => e.key === 'Enter' && handleInvite()} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rol</Label>
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Comprador</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="delivery">Repartidor</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleInvite} disabled={inviting} className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl gap-2">
          {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Invitar
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuarios..." className="pl-9 rounded-xl" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="user">Compradores</SelectItem>
            <SelectItem value="manager">Managers</SelectItem>
            <SelectItem value="delivery">Repartidores</SelectItem>
            <SelectItem value="owner">Owners</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} usuarios</p>
          {filtered.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="w-9 h-9 rounded-full bg-strawberry/10 flex items-center justify-center flex-shrink-0 font-bold text-strawberry text-sm">
                {(u.full_name || u.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <Select value={u.role || 'user'} onValueChange={r => handleChangeRole(u, r)} disabled={u.email === me?.email}>
                <SelectTrigger className="w-32 rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Comprador</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="delivery">Repartidor 🚗</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner 👑</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* Manager Permissions */}
      {managers.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <h4 className="font-poppins font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" /> Permisos de Managers</h4>
          {managers.map(mgr => {
            const p = getPerms(mgr.email);
            return (
              <div key={mgr.id} className="space-y-3">
                <p className="text-sm font-semibold text-purple-600">{mgr.full_name || mgr.email}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.keys(PERM_LABELS).map(pk => (
                    <div key={pk} className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
                      <span className="text-xs">{PERM_LABELS[pk]}</span>
                      <Switch checked={!!p[pk]} onCheckedChange={() => togglePerm(mgr.email, pk)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Store Settings
// ═══════════════════════════════════════════════════════════════════════════════
function StoreSettingsSection() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const ch = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    base44.entities.StoreSettings.list().then(list => {
      if (list[0]) { setSettings(list[0]); setForm(list[0]); }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (settings) await base44.entities.StoreSettings.update(settings.id, form);
      else { const c = await base44.entities.StoreSettings.create(form); setSettings(c); }
      toast.success('Configuración guardada ✅');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div>;

  const groups = [
    { title: '🛒 Entrega y Precios', fields: [
      { k: 'delivery_fee', label: 'Costo de Envío ($)', type: 'number' },
      { k: 'free_delivery_min', label: 'Envío Gratis desde ($)', type: 'number' },
    ]},
    { title: '📞 Contacto y Social', fields: [
      { k: 'whatsapp_number', label: 'WhatsApp (con código país)', placeholder: '525512345678' },
      { k: 'admin_email', label: 'Email de Notificaciones', type: 'email' },
      { k: 'instagram_url', label: 'Instagram URL' },
      { k: 'facebook_url', label: 'Facebook URL' },
    ]},
    { title: '📢 Anuncios', fields: [
      { k: 'announcement_es', label: 'Anuncio (Español)', type: 'textarea' },
      { k: 'announcement_en', label: 'Announcement (English)', type: 'textarea' },
      { k: 'closed_message_es', label: 'Mensaje Cerrado (ES)' },
    ]},
    { title: '⚙️ Estado', fields: [
      { k: 'open_hours', label: 'Horario de atención', placeholder: '10:00 - 22:00' },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        {[{ k: 'is_open', label: '🔓 Tienda Abierta' }, { k: 'maintenance_mode', label: '🚧 Modo Mantenimiento' }, { k: 'referral_enabled', label: '🎁 Referidos Activos' }].map(sw => (
          <div key={sw.k} className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
            <Switch checked={!!form[sw.k]} onCheckedChange={v => ch(sw.k, v)} />
            <span className="text-sm font-medium">{sw.label}</span>
          </div>
        ))}
      </div>

      {groups.map(g => (
        <div key={g.title} className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-sm">{g.title}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.fields.map(f => (
              <FormRow key={f.k} label={f.label}>
                {f.type === 'textarea' ? (
                  <Textarea value={form[f.k] || ''} onChange={e => ch(f.k, e.target.value)} className="rounded-xl text-sm" rows={2} />
                ) : (
                  <Input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => ch(f.k, e.target.value)} className="rounded-xl text-sm" placeholder={f.placeholder} />
                )}
              </FormRow>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3 bg-card border border-border rounded-2xl p-5">
        <h4 className="font-semibold text-sm">🎁 Programa de Referidos</h4>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Puntos por referido (ambos lados)">
            <Input type="number" value={form.referral_points || 50} onChange={e => ch('referral_points', parseInt(e.target.value))} className="rounded-xl text-sm" />
          </FormRow>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar Toda la Configuración
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Branding
// ═══════════════════════════════════════════════════════════════════════════════
function BrandingSection() {
  return (
    <div className="space-y-4">
      <div className="bg-muted rounded-2xl p-5 space-y-3">
        <h4 className="font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-strawberry" /> Colores & Estilos</h4>
        <p className="text-sm text-muted-foreground">Los colores están definidos en el sistema de diseño global (CSS Variables). Para cambiarlos, ve al panel de Base44 → Tema Visual, o edita el archivo index.css directamente.</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Strawberry (Primary)', color: '#E8294A', desc: '--primary' },
            { name: 'Chocolate (Accent)', color: '#5C2D0E', desc: '--accent' },
            { name: 'Gold (Loyalty)', color: '#D4A017', desc: '--gold' },
          ].map(c => (
            <div key={c.name} className="text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-md border-2 border-white" style={{ background: c.color }} />
              <p className="text-xs font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{c.color}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
        <Link to="/owner">
          <Button variant="outline" className="rounded-xl gap-2 w-full">
            <ExternalLink className="w-4 h-4" /> Ir al Editor de Branding Completo (Owner Panel)
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Gallery
// ═══════════════════════════════════════════════════════════════════════════════
function GallerySection() {
  const { items, loading } = useEntityCRUD('Product');
  const [search, setSearch] = useState('');

  const withImages = items.filter(p => p.image_url && p.image_url.startsWith('http'));
  const filtered = withImages.filter(p => p.name_es?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar imágenes..." className="pl-9 rounded-xl" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} imágenes de productos · Para subir nuevas imágenes, edita el producto y pega la URL de imagen.</p>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="group relative rounded-2xl overflow-hidden bg-muted aspect-square">
              <img src={p.image_url} alt={p.name_es} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-2">
                <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">{p.name_es}</p>
              </div>
              {!p.is_available && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">Oculto</div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">No hay imágenes de productos. Edita un producto y añade una URL de imagen.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Emails / Notifications
// ═══════════════════════════════════════════════════════════════════════════════
function EmailsSection() {
  return (
    <div className="space-y-4">
      <div className="bg-muted rounded-2xl p-5">
        <h4 className="font-semibold flex items-center gap-2 mb-3"><Mail className="w-4 h-4 text-strawberry" /> Templates de Email</h4>
        <p className="text-sm text-muted-foreground mb-4">Los templates de email de estado de pedido están disponibles en el Admin Panel → Emails.</p>
        <Link to="/admin">
          <Button variant="outline" className="rounded-xl gap-2">
            <ExternalLink className="w-4 h-4" /> Ir al Admin Panel → Emails
          </Button>
        </Link>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="font-semibold text-sm">📋 Emails automáticos configurados</h4>
        {[
          { icon: '📦', label: 'Confirmación de pedido', desc: 'Se envía cuando el pedido pasa a "Confirmado"' },
          { icon: '🍳', label: 'En preparación', desc: 'Se envía cuando el pedido pasa a "Preparando"' },
          { icon: '🚗', label: 'En camino', desc: 'Se envía cuando el pedido pasa a "En Camino"' },
          { icon: '✅', label: 'Pedido entregado', desc: 'Se envía cuando el pedido se marca "Entregado"' },
          { icon: '🎁', label: 'Referido completado', desc: 'Se envía a ambas partes cuando se completa un referido' },
          { icon: '⚠️', label: 'Alerta de stock bajo', desc: 'Se envía al admin cuando ingredientes están bajos' },
          { icon: '⭐', label: 'Solicitud de reseña', desc: 'Se envía automáticamente 1 día después de entrega' },
        ].map(e => (
          <div key={e.label} className="flex items-start gap-3 p-3 bg-muted rounded-xl">
            <span className="text-lg">{e.icon}</span>
            <div>
              <p className="font-medium text-sm">{e.label}</p>
              <p className="text-xs text-muted-foreground">{e.desc}</p>
            </div>
            <Badge className="ml-auto text-xs bg-green-100 text-green-700 flex-shrink-0">Activo</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Receipts & Redemptions overview
// ═══════════════════════════════════════════════════════════════════════════════
function ReceiptsSection() {
  const { items: orders, loading } = useEntityCRUD('Order', '-created_date', 50);
  const [search, setSearch] = useState('');

  const filtered = orders.filter(o => (o.tracking_code || '').toLowerCase().includes(search.toLowerCase()) || (o.customer_name || '').toLowerCase().includes(search.toLowerCase()));

  const STATUS_COLORS_MAP = { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', preparing: 'bg-orange-100 text-orange-700', on_the_way: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido o cliente..." className="pl-9 rounded-xl" />
        </div>
        <Button onClick={() => {
          const rows = orders.map(o => ({ tracking_code: o.tracking_code, customer: o.customer_name, total: o.total, status: o.status, payment: o.payment_method, date: new Date(o.created_date).toLocaleDateString('es-MX') }));
          const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => JSON.stringify(v)).join(','))].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'recibos.csv'; a.click();
          toast.success('CSV descargado');
        }} variant="outline" className="rounded-xl gap-1.5 flex-shrink-0">
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-strawberry" /></div> : (
        <div className="space-y-2">
          {filtered.map(o => (
            <div key={o.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Receipt className="w-8 h-8 text-strawberry flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-strawberry">#{o.tracking_code}</span>
                  <Badge className={`text-xs ${STATUS_COLORS_MAP[o.status] || 'bg-gray-100 text-gray-700'}`}>{o.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{o.customer_name} · ${o.total?.toFixed(2)} · {o.payment_method} · {new Date(o.created_date).toLocaleDateString('es-MX')}</p>
              </div>
              {o.loyalty_points_earned > 0 && (
                <Badge className="text-xs bg-amber-100 text-amber-700 flex-shrink-0">+{o.loyalty_points_earned} pts</Badge>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No se encontraron pedidos</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const SECTION_COMPONENTS = {
  products: ProductsSection,
  blog: BlogSection,
  promos: PromosSection,
  reviews: ReviewsSection,
  rewards: RewardsSection,
  challenges: ChallengesSection,
  subscriptions: SubscriptionsSection,
  users: UsersSection,
  permissions: UsersSection,
  settings: StoreSettingsSection,
  branding: BrandingSection,
  emails: EmailsSection,
  receipts: ReceiptsSection,
  gallery: GallerySection,
};

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!user || !['admin', 'owner'].includes(user.role)) navigate('/');
  }, [user]);

  if (!user || !['admin', 'owner'].includes(user.role)) return null;

  const groups = [...new Set(SECTIONS.map(s => s.group))];
  const ActiveComponent = SECTION_COMPONENTS[activeSection] || (() => <div className="text-muted-foreground text-center py-16">Sección en desarrollo...</div>);
  const activeInfo = SECTIONS.find(s => s.id === activeSection);

  const handleSectionSelect = (id) => {
    setActiveSection(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen pt-14 bg-background flex flex-col md:flex-row">

      {/* ── Desktop Sidebar ── */}
      <div className={`hidden md:flex ${sidebarOpen ? 'w-56' : 'w-14'} transition-all duration-200 flex-shrink-0 bg-card border-r border-border flex-col overflow-hidden sticky top-14 h-[calc(100vh-3.5rem)]`}>
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-strawberry/10 flex items-center justify-center flex-shrink-0">
            <Crown className="w-4 h-4 text-gold" />
          </div>
          {sidebarOpen && <span className="font-poppins font-black text-sm text-foreground">SuperAdmin</span>}
          <button onClick={() => setSidebarOpen(v => !v)} className="ml-auto p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            {sidebarOpen ? <X className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {groups.map(group => (
            <div key={group}>
              {sidebarOpen && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{group}</p>}
              <div className="space-y-0.5">
                {SECTIONS.filter(s => s.group === group).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    title={s.label}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeSection === s.id
                        ? 'bg-strawberry/10 text-strawberry'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <s.icon className="w-4 h-4 flex-shrink-0" />
                    {sidebarOpen && <span className="truncate">{s.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Quick Links */}
        {sidebarOpen && (
          <div className="p-3 border-t border-border space-y-1">
            <p className="text-xs text-muted-foreground font-semibold px-2 mb-1">Ir a...</p>
            {[{ to: '/admin', label: '⚙️ Admin Panel' }, { to: '/analytics', label: '📊 Analytics' }, { to: '/logistica', label: '🚗 Logística' }, { to: '/owner', label: '👑 Owner Panel' }].map(l => (
              <Link key={l.to} to={l.to} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-card border-b border-border sticky top-14 z-30">
        <div className="w-6 h-6 rounded-lg bg-strawberry/10 flex items-center justify-center flex-shrink-0">
          <Crown className="w-3.5 h-3.5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          {activeInfo && (
            <div className="flex items-center gap-1.5">
              <activeInfo.icon className="w-3.5 h-3.5 text-strawberry flex-shrink-0" />
              <span className="font-semibold text-sm truncate">{activeInfo.label}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setMobileNavOpen(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-xl text-xs font-semibold"
        >
          <Layers className="w-3.5 h-3.5" />
          Secciones
        </button>
      </div>

      {/* ── Mobile Section Picker (bottom sheet) ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl max-h-[75vh] overflow-y-auto md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-poppins font-bold text-sm">SuperAdmin · Secciones</h3>
                <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-3 pb-8">
                {groups.map(group => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{group}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SECTIONS.filter(s => s.group === group).map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleSectionSelect(s.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all ${
                            activeSection === s.id
                              ? 'bg-strawberry/10 text-strawberry border border-strawberry/30'
                              : 'bg-muted text-foreground hover:bg-secondary'
                          }`}
                        >
                          <s.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto min-w-0">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            {/* Page Header — desktop only (mobile shows in top bar) */}
            <div className="hidden md:flex items-center gap-3 mb-6">
              {activeInfo && <activeInfo.icon className="w-6 h-6 text-strawberry" />}
              <div>
                <h1 className="font-poppins font-black text-2xl">{activeInfo?.label}</h1>
                <p className="text-xs text-muted-foreground">{activeInfo?.group} · Fresitas G&F</p>
              </div>
            </div>
            {/* Mobile header */}
            <div className="md:hidden mb-4">
              <h1 className="font-poppins font-black text-xl">{activeInfo?.label}</h1>
            </div>
            <ActiveComponent />
          </motion.div>
        </div>
      </div>
    </div>
  );
}