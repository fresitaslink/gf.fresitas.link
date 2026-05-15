import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, MessageCircle, User, ShieldCheck, Bot, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const WILLFY_KEYWORDS = ['@willfy', 'willfy'];

function Avatar({ url, name, isAdmin, isWillfy, size = 8 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (isWillfy) {
    return (
      <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-strawberry to-pink-500 flex items-center justify-center flex-shrink-0`}>
        <span className="font-poppins font-black text-white text-xs">W</span>
      </div>
    );
  }
  if (url) {
    return <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${isAdmin ? 'bg-strawberry' : 'bg-muted text-muted-foreground'}`}>
      {isAdmin ? <ShieldCheck className="w-4 h-4" /> : initials}
    </div>
  );
}

function MessageBubble({ msg, isMe, userName, userAvatar, onCopy }) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const isWillfy = msg.is_willfy || (msg.sender_name || '').toLowerCase().includes('willfy');

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const senderName = msg.sender_name || (isWillfy ? 'Willfy AI' : msg.is_admin ? 'Soporte' : userName || 'Tú');
  const avatarUrl = isMe ? userAvatar : msg.sender_avatar;

  return (
    <div
      className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isMe && (
        <Avatar url={avatarUrl} name={senderName} isAdmin={msg.is_admin} isWillfy={isWillfy} size={8} />
      )}

      <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name + time */}
        <div className={`flex items-center gap-2 text-xs text-muted-foreground px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {!isMe && <span className="font-semibold text-foreground">{senderName}</span>}
          <span>{new Date(msg.created_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.is_admin && !isWillfy && (
            <span className="bg-strawberry/10 text-strawberry text-xs px-1.5 py-0.5 rounded-full">Rep.</span>
          )}
          {isWillfy && (
            <span className="bg-purple-100 text-purple-600 text-xs px-1.5 py-0.5 rounded-full">IA</span>
          )}
        </div>

        {/* Bubble */}
        <div className="relative">
          <div className={`rounded-2xl px-4 py-2.5 ${
            isMe
              ? 'bg-strawberry text-white rounded-tr-sm'
              : isWillfy
              ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 text-foreground rounded-tl-sm'
              : 'bg-card border border-border text-foreground rounded-tl-sm'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
          </div>

          {/* Action buttons on hover */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-10' : '-right-10'} flex gap-1`}
              >
                <button
                  onClick={handleCopy}
                  className="w-7 h-7 bg-card border border-border rounded-lg flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
                  title="Copiar"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isMe && (
        <Avatar url={userAvatar} name={userName} isAdmin={false} size={8} />
      )}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    Promise.all([
      base44.entities.ChatMessage.filter({ user_email: user.email }, 'created_date', 100),
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
      base44.entities.StoreSettings.list(),
    ]).then(([msgs, profiles, settingsList]) => {
      setMessages(msgs);
      setProfile(profiles[0] || null);
      setSettings(settingsList[0] || null);

      // Auto-greeting if no messages yet
      if (msgs.length === 0) {
        base44.entities.ChatMessage.create({
          user_email: user.email,
          message: '¡Hola! 👋 Gracias por contactar a Fresitas G&F. Estamos aquí para ayudarte. Te respondemos en menos de 30 minutos.\n\nEscribe @willfy al inicio de tu mensaje si quieres hablar con nuestra IA, o simplemente escribe tu pregunta para hablar con un representante. 🍓',
          is_admin: true,
          is_read: true,
          is_willfy: false,
          sender_name: 'Soporte Fresitas G&F',
          conversation_id: user.email,
        }).then(msg => setMessages([msg]));
      }

      // Mark admin messages as read
      msgs.filter(m => m.is_admin && !m.is_read).forEach(m => {
        base44.entities.ChatMessage.update(m.id, { is_read: true }).catch(() => {});
      });
    }).finally(() => setLoading(false));
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.user_email !== user.email) return;
      if (event.type === 'create') {
        setMessages(prev => {
          if (prev.find(m => m.id === event.id)) return prev;
          return [...prev, event.data];
        });
        // Mark admin messages as read in real time
        if (event.data?.is_admin && !event.data?.is_read) {
          base44.entities.ChatMessage.update(event.id, { is_read: true }).catch(() => {});
        }
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsub;
  }, [user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const isWillfyMessage = WILLFY_KEYWORDS.some(kw => text.toLowerCase().startsWith(kw));

    try {
      // Save user message
      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: text,
        is_admin: false,
        is_read: false,
        is_willfy: false,
        sender_name: profile?.display_name || user.full_name || user.email,
        sender_avatar: profile?.avatar_url || '',
        conversation_id: user.email,
      });

      // If @willfy prefix, generate AI response
      if (isWillfyMessage) {
        const cleanText = text.replace(/@willfy\s*/i, '').trim();
        const productList = await base44.entities.Product.list('name_es', 20);
        const productNames = productList.map(p => p.name_es).join(', ');

        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `Eres Willfy, el asistente virtual de Fresitas G&F, una tienda de postres con fresas, crema y chocolate en México. Eres amigable, cálido y conocedor de todos los productos.

Productos disponibles: ${productNames}

Información de la tienda: 
- Horario: ${settings?.open_hours || '10:00 - 22:00'}
- WhatsApp: ${settings?.whatsapp_number || 'disponible'}
- Envío gratis en pedidos mayores a $${settings?.free_delivery_min || 200}
- Costo de envío: $${settings?.delivery_fee || 30}

Pregunta del cliente: ${cleanText}

Responde en español de forma cálida y útil. Si preguntan por productos, menciona los disponibles. Si la pregunta necesita atención humana (quejas serias, reembolsos, problemas de entrega), sugiere hablar con un representante escribiendo sin @willfy.`,
        });

        await base44.entities.ChatMessage.create({
          user_email: user.email,
          message: aiResponse,
          is_admin: true,
          is_read: true,
          is_willfy: true,
          sender_name: 'Willfy AI',
          conversation_id: user.email,
        });
      } else {
        // Notify store (admin) about new customer message
        if (settings?.admin_email) {
          base44.integrations.Core.SendEmail({
            to: settings.admin_email,
            subject: `💬 Nuevo mensaje en Chat - ${profile?.display_name || user.email}`,
            body: `Hay un nuevo mensaje de cliente en el chat de Fresitas G&F.\n\nCliente: ${profile?.display_name || user.full_name || user.email}\nEmail: ${user.email}\nMensaje: "${text}"\n\nResponde desde el panel de Admin → Chat.\n\n— Fresitas G&F`,
          }).catch(() => {});
        }
      }
    } catch (err) {
      toast.error('No se pudo enviar el mensaje');
      setNewMessage(text);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isStoreOnline = settings?.is_open !== false;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-20 px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-strawberry/10 flex items-center justify-center mx-auto">
            <MessageCircle className="w-10 h-10 text-strawberry" />
          </div>
          <h2 className="font-poppins font-bold text-2xl">Chat con Soporte</h2>
          <p className="text-muted-foreground">Inicia sesión para chatear con nosotros o con Willfy AI</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-strawberry text-white rounded-xl w-full">
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  const userName = profile?.display_name || user.full_name || user.email;
  const userAvatar = profile?.avatar_url || '';

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-16 z-10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-strawberry to-pink-500 flex items-center justify-center flex-shrink-0">
          <span className="font-poppins font-black text-white text-sm">F</span>
        </div>
        <div className="flex-1">
          <h1 className="font-poppins font-bold text-sm text-foreground">Chat — Fresitas G&F</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isStoreOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <p className="text-xs text-muted-foreground">
              {isStoreOnline ? 'En línea · Respondemos rápido' : 'Fuera de línea · Dejanos tu mensaje'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 px-2.5 py-1 rounded-full text-xs">
          <Bot className="w-3 h-3" />
          <span>@willfy</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">¡Empieza la conversación!</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={!msg.is_admin}
              userName={userName}
              userAvatar={userAvatar}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* @willfy hint */}
      <div className="max-w-2xl mx-auto w-full px-4 pb-1">
        <p className="text-xs text-muted-foreground text-center">
          Escribe <span className="font-mono text-purple-600 font-semibold">@willfy</span> al inicio para respuesta inmediata de IA, o escribe normalmente para hablar con un representante
        </p>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje o @willfy para IA... (Enter para enviar)"
            rows={1}
            className="resize-none rounded-2xl flex-1 min-h-[42px] max-h-32 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="bg-strawberry text-white hover:bg-strawberry/90 rounded-2xl h-10 w-10 p-0 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
