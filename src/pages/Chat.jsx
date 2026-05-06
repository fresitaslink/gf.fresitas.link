import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Circle, Sparkles, Loader2, Brain, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/StoreContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import AvatarUpload from '@/components/chat/AvatarUpload';

const WILLFY_AVATAR = (
  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
    style={{ background: 'linear-gradient(135deg, hsl(var(--strawberry)), #e91e8c)' }}>
    <Brain className="w-4 h-4 text-white" />
  </div>
);

export default function Chat() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { isOpen: isStoreOpen } = useStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [willfyError, setWillfyError] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const conversationRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadData();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadData = async () => {
    try {
      const [profilesData] = await Promise.all([
        base44.entities.CustomerProfile.filter({ user_email: user.email }),
      ]);
      if (profilesData[0]) setProfile(profilesData[0]);

      // Load or create Willfy conversation
      const convList = await base44.agents.listConversations({ agent_name: 'willfy' });
      let conv = convList?.find(c => c.metadata?.user_email === user.email);

      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: 'willfy',
          metadata: {
            user_email: user.email,
            name: profilesData[0]?.display_name || user.full_name,
            role: user.role,
            language,
          },
        });
      } else {
        // Load full conversation with messages
        conv = await base44.agents.getConversation(conv.id);
      }

      setConversation(conv);
      conversationRef.current = conv;

      // Map agent messages to display format
      const agentMsgs = (conv.messages || []).map((m, i) => ({
        id: `agent_${i}`,
        role: m.role,
        content: m.content,
        created_date: m.created_at || new Date().toISOString(),
      }));
      setMessages(agentMsgs);

      // Subscribe to real-time updates
      const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
        const updated = (data.messages || []).map((m, i) => ({
          id: `agent_${i}`,
          role: m.role,
          content: m.content,
          created_date: m.created_at || new Date().toISOString(),
          tool_calls: m.tool_calls,
        }));
        setMessages(updated);
        setIsTyping(false);
      });
      unsubscribeRef.current = unsub;

    } catch (err) {
      console.error('Chat load error:', err);
      // Fallback: show greeting only
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: language === 'es'
          ? '¡Hola! 🍓 Soy **Willfy**, tu asistente de Fresitas G&F. ¿En qué te puedo ayudar hoy?'
          : 'Hi! 🍓 I\'m **Willfy**, your Fresitas G&F assistant. How can I help you today?',
        created_date: new Date().toISOString(),
      }]);
    }
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
    setWillfyError(false);
    setIsTyping(true);

    // Optimistically add user message
    const tempId = `temp_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: text,
      created_date: new Date().toISOString(),
    }]);

    try {
      let conv = conversationRef.current;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: 'willfy',
          metadata: { user_email: user.email, name: profile?.display_name || user.full_name, role: user.role, language },
        });
        setConversation(conv);
        conversationRef.current = conv;

        // Subscribe
        const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
          const updated = (data.messages || []).map((m, i) => ({
            id: `agent_${i}`,
            role: m.role,
            content: m.content,
            created_date: m.created_at || new Date().toISOString(),
            tool_calls: m.tool_calls,
          }));
          setMessages(updated);
          setIsTyping(false);
        });
        unsubscribeRef.current = unsub;
      }

      const updated = await base44.agents.addMessage(conv, { role: 'user', content: text });
      conversationRef.current = updated;
      setConversation(updated);

      // Messages updated via subscription, but also update directly
      const updatedMsgs = (updated.messages || []).map((m, i) => ({
        id: `agent_${i}`,
        role: m.role,
        content: m.content,
        created_date: m.created_at || new Date().toISOString(),
        tool_calls: m.tool_calls,
      }));
      setMessages(updatedMsgs);
      setIsTyping(false);

    } catch (err) {
      console.error('Willfy error:', err);
      setWillfyError(true);
      setIsTyping(false);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(language === 'es' ? 'Willfy no pudo responder, intenta de nuevo' : 'Willfy could not respond, try again');
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    setWillfyError(false);
    loadData();
  };

  const quickReplies = language === 'es'
    ? ['¿Qué hay en el menú?', 'Ver mis pedidos', 'Mis puntos de lealtad', 'Quiero suscribirme']
    : ["What's on the menu?", 'Track my order', 'My loyalty points', 'Subscribe'];

  if (!user) return null;

  const userInitial = (profile?.display_name || user.full_name || user.email || '?')[0].toUpperCase();

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
              {isStoreOpen ? (language === 'es' ? 'En línea · Fresitas G&F' : 'Online · Fresitas G&F') : (language === 'es' ? 'Fuera de horario' : 'Outside hours')}
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
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4"
        style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--cream)) 100%)' }}>

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && WILLFY_AVATAR}
                <div className={`max-w-[80%] ${isUser ? 'items-end flex flex-col' : ''}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-strawberry text-white rounded-br-sm'
                      : 'bg-card border border-border rounded-bl-sm shadow-sm'
                  }`}>
                    {isUser ? (
                      <p>{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        components={{
                          a: ({ children, href }) => <a href={href} className="text-strawberry underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                          p: ({ children }) => <p className="my-1">{children}</p>,
                          ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                          li: ({ children }) => <li className="my-0.5">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        }}
                      >
                        {msg.content || ''}
                      </ReactMarkdown>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(msg.created_date).toLocaleTimeString(language === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-strawberry/10 border border-strawberry/20 flex items-center justify-center flex-shrink-0">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      : <span className="text-xs font-bold text-strawberry">{userInitial}</span>
                    }
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
              {WILLFY_AVATAR}
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">{language === 'es' ? 'Willfy está pensando' : 'Willfy is thinking'}</span>
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 bg-strawberry rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {willfyError && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={handleRetry} className="rounded-full text-xs gap-1.5 border-strawberry/40 text-strawberry">
              <RefreshCw className="w-3 h-3" /> {language === 'es' ? 'Reintentar' : 'Retry'}
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {messages.length <= 2 && !isTyping && (
        <div className="flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-background/80 backdrop-blur-sm">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => { setInput(reply); inputRef.current?.focus(); }}
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
              disabled={sending || isTyping}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || isTyping}
            className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full w-11 h-11 p-0 flex-shrink-0 shadow-md"
          >
            {sending || isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {!isStoreOpen && (
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            ⏰ {language === 'es' ? 'Estamos cerrados. Willfy responde 24/7.' : "We're closed. Willfy replies 24/7."}
          </p>
        )}
      </div>
    </div>
  );
}