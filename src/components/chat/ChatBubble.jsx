import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, MoreHorizontal, Smile, Trash2, Reply, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const REACTIONS = ['❤️', '😂', '👍', '🔥', '🍓', '😮'];

const ROLE_LABELS = {
  owner: { label: 'Owner', color: 'text-gold', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  admin: { label: 'Admin', color: 'text-gold', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  manager: { label: 'Manager', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  delivery: { label: 'Repartidor', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  willfy: { label: 'Willfy AI', color: 'text-strawberry', bg: 'bg-pink-100 dark:bg-pink-900/30' },
};

export default function ChatBubble({ msg, isOwn, viewerRole, onReact, onDelete, compact = false }) {
  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [copied, setCopied] = useState(false);
  const optionsRef = useRef(null);

  const isAdmin = msg.is_admin || msg.is_willfy;
  const isWillfy = msg.is_willfy;

  const senderName = isWillfy
    ? 'Willfy'
    : msg.sender_name || (isAdmin ? 'Fresitas G&F' : 'Tú');

  const role = isWillfy ? 'willfy' : msg.sender_role;
  const roleInfo = ROLE_LABELS[role];

  const dateStr = (() => {
    try {
      return format(new Date(msg.created_date), "d MMM · HH:mm", { locale: es });
    } catch {
      return '';
    }
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.message);
    setCopied(true);
    toast.success('Copiado');
    setTimeout(() => setCopied(false), 2000);
    setShowOptions(false);
  };

  const avatarContent = isWillfy ? (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, hsl(var(--strawberry)), #e91e8c)' }}>
      <span className="font-poppins font-black text-white text-xs">W</span>
    </div>
  ) : msg.sender_avatar ? (
    <img src={msg.sender_avatar} alt={senderName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-border" />
  ) : (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-strawberry/20 to-pink-200 dark:from-strawberry/30 dark:to-pink-900/40 border-2 border-border">
      <span className="text-sm font-bold text-strawberry">{(senderName || '?')[0].toUpperCase()}</span>
    </div>
  );

  return (
    <div className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!compact && avatarContent}

      <div className={`flex flex-col max-w-xs sm:max-w-sm ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender info */}
        {!compact && !isOwn && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-semibold text-foreground">{senderName}</span>
            {roleInfo && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleInfo.bg} ${roleInfo.color} flex items-center gap-0.5`}>
                {isWillfy && <Sparkles className="w-2.5 h-2.5" />}
                {roleInfo.label}
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm cursor-pointer select-text
              ${isOwn
                ? 'bg-strawberry text-white rounded-tr-sm'
                : isWillfy
                  ? 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/30 text-foreground border border-pink-200 dark:border-pink-900 rounded-tl-sm'
                  : 'bg-card text-foreground rounded-tl-sm border border-border'
              }`}
            onDoubleClick={() => setShowReactions(r => !r)}
          >
            {/* Willfy typing indicator or message */}
            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>

            {/* Reactions display */}
            {msg.reactions?.length > 0 && (
              <div className="flex gap-0.5 mt-1 flex-wrap">
                {msg.reactions.map((r, i) => (
                  <span key={i} className="text-sm">{r}</span>
                ))}
              </div>
            )}
          </div>

          {/* Hover options */}
          <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}`}>
            <button
              onClick={() => setShowOptions(o => !o)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowReactions(r => !r)}
              className="w-7 h-7 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Smile className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Options dropdown */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute z-50 top-0 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px] ${isOwn ? 'right-full mr-8' : 'left-full ml-8'}`}
              >
                <button onClick={handleCopy} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar
                </button>
                {isOwn && onDelete && (
                  <button onClick={() => { onDelete(msg.id); setShowOptions(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reactions picker */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className={`absolute z-50 bottom-full mb-2 bg-card border border-border rounded-2xl shadow-xl px-2 py-1.5 flex gap-1.5 ${isOwn ? 'right-0' : 'left-0'}`}
              >
                {REACTIONS.map(r => (
                  <button key={r} className="text-lg hover:scale-125 transition-transform" onClick={() => { onReact?.(msg.id, r); setShowReactions(false); }}>
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] mt-0.5 px-1 ${isOwn ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
          {dateStr}
        </p>
      </div>
    </div>
  );
}