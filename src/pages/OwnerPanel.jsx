import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Settings, Tag, Crown, Shield, ShoppingBag, BarChart2, Palette, Globe, Bell, Save, Plus, Trash2, Edit2, Check, X, RefreshCw, Loader2, Mail, Key, ToggleLeft, Star, Zap, Map, Truck } from 'lucide-react';
import DeliveryHeatmap from '@/components/owner/DeliveryHeatmap';
import StoreBrandingEditor from '@/components/owner/StoreBrandingEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PERMISSION_LABELS = {
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

export default function OwnerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [managerPerms, setManagerPerms] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [newPromo, setNewPromo] = useState({
    code: '', discount_type: 'percent', discount_value: 10,
    min_order: 0, max_uses: '', valid_until: '', description_es: '', is_active: true
  });
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    is_open: true, delivery_fee: 30, free_delivery_min: 200,
    whatsapp_number: '', admin_email: '',
    announcement_es: '', announcement_en: '',
    closed_message_es: '', maintenance_mode: false,
    instagram_url: '', facebook_url: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!user || !['owner', 'admin'].includes(user.role)) { navigate('/'); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [usrs, perms, promos, settingsList, subs] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.ManagerPermissions.list(),
      base44.entities.PromoCode.list('-created_date', 100),
      base44.entities.StoreSettings.list(),
      base44.entities.Subscription.list('-created_date', 100),
    ]);
    setUsers(usrs);
    setManagerPerms(perms);
    setPromoCodes(promos);
    setSubscriptions(subs);
    if (settingsList[0]) {
      setSettings(settingsList[0]);
      setSettingsForm({
        is_open: settingsList[0].is_open !== false,
        delivery_fee: settingsList[0].delivery_fee || 30,
        free_delivery_min: settingsList[0].free_delivery_min || 200,
        whatsapp_number: settingsList[0].whatsapp_number || '',
        admin_email: settingsList[0].admin_email || '',
        announcement_es: settingsList[0].announcement_es || '',
        announcement_en: settingsList[0].announcement_en || '',
        closed_message_es: settingsList[0].closed_message_es || '',
        maintenance_mode: settingsList[0].maintenance_mode || false,
        instagram_url: settingsList[0].instagram_url || '',
        facebook_url: settingsList[0].facebook_url || '',
      });
    }
    setLoading(false);
  };

  const handleChangeRole = async (targetUser, newRole) => {
    try {
      await base44.entities.User.update(targetUser.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
      toast.success(`Rol de ${targetUser.full_name || targetUser.email} cambiado a ${newRole}`);
    } catch (e) {
      toast.error('Error al cambiar rol: ' + e.message);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
    } catch (e) {
      toast.error('Error al invitar: ' + e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const getOrCreateManagerPerms = (email) => {
    return managerPerms.find(p => p.user_email === email) || {
      user_email: email,
      can_manage_orders: true,
      can_manage_products: false,
      can_view_analytics: true,
      can_manage_settings: false,
      can_manage_promos: false,
      can_chat_customers: true,
      can_reply_reviews: true,
      can_export_data: false,
      can_manage_users: false,
      is_active: true,
    };
  };

  const handleTogglePerm = async (managerEmail, permKey) => {
    const existing = managerPerms.find(p => p.user_email === managerEmail);
    const currentPerms = getOrCreateManagerPerms(managerEmail);
    const newVal = !currentPerms[permKey];
    const updated = { ...currentPerms, [permKey]: newVal, granted_by: user.email };
    if (existing) {
      await base44.entities.ManagerPermissions.update(existing.id, { [permKey]: newVal });
      setManagerPerms(prev => prev.map(p => p.id === existing.id ? { ...p, [permKey]: newVal } : p));
    } else {
      const created = await base44.entities.ManagerPermissions.create(updated);
      setManagerPerms(prev => [...prev, created]);
    }
    toast.success('Permiso actualizado');
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code.trim() || !newPromo.discount_value) {
      toast.error('Código y descuento son requeridos');
      return;
    }
    setPromoLoading(true);
    try {
      const data = {
        ...newPromo,
        code: newPromo.code.toUpperCase(),
        discount_value: parseFloat(newPromo.discount_value),
        min_order: parseFloat(newPromo.min_order) || 0,
        max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null,
        uses_count: 0,
      };
      if (editingPromo) {
        await base44.entities.PromoCode.update(editingPromo.id, data);
        setPromoCodes(prev => prev.map(p => p.id === editingPromo.id ? { ...p, ...data, id: editingPromo.id } : p));
        setEditingPromo(null);
        toast.success('Cupón actualizado');
      } else {
        const created = await base44.entities.PromoCode.create(data);
        setPromoCodes(prev => [created, ...prev]);
        toast.success('Cupón creado');
      }
      setNewPromo({ code: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: '', valid_until: '', description_es: '', is_active: true });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleTogglePromo = async (promo) => {
    await base44.entities.PromoCode.update(promo.id, { is_active: !promo.is_active });
    setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleDeletePromo = async (promo) => {
    await base44.entities.PromoCode.delete(promo.id);
    setPromoCodes(prev => prev.filter(p => p.id !== promo.id));
    toast.success('Cupón eliminado');
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      if (settings) {
        await base44.entities.StoreSettings.update(settings.id, settingsForm);
      } else {
        const c = await base44.entities.StoreSettings.create(settingsForm);
        setSettings(c);
      }
      toast.success('Configuración guardada');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
      </div>
    );
  }

  if (!user || !['owner', 'admin'].includes(user.role)) return null;

  const managers = users.filter(u => u.role === 'manager');
  const buyers = users.filter(u => u.role === 'user' || !u.role);
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between py-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-6 h-6 text-gold" />
                <h1 className="font-poppins font-black text-3xl text-foreground">Owner Panel</h1>
              </div>
              <p className="text-muted-foreground text-sm">Control total · Fresitas G&F</p>
            </div>
            <Badge className="bg-gold/20 text-gold border border-gold/30 px-3 py-1">
              <Crown className="w-3 h-3 mr-1" /> OWNER
            </Badge>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Usuarios', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Managers', value: managers.length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Cupones Activos', value: promoCodes.filter(p => p.is_active).length, icon: Tag, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'Suscripciones', value: subscriptions.filter(s => s.status === 'active').length, icon: Zap, color: 'text-gold', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            ].map((s, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className={`font-poppins font-bold text-2xl ${s.color}`}>{s.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="users">
            <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="users" className="rounded-lg text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Usuarios & Roles</TabsTrigger>
              <TabsTrigger value="promos" className="rounded-lg text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> Cupones</TabsTrigger>
              <TabsTrigger value="subscriptions" className="rounded-lg text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> Suscripciones</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg text-xs flex items-center gap-1"><Settings className="w-3 h-3" /> Configuración</TabsTrigger>
              <TabsTrigger value="store" className="rounded-lg text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> Tienda</TabsTrigger>
              <TabsTrigger value="heatmap" className="rounded-lg text-xs flex items-center gap-1"><Map className="w-3 h-3" /> Mapa Demanda</TabsTrigger>
            </TabsList>

            {/* USERS & ROLES */}
            <TabsContent value="users">
              <div className="space-y-6">
                {/* Invite */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-poppins font-semibold text-lg mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-strawberry" /> Invitar Nuevo Usuario
                  </h3>
                  <div className="flex gap-3 flex-wrap">
                    <Input
                      placeholder="email@ejemplo.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="rounded-xl flex-1 min-w-[200px]"
                      type="email"
                    />
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="w-36 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="user">Comprador</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="delivery">Repartidor</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleInviteUser} disabled={inviteLoading} className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
                      {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Invitar
                    </Button>
                  </div>
                </div>

                {/* Users List */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-poppins font-semibold text-lg mb-4">Todos los Usuarios ({users.length})</h3>
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-strawberry/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-strawberry">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <Select
                          value={u.role || 'user'}
                          onValueChange={(role) => handleChangeRole(u, role)}
                          disabled={u.email === user.email}
                        >
                          <SelectTrigger className="w-32 rounded-xl h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="user">Comprador</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="delivery">Repartidor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        {(u.role === 'owner' || u.role === 'admin') && <Crown className="w-4 h-4 text-gold flex-shrink-0" />}
                        {u.role === 'manager' && <Shield className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                        {u.role === 'delivery' && <Truck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manager Permissions */}
                {managers.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-poppins font-semibold text-lg mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-purple-500" /> Permisos de Managers
                    </h3>
                    {managers.map(mgr => {
                      const perms = getOrCreateManagerPerms(mgr.email);
                      return (
                        <div key={mgr.id} className="mb-6 last:mb-0">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-purple-500" />
                            <span className="font-semibold text-sm">{mgr.full_name || mgr.email}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {Object.keys(PERMISSION_LABELS).map(perm => (
                              <div key={perm} className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
                                <span className="text-xs">{PERMISSION_LABELS[perm]}</span>
                                <Switch
                                  checked={!!perms[perm]}
                                  onCheckedChange={() => handleTogglePerm(mgr.email, perm)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PROMO CODES */}
            <TabsContent value="promos">
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-poppins font-semibold text-lg mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-green-600" /> {editingPromo ? 'Editar Cupón' : 'Crear Cupón'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Código *</Label>
                      <Input
                        value={newPromo.code}
                        onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="FRESITAS20"
                        className="rounded-xl font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tipo de Descuento</Label>
                      <Select value={newPromo.discount_type} onValueChange={v => setNewPromo(p => ({ ...p, discount_type: v }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Porcentaje (%)</SelectItem>
                          <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Valor del Descuento *</Label>
                      <Input
                        type="number"
                        value={newPromo.discount_value}
                        onChange={e => setNewPromo(p => ({ ...p, discount_value: e.target.value }))}
                        placeholder={newPromo.discount_type === 'percent' ? '10' : '50'}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pedido Mínimo ($)</Label>
                      <Input
                        type="number"
                        value={newPromo.min_order}
                        onChange={e => setNewPromo(p => ({ ...p, min_order: e.target.value }))}
                        placeholder="0"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Usos Máximos (vacío = ilimitado)</Label>
                      <Input
                        type="number"
                        value={newPromo.max_uses}
                        onChange={e => setNewPromo(p => ({ ...p, max_uses: e.target.value }))}
                        placeholder="100"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Válido Hasta</Label>
                      <Input
                        type="date"
                        value={newPromo.valid_until}
                        onChange={e => setNewPromo(p => ({ ...p, valid_until: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Descripción</Label>
                      <Input
                        value={newPromo.description_es}
                        onChange={e => setNewPromo(p => ({ ...p, description_es: e.target.value }))}
                        placeholder="Ej: 20% de descuento en tu primer pedido"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={handleCreatePromo} disabled={promoLoading} className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
                      {promoLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {editingPromo ? 'Actualizar' : 'Crear'} Cupón
                    </Button>
                    {editingPromo && (
                      <Button variant="outline" onClick={() => { setEditingPromo(null); setNewPromo({ code: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: '', valid_until: '', description_es: '', is_active: true }); }} className="rounded-xl">
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Promo List */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-poppins font-semibold text-lg mb-4">Cupones Existentes ({promoCodes.length})</h3>
                  <div className="space-y-3">
                    {promoCodes.map(promo => (
                      <div key={promo.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${promo.is_active ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-border bg-muted opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm">{promo.code}</span>
                            <Badge className={`text-xs ${promo.discount_type === 'percent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `$${promo.discount_value}`}
                            </Badge>
                            {promo.min_order > 0 && <Badge variant="outline" className="text-xs">Min. ${promo.min_order}</Badge>}
                            {promo.max_uses && <Badge variant="outline" className="text-xs">{promo.uses_count || 0}/{promo.max_uses} usos</Badge>}
                          </div>
                          {promo.description_es && <p className="text-xs text-muted-foreground mt-1">{promo.description_es}</p>}
                          {promo.valid_until && <p className="text-xs text-muted-foreground">Vence: {promo.valid_until}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={promo.is_active} onCheckedChange={() => handleTogglePromo(promo)} />
                          <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setEditingPromo(promo); setNewPromo({ code: promo.code, discount_type: promo.discount_type, discount_value: promo.discount_value, min_order: promo.min_order || 0, max_uses: promo.max_uses || '', valid_until: promo.valid_until || '', description_es: promo.description_es || '', is_active: promo.is_active }); }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDeletePromo(promo)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {promoCodes.length === 0 && <p className="text-center text-muted-foreground py-8">No hay cupones creados</p>}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* SUBSCRIPTIONS */}
            <TabsContent value="subscriptions">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-poppins font-semibold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gold" /> Suscripciones Activas
                </h3>
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay suscripciones aún</p>
                    <p className="text-xs text-muted-foreground mt-1">Los clientes pueden suscribirse desde su perfil</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map(sub => (
                      <div key={sub.id} className="p-4 bg-muted rounded-xl flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{sub.customer_name || sub.user_email}</span>
                            <Badge className={`text-xs ${sub.plan === 'vip' ? 'bg-gold/20 text-gold' : sub.plan === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {sub.plan?.toUpperCase()}
                            </Badge>
                            <Badge className={`text-xs ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {sub.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{sub.user_email} · {sub.frequency} · {sub.delivery_day}</p>
                          <p className="text-xs text-muted-foreground">Siguiente entrega: {sub.next_delivery || 'No definida'}</p>
                          {sub.total_monthly && <p className="text-sm font-bold text-strawberry mt-1">${sub.total_monthly?.toFixed(2)}/mes</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs"
                          onClick={async () => {
                            const newStatus = sub.status === 'active' ? 'paused' : 'active';
                            await base44.entities.Subscription.update(sub.id, { status: newStatus });
                            setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
                            toast.success(`Suscripción ${newStatus === 'active' ? 'activada' : 'pausada'}`);
                          }}
                        >
                          {sub.status === 'active' ? 'Pausar' : 'Activar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* SETTINGS */}
            <TabsContent value="settings">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
                <h3 className="font-poppins font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Configuración General</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Costo de Envío ($)</Label>
                    <Input type="number" value={settingsForm.delivery_fee} onChange={e => setSettingsForm(p => ({ ...p, delivery_fee: parseFloat(e.target.value) }))} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Envío Gratis desde ($)</Label>
                    <Input type="number" value={settingsForm.free_delivery_min} onChange={e => setSettingsForm(p => ({ ...p, free_delivery_min: parseFloat(e.target.value) }))} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>WhatsApp (con código país)</Label>
                    <Input value={settingsForm.whatsapp_number} onChange={e => setSettingsForm(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="525512345678" className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email de Notificaciones</Label>
                    <Input value={settingsForm.admin_email} onChange={e => setSettingsForm(p => ({ ...p, admin_email: e.target.value }))} type="email" className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Instagram URL</Label>
                    <Input value={settingsForm.instagram_url} onChange={e => setSettingsForm(p => ({ ...p, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Facebook URL</Label>
                    <Input value={settingsForm.facebook_url} onChange={e => setSettingsForm(p => ({ ...p, facebook_url: e.target.value }))} placeholder="https://facebook.com/..." className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Anuncio (Español)</Label>
                  <Textarea value={settingsForm.announcement_es} onChange={e => setSettingsForm(p => ({ ...p, announcement_es: e.target.value }))} className="rounded-xl" rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Announcement (English)</Label>
                  <Textarea value={settingsForm.announcement_en} onChange={e => setSettingsForm(p => ({ ...p, announcement_en: e.target.value }))} className="rounded-xl" rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Mensaje Tienda Cerrada</Label>
                  <Input value={settingsForm.closed_message_es} onChange={e => setSettingsForm(p => ({ ...p, closed_message_es: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settingsForm.maintenance_mode} onCheckedChange={v => setSettingsForm(p => ({ ...p, maintenance_mode: v }))} />
                  <Label>Modo Mantenimiento (bloquea la app para clientes)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settingsForm.is_open} onCheckedChange={v => setSettingsForm(p => ({ ...p, is_open: v }))} />
                  <Label>Tienda Abierta</Label>
                </div>
                <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Configuración
                </Button>
              </div>
            </TabsContent>

            {/* HEATMAP */}
            <TabsContent value="heatmap">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-poppins font-semibold text-lg mb-4 flex items-center gap-2">
                  <Map className="w-5 h-5 text-strawberry" /> Mapa de Calor — Zonas de Demanda
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Visualiza dónde se concentran los pedidos para optimizar rutas y tiempos de entrega.
                </p>
                <DeliveryHeatmap />
              </div>
            </TabsContent>

            {/* STORE BRANDING */}
            <TabsContent value="store">
              <StoreBrandingEditor settings={settings} onSaved={(s) => setSettings(s)} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}