import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Package, Tag, Star, Gift, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

const TYPE_ICONS = {
  order_update: Package,
  promo: Tag,
  new_product: Star,
  loyalty: Gift,
};

const TYPE_COLORS = {
  order_update: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
  promo: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
  new_product: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
  loyalty: 'bg-green-100 text-green-600 dark:bg-green-900/30',
};

export default function NotificationDrawer() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = () => {
    if (!user) return;
    base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 30)
      .then(notifs => {
        setNotifications(notifs);
        setUnread(notifs.filter(n => !n.is_read).length);
      }).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === user.email) {
        setNotifications(prev => [event.data, ...prev]);
        setUnread(prev => prev + 1);
      }
      if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      }
    });
    return () => unsub();
  }, [user]);

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.is_read);
    await Promise.all(unreadNotifs.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.Notification.update(notif.id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  if (!user) return null;

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-strawberry text-white rounded-full border-2 border-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-full bg-background border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-strawberry" />
                <h2 className="font-poppins font-semibold text-foreground">
                  {language === 'es' ? 'Notificaciones' : 'Notifications'}
                </h2>
                {unread > 0 && (
                  <Badge className="bg-strawberry text-white text-xs">{unread}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs rounded-lg h-7 px-2">
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    {language === 'es' ? 'Leer todo' : 'Mark all read'}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <Bell className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm text-center">
                    {language === 'es' ? 'No hay notificaciones' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map(notif => {
                    const Icon = TYPE_ICONS[notif.type] || Bell;
                    const colorClass = TYPE_COLORS[notif.type] || 'bg-muted text-muted-foreground';
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => markRead(notif)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${!notif.is_read ? 'bg-strawberry/5' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium leading-tight ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {language === 'es' ? notif.title_es : (notif.title_en || notif.title_es)}
                              </p>
                              {!notif.is_read && (
                                <div className="w-2 h-2 rounded-full bg-strawberry flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {language === 'es' ? notif.message_es : (notif.message_en || notif.message_es)}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {new Date(notif.created_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}