// src/components/ui/DatePickerNative.tsx
// ─── Native date input dengan display Bahasa Indonesia ───────────────────────
// Gunakan input type="date" native browser — di Android Chrome membuka
// date picker bawaan OS yang jauh lebih ergonomis dari custom picker.
// Input dioverlay di atas display div agar tampilan tetap custom tapi
// date picker tetap native.

import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerNativeProps {
  /** Format: YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DatePickerNative({ value, onChange, className }: DatePickerNativeProps) {
  let displayDate = 'Pilih tanggal';
  if (value) {
    try {
      // parseISO agar tidak ada timezone shift
      displayDate = format(parseISO(value), 'EEEE, d MMMM yyyy', { locale: id });
    } catch (_) {
      displayDate = value;
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Display layer */}
      <div className="bg-card border border-border rounded-xl px-4 min-h-[52px] flex items-center justify-between gap-3 pointer-events-none">
        <CalendarDays className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1 capitalize">
          {displayDate}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">Tap untuk ganti</span>
      </div>

      {/* Input overlay — transparan, tapi bisa diklik → trigger OS date picker */}
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Pilih tanggal"
        // Pastikan tidak ada styling yang menghalangi klik
        style={{ WebkitAppearance: 'none' }}
      />
    </div>
  );
}
