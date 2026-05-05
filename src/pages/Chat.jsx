import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Circle, Sparkles, AtSign, Image as ImageIcon, Loader2, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ChatBubble from '@/components/chat/ChatBubble';
import AvatarUpload from '@/components/chat/AvatarUpload';

const WILLFY_INTRO = "¡Hola! 🍓 Soy **Willfy**, tu asistente de Fresitas G&F. Puedo ayudarte con el menú, pedidos, puntos de lealtad y más. Escribe **@willfy** en cualquier momento para hablar directamente conmigo.";

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
  const [showMentionHint, setShowMentionHint] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadData();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Subscribe to real-time updates
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

    return () => unsubscribe();
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

    const isWillfyMention = text.toLowerCase().includes('@willfy');

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

      if (isWillfyMention) {
        await handleWillfyResponse(text, msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleWillfyResponse = async (userText, userMsg) => {
    setWillfyLoading(true);
    // Create a temporary thinking bubble
    const thinkingId = 'thinking-' + Date.now();
    setMessages(prev => [...prev, {
      id: thinkingId,
      message: '...',
      is_admin: true,
      is_willfy: true,
      sender_name: 'Willfy',
      sender_role: 'willfy',
      user_email: user.email,
      created_date: new Date().toISOString(),
      _thinking: true,
    }]);

    try {
      // Use Willfy agent conversation
      let conv = conversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: 'willfy',
          metadata: { user_email: user.email, name: profile?.display_name || user.full_name },
        });
        setConversation(conv);
      }

      const updated = await base44.agents.addMessage(conv, { role: 'user', content: userText });
      setConversation(updated);

      const lastAssistant = [...updated.messages].reverse().find(m => m.role === 'assistant');
      const responseText = lastAssistant?.content || '¡Con gusto te ayudo! 🍓';

      // Remove thinking, add real response
      setMessages(prev => prev.filter(m => m.id !== thinkingId));

      await base44.entities.ChatMessage.create({
        user_email: user.email,
        message: responseText,
        is_admin: true,
        is_willfy: true,
        sender_name: 'Willfy',
        sender_role: 'willfy',
      });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
    } finally {
      setWillfyLoading(false);
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setShowMentionHint(val.includes('@') && !val.includes('@willfy'));
  };

  const insertMention = () => {
    setInput(i => i.replace('@', '@willfy '));
    setShowMentionHint(false);
    inputRef.current?.focus();
  };

  if (!user) return null;
  const isStoreOpen = settings?.is_open !== false;

  return (
    <div className="min-h-screen pt-16 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Willfy avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, hsl(var(--strawberry)), #e91e8c)' }}>
              <span className="font-poppins font-black text-white text-sm">W</span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isStoreOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm">Willfy</p>
              <span className="text-[10px] bg-pink-100 dark:bg-pink-900/40 text-strawberry px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Circle className={`w-2 h-2 fill-current ${isStoreOpen ? 'text-green-500' : 'text-gray-400'}`} />
              {isStoreOpen ? 'En línea · Fresitas G&F' : 'Fuera de línea'}
            </p>
          </div>
        </div>

        {/* User avatar upload */}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--cream)))' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: msg._thinking ? [1, 0.4, 1] : 1, y: 0 }}
              transition={msg._thinking ? { repeat: Infinity, duration: 1 } : {}}
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

        {willfyLoading && (
          <div className="flex items-center gap-2 pl-10">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-strawberry" />
              <span className="text-xs text-muted-foreground">Willfy está pensando…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* @willfy hint */}
      <AnimatePresence>
        {showMentionHint && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="px-4 py-2 bg-pink-50 dark:bg-pink-950/30 border-t border-pink-200 dark:border-pink-900"
          >
            <button onClick={insertMention} className="flex items-center gap-2 text-xs text-strawberry font-medium hover:underline">
              <AtSign className="w-3.5 h-3.5" />
              Mencionar @willfy para respuesta de IA
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3">
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`${t.yourMessage || 'Escribe un mensaje'}… (@ para mencionar a Willfy)`}
              className="flex-1 rounded-2xl border-border focus:border-strawberry resize-none min-h-[40px] max-h-28 pr-10 py-2.5"
              rows={1}
              disabled={sending}
            />
            <button
              className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-strawberry transition-colors"
              onClick={() => setShowMentionHint(true)}
              title="Mencionar Willfy"
            >
              <AtSign className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full w-10 h-10 p-0 flex-shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isStoreOpen && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {language === 'es' ? settings?.closed_message_es || 'Estamos cerrados. Respondemos en nuestro horario.' : "We're closed. We'll respond during business hours."}
          </p>
        )}
      </div>
    </div>
  );
}