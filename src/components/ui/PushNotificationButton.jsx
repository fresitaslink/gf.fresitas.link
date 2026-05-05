import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PushNotificationButton() {
  const [permission, setPermission] = useState('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('🔔 ¡Notificaciones activadas! Te avisaremos sobre tu pedido.', { duration: 4000 });
      // Show test notification
      new Notification('🍓 Fresitas G&F', {
        body: '¡Notificaciones activadas! Te avisaremos cuando tu pedido esté en camino.',
        icon: '/favicon.ico',
      });
    }
  };

  if (!supported || permission === 'denied') return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestPermission}
      className={`rounded-full text-xs gap-1.5 ${permission === 'granted' ? 'border-green-500 text-green-600' : 'border-strawberry text-strawberry'}`}
    >
      {permission === 'granted' ? (
        <><Bell className="w-3 h-3 fill-green-500" /> Notif. Activas</>
      ) : (
        <><Bell className="w-3 h-3" /> Activar alertas</>
      )}
    </Button>
  );
}

// Utility to show push notification
export function showPushNotification(title, body, link) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
    if (link) {
      notif.onclick = () => { window.focus(); window.location.href = link; };
    }
  }
}