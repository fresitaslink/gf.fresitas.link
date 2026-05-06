import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, User, Menu, X, Sun, Moon, Bot, Crown, Shield,
  Truck, ChevronDown, Home, Package, Heart, Star, MessageCircle,
  Users, BarChart2, Settings, Zap, Gift, FileText, Map, Layers,
  BookOpen, Tag, Bell, LogIn
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationDrawer from '@/components/layout/NotificationDrawer';

// ── Dropdown Menu Component ─────────────────────────────────────────────────
function NavDropdown({ label, icon: Icon, items, roleColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAnyActive = items.some(i => i.to === location.pathname);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-muted ${
          isAnyActive || open
            ? 'text-strawberry bg-strawberry/8'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 w-52 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden py-1.5"
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
                  <span>{item.label}</span>
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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
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
    adminItems.push({ to: '/logistica', label: 'Logística', icon: Map, iconColor: 'text-indigo-500' });
  }
  if (user?.role === 'delivery') {
    adminItems.push({ to: '/driver', label: 'App Repartidor 🚗', icon: Truck, iconColor: 'text-blue-500' });
  }

  // ── All mobile links flat ──────────────────────────────────────────────────
  const allMobileLinks = [...customerItems, ...(adminItems.length > 0 ? [{ divider: true }, ...adminItems] : [])];

  const isAdmin = ['admin', 'owner', 'manager', 'delivery'].includes(user?.role);
  const roleIcon = user?.role === 'owner' ? Crown : user?.role === 'manager' ? Shield : user?.role === 'delivery' ? Truck : null;
  const roleColor = user?.role === 'owner' ? 'text-gold' : user?.role === 'manager' ? 'text-purple-500' : 'text-blue-500';

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

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-1.5 group flex-shrink-0 mr-1">
            <span className="text-xl font-poppins font-black text-strawberry">Fresitas</span>
            <span className="text-xl font-poppins font-black text-chocolate hidden sm:inline">G&F</span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {/* Quick direct links */}
            <Link
              to="/menu"
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/menu' ? 'text-strawberry' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              {language === 'es' ? 'Menú' : 'Menu'}
            </Link>

            {/* Customer dropdown */}
            <NavDropdown
              label={language === 'es' ? 'Mi Cuenta' : 'My Account'}
              icon={User}
              items={customerItems}
            />

            {/* Admin dropdown — only for staff */}
            {isAdmin && adminItems.length > 0 && (
              <NavDropdown
                label={language === 'es' ? 'Panel' : 'Panel'}
                icon={Settings}
                items={adminItems}
                roleColor={roleColor}
              />
            )}
          </div>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-0.5 ml-auto">

            {/* Store Status pill */}
            <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              storeOpen
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${storeOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="hidden lg:inline">{storeOpen ? t.open : t.closed}</span>
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
                <button className="p-1.5 relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                  <div className="w-7 h-7 rounded-full bg-strawberry/10 flex items-center justify-center">
                    {roleIcon ? (
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
                <span className="hidden sm:inline">{t.login}</span>
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
            className="md:hidden bg-background border-t border-border overflow-hidden"
          >
            <div className="px-4 py-3 space-y-0.5 max-h-[75vh] overflow-y-auto">
              {allMobileLinks.map((link, i) => {
                if (link.divider) return <div key={i} className="my-2 border-t border-border" />;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-strawberry/10 text-strawberry'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.icon && <link.icon className={`w-4 h-4 flex-shrink-0 ${link.iconColor || 'text-muted-foreground'}`} />}
                    {link.label}
                    {link.badge && <Badge className={`ml-auto text-xs ${link.badge.cls}`}>{link.badge.label}</Badge>}
                  </Link>
                );
              })}
              {!user && (
                <button
                  className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 bg-strawberry text-white rounded-xl font-semibold text-sm"
                  onClick={() => base44.auth.redirectToLogin()}
                >
                  <LogIn className="w-4 h-4" /> {t.login}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}