// src/components/ui/Stepper.tsx
// ─── Komponen stepper +/- untuk qty tanpa keyboard ───────────────────────────
// Touch target 44px di setiap tombol, disabled state visual jelas.

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function Stepper({ value, onChange, min = 0, max = 99, className }: StepperProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          'h-10 w-10 rounded-lg border border-border',
          'flex items-center justify-center',
          'transition-colors duration-100',
          'active:bg-accent/30 disabled:opacity-30',
          'touch-manipulation', // hapus delay 300ms tap di mobile
        )}
        aria-label="Kurangi"
      >
        <Minus className="w-4 h-4" />
      </button>

      <span
        className={cn(
          'min-w-[2rem] text-center text-base font-bold tabular-nums',
          value > 0 ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          'h-10 w-10 rounded-lg border border-border',
          'flex items-center justify-center',
          'transition-colors duration-100',
          'active:bg-accent/30 disabled:opacity-30',
          'touch-manipulation',
        )}
        aria-label="Tambah"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
