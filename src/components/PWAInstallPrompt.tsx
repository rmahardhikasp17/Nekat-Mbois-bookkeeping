// src/components/PWAInstallPrompt.tsx
// ─── Komponen install prompt native-friendly untuk Android ───────────────────
// Menangkap beforeinstallprompt, menampilkan banner custom yang persisten
// hingga user install atau dismiss.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Jika sudah ter-install sebagai PWA, jangan tampilkan dan jangan pasang listener
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Record<string, unknown>)['standalone'] === true);
    if (isStandalone) return;

    // Jangan tampilkan jika user sudah pernah dismiss dalam 7 hari
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissedAt) < sevenDays) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !installEvent) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch (_) {}
  };

  return (
    <div
      role="banner"
      aria-label="Install aplikasi ke home screen"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Download className="h-5 w-5 text-primary" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">
          Install Aplikasi
        </p>
        <p className="text-xs text-muted-foreground">
          Akses lebih cepat dari home screen
        </p>
      </div>

      {/* Actions */}
      <Button
        id="pwa-install-btn"
        size="sm"
        onClick={handleInstall}
        className="shrink-0 gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        Install
      </Button>
      <button
        id="pwa-dismiss-btn"
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Tutup banner install"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
