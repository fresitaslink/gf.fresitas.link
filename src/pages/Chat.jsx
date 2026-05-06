import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, MessageCircle, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) loadMessages(u.email);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (email) => {
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { user_email: email },
        'created_date',
        100
      );
      setMessages(msgs);
    } catch (err) {
      toast.error('No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.user_email !== user.email) return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsub;
  }, [user?.email]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: text,
        is_admin: false,
        is_read: false,
        sender_name: user.full_name || user.email,
        conversation_id: user.email,
      });
    } catch (err) {
      toast.error('No se pudo enviar el mensaje');
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <MessageCircle className="w-16 h-16 text-strawberry mx-auto" />
          <h2 className="font-poppins font-bold text-2xl">Chat con Soporte</h2>
          <p className="text-muted-foreground">Inicia sesión para chatear con nosotros</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-strawberry text-white">
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-10 h-10 rounded-full bg-strawberry/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-strawberry" />
        </div>
        <div>
          <h1 className="font-poppins font-bold text-foreground">Chat con Soporte</h1>
          <p className="text-xs text-muted-foreground">Fresitas G&F • Respondemos rápido 🍓</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-strawberry" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">Empieza la conversación. ¡Estamos aquí para ayudarte!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = !msg.is_admin;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-strawberry flex items-center justify-center flex-shrink-0 mt-1">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-strawberry text-white rounded-tr-sm'
                    : 'bg-card border border-border text-foreground rounded-tl-sm'
                }`}>
                  {!isMe && (
                    <p className="text-xs font-semibold text-strawberry mb-1">
                      {msg.sender_name || 'Soporte'}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isMe && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <Textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje... (Enter para enviar)"
            rows={1}
            className="resize-none rounded-xl flex-1 min-h-[42px] max-h-32"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl h-10 w-10 p-0 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}