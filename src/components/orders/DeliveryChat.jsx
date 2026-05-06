import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DeliveryChat({ order, driver, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && order?.id) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, order?.id]);

  const loadMessages = async () => {
    try {
      const chats = await base44.entities.ChatMessage.filter({ conversation_id: order.id }, '-created_date', 50);
      setMessages(chats.reverse());
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const user = await base44.auth.me();

      await base44.entities.ChatMessage.create({
        conversation_id: order.id,
        user_email: user.email,
        message: newMessage,
        sender_name: user.full_name,
        is_admin: false,
        created_date: new Date().toISOString()
      });

      setNewMessage('');
      await loadMessages();
    } catch (err) {
      toast.error('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-end z-50"
      >
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="bg-white dark:bg-card w-full rounded-t-3xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-strawberry to-strawberry/80 text-white p-4 rounded-t-3xl">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-lg">Chat con {driver?.driver_name || 'Repartidor'}</h3>
                <p className="text-xs opacity-90">#{order?.tracking_code}</p>
              </div>
              <button onClick={onClose} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Info */}
            <div className="flex items-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{order?.customer_address?.substring(0, 30)}...</span>
              </div>
              {driver?.current_lat && (
                <a
                  href={`https://maps.google.com/?q=${driver.current_lat},${driver.current_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 opacity-90 hover:opacity-100"
                >
                  <MapPin className="w-3 h-3" />
                  Ver mapa
                </a>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">Inicia una conversación con el repartidor</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                      msg.is_admin
                        ? 'bg-muted text-foreground'
                        : 'bg-strawberry text-white'
                    }`}
                  >
                    <p>{msg.message}</p>
                    <p className={`text-xs ${msg.is_admin ? 'text-muted-foreground' : 'opacity-70'} mt-1`}>
                      {new Date(msg.created_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-border flex gap-2">
            {driver?.phone && (
              <a href={`tel:${driver.phone}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full gap-2">
                  <Phone className="w-3 h-3" /> Llamar
                </Button>
              </a>
            )}
            {driver?.phone && (
              <a href={`https://wa.me/${driver.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full gap-2">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </Button>
              </a>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                disabled={loading}
                className="rounded-2xl"
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !newMessage.trim()}
                className="bg-strawberry text-white hover:bg-strawberry/90 rounded-2xl gap-2"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}