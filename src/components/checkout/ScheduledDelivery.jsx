import React, { useState } from 'react';
import { Calendar, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/LanguageContext';

// Generate time slots from 10:00 to 21:00 every 30 min
function generateTimeSlots() {
  const slots = [];
  for (let h = 10; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 21 && m > 0) break;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

function getMinDate() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getMaxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

const TIME_SLOTS = generateTimeSlots();

export default function ScheduledDelivery({ value, onChange, language }) {
  const [mode, setMode] = useState(value === 'asap' || !value ? 'asap' : 'scheduled');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleModeChange = (m) => {
    setMode(m);
    if (m === 'asap') {
      onChange('asap');
    } else {
      // Only set if both date and time are chosen
      if (date && time) onChange(`${date} ${time}`);
      else onChange('');
    }
  };

  const handleDateChange = (d) => {
    setDate(d);
    if (d && time) onChange(`${d} ${time}`);
    else onChange('');
  };

  const handleTimeChange = (t) => {
    setTime(t);
    if (date && t) onChange(`${date} ${t}`);
    else onChange('');
  };

  const isToday = date === getMinDate();

  // Filter time slots: if today, only future slots (at least 1h from now)
  const availableSlots = TIME_SLOTS.filter(slot => {
    if (!isToday) return true;
    const [h, m] = slot.split(':').map(Number);
    const now = new Date();
    const slotTime = new Date();
    slotTime.setHours(h, m, 0, 0);
    return slotTime.getTime() > now.getTime() + 60 * 60 * 1000; // 1h ahead
  });

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('asap')}
          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
            mode === 'asap'
              ? 'border-strawberry bg-strawberry/5 text-strawberry'
              : 'border-border hover:border-strawberry/50 text-muted-foreground'
          }`}
        >
          <Zap className={`w-4 h-4 ${mode === 'asap' ? 'text-strawberry' : 'text-muted-foreground'}`} />
          {language === 'es' ? 'Lo antes posible' : 'As soon as possible'}
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('scheduled')}
          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
            mode === 'scheduled'
              ? 'border-strawberry bg-strawberry/5 text-strawberry'
              : 'border-border hover:border-strawberry/50 text-muted-foreground'
          }`}
        >
          <Calendar className={`w-4 h-4 ${mode === 'scheduled' ? 'text-strawberry' : 'text-muted-foreground'}`} />
          {language === 'es' ? 'Programar entrega' : 'Schedule delivery'}
        </button>
      </div>

      {/* ASAP info */}
      {mode === 'asap' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-3">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {language === 'es'
            ? 'Tiempo estimado: 30–60 minutos según disponibilidad'
            : 'Estimated time: 30–60 minutes depending on availability'}
        </div>
      )}

      {/* Date + Time pickers */}
      {mode === 'scheduled' && (
        <div className="space-y-3 p-4 bg-muted/40 rounded-2xl border border-border">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {language === 'es' ? 'Fecha de entrega' : 'Delivery date'}
            </label>
            <input
              type="date"
              value={date}
              min={getMinDate()}
              max={getMaxDate()}
              onChange={e => handleDateChange(e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {date && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {language === 'es' ? 'Hora de entrega' : 'Delivery time'}
              </label>
              {availableSlots.length === 0 ? (
                <p className="text-xs text-red-500 px-1">
                  {language === 'es'
                    ? 'No hay horarios disponibles para hoy. Selecciona otra fecha.'
                    : 'No slots available today. Please select another date.'}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {availableSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleTimeChange(slot)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                        time === slot
                          ? 'bg-strawberry text-white border-strawberry'
                          : 'bg-background border-border hover:border-strawberry/50 text-foreground'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {date && time && (
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl p-2.5">
              ✅ {language === 'es' ? 'Entrega programada para:' : 'Delivery scheduled for:'}{' '}
              <strong>
                {new Date(`${date}T${time}`).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })} {language === 'es' ? 'a las' : 'at'} {time}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}