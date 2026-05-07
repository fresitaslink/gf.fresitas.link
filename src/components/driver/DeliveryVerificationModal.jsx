import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Driver verification modal for delivery completion
 * Collects PIN and proof-of-delivery photo
 */
export default function DeliveryVerificationModal({ order, onComplete }) {
  const [step, setStep] = useState('pin'); // pin → photo → verified
  const [pinInput, setPinInput] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleVerifyPin = async () => {
    let expectedPin = order.verification_pin ? String(order.verification_pin).trim() : null;

    // If the order has no PIN yet (older order), generate one server-side now
    if (!expectedPin) {
      try {
        const newPin = String(Math.floor(1000 + Math.random() * 9000));
        await base44.entities.Order.update(order.id, { verification_pin: newPin });
        expectedPin = newPin;
        toast.info(`PIN generado: ${newPin}. Pídele al cliente que actualice su app y verifique.`);
        return;
      } catch (e) {
        toast.error('No se pudo generar PIN. Contacta al admin.');
        return;
      }
    }

    // Lenient comparison: pad with zeros, strip non-digits
    const normalize = (s) => String(s).replace(/\D/g, '').padStart(4, '0').slice(-4);
    if (normalize(pinInput) === normalize(expectedPin)) {
      toast.success('PIN verificado ✅');
      setStep('photo');
    } else {
      toast.error('PIN incorrecto. Pídele al cliente que confirme el código en su app.');
      setPinInput('');
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => setPhotoPreview(evt.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!photoFile) {
      toast.error('Debes subir una foto');
      return;
    }

    setLoading(true);
    try {
      // Upload photo (frontend SDK — driver is authenticated)
      const uploadRes = await base44.integrations.Core.UploadFile({ file: photoFile });

      // Mark as delivered
      await base44.entities.Order.update(order.id, {
        status: 'delivered',
        driver_last_location_update: new Date().toISOString()
      });

      // Update or create delivery verification
      const existing = await base44.entities.DeliveryVerification.filter({ order_id: order.id });
      const verificationData = {
        pin_verified: true,
        verification_status: 'verified',
        driver_photo_url: uploadRes.file_url,
        driver_photo_timestamp: new Date().toISOString(),
      };
      if (existing[0]) {
        await base44.entities.DeliveryVerification.update(existing[0].id, verificationData);
      } else {
        await base44.entities.DeliveryVerification.create({
          order_id: order.id,
          driver_email: order.assigned_driver_email,
          customer_email: order.user_email || '',
          verification_pin: order.verification_pin,
          ...verificationData,
        });
      }

      toast.success('¡Entrega completada!');
      setStep('verified');
      setTimeout(() => onComplete?.(), 2000);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4 border border-border"
      >
        {step === 'pin' && (
          <>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Verificar Entrega
            </h3>
            <p className="text-sm text-muted-foreground">
              El cliente verá el código en su app. Pídele que lo diga en voz alta.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Código de 4 dígitos"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength="4"
              className="text-center text-2xl tracking-widest font-bold"
              autoFocus
            />
            <Button
              onClick={handleVerifyPin}
              disabled={pinInput.length !== 4}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Verificar PIN
            </Button>
          </>
        )}

        {step === 'photo' && (
          <>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Foto de Entrega
            </h3>
            <p className="text-sm text-muted-foreground">
              Toma una foto con el cliente y el pedido como prueba.
            </p>

            {photoPreview ? (
              <div className="space-y-3">
                <img
                  src={photoPreview}
                  alt="preview"
                  className="w-full rounded-xl object-cover h-48"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Retomar
                  </Button>
                  <Button
                    onClick={handleCompleteDelivery}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>✅ Confirmar</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Toca para subir foto</p>
                <p className="text-xs text-muted-foreground mt-1">o abre la cámara</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </>
        )}

        {step === 'verified' && (
          <div className="text-center space-y-4 py-6">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
            >
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            </motion.div>
            <h3 className="font-bold text-lg">¡Entrega Completada!</h3>
            <p className="text-sm text-muted-foreground">
              Pedido #{order.tracking_code} marcado como entregado.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}