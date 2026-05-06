import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Upload, Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function FailedDeliveryReporter({ order, onClose }) {
  const [reason, setReason] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const failureReasons = [
    'customer_not_home',
    'wrong_address',
    'customer_refused',
    'damaged_order',
    'vehicle_issue',
    'accident',
    'other'
  ];

  const reasonLabels = {
    customer_not_home: '❌ Cliente no estaba',
    wrong_address: '🗺️ Dirección incorrecta',
    customer_refused: '👎 Cliente rechazó',
    damaged_order: '📦 Pedido dañado',
    vehicle_issue: '🚗 Problema del vehículo',
    accident: '⚠️ Accidente',
    other: '❓ Otro'
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(result.file_url);
      toast.success('Foto capturada ✅');
    } catch (err) {
      toast.error('Error al subir foto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Selecciona una razón');
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke('handleFailedDelivery', {
        order_id: order.id,
        failure_reason: reasonLabels[reason],
        photo_url: photoUrl,
        driver_email: order.driver_email
      });

      setSubmitted(true);
      toast.success('Fallo reportado - Admin notificado ✅');

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-card rounded-2xl p-6 max-w-sm mx-4 text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-bold text-lg mb-2">Fallo Reportado</h2>
          <p className="text-sm text-muted-foreground mb-4">
            El admin fue notificado por SMS y email. Gracias por la información.
          </p>
        </motion.div>
      </motion.div>
    );
  }

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
          className="bg-white dark:bg-card w-full rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold">Reportar Fallo de Entrega</h2>
                <p className="text-xs text-muted-foreground">#{order.tracking_code} • {order.customer_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">¿Por qué falló la entrega?</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Selecciona una razón..." />
              </SelectTrigger>
              <SelectContent>
                {failureReasons.map(r => (
                  <SelectItem key={r} value={r}>
                    {reasonLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photo Capture */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Foto de Evidencia (opcional)</label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              {photoUrl ? (
                <div>
                  <img src={photoUrl} alt="evidencia" className="w-full max-h-48 object-cover rounded-lg mb-3" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setPhotoUrl('')}
                  >
                    Cambiar Foto
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    disabled={loading}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-medium">Capturar Foto</span>
                    <span className="text-xs text-muted-foreground">Toca para usar cámara</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Notas Adicionales (opcional)</label>
            <Textarea
              placeholder="Describe qué pasó en detalle..."
              value={photoUrl ? '' : ''}
              className="rounded-lg"
              rows={3}
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">ℹ️ Información:</span> El admin será notificado inmediatamente por SMS y email con tu reporte.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-lg"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Reportar Fallo
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}