import React, { useState } from 'react';
import { Palette, Upload, Save, Loader2, Store, Image, Type, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const THEME_PRESETS = [
  { name: 'Fresitas Original', primary: '#E8345E', accent: '#5C2D0E', bg: '#FFF5F7' },
  { name: 'Chocolate Oscuro', primary: '#5C2D0E', accent: '#E8345E', bg: '#FFF8F5' },
  { name: 'Rosa Suave', primary: '#E91E8C', accent: '#FF6B9D', bg: '#FFF0F7' },
  { name: 'Verde Fresco', primary: '#2E7D32', accent: '#E8345E', bg: '#F5FFF5' },
  { name: 'Azul Marino', primary: '#1A237E', accent: '#E8345E', bg: '#F5F7FF' },
  { name: 'Dorado Premium', primary: '#B8860B', accent: '#E8345E', bg: '#FFFDF0' },
];

export default function StoreBrandingEditor({ settings, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    store_name: settings?.store_name || 'Fresitas G&F',
    store_tagline_es: settings?.store_tagline_es || 'Fresitas con crema, chocolate y más',
    store_tagline_en: settings?.store_tagline_en || 'Strawberries with cream, chocolate and more',
    logo_url: settings?.logo_url || '',
    primary_color: settings?.primary_color || '#E8345E',
    accent_color: settings?.accent_color || '#5C2D0E',
    open_hours: settings?.open_hours || '10:00 - 22:00',
    whatsapp_number: settings?.whatsapp_number || '',
    instagram_url: settings?.instagram_url || '',
    facebook_url: settings?.facebook_url || '',
    referral_points: settings?.referral_points || 50,
    referral_enabled: settings?.referral_enabled !== false,
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, logo_url: file_url }));
      toast.success('Logo subido');
    } catch (err) {
      toast.error('Error al subir logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let saved;
      if (settings?.id) {
        saved = await base44.entities.StoreSettings.update(settings.id, form);
      } else {
        saved = await base44.entities.StoreSettings.create(form);
      }
      onSaved(saved);
      toast.success('Identidad de la tienda guardada');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Identity */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-lg flex items-center gap-2">
          <Store className="w-5 h-5 text-strawberry" /> Identidad de la Tienda
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Nombre de la Tienda</Label>
            <Input
              value={form.store_name}
              onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))}
              className="rounded-xl"
              placeholder="Fresitas G&F"
            />
          </div>
          <div className="space-y-1">
            <Label>Horario de Atención</Label>
            <Input
              value={form.open_hours}
              onChange={e => setForm(p => ({ ...p, open_hours: e.target.value }))}
              className="rounded-xl"
              placeholder="10:00 - 22:00"
            />
          </div>
          <div className="space-y-1">
            <Label>Tagline (Español)</Label>
            <Input
              value={form.store_tagline_es}
              onChange={e => setForm(p => ({ ...p, store_tagline_es: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label>Tagline (English)</Label>
            <Input
              value={form.store_tagline_en}
              onChange={e => setForm(p => ({ ...p, store_tagline_en: e.target.value }))}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-lg flex items-center gap-2">
          <Image className="w-5 h-5 text-strawberry" /> Logo de la Tienda
        </h3>

        <div className="flex items-start gap-6 flex-wrap">
          {/* Preview */}
          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center">
                <Store className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground mt-1">Sin logo</p>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-strawberry/40 bg-strawberry/5 hover:bg-strawberry/10 transition-colors w-fit">
                {uploadingLogo
                  ? <Loader2 className="w-4 h-4 text-strawberry animate-spin" />
                  : <Upload className="w-4 h-4 text-strawberry" />}
                <span className="text-sm text-strawberry font-medium">
                  {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                </span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            <div className="space-y-1">
              <Label className="text-xs">O pega una URL de imagen</Label>
              <Input
                value={form.logo_url}
                onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
                className="rounded-xl text-xs"
                placeholder="https://..."
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG o SVG, fondo transparente. Máx 2MB.</p>
          </div>
        </div>
      </div>

      {/* Color Theme */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-lg flex items-center gap-2">
          <Palette className="w-5 h-5 text-strawberry" /> Colores del Tema
        </h3>

        {/* Preset themes */}
        <div>
          <Label className="mb-2 block">Presets Rápidos</Label>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => setForm(p => ({ ...p, primary_color: preset.primary, accent_color: preset.accent }))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:border-strawberry/50 transition-all text-xs"
                style={{ borderLeftColor: preset.primary, borderLeftWidth: 4 }}
              >
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: preset.primary }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                </div>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Color Principal</Label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-border flex-shrink-0 overflow-hidden">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
                  className="w-full h-full cursor-pointer border-0 p-0"
                />
              </div>
              <Input
                value={form.primary_color}
                onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
                className="rounded-xl font-mono text-sm"
                placeholder="#E8345E"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color Acento (Chocolate)</Label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-border flex-shrink-0 overflow-hidden">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))}
                  className="w-full h-full cursor-pointer border-0 p-0"
                />
              </div>
              <Input
                value={form.accent_color}
                onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))}
                className="rounded-xl font-mono text-sm"
                placeholder="#5C2D0E"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: form.primary_color }}>
            <span className="font-poppins font-bold text-white text-sm">Fresitas G&F</span>
            <div className="ml-auto flex gap-1">
              {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/40" />)}
            </div>
          </div>
          <div className="p-4 bg-muted/50 flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl text-white text-xs font-medium" style={{ background: form.primary_color }}>
              Ordenar Ahora
            </div>
            <div className="px-4 py-2 rounded-xl text-white text-xs font-medium" style={{ background: form.accent_color }}>
              Ver Menú
            </div>
          </div>
        </div>
      </div>

      {/* Social & Contact */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-strawberry" /> Redes Sociales y Contacto
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>WhatsApp (con código de país)</Label>
            <Input value={form.whatsapp_number} onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="525512345678" className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>Instagram URL</Label>
            <Input value={form.instagram_url} onChange={e => setForm(p => ({ ...p, instagram_url: e.target.value }))} placeholder="https://instagram.com/fresitasgf" className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>Facebook URL</Label>
            <Input value={form.facebook_url} onChange={e => setForm(p => ({ ...p, facebook_url: e.target.value }))} placeholder="https://facebook.com/fresitasgf" className="rounded-xl" />
          </div>
        </div>
      </div>

      {/* Referral Program Settings */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-poppins font-semibold text-lg flex items-center gap-2">
          <Type className="w-5 h-5 text-strawberry" /> Programa de Referidos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Puntos por Referido (para ambos)</Label>
            <Input
              type="number"
              value={form.referral_points}
              onChange={e => setForm(p => ({ ...p, referral_points: parseInt(e.target.value) }))}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Ambos usuarios (referidor y referido) reciben esta cantidad</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full bg-strawberry text-white hover:bg-strawberry/90 rounded-xl h-12 text-base font-semibold">
        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
        Guardar Todos los Cambios
      </Button>
    </div>
  );
}