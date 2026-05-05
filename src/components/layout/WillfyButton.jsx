import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WillfyButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-card border border-border rounded-2xl shadow-2xl p-3 mb-1 min-w-[180px]"
          >
            <p className="font-poppins font-bold text-sm text-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-strawberry" /> Willfy AI
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Tu asistente de Fresitas</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Link to="/chat">
        <motion.div
          className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(var(--strawberry)), #e91e8c)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          {/* Willfy W logo */}
          <span className="font-poppins font-black text-white text-xl leading-none select-none">W</span>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-strawberry/40 animate-ping" />
        </motion.div>
      </Link>
    </div>
  );
}