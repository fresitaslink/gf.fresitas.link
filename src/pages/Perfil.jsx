import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Bell, Plus, Trash2, Gift, Star, BellRing, CalendarDays, CheckCircle2, BarChart2, Crown, Shield, Zap, Award, Heart } from 'lucide-react';
import { LoyaltyLevelCard, BadgesGrid } from '@/components/loyalty/LoyaltyLevel';
import LevelProgressBar from '@/components/loyalty/LevelProgressBar';
import MyPerksList from '@/components/loyalty/MyPerksList';
import ReferralLinkCard from '@/components/profile/ReferralLinkCard';
import MisRecompensas from '@/components/loyalty/MisRecompensas';
import LoyaltyDashboard from '@/components/loyalty/LoyaltyDashboard';
import PushNotificationButton from '@/components/ui/PushNotificationButton';
import AvatarUpload from '@/components/chat/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function Perfil() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [storeSettings, setStoreSettings] = useState({});
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [newAddress, setNewAddress] = useState({ label: '', address: '', is_default: false });
  const [addingAddress, setAddingAddress] = useState(false);

  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    birthday: '',
    newsletter_subscribed: true,
  });

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    Promise.all([
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
      base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 20),
      base44.entities.LoyaltyTransaction.filter({ user_email: user.email }, '-created_date', 20),
      base44.entities.StoreSettings.list(),
      base44.entities.ReferralRecord.filter({ referrer_email: user.email, status: 'completed' }),
    ]).then(([profiles, notifs, loyalty, settings, refs]) => {
      if (profiles[0]) {
        setProfile(profiles[0]);
        setForm({
          display_name: profiles[0].display_name || user.full_name || '',
          phone: profiles[0].phone || '',
          birthday: profiles[0].birthday || '',
          newsletter_subscribed: profiles[0].newsletter_subscribed !== false,
        });
      }
      setNotifications(notifs);
      setLoyaltyHistory(loyalty);
      setStoreSettings(settings[0] || {});
      setCompletedReferrals(refs.length);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (profile) {
        const updated = await base44.entities.CustomerProfile.update(profile.id, form);
        setProfile(updated);
      } else {
        const created = await base44.entities.CustomerProfile.create({ ...form, user_email: user.email, loyalty_points: 0 });
        setProfile(created);
      }
      toast.success(t.success);
    } catch (err) {
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNotifRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.Notification.update(notif.id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const handleAddAddress = async () => {
    if (!newAddress.address.trim()) return;
    const updated = [...(profile?.addresses || []), newAddress];
    const savedProfile = await base44.entities.CustomerProfile.update(profile.id, { addresses: updated });
    setProfile(savedProfile);
    setNewAddress({ label: '', address: '', is_default: false });
    setAddingAddress(false);
    toast.success(language === 'es' ? 'Dirección guardada' : 'Address saved');
  };

  const handleRemoveAddress = async (idx) => {
    const updated = profile.addresses.filter((_, i) => i !== idx);
    const savedProfile = await base44.entities.CustomerProfile.update(profile.id, { addresses: updated });
    setProfile(savedProfile);
  };

  if (loading) {
    return <div className="min-h-screen pt-20 px-4"><div className="max-w-2xl mx-auto py-8 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="py-8 flex items-center gap-4">
            <AvatarUpload
              currentUrl={profile?.avatar_url}
              name={profile?.display_name || user.full_name || user.email}
              onUpload={async (url) => {
                if (profile) {
                  const updated = await base44.entities.CustomerProfile.update(profile.id, { avatar_url: url });
                  setProfile(updated);
                } else {
                  const created = await base44.entities.CustomerProfile.create({ user_email: user.email, display_name: user.full_name, avatar_url: url, loyalty_points: 0 });
                  setProfile(created);
                }
              }}
              size="lg"
            />
            <div>
              <h1 className="font-poppins font-bold text-2xl text-foreground">{profile?.display_name || user.full_name}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-strawberry/10 text-strawberry px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-strawberry" /> {profile?.loyalty_points || 0} {t.loyaltyPoints}
                </span>
                <Link to="/dashboard" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity">
                  <BarChart2 className="w-3 h-3" /> {language === 'es' ? 'Ver Dashboard' : 'View Dashboard'}
                </Link>
                <Link to="/suscripciones" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity">
                  <Zap className="w-3 h-3" /> {language === 'es' ? 'Mi Suscripción' : 'Subscription'}
                </Link>
                {user.role === 'owner' && (
                  <Link to="/owner" className="text-xs bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity">
                    <Crown className="w-3 h-3" /> Owner Panel
                  </Link>
                )}
                {user.role === 'manager' && (
                  <Link to="/manager" className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity">
                    <Shield className="w-3 h-3" /> Manager Panel
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Compact level progress (always visible) */}
          {profile && (
            <div className="bg-card rounded-2xl border border-border p-4 mb-4">
              <LevelProgressBar
                lifetimePoints={profile.lifetime_points || profile.loyalty_points || 0}
                language={language}
                compact
              />
            </div>
          )}

          <Tabs defaultValue="profile">
            <TabsList className="w-full rounded-xl mb-6 bg-muted flex-wrap h-auto">
              <TabsTrigger value="profile" className="flex-1 rounded-lg text-xs">{t.editProfile}</TabsTrigger>
              <TabsTrigger value="nivel" className="flex-1 rounded-lg text-xs flex items-center gap-1">
                <Crown className="w-3 h-3" /> Mi Nivel
              </TabsTrigger>
              <TabsTrigger value="referidos" className="flex-1 rounded-lg text-xs flex items-center gap-1">
                <Gift className="w-3 h-3" /> Referidos
              </TabsTrigger>
              <TabsTrigger value="recompensas" className="flex-1 rounded-lg text-xs flex items-center gap-1">
                <Award className="w-3 h-3" /> Recompensas
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex-1 rounded-lg text-xs">{t.savedAddresses}</TabsTrigger>
              <TabsTrigger value="loyalty" className="flex-1 rounded-lg text-xs">{t.loyaltyPoints}</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1 rounded-lg text-xs">{t.notifications}</TabsTrigger>
              <TabsTrigger value="push" className="flex-1 rounded-lg text-xs flex items-center gap-1">
                <Bell className="w-3 h-3" /> Alertas
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div className="space-y-1">
                  <Label>{t.name}</Label>
                  <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>{t.phone}</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} type="tel" className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1">{language === 'es' ? 'Cumpleaños' : 'Birthday'} <CalendarDays className="w-3 h-3 text-muted-foreground" /></Label>
                  <Input value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))} type="date" className="rounded-xl" />
                  <p className="text-xs text-muted-foreground">{language === 'es' ? 'Sorpresa especial en tu cumpleaños' : 'Special surprise on your birthday'}</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">{language === 'es' ? 'Newsletter' : 'Newsletter'}</p>
                    <p className="text-xs text-muted-foreground">{language === 'es' ? 'Recibe promociones y novedades' : 'Get promotions and news'}</p>
                  </div>
                  <Switch checked={form.newsletter_subscribed} onCheckedChange={val => setForm(p => ({ ...p, newsletter_subscribed: val }))} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
                  {saving ? '...' : t.save}
                </Button>
                <Button variant="outline" className="w-full rounded-xl border-destructive text-destructive" onClick={() => base44.auth.logout()}>
                  {t.logout}
                </Button>
              </div>
            </TabsContent>

            {/* Nivel Tab */}
            <TabsContent value="nivel">
              <div className="space-y-5">
                <LevelProgressBar
                  lifetimePoints={profile?.lifetime_points || profile?.loyalty_points || 0}
                  language={language}
                />
                <MyPerksList
                  lifetimePoints={profile?.lifetime_points || profile?.loyalty_points || 0}
                  language={language}
                />
                <BadgesGrid totalOrders={profile?.total_orders || 0} points={profile?.loyalty_points || 0} />
              </div>
            </TabsContent>

            {/* Referidos Tab */}
            <TabsContent value="referidos">
              <ReferralLinkCard
                user={user}
                settings={storeSettings}
                completedCount={completedReferrals}
                language={language}
              />
            </TabsContent>

            {/* Recompensas Tab */}
            <TabsContent value="recompensas">
              <MisRecompensas
                profile={profile}
                language={language}
                onPointsUpdated={(newPoints) => setProfile(p => p ? { ...p, loyalty_points: newPoints } : p)}
              />
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                {profile?.addresses?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.addresses.map((addr, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                        <MapPin className="w-4 h-4 text-strawberry mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          {addr.label && <p className="font-medium text-sm">{addr.label}</p>}
                          <p className="text-sm text-muted-foreground">{addr.address}</p>
                          {addr.is_default && <span className="text-xs text-strawberry flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> {language === 'es' ? 'Principal' : 'Default'}</span>}
                        </div>
                        <button onClick={() => handleRemoveAddress(i)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">{language === 'es' ? 'No tienes direcciones guardadas' : 'No saved addresses'}</p>
                )}

                {addingAddress ? (
                  <div className="space-y-3 border border-border rounded-xl p-4">
                    <Input placeholder={language === 'es' ? 'Etiqueta (ej: Casa, Trabajo)' : 'Label (e.g. Home, Work)'} value={newAddress.label} onChange={e => setNewAddress(p => ({ ...p, label: e.target.value }))} className="rounded-xl" />
                    <Input placeholder={language === 'es' ? 'Dirección completa' : 'Full address'} value={newAddress.address} onChange={e => setNewAddress(p => ({ ...p, address: e.target.value }))} className="rounded-xl" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddAddress} className="bg-strawberry text-white rounded-xl hover:bg-strawberry/90">{t.save}</Button>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAddingAddress(false)}>{t.cancel}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full rounded-xl border-dashed border-strawberry text-strawberry" onClick={() => setAddingAddress(true)}>
                    <Plus className="w-4 h-4 mr-2" /> {language === 'es' ? 'Agregar Dirección' : 'Add Address'}
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Loyalty Tab */}
            <TabsContent value="loyalty">
              <LoyaltyDashboard
                profile={profile}
                loyaltyHistory={loyaltyHistory}
                language={language}
              />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <div className="bg-card rounded-2xl border border-border p-4">
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">{language === 'es' ? 'No hay notificaciones' : 'No notifications'}</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkNotifRead(notif)}
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${notif.is_read ? 'bg-muted opacity-60' : 'bg-strawberry/5 border border-strawberry/20'}`}
                      >
                        <div className="flex items-start gap-2">
                          {!notif.is_read && <div className="w-2 h-2 rounded-full bg-strawberry mt-1.5 flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-sm">{language === 'es' ? notif.title_es : (notif.title_en || notif.title_es)}</p>
                            <p className="text-xs text-muted-foreground">{language === 'es' ? notif.message_es : (notif.message_en || notif.message_es)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Push Notifications Tab */}
            <TabsContent value="push">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-strawberry/10 rounded-xl flex items-center justify-center">
                    <BellRing className="w-5 h-5 text-strawberry" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{language === 'es' ? 'Notificaciones Push' : 'Push Notifications'}</h3>
                    <p className="text-xs text-muted-foreground">{language === 'es' ? 'Alertas en tiempo real en tu dispositivo' : 'Real-time alerts on your device'}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {language === 'es'
                    ? 'Activa las notificaciones push para recibir alertas instantáneas cuando tu pedido cambie de estado, cuando haya promociones especiales o cuando lleguen puntos de lealtad.'
                    : 'Enable push notifications to receive instant alerts when your order status changes, when there are special promotions, or when loyalty points arrive.'}
                </p>
                <div className="flex justify-center pt-2">
                  <PushNotificationButton />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}