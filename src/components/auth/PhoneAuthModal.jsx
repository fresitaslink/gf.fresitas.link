import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Lock, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PhoneAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'code' | 'name'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoCode, setDemoCode] = useState(null);

  const handleRequestCode = async () => {
    if (!phone) {
      toast.error('Por favor ingresa tu número');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke('verifyPhoneLogin', {
        action: 'request_code',
        phone
      });

      if (result.data?.success) {
        setDemoCode(result.data.demo_code); // For development
        setStep('code');
        toast.success('Código enviado a tu número');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      toast.error('Ingresa un código válido de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke('verifyPhoneLogin', {
        action: 'verify_code',
        phone,
        code,
        full_name: name
      });

      if (result.data?.success) {
        // Check if need name
        if (!result.data.customer?.display_name || result.data.customer.display_name === 'Usuario Fresitas') {
          setStep('name');
        } else {
          toast.success('¡Bienvenido de vuelta! 🍓');
          onSuccess(result.data);
        }
      }
    } catch (err) {
      toast.error('Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleSetName = async () => {
    if (!name.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }

    toast.success('¡Bienvenido ' + name + '! 🍓');
    onSuccess({ name, phone });
    handleClose();
  };

  const handleClose = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setName('');
    setDemoCode(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-3xl max-w-md w-full p-6 relative"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🍓</div>
              <h2 className="font-poppins font-bold text-2xl">Fresitas G&F</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 'phone' && 'Inicia sesión con tu teléfono'}
                {step === 'code' && 'Verifica tu código'}
                {step === 'name' && 'Completa tu perfil'}
              </p>
            </div>

            {/* Phone step */}
            {step === 'phone' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold mb-2 block">Número de Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+52 55 1234 5678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recibirás un código de verificación
                  </p>
                </div>

                <Button
                  onClick={handleRequestCode}
                  disabled={loading || !phone}
                  className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-2.5 font-bold"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Código'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Sin contraseña. Solo teléfono.
                </p>
              </motion.div>
            )}

            {/* Code step */}
            {step === 'code' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold mb-2 block">Código de 6 Dígitos</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="123456"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength="6"
                      className="pl-10 text-center text-2xl tracking-widest rounded-xl"
                    />
                  </div>
                  {demoCode && (
                    <p className="text-xs text-amber-600 mt-2 font-mono">
                      Demo: {demoCode}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-2.5 font-bold"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
                </Button>

                <button
                  onClick={() => setStep('phone')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  ← Cambiar número
                </button>
              </motion.div>
            )}

            {/* Name step */}
            {step === 'name' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold mb-2 block">¿Cómo te llamas?</label>
                  <Input
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSetName}
                  disabled={loading || !name.trim()}
                  className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> ¡Listo!
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}