import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, User, Menu, X, Sun, Moon, Bot, Crown, Shield,
  Truck, ChevronDown, Home, Package, Heart, Star, MessageCircle,
  Users, BarChart2, Settings, Zap, Gift, FileText, Map, Layers,
  BookOpen, Tag, Bell, LogIn, DollarSign
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/StoreContext';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import NotificationDrawer from '@/components/layout/NotificationDrawer';


// ── Dropdown Menu Component ─────────────────────────────────────────────────
function NavDropdown({ label, icon: Icon, items, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isAnyActive = items.some(i => i.to === location.pathname);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          isAnyActive || open
            ? 'text-strawberry bg-strawberry/8'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="truncate max-w-[100px]">{label}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-full mt-1.5 w-52 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {items.map((item, i) => {
              if (item.divider) return <div key={i} className="my-1 border-t border-border" />;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    location.pathname === item.to
                      ? 'bg-strawberry/10 text-strawberry font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon && <item.icon className={`w-4 h-4 flex-shrink-0 ${item.iconColor || 'text-muted-foreground'}`} />}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <Badge className={`ml-auto text-xs ${item.badge.cls}`}>{item.badge.label}</Badge>}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Navbar ─────────────────────────────────────────────────────────────
export default function Navbar({ darkMode, toggleDarkMode, storeOpen }) {
  const { t, language, toggleLanguage } = useLanguage();
  const { itemCount } = useCart();
  const { user } = useAuth();
  const { logoUrl, storeName } = useStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    base44.entities.CustomerProfile.filter({ user_email: user.email }).then(profiles => {
      if (profiles[0]?.avatar_url) setAvatarUrl(profiles[0].avatar_url);
    }).catch(() => {});
  }, [user?.email]);

  // Subscribe to profile updates for avatar changes
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.CustomerProfile.subscribe((event) => {
      if ((event.type === 'update' || event.type === 'create') && event.data?.user_email === user.email) {
        setAvatarUrl(event.data?.avatar_url || null);
      }
    });
    return unsub;
  }, [user?.email]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── Customer Links ─────────────────────────────────────────────────────────
  const customerItems = [
    { to: '/menu', label: language === 'es' ? 'Menú' : 'Menu', icon: Home },
    { to: '/orders', label: language === 'es' ? 'Mis Pedidos' : 'My Orders', icon: Package },
    { to: '/favoritos', label: language === 'es' ? 'Favoritos' : 'Favorites', icon: Heart },
    { to: '/suscripciones', label: language === 'es' ? 'Suscripción' : 'Subscribe', icon: Star },
    { to: '/dashboard', label: language === 'es' ? 'Mis Stats' : 'My Stats', icon: BarChart2 },
    { to: '/mi-cuenta', label: language === 'es' ? 'Mi Cuenta' : 'My Account', icon: User },
    { to: '/referral', label: language === 'es' ? 'Referir Amigos' : 'Refer Friends', icon: Users },
    { to: '/blog', label: 'Blog', icon: BookOpen },
    { divider: true },
    { to: '/challenges', label: language === 'es' ? 'Desafíos' : 'Challenges', icon: Zap, iconColor: 'text-amber-500', badge: { label: '🔥', cls: 'bg-amber-100 text-amber-700' } },
    { to: '/rewards', label: language === 'es' ? 'Premios & Puntos' : 'Rewards', icon: Gift, iconColor: 'text-pink-500' },
  ];

  // ── Admin / Staff Links ────────────────────────────────────────────────────
  const adminItems = [];
  if (['admin', 'owner', 'manager'].includes(user?.role)) {
    adminItems.push({ to: '/admin', label: 'Admin Panel', icon: Settings, iconColor: 'text-blue-500' });
  }
  if (['admin', 'owner'].includes(user?.role)) {
    adminItems.push({ to: '/superadmin', label: 'SuperAdmin ⚡', icon: Crown, iconColor: 'text-gold' });
    adminItems.push({ to: '/owner', label: 'Owner Panel', icon: Crown, iconColor: 'text-amber-500' });
    adminItems.push({ to: '/analytics', label: 'Analytics', icon: BarChart2, iconColor: 'text-purple-500' });
    adminItems.push({ to: '/content', label: 'Contenido', icon: Layers, iconColor: 'text-green-500' });
  }
  if (user?.role === 'manager') {
    adminItems.push({ to: '/manager', label: 'Manager Panel', icon: Shield, iconColor: 'text-purple-500' });
  }
  if (['admin', 'owner', 'manager', 'delivery'].includes(user?.role)) {
    adminItems.push({ divider: true });
    adminItems.push({ to: '/drivers', label: 'Conductores', icon: Truck, iconColor: 'text-orange-500' });
    adminItems.push({ to: '/logistica', label: 'Logística', icon: Map, iconColor: 'text-indigo-500' });
  }
  if (['admin', 'owner', 'delivery'].includes(user?.role)) {
    adminItems.push({ to: '/driver', label: 'App Repartidor', icon: Truck, iconColor: 'text-blue-500' });
    adminItems.push({ to: '/driver-earnings', label: 'Mis Ganancias', icon: DollarSign, iconColor: 'text-green-500' });
  }

  const isAdmin = ['admin', 'owner', 'manager', 'delivery'].includes(user?.role);
  const roleIcon = user?.role === 'owner' ? Crown : user?.role === 'manager' ? Shield : user?.role === 'delivery' ? Truck : null;
  const roleColor = user?.role === 'owner' ? 'text-gold' : user?.role === 'manager' ? 'text-purple-500' : 'text-blue-500';

  const adminLabel =
    user?.role === 'owner' ? '👑 Owner' :
    user?.role === 'manager' ? '🛡 Manager' :
    user?.role === 'delivery' ? '🚗 Driver' :
    '⚙️ Admin';

  // All mobile links flat
  const allMobileLinks = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/menu', label: language === 'es' ? 'Menú' : 'Menu', icon: Package },
    { divider: true },
    ...customerItems,
    ...(adminItems.length > 0 ? [{ divider: true }, ...adminItems] : []),
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border'
          : 'bg-background/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5">
        <div className="flex items-center h-14 gap-1">

          {/* ── Logo + Store Name ── */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
            {logoUrl && (
              <img src={logoUrl} alt={storeName || 'Fresitas'} className="h-8 w-auto object-contain" />
            )}
            {/* Fallback text when no logo */}
            {!logoUrl && (
              <>
                <span className="text-lg sm:text-xl font-poppins font-black text-strawberry">Fresitas</span>
                <span className="text-lg sm:text-xl font-poppins font-black text-chocolate hidden sm:inline">G&F</span>
              </>
            )}
            {logoUrl && storeName && (
              <span className="hidden sm:inline text-sm font-poppins font-bold text-foreground">{storeName}</span>
            )}
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0">
            {/* Direct menu link */}
            <Link
              to="/menu"
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                location.pathname === '/menu' ? 'text-strawberry' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {language === 'es' ? 'Menú' : 'Menu'}
            </Link>

            {/* Customer dropdown */}
            {user && (
              <NavDropdown
                label={language === 'es' ? 'Mi Cuenta' : 'My Account'}
                icon={User}
                items={customerItems}
              />
            )}

            {/* Admin dropdown — only for staff */}
            {isAdmin && adminItems.length > 0 && (
              <NavDropdown
                label={adminLabel}
                icon={null}
                items={adminItems}
              />
            )}
          </div>

          {/* Medium screens: show just dropdowns, no direct menu link */}
          <div className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 min-w-0">
            {user && (
              <NavDropdown
                label={language === 'es' ? 'Cuenta' : 'Account'}
                icon={User}
                items={customerItems}
              />
            )}
            {isAdmin && adminItems.length > 0 && (
              <NavDropdown
                label={adminLabel}
                icon={null}
                items={adminItems}
              />
            )}
          </div>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-0.5 ml-auto">

            {/* Store Status pill — hidden on small phones */}
            <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              storeOpen
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${storeOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="hidden lg:inline">{storeOpen ? (t.open || 'Abierto') : (t.closed || 'Cerrado')}</span>
            </div>

            {/* Language */}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {language === 'es' ? 'EN' : 'ES'}
            </button>

            {/* Dark mode */}
            <button onClick={toggleDarkMode} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Willfy AI chat */}
            <Link to="/chat" title="Willfy AI">
              <button className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors">
                <Bot className="w-4 h-4" />
              </button>
            </Link>

            {/* Notifications */}
            {user && <NotificationDrawer />}

            {/* Cart */}
            <Link to="/cart">
              <button className="p-2 relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <ShoppingCart className="w-4 h-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-strawberry text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
            </Link>

            {/* Profile icon or Login */}
            {user ? (
              <Link to="/mi-cuenta">
                <button className="p-1 relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
                  <div className="w-8 h-8 rounded-full bg-strawberry/10 flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-strawberry/40 transition-all">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.full_name || ''} className="w-full h-full object-cover" />
                    ) : roleIcon ? (
                      React.createElement(roleIcon, { className: `w-3.5 h-3.5 ${roleColor}` })
                    ) : (
                      <span className="text-xs font-bold text-strawberry">
                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-strawberry hover:bg-strawberry/90 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.login || 'Entrar'}</span>
              </button>
            )}

            {/* Mobile hamburger — shown below md */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/98 backdrop-blur border-t border-border overflow-hidden"
          >
            <div className="px-3 py-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
              {/* Quick links at top */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Link
                  to="/menu"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    location.pathname === '/menu' ? 'bg-strawberry text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  <Package className="w-4 h-4" /> {language === 'es' ? 'Menú' : 'Menu'}
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {language === 'es' ? 'Carrito' : 'Cart'}
                  {itemCount > 0 && <Badge className="ml-auto bg-strawberry text-white text-xs">{itemCount}</Badge>}
                </Link>
              </div>

              <div className="border-t border-border mb-2" />

              {/* Mobile user avatar + name */}
              {user && (
                <div className="flex items-center gap-3 px-3 py-3 bg-muted rounded-xl mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-strawberry/10 flex items-center justify-center ring-2 ring-strawberry/20 flex-shrink-0">
                    {avatarUrl
                      ? <img src={avatarUrl} alt={user.full_name || ''} className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-strawberry">{(user.full_name || user.email || '?')[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role || 'cliente'}</p>
                  </div>
                  <button onClick={() => { base44.auth.logout(); setMobileOpen(false); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10">
                    {t.logout || 'Salir'}
                  </button>
                </div>
              )}

              {allMobileLinks.map((link, i) => {
                if (link.divider) return <div key={i} className="my-1.5 border-t border-border" />;
                if (link.to === '/menu' || link.to === '/cart') return null; // already shown above
                return (
                  <Link
                    key={link.to + i}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-strawberry/10 text-strawberry'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.icon && <link.icon className={`w-4 h-4 flex-shrink-0 ${link.iconColor || 'text-muted-foreground'}`} />}
                    <span className="flex-1">{link.label}</span>
                    {link.badge && <Badge className={`text-xs ${link.badge.cls}`}>{link.badge.label}</Badge>}
                  </Link>
                );
              })}

              {!user && (
                <button
                  className="w-full flex items-center justify-center gap-2 mt-3 py-3 bg-strawberry text-white rounded-xl font-semibold text-sm"
                  onClick={() => { base44.auth.redirectToLogin(); setMobileOpen(false); }}
                >
                  <LogIn className="w-4 h-4" /> {t.login || 'Iniciar Sesión'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}