import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Circle, Sparkles, AtSign, Loader2, Bot, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChatBubble from '@/components/chat/ChatBubble';
import AvatarUpload from '@/components/chat/AvatarUpload';

const WILLFY_INTRO = "¡Hola! 🍓 Soy **Willfy**, el asistente inteligente de Fresitas G&F. Puedo ayudarte con el menú, rastrear pedidos, consultar tus puntos de lealtad, gestionar tu suscripción y mucho más. ¿En qué te ayudo hoy?";

export default function Chat() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [willfyLoading, setWillfyLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadData();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, willfyLoading]);

  const loadData = async () => {
    const [settingsData, profilesData, msgsData] = await Promise.all([
      base44.entities.StoreSettings.list(),
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
      base44.entities.ChatMessage.filter({ user_email: user.email }, 'created_date', 80),
    ]);

    if (settingsData[0]) setSettings(settingsData[0]);
    if (profilesData[0]) setProfile(profilesData[0]);

    if (msgsData.length === 0) {
      setMessages([{
        id: 'greeting',
        message: WILLFY_INTRO,
        is_admin: true,
        is_willfy: true,
        sender_name: 'Willfy',
        sender_role: 'willfy',
        user_email: user.email,
        created_date: new Date().toISOString(),
      }]);
    } else {
      setMessages(msgsData);
    }

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        if (event.type === 'create') {
          setMessages(prev => prev.find(m => m.id === event.id) ? prev : [...prev, event.data]);
        } else if (event.type === 'delete') {
          setMessages(prev => prev.filter(m => m.id !== event.id));
        } else if (event.type === 'update') {
          setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        }
      }
    });
    unsubscribeRef.current = unsubscribe;
  };

  const handleAvatarUpload = async (url) => {
    if (profile) {
      await base44.entities.CustomerProfile.update(profile.id, { avatar_url: url });
      setProfile(p => ({ ...p, avatar_url: url }));
    } else {
      const created = await base44.entities.CustomerProfile.create({
        user_email: user.email,
        display_name: user.full_name,
        avatar_url: url,
      });
      setProfile(created);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      const msg = await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: text,
        is_admin: false,
        sender_name: profile?.display_name || user.full_name || user.email,
        sender_avatar: profile?.avatar_url || null,
        sender_role: user.role || 'user',
      });
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);

      // Willfy responds to ALL messages automatically
      await handleWillfyResponse(text);
    } finally {
      setSending(false);
    }
  };

  const handleWillfyResponse = async (userText) => {
    setWillfyLoading(true);
    setIsTyping(true);

    try {
      let conv = conversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: 'willfy',
          metadata: {
            user_email: user.email,
            name: profile?.display_name || user.full_name,
            role: user.role,
            language: language,
          },
        });
        setConversation(conv);
      }

      // Build enriched context message
      const contextualText = userText;
      const updated = await base44.agents.addMessage(conv, { role: 'user', content: contextualText });
      setConversation(updated);

      const lastAssistant = [...updated.messages].reverse().find(m => m.role === 'assistant');
      const responseText = lastAssistant?.content || (language === 'es' ? '¡Con gusto te ayudo! 🍓' : 'Happy to help! 🍓');

      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: responseText,
        is_admin: true,
        is_willfy: true,
        sender_name: 'Willfy',
        sender_role: 'willfy',
      });
    } catch (err) {
      console.error('Willfy error:', err);
      toast.error(language === 'es' ? 'Willfy no pudo responder' : 'Willfy could not respond');
    } finally {
      setWillfyLoading(false);
      setIsTyping(false);
    }
  };

  const handleReact = async (msgId, reaction) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.id === 'greeting') return;
    const current = msg.reactions || [];
    const updated = current.includes(reaction) ? current.filter(r => r !== reaction) : [...current, reaction];
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: updated } : m));
    if (msg.id !== 'greeting') {
      await base44.entities.ChatMessage.update(msgId, { reactions: updated }).catch(() => {});
    }
  };

  const handleDelete = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await base44.entities.ChatMessage.delete(msgId).catch(() => {});
  };

  const quickReplies = language === 'es'
    ? ['¿Qué hay en el menú?', 'Ver mis pedidos', 'Mis puntos de lealtad', 'Quiero suscribirme']
    : ['What\'s on the menu?', 'Track my order', 'My loyalty points', 'Subscribe'];

  const handleQuickReply = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  if (!user) return null;
  const isStoreOpen = settings?.is_open !== false;

  return (
    <div className="min-h-screen pt-16 flex flex-col bg-background" style={{ height: '100dvh' }}>

      {/* Chat Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, hsl(var(--strawberry)), #e91e8c)' }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${isStoreOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm font-poppins">Willfy</p>
              <span className="text-[10px] bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 text-strawberry px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-pink-200 dark:border-pink-800">
                <Sparkles className="w-2.5 h-2.5" /> IA Avanzada
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Circle className={`w-2 h-2 fill-current ${isStoreOpen ? 'text-green-500' : 'text-gray-400'}`} />
              {isStoreOpen
                ? (language === 'es' ? 'En línea · Fresitas G&F' : 'Online · Fresitas G&F')
                : (language === 'es' ? 'Fuera de horario' : 'Outside hours')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground hidden sm:block">{profile?.display_name || user.full_name}</p>
          <AvatarUpload
            currentUrl={profile?.avatar_url}
            name={profile?.display_name || user.full_name || user.email}
            onUpload={handleAvatarUpload}
            size="sm"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3"
        style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--cream)) 100%)' }}>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <ChatBubble
                msg={msg}
                isOwn={!msg.is_admin && !msg.is_willfy}
                viewerRole={user.role}
                onReact={handleReact}
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {willfyLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2 pl-2"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(var(--strawberry)), #e91e8c)' }}>
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">{language === 'es' ? 'Willfy está pensando' : 'Willfy is thinking'}</span>
                  <span className="w-1.5 h-1.5 bg-strawberry rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-strawberry rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-strawberry rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies — show only when conversation is fresh */}
      {messages.length <= 2 && !willfyLoading && (
        <div className="flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-background/80 backdrop-blur-sm">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => handleQuickReply(reply)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-strawberry/40 text-strawberry bg-strawberry/5 hover:bg-strawberry hover:text-white transition-all duration-200 font-medium"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3 flex-shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={language === 'es' ? 'Escribe tu mensaje a Willfy…' : 'Message Willfy…'}
              className="flex-1 rounded-2xl border-border focus:border-strawberry resize-none min-h-[44px] max-h-32 py-3 pr-3 text-sm"
              rows={1}
              disabled={sending || willfyLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || willfyLoading}
            className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full w-11 h-11 p-0 flex-shrink-0 shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {sending || willfyLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
        {!isStoreOpen && (
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            {language === 'es'
              ? settings?.closed_message_es || '⏰ Estamos cerrados. Willfy responde 24/7.'
              : "⏰ We're closed. Willfy replies 24/7."}
          </p>
        )}
      </div>
    </div>
  );
}