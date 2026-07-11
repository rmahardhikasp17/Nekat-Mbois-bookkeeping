// src/components/BottomNav.tsx
// ─── Bottom Navigation Bar — Android Material Design 3 inspired ──────────────
// Touch target 56px (min-h-[56px]), safe area support untuk layar notch,
// active state feedback via active:bg-accent/10 (bukan hover-only).

import { LayoutDashboard, PlusCircle, FileText, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppPage =
  | 'dashboard'
  | 'daily-input'
  | 'daily-recap'
  | 'monthly-report'
  | 'settings';

interface BottomNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard'      as const, label: 'Beranda', Icon: LayoutDashboard },
  { id: 'daily-input'    as const, label: 'Input',   Icon: PlusCircle      },
  { id: 'daily-recap'    as const, label: 'Rekap',   Icon: FileText        },
  { id: 'monthly-report' as const, label: 'Laporan', Icon: BarChart3       },
  { id: 'settings'       as const, label: 'Setelan', Icon: Settings        },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Navigasi utama"
    >
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => onNavigate(id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                'min-h-[56px] py-2 px-1',
                // Active feedback — tidak pakai hover-only
                'transition-colors duration-100 active:bg-accent/20',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active indicator pill */}
              <div className="relative flex items-center justify-center">
                {active && (
                  <span className="absolute inset-0 bg-primary/15 rounded-full w-10 h-6 -translate-x-1/2 left-1/2" />
                )}
                <Icon
                  className={cn(
                    'relative w-5 h-5 transition-transform duration-150',
                    active && 'scale-110'
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </div>
              <span className={cn(
                'text-[10px] leading-tight',
                active ? 'font-semibold' : 'font-medium'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
