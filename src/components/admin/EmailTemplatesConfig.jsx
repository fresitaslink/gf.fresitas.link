import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STATUS_CONFIGS = [
  { key: 'confirmed', label: 'Confirmado ✅', color: 'bg-blue-50 border-blue-200' },
  { key: 'preparing', label: 'En Preparación 👨‍🍳', color: 'bg-orange-50 border-orange-200' },
  { key: 'on_the_way', label: 'En Camino 🚗', color: 'bg-purple-50 border-purple-200' },
  { key: 'delivered', label: 'Entregado 🏠', color: 'bg-green-50 border-green-200' },
  { key: 'cancelled', label: 'Cancelado ❌', color: 'bg-red-50 border-red-200' },
];

const DEFAULTS = {
  confirmed: 'Hola {customer_name}! ✅ Tu pedido #{tracking_code} ha sido confirmado. Lo estamos preparando con mucho cariño. ¡Pronto recibirás otra actualización!',
  preparing: 'Hola {customer_name}! 👨‍🍳 ¡Tu pedido #{tracking_code} está siendo preparado! Nuestros expertos en fresitas están trabajando en ello ahora mismo.',
  on_the_way: 'Hola {customer_name}! 🚗 ¡Tu pedido #{tracking_code} ya está en camino! El repartidor está llevando tus fresitas a tu puerta. ¡Prepárate!',
  delivered: 'Hola {customer_name}! 🏠 ¡Tu pedido #{tracking_code} fue entregado! Esperamos que disfrutes tus fresitas. No olvides dejarnos una reseña ⭐',
  cancelled: 'Hola {customer_name}. Tu pedido #{tracking_code} fue cancelado. Si tienes preguntas contáctanos por WhatsApp. Lamentamos los inconvenientes.',
};

export default function EmailTemplatesConfig({ settings, onSaved }) {
  const [templates, setTemplates] = useState({
    email_template_confirmed_es: '',
    email_template_preparing_es: '',
    email_template_on_the_way_es: '',
    email_template_delivered_es: '',
    email_template_cancelled_es: '',
    whatsapp_template_confirmed: '',
    whatsapp_template_on_the_way: '',
    whatsapp_template_delivered: '',
  });
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setTemplates({
        email_template_confirmed_es: settings.email_template_confirmed_es || DEFAULTS.confirmed,
        email_template_preparing_es: settings.email_template_preparing_es || DEFAULTS.preparing,
        email_template_on_the_way_es: settings.email_template_on_the_way_es || DEFAULTS.on_the_way,
        email_template_delivered_es: settings.email_template_delivered_es || DEFAULTS.delivered,
        email_template_cancelled_es: settings.email_template_cancelled_es || DEFAULTS.cancelled,
        whatsapp_template_confirmed: settings.whatsapp_template_confirmed || '✅ Pedido #{tracking_code} confirmado, {customer_name}! Lo estamos preparando.',
        whatsapp_template_on_the_way: settings.whatsapp_template_on_the_way || '🚗 Tu pedido #{tracking_code} ya va en camino, {customer_name}!',
        whatsapp_template_delivered: settings.whatsapp_template_delivered || '🏠 Pedido #{tracking_code} entregado. ¡Gracias por tu preferencia, {customer_name}!',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        await base44.entities.StoreSettings.update(settings.id, templates);
        toast.success('✅ Plantillas de email guardadas');
        onSaved && onSaved(templates);
      }
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) { toast.error('Ingresa un email para probar'); return; }
    setTesting(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: testEmail,
        subject: '🍓 Prueba de notificación — Fresitas G&F',
        body: `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#E8294A;">🍓 Prueba de Email</h2>
          <p>Este es un email de prueba de las notificaciones de Fresitas G&F.</p>
          <p>Las variables disponibles son: <strong>{customer_name}</strong>, <strong>{tracking_code}</strong>, <strong>{total}</strong></p>
        </div>`
      });
      toast.success('Email de prueba enviado a ' + testEmail);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-poppins font-semibold text-lg">Plantillas de Notificación</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Usa <code className="bg-muted px-1 rounded text-xs">{'{customer_name}'}</code>, <code className="bg-muted px-1 rounded text-xs">{'{tracking_code}'}</code>, <code className="bg-muted px-1 rounded text-xs">{'{total}'}</code> como variables dinámicas.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Guardar Plantillas
        </Button>
      </div>

      {/* Test email */}
      <div className="border border-border rounded-xl p-4 bg-muted/30">
        <Label className="text-sm font-semibold mb-2 block">Enviar Email de Prueba</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@ejemplo.com"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            className="rounded-xl"
          />
          <Button onClick={handleTestEmail} disabled={testing} variant="outline" className="rounded-xl flex-shrink-0">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
            Enviar Prueba
          </Button>
        </div>
      </div>

      {/* Email templates */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Plantillas de Email por Estado</h4>
        {STATUS_CONFIGS.map(({ key, label, color }) => (
          <div key={key} className={`border rounded-xl p-4 ${color} dark:bg-muted/20 dark:border-border`}>
            <Label className="font-semibold text-sm mb-2 block">{label}</Label>
            <Textarea
              rows={3}
              value={templates[`email_template_${key}_es`] || ''}
              onChange={e => setTemplates(p => ({ ...p, [`email_template_${key}_es`]: e.target.value }))}
              className="rounded-xl bg-white dark:bg-card text-sm"
              placeholder={DEFAULTS[key]}
            />
          </div>
        ))}
      </div>

      {/* WhatsApp templates */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Mensajes de WhatsApp</h4>
        {[
          { key: 'whatsapp_template_confirmed', label: 'Confirmado ✅' },
          { key: 'whatsapp_template_on_the_way', label: 'En Camino 🚗' },
          { key: 'whatsapp_template_delivered', label: 'Entregado 🏠' },
        ].map(({ key, label }) => (
          <div key={key} className="border border-green-200 bg-green-50 dark:bg-muted/20 dark:border-border rounded-xl p-4">
            <Label className="font-semibold text-sm mb-2 block text-green-800 dark:text-green-400">{label}</Label>
            <Textarea
              rows={2}
              value={templates[key] || ''}
              onChange={e => setTemplates(p => ({ ...p, [key]: e.target.value }))}
              className="rounded-xl bg-white dark:bg-card text-sm"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
        Guardar Todas las Plantillas
      </Button>
    </div>
  );
}