import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Mail, Send, Loader2, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];
const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando', on_the_way: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado' };
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  on_the_way: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const EMAIL_TEMPLATES = {
  open: {
    subject: '🍓 ¡Fresitas G&F está abierto ahora!',
    body: 'Hola {nombre},\n\n¡Ya estamos abiertos y listos para tomar tu pedido! 🍓\n\nVen a disfrutar nuestras ricas fresitas con crema, chocolate y más.\n\nHorario de hoy: {horario}\n\n¡Te esperamos!\nFresitas G&F 🍓'
  },
  promo: {
    subject: '🎉 Promoción especial en Fresitas G&F',
    body: 'Hola {nombre},\n\nTenemos una promoción especial para ti:\n\n{promo}\n\n¡No te lo pierdas! Válido solo por tiempo limitado.\n\n¡Gracias por ser parte de la familia Fresitas! 🍓\nFresitas G&F'
  },
  seasonal: {
    subject: '🍓 Nuevos productos de temporada - Fresitas G&F',
    body: 'Hola {nombre},\n\n¡Llegaron los nuevos sabores de temporada! 🌟\n\n{descripcion}\n\nVisítanos y pruébalos antes de que se agoten.\n\n¡Con mucho cariño,\nFresitas G&F 🍓'
  },
  done: {
    subject: '✅ Resumen del día - Fresitas G&F',
    body: 'Hola {nombre},\n\nGracias por visitarnos hoy. Ya hemos terminado el servicio por hoy.\n\nNos vemos mañana con más frescura y sabor 🍓\n\nHorario mañana: {horario}\n\n¡Hasta pronto!\nFresitas G&F'
  },
};

function OrderCard({ order, onUpdateStatus, onSendEmail }) {
  const [expanded, setExpanded] = useState(false);
  const [emailBody, setEmailBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSendCustomEmail = async () => {
    if (!emailBody.trim() || !order.user_email) return;
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: order.user_email,
        subject: emailSubject || `Actualización de tu pedido #${order.tracking_code}`,
        body: emailBody,
      });
      toast.success(`Email enviado a ${order.user_email}`);
      setEmailBody('');
      setEmailSubject('');
      setShowEmailForm(false);
    } catch (err) {
      toast.error('Error al enviar email');
    } finally {
      setSendingEmail(false);
    }
  };

  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-strawberry">#{order.tracking_code || order.id?.slice(-6)}</span>
            <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</Badge>
            {order.status === 'pending' && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            )}
          </div>
          <p className="font-medium text-sm mt-0.5">{order.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{order.customer_address}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold">${order.total?.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{order.items?.length} items</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {order.customer_phone}</p>
            <p>{order.payment_method} · {new Date(order.created_date).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
            {order.notes && <p className="italic">"{order.notes}"</p>}
            {order.delivery_time_preference && order.delivery_time_preference !== 'asap' && (
              <p className="text-purple-600">📅 {order.delivery_time_preference}</p>
            )}
          </div>

          {/* Items */}
          <div className="space-y-1">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{item.quantity}x {item.name}{item.size ? ` (${item.size})` : ''}</span>
                <span className="font-medium">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Status actions */}
          <div className="flex gap-2 flex-wrap">
            {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button
                size="sm"
                className="text-xs h-7 bg-strawberry text-white hover:bg-strawberry/90 rounded-full"
                onClick={() => onUpdateStatus(order.id, nextStatus)}
              >
                → {STATUS_LABELS[nextStatus]}
              </Button>
            )}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-red-300 text-red-600 rounded-full"
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
              >
                Cancelar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 rounded-full border-blue-200 text-blue-600"
              onClick={() => setShowEmailForm(e => !e)}
            >
              <Mail className="w-3 h-3 mr-1" /> Email al cliente
            </Button>
          </div>

          {/* Email form */}
          {showEmailForm && (
            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Enviar email a {order.user_email || 'cliente'}</p>
              <input
                className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-strawberry"
                placeholder="Asunto..."
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
              <Textarea
                className="text-xs rounded-xl min-h-[80px]"
                placeholder="Escribe tu mensaje aquí..."
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
              />
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-7"
                onClick={handleSendCustomEmail}
                disabled={sendingEmail || !emailBody.trim()}
              >
                {sendingEmail ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                Enviar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveOrdersPanel({ orders, onUpdateStatus }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState('open');
  const [broadcastBody, setBroadcastBody] = useState(EMAIL_TEMPLATES.open.body);
  const [broadcastSubject, setBroadcastSubject] = useState(EMAIL_TEMPLATES.open.subject);
  const [sending, setSending] = useState(false);
  const prevCountRef = useRef(orders.length);
  const audioCtxRef = useRef(null);

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    const newPending = orders.filter(o => o.status === 'pending').length;
    const prevPending = prevCountRef.current;
    if (newPending > prevPending) {
      playNotificationSound();
      setNewOrderCount(c => c + (newPending - prevPending));
      toast('🍓 ¡Nuevo pedido entrante!', { duration: 5000 });
    }
    prevCountRef.current = newPending;
  }, [orders]);

  const handleBroadcastSend = async () => {
    setSending(true);
    try {
      const profiles = await base44.entities.CustomerProfile.list('-created_date', 1000);
      const emails = profiles.map(p => p.user_email).filter(Boolean);
      let sent = 0;
      for (const email of emails.slice(0, 100)) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: broadcastSubject,
            body: broadcastBody.replace('{nombre}', 'cliente'),
          });
          sent++;
        } catch (e) {}
      }
      toast.success(`Email enviado a ${sent} clientes`);
      setShowBroadcast(false);
    } catch (err) {
      toast.error('Error al enviar broadcast');
    } finally {
      setSending(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status));

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(e => !e)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
              soundEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
          </button>
          {newOrderCount > 0 && (
            <button
              onClick={() => setNewOrderCount(0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-yellow-100 text-yellow-800 border border-yellow-200"
            >
              <Bell className="w-3.5 h-3.5 animate-pulse" /> {newOrderCount} nuevo{newOrderCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto text-xs rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={() => setShowBroadcast(b => !b)}
        >
          <Mail className="w-3.5 h-3.5 mr-1.5" /> Email Masivo a Clientes
        </Button>
      </div>

      {/* Broadcast panel */}
      {showBroadcast && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Enviar Email a Todos los Clientes
          </h3>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) => (
              <button
                key={key}
                onClick={() => {
                  setBroadcastTemplate(key);
                  setBroadcastBody(tmpl.body);
                  setBroadcastSubject(tmpl.subject);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  broadcastTemplate === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-background border-border text-foreground'
                }`}
              >
                {key === 'open' ? '🍓 Estamos Abiertos' : key === 'promo' ? '🎉 Promoción' : key === 'seasonal' ? '🌟 Temporada' : '✅ Cerramos Hoy'}
              </button>
            ))}
          </div>
          <input
            className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Asunto del email..."
            value={broadcastSubject}
            onChange={e => setBroadcastSubject(e.target.value)}
          />
          <Textarea
            className="rounded-xl text-sm min-h-[120px]"
            value={broadcastBody}
            onChange={e => setBroadcastBody(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Se enviará a todos los clientes registrados (máx. 100 a la vez). Usa {'{nombre}'} para personalizar.</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              onClick={handleBroadcastSend}
              disabled={sending}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              {sending ? 'Enviando...' : 'Enviar a todos'}
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowBroadcast(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Pendientes ({pendingOrders.length})
          </h3>
          <div className="space-y-2">
            {pendingOrders.map(order => (
              <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />
            ))}
          </div>
        </div>
      )}

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 mt-4">
            🚀 En Progreso ({activeOrders.length})
          </h3>
          <div className="space-y-2">
            {activeOrders.map(order => (
              <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />
            ))}
          </div>
        </div>
      )}

      {pendingOrders.length === 0 && activeOrders.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sin pedidos activos ahora mismo</p>
          <p className="text-xs mt-1">Los nuevos pedidos aparecerán aquí en tiempo real</p>
        </div>
      )}
    </div>
  );
}