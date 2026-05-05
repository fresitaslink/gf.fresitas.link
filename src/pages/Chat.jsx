import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Chat() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    base44.entities.StoreSettings.list().then(s => { if (s[0]) setSettings(s[0]); });

    // Load existing messages
    base44.entities.ChatMessage.filter({ user_email: user.email }, 'created_date', 50).then(msgs => {
      if (msgs.length === 0) {
        // Show auto-greeting as UI-only message
        setMessages([{ id: 'greeting', message: t.chatGreeting, is_admin: true, created_date: new Date().toISOString() }]);
      } else {
        setMessages(msgs);
      }
    });

    // Real-time subscription
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        if (event.type === 'create') {
          setMessages(prev => {
            if (prev.find(m => m.id === event.id)) return prev;
            return [...prev, event.data];
          });
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      });
      setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  const isStoreOpen = settings?.is_open !== false;

  return (
    <div className="min-h-screen pt-16 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-strawberry to-pink-400 flex items-center justify-center text-white font-bold text-sm">
            🍓
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isStoreOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
        <div>
          <p className="font-semibold text-sm">Fresitas G&F</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Circle className={`w-2 h-2 fill-current ${isStoreOpen ? 'text-green-500' : 'text-gray-400'}`} />
            {isStoreOpen ? t.online : t.offline}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--cream)))' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-xs sm:max-w-sm rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                msg.is_admin
                  ? 'bg-card text-foreground rounded-tl-sm border border-border'
                  : 'bg-strawberry text-white rounded-tr-sm'
              }`}>
                <p className="leading-relaxed">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.is_admin ? 'text-muted-foreground' : 'text-pink-200'}`}>
                  {new Date(msg.created_date).toLocaleTimeString(language === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3 safe-area-pb">
        <div className="flex gap-2 items-center max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={t.yourMessage}
            className="flex-1 rounded-full border-border focus:border-strawberry"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isStoreOpen && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {language === 'es' ? settings?.closed_message_es || 'Estamos cerrados. Respondemos en nuestro horario.' : settings?.closed_message_en || 'We\'re closed. We\'ll respond during business hours.'}
          </p>
        )}
      </div>
    </div>
  );
}