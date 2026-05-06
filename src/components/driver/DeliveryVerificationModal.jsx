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

  const handleVerifyPin = () => {
    if (pinInput.trim() === order.verification_pin) {
      toast.success('PIN verificado ✓');
      setStep('photo');
    } else {
      toast.error('PIN incorrecto');
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
      // Upload photo
      const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({
        file: photoFile
      });

      // Mark as delivered
      await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'delivered',
        driver_last_location_update: new Date().toISOString()
      });

      // Update delivery verification
      await base44.asServiceRole.entities.DeliveryVerification.update(
        (await base44.asServiceRole.entities.DeliveryVerification.filter({ order_id: order.id }))[0]?.id,
        {
          pin_verified: true,
          verification_status: 'verified',
          driver_photo_url: uploadRes.file_url,
          driver_photo_timestamp: new Date().toISOString()
        }
      );

      toast.success('✅ ¡Entrega completada!');
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
              placeholder="Código de 4 dígitos"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.slice(0, 4))}
              maxLength="4"
              className="text-center text-2xl tracking-widest font-bold"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Código correcto: {order.verification_pin}
            </p>
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