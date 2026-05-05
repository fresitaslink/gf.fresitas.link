import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ENTITY_CONFIGS = {
  Product: {
    label: 'Productos',
    fields: [
      { key: 'name_es', label: 'Nombre (ES)', required: true },
      { key: 'name_en', label: 'Nombre (EN)', required: false },
      { key: 'price', label: 'Precio', required: true, type: 'number' },
      { key: 'category', label: 'Categoría', required: false },
      { key: 'description_es', label: 'Descripción (ES)', required: false },
      { key: 'description_en', label: 'Descripción (EN)', required: false },
      { key: 'image_url', label: 'URL Imagen', required: false },
      { key: 'is_available', label: 'Disponible (true/false)', required: false, type: 'boolean' },
    ],
  },
  CustomerProfile: {
    label: 'Clientes',
    fields: [
      { key: 'user_email', label: 'Email', required: true },
      { key: 'display_name', label: 'Nombre', required: false },
      { key: 'phone', label: 'Teléfono', required: false },
      { key: 'loyalty_points', label: 'Puntos', required: false, type: 'number' },
    ],
  },
  PromoCode: {
    label: 'Códigos Promo',
    fields: [
      { key: 'code', label: 'Código', required: true },
      { key: 'discount_type', label: 'Tipo (percent/fixed)', required: true },
      { key: 'discount_value', label: 'Valor Descuento', required: true, type: 'number' },
      { key: 'min_order', label: 'Pedido Mínimo', required: false, type: 'number' },
      { key: 'valid_until', label: 'Válido Hasta (YYYY-MM-DD)', required: false },
    ],
  },
};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = [];
    let cur = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

export default function CSVImport() {
  const fileRef = useRef(null);
  const [entity, setEntity] = useState('Product');
  const [csvData, setCsvData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('upload'); // upload | map | preview | done

  const config = ENTITY_CONFIGS[entity];

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      if (rows.length === 0) { toast.error('CSV vacío o inválido'); return; }
      setCsvData({ headers, rows });
      // Auto-map fields that match
      const autoMap = {};
      config.fields.forEach(f => {
        const match = headers.find(h => h.toLowerCase() === f.key.toLowerCase() || h.toLowerCase() === f.label.toLowerCase());
        if (match) autoMap[f.key] = match;
      });
      setMapping(autoMap);
      setStep('map');
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData) return;
    setImporting(true);
    try {
      const records = csvData.rows.map(row => {
        const record = {};
        config.fields.forEach(f => {
          const csvCol = mapping[f.key];
          if (!csvCol) return;
          let val = row[csvCol];
          if (val === undefined || val === '') return;
          if (f.type === 'number') val = parseFloat(val) || 0;
          if (f.type === 'boolean') val = val === 'true' || val === '1' || val === 'yes';
          record[f.key] = val;
        });
        return record;
      }).filter(r => {
        const requiredOk = config.fields.filter(f => f.required).every(f => r[f.key] !== undefined && r[f.key] !== '');
        return requiredOk;
      });

      if (records.length === 0) { toast.error('Ningún registro válido para importar'); setImporting(false); return; }

      let success = 0, failed = 0;
      for (const record of records) {
        try {
          await base44.entities[entity].create(record);
          success++;
        } catch {
          failed++;
        }
      }
      setResult({ success, failed, total: records.length });
      setStep('done');
      toast.success(`${success} registros importados exitosamente`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setCsvData(null);
    setMapping({});
    setResult(null);
    setStep('upload');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="space-y-1">
          <p className="text-sm font-medium">Importar en:</p>
          <Select value={entity} onValueChange={(v) => { setEntity(v); reset(); }}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTITY_CONFIGS).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 text-sm text-muted-foreground bg-muted rounded-xl p-3">
          <p className="font-medium mb-1">Campos de {config.label}:</p>
          <div className="flex flex-wrap gap-1">
            {config.fields.map(f => (
              <span key={f.key} className={`text-xs px-2 py-0.5 rounded-full border ${f.required ? 'bg-strawberry/10 border-strawberry/30 text-strawberry' : 'bg-background border-border text-muted-foreground'}`}>
                {f.key}{f.required ? '*' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {step === 'upload' && (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-strawberry/40 rounded-2xl cursor-pointer hover:bg-strawberry/5 transition-colors">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <Upload className="w-8 h-8 text-strawberry/60 mb-2" />
          <p className="text-sm font-medium text-foreground">Haz clic o arrastra tu archivo CSV</p>
          <p className="text-xs text-muted-foreground mt-1">Formato: .csv con encabezados en la primera fila</p>
        </label>
      )}

      {step === 'map' && csvData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{csvData.rows.length} filas detectadas</span>
              <span className="text-xs text-muted-foreground">Columnas: {csvData.headers.join(', ')}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <h4 className="font-semibold text-sm mb-3">Mapeo de Columnas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.fields.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <div className="flex-1 text-xs">
                    <span className="font-medium">{f.label}</span>
                    {f.required && <span className="text-strawberry ml-0.5">*</span>}
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <Select value={mapping[f.key] || '__none'} onValueChange={(v) => setMapping(prev => ({ ...prev, [f.key]: v === '__none' ? undefined : v }))}>
                    <SelectTrigger className="w-36 h-8 rounded-lg text-xs">
                      <SelectValue placeholder="No mapear" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No mapear</SelectItem>
                      {csvData.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-xl p-4 max-h-48 overflow-y-auto">
            <h4 className="font-semibold text-xs mb-2 text-muted-foreground uppercase">Vista Previa (5 filas)</h4>
            <div className="space-y-1">
              {csvData.rows.slice(0, 5).map((row, i) => (
                <div key={i} className="text-xs bg-background rounded-lg px-3 py-1.5 font-mono">
                  {Object.entries(mapping).filter(([, col]) => col).map(([field, col]) => `${field}: "${row[col] || ''}"`).join(' | ')}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleImport} disabled={importing} className="w-full bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
            {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando…</> : <><Upload className="w-4 h-4 mr-2" /> Importar {csvData.rows.length} registros</>}
          </Button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-poppins font-bold text-xl">¡Importación Completada!</h3>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="font-poppins font-black text-2xl text-green-600">{result.success}</div>
              <p className="text-xs text-muted-foreground">Exitosos</p>
            </div>
            {result.failed > 0 && (
              <div className="text-center">
                <div className="font-poppins font-black text-2xl text-red-500">{result.failed}</div>
                <p className="text-xs text-muted-foreground">Fallidos</p>
              </div>
            )}
          </div>
          <Button onClick={reset} variant="outline" className="rounded-xl border-strawberry text-strawberry">
            Importar Otro Archivo
          </Button>
        </div>
      )}
    </div>
  );
}