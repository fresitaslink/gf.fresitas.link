import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AvatarUpload({ currentUrl, name, onUpload, size = 'md' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-lg';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpload(file_url);
      toast.success('Foto actualizada');
    } catch (err) {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group cursor-pointer" onClick={() => !uploading && inputRef.current?.click()}>
      <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-border bg-gradient-to-br from-strawberry/20 to-pink-200 dark:from-strawberry/30 dark:to-pink-900/40 flex items-center justify-center`}>
        {currentUrl ? (
          <img src={currentUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-strawberry">{(name || '?')[0].toUpperCase()}</span>
        )}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}