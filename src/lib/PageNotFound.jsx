import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-8xl mb-6"
        >
          🍓
        </motion.div>
        <h1 className="font-poppins font-black text-6xl text-strawberry mb-2">404</h1>
        <h2 className="font-poppins font-bold text-2xl text-foreground mb-3">
          ¡Ay, estas fresitas se perdieron!
        </h2>
        <p className="text-muted-foreground mb-8">
          No encontramos la página que buscas. Pero no te preocupes, tenemos muchas otras delicias esperándote.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button className="bg-strawberry hover:bg-strawberry/90 text-white rounded-full px-8">
              🏠 Ir al Inicio
            </Button>
          </Link>
          <Link to="/menu">
            <Button variant="outline" className="border-strawberry text-strawberry hover:bg-strawberry hover:text-white rounded-full px-8">
              🍓 Ver Menú
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}