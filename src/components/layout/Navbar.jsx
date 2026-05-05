import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, User, Menu, X, Sun, Moon, Bot, Crown, Shield, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PushNotificationButton from '@/components/ui/PushNotificationButton';
import NotificationDrawer from '@/components/layout/NotificationDrawer';

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

  const navLinks = [
    { to: '/menu', label: t.menu },
    { to: '/orders', label: t.orders },
    { to: '/favoritos', label: t.favorites },
    { to: '/suscripciones', label: language === 'es' ? 'Suscripción' : 'Subscribe' },
    { to: '/chat', label: t.chat },
    { to: '/referral', label: language === 'es' ? 'Referir' : 'Refer' },
    { to: '/dashboard', label: language === 'es' ? 'Mi Stats' : 'My Stats' },
  ];

  if (user?.role === 'admin') navLinks.push({ to: '/admin', label: t.admin });
  if (user?.role === 'manager') navLinks.push({ to: '/manager', label: 'Manager' });
  if (user?.role === 'owner') navLinks.push({ to: '/owner', label: 'Owner' });

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <span className="text-2xl font-poppins font-black text-strawberry group-hover:scale-105 transition-transform inline-block">
                Fresitas
              </span>
              <span className="text-2xl font-poppins font-black text-chocolate"> G&F</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-strawberry ${
                  location.pathname === link.to ? 'text-strawberry' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Store Status */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              storeOpen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${storeOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {storeOpen ? t.open : t.closed}
            </div>

            {/* Push Notifications - desktop only */}
            <div className="hidden lg:block">
              <PushNotificationButton />
            </div>

            {/* Language Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-xs font-bold px-2">
              {language === 'es' ? 'EN' : 'ES'}
            </Button>

            {/* Dark Mode */}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Willfy AI */}
            <a href="https://app.base44.com/agents/willfy" target="_blank" rel="noopener noreferrer" title="Habla con Willfy">
              <Button variant="ghost" size="icon" className="text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                <Bot className="h-4 w-4" />
              </Button>
            </a>

            {/* Notifications Drawer */}
            {user && <NotificationDrawer />}

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-strawberry text-white border-0">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Profile with role indicator */}
            {user ? (
              <Link to="/perfil">
                <Button variant="ghost" size="icon" className="relative">
                  <User className="h-4 w-4" />
                  {user.role === 'owner' && <Crown className="absolute -top-1 -right-1 w-3 h-3 text-gold" />}
                  {user.role === 'manager' && <Shield className="absolute -top-1 -right-1 w-3 h-3 text-purple-500" />}
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="bg-strawberry hover:bg-strawberry/90 text-white"
                onClick={() => base44.auth.redirectToLogin()}
              >
                {t.login}
              </Button>
            )}

            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-secondary text-strawberry'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <Button
                  className="w-full bg-strawberry hover:bg-strawberry/90 text-white mt-2"
                  onClick={() => base44.auth.redirectToLogin()}
                >
                  {t.login}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}