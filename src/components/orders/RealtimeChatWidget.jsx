import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MapPin, Phone, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function RealtimeChatWidget({ order, driver, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (order?.id && order?.status === 'on_the_way') {
      loadMessages();
      subscribeToMessages();
      subscribeToLocation();

      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [order?.id, order?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const chats = await base44.entities.ChatMessage.filter(
        { conversation_id: order.id },
        '-created_date',
        100
      );
      setMessages(chats.reverse());
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const subscribeToMessages = () => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversation_id === order.id) {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  };

  const subscribeToLocation = () => {
    const unsub = base44.entities.Driver.subscribe((event) => {
      if (event.type === 'update' && event.data?.user_email === driver?.user_email) {
        setLiveLocation({
          lat: event.data.current_lat,
          lng: event.data.current_lng,
          timestamp: event.data.last_location_update
        });
      }
    });
    return unsub;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
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
      });

      setNewMessage('');
      await loadMessages();
    } catch (err) {
      toast.error('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const handleShareLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const locationMsg = `📍 Estoy en: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setNewMessage(locationMsg);
      });
    }
  };

  if (order?.status !== 'on_the_way') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-96 z-40"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-strawberry to-strawberry/80 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Chat con {driver?.full_name || 'Repartidor'}</p>
            <p className="text-xs opacity-90">{driver?.vehicle_model} · {driver?.vehicle_plate}</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location preview */}
        {liveLocation && (
          <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              📍 En ruta — Actualizado hace {Math.round((Date.now() - new Date(liveLocation.timestamp)) / 1000)}s
            </span>
            <a
              href={`https://maps.google.com/?q=${liveLocation.lat},${liveLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-strawberry hover:underline text-xs font-medium"
            >
              Ver mapa
            </a>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Inicia una conversación con el repartidor
            </p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-xs ${
                    msg.is_admin
                      ? 'bg-muted text-foreground'
                      : 'bg-strawberry text-white'
                  }`}
                >
                  <p>{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.is_admin ? 'text-muted-foreground/70' : 'opacity-60'}`}>
                    {new Date(msg.created_date).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="border-t border-border p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              disabled={loading}
              className="text-xs rounded-lg"
            />
            <Button
              type="submit"
              disabled={loading || !newMessage.trim()}
              size="icon"
              className="bg-strawberry hover:bg-strawberry/90 h-8 w-8"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleShareLocation}
              className="flex-1 px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center gap-1"
            >
              <MapPin className="w-3 h-3" /> Mi ubicación
            </button>
            {driver?.phone && (
              <a href={`tel:${driver.phone}`} className="flex-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full h-auto py-1 text-xs gap-1"
                >
                  <Phone className="w-3 h-3" /> Llamar
                </Button>
              </a>
            )}
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}