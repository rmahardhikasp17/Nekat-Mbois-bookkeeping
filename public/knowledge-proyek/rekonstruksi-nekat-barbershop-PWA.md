# 🔨 Master Prompt: Rekonstruksi Nekat Barbershop → PWA Android-First
> Dokumen ini berisi prompt bertahap untuk AI Vibe Coding.
> Jalankan SATU FASE dalam satu sesi. Jangan skip urutan.

---

## 📌 KONTEKS PROYEK (Baca sebelum semua fase)

**Nama Proyek**: Nekat Mbois Bookkeeping  
**Fungsi**: Aplikasi pembukuan barbershop — input harian, hitung gaji otomatis, laporan bulanan  
**Stack Asal**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + IndexedDB/localStorage  
**Target Rekonstruksi**: PWA Android-first, IndexedDB murni (tanpa localStorage fallback), UI mobile-native  

**Skema Bisnis Inti (JANGAN diubah):**
```
Karyawan: Gaji = (Revenue Layanan × 50%) + Bonus Layanan
Owner:    Gaji = Revenue Sendiri + (Revenue Karyawan × 50%) + Bonus - Rp50.000/hari
Tabungan: Rp50.000 × jumlah hari hadir Owner
```

---

## URUTAN FASE PENGERJAAN

```
FASE 0 → Bersihkan & Konsolidasi (fondasi bersih)
FASE 1 → Konsolidasi Data Layer (satu sumber kebenaran)
FASE 2 → Konfigurasi PWA (manifest + service worker)
FASE 3 → Migrasi Storage ke IndexedDB Murni
FASE 4 → Redesign UI Android-First
FASE 5 → Input UX — Tombol Cepat & Stepper
FASE 6 → Audit Algoritma & Anti-Collision ID
FASE 7 → Testing & Finalisasi
```

---

---

# FASE 0 — BERSIHKAN & KONSOLIDASI

## 🎯 Tujuan Fase Ini
Menghapus semua noise sebelum menyentuh logika. File duplikat adalah bom waktu — satu perubahan di TSX tidak akan sinkron ke JSX lama, dan AI akan bingung file mana yang aktif.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior TypeScript Engineer. Proyek ini adalah aplikasi React + Vite + TypeScript bernama "Nekat Mbois Bookkeeping" — aplikasi pembukuan barbershop offline-first.

TUGAS FASE 0: Bersihkan duplikasi dan siapkan fondasi bersih.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — HAPUS FILE DUPLIKAT JSX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hapus file-file berikut karena sudah ada versi TSX-nya yang aktif:
- src/pages/Index.jsx
- src/components/Navigation.jsx
- src/components/DailyRecap.jsx
- src/components/ServicesManager.jsx
- src/components/EmployeeManager.jsx
- src/components/TransactionForm.jsx

Sebelum menghapus, verifikasi bahwa TIDAK ADA import di file lain yang masih mengacu ke file .jsx tersebut. Jika ada, pindahkan import ke versi .tsx-nya.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — HAPUS console.log DEBUG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Di file src/components/MonthlyReport.tsx, hapus semua baris console.log yang mengandung string 'DEBUG' atau emoji 🔍. Jangan hapus console.error yang legitimate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — INVENTARISASI FILE ORPHAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File-file berikut belum terhubung ke router manapun:
- src/components/ProductManager.jsx
- src/components/ProductSales.jsx
- src/components/Urgent.jsx

Untuk fase ini: JANGAN hapus, tapi pindahkan ke folder src/components/_orphan/ dan tambahkan komentar di baris pertama masing-masing:
// [ORPHAN] Belum diintegrasikan ke router. Review di Fase 6.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — RENAME DAN UNIFIKASI SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File src/components/Settings.jsx masih JavaScript. Rename menjadi Settings.tsx dan tambahkan type annotation minimal (prop types) tanpa mengubah logika. Cukup:
- Tambahkan interface SettingsProps jika komponen menerima props
- Ganti 'any' yang muncul dari inferensi dengan type yang tepat

HASIL YANG DIHARAPKAN:
- Zero file .jsx yang aktif diimport
- Zero console.log DEBUG di production code
- Semua file terkumpul rapi, tidak ada yang mengambang

VALIDASI AKHIR FASE 0:
Jalankan `npm run build` dan pastikan tidak ada error TypeScript atau import yang broken.
```

---

---

# FASE 1 — KONSOLIDASI DATA LAYER & BUSINESS LOGIC

## 🎯 Tujuan Fase Ini
Membuat satu sumber kebenaran untuk: (1) TypeScript types semua data, (2) kalkulasi gaji, (3) semua ID generation. Ini adalah fondasi yang akan dipakai semua fase berikutnya.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior TypeScript Engineer. Proyek: Nekat Mbois Bookkeeping (React + Vite + TypeScript, aplikasi pembukuan barbershop offline).

TUGAS FASE 1: Konsolidasi data layer dan business logic ke satu tempat.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — BUAT src/types/index.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat file baru src/types/index.ts yang mendefinisikan SEMUA interface data aplikasi:

```typescript
// src/types/index.ts
export type EmployeeRole = 'Owner' | 'Karyawan';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  createdAt: string; // ISO date string
}

export interface Service {
  id: string;
  name: string;
  price: number;
  isBonusService: boolean;
  createdAt: string;
}

export interface ServiceEntry {
  serviceId: string;
  serviceName: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface BonusEntry {
  serviceId: string;
  serviceName: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface DailyRecord {
  id: string;
  date: string; // format: YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  services: ServiceEntry[];
  bonusServices: BonusEntry[];
  totalRevenue: number;    // total dari layanan utama
  totalBonus: number;      // total dari bonus service
  calculatedSalary: number; // hasil kalkulasi final
  savingsDeduction: number; // hanya untuk Owner (50000/hari)
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface MonthlyOverride {
  employeeId: string;
  month: string; // format: YYYY-MM
  overrideValues: Partial<{
    totalSalary: number;
    totalRevenue: number;
    totalBonus: number;
  }>;
}

export interface BusinessData {
  businessName: string;
  employees: Employee[];
  services: Service[];
  dailyRecords: DailyRecord[];
  transactions: Transaction[];
  monthlyOverrides: MonthlyOverride[];
  lastSaved: string;
  version: string; // untuk migrasi data di masa depan, mulai dari "2.0.0"
}

export const DEFAULT_BUSINESS_DATA: BusinessData = {
  businessName: 'Nekat Barbershop',
  employees: [],
  services: [],
  dailyRecords: [],
  transactions: [],
  monthlyOverrides: [],
  lastSaved: new Date().toISOString(),
  version: '2.0.0',
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — BUAT src/utils/salaryCalculator.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat file baru src/utils/salaryCalculator.ts sebagai SATU-SATUNYA tempat logika kalkulasi gaji:

```typescript
// src/utils/salaryCalculator.ts
import type { EmployeeRole, ServiceEntry, BonusEntry } from '@/types';

const OWNER_DAILY_SAVINGS = 50_000;

export function calculateRevenue(services: ServiceEntry[]): number {
  return services.reduce((sum, s) => sum + s.subtotal, 0);
}

export function calculateBonus(bonusServices: BonusEntry[]): number {
  return bonusServices.reduce((sum, b) => sum + b.subtotal, 0);
}

export function calculateSalary(
  revenue: number,
  bonus: number,
  role: EmployeeRole
): { salary: number; savingsDeduction: number } {
  if (role === 'Karyawan') {
    return { salary: revenue * 0.5 + bonus, savingsDeduction: 0 };
  }
  // Owner
  return {
    salary: revenue - OWNER_DAILY_SAVINGS + bonus,
    savingsDeduction: OWNER_DAILY_SAVINGS,
  };
}

export function calculateMonthlyOwnerSalary(params: {
  ownerOwnRevenue: number;
  totalEmployeeRevenue: number;
  ownerBonus: number;
  ownerAttendanceDays: number;
}): { salary: number; savings: number } {
  const { ownerOwnRevenue, totalEmployeeRevenue, ownerBonus, ownerAttendanceDays } = params;
  const savings = OWNER_DAILY_SAVINGS * ownerAttendanceDays;
  const salary = ownerOwnRevenue + totalEmployeeRevenue * 0.5 + ownerBonus - savings;
  return { salary, savings };
}
```

PENTING: Setelah membuat file ini, cari semua kalkulasi gaji yang ada di:
- src/components/DailyInput.jsx (atau TSX)
- src/utils/dataManager.js
- src/components/MonthlyReport.tsx
...dan GANTI semua dengan import fungsi dari salaryCalculator.ts. Jangan biarkan ada logika gaji di tempat lain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — BUAT src/utils/idGenerator.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat file baru src/utils/idGenerator.ts:

```typescript
// src/utils/idGenerator.ts
// Menggantikan semua Date.now().toString() di seluruh proyek

export function generateId(): string {
  return crypto.randomUUID();
}
```

Setelah membuat file ini, cari semua penggunaan `Date.now().toString()` dan `Date.now()` yang digunakan sebagai ID di seluruh proyek dan ganti dengan `generateId()`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — RENAME dataManager.js → dataManager.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rename src/utils/dataManager.js → src/utils/dataManager.ts.

Tambahkan import BusinessData dari @/types di bagian atas. Ganti semua type `any` dengan type yang sesuai dari @/types. Khususnya:
- Parameter dan return type fungsi `loadData` → Promise<BusinessData>
- Parameter fungsi `saveData` → (data: BusinessData) => Promise<void>
- Parameter `updateBusinessData` → (data: BusinessData) => void

VALIDASI AKHIR FASE 1:
`npm run build` harus zero TypeScript errors. Pastikan tidak ada lagi:
- `Date.now()` sebagai ID
- Logika kalkulasi gaji di luar salaryCalculator.ts
- `any` type yang tidak disengaja di dataManager.ts
```

---

---

# FASE 2 — KONFIGURASI PWA

## 🎯 Tujuan Fase Ini
Mengubah SPA biasa menjadi Progressive Web App yang bisa diinstall di Android, bekerja offline, dan muncul di home screen seperti aplikasi native.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior Frontend Engineer dengan spesialisasi PWA. Proyek: Nekat Mbois Bookkeeping (React + Vite + TypeScript).

TUGAS FASE 2: Konfigurasi PWA lengkap untuk Android.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — INSTALL VITE PWA PLUGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Install dependency:
```bash
npm install -D vite-plugin-pwa
npm install workbox-window
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — UPDATE vite.config.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Update vite.config.ts dengan konfigurasi PWA berikut:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Nekat Mbois Bookkeeping',
        short_name: 'NekatMbois',
        description: 'Aplikasi pembukuan barbershop offline-first',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128.png',  sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png',  sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png',  sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png',  sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — BUAT ICON SET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat folder public/icons/. Untuk sementara, gunakan script berikut di terminal untuk generate placeholder icons dari satu SVG sumber (ganti dengan icon barbershop sesungguhnya nanti):

Jika ada file SVG logo sudah ada di public/, gunakan itu sebagai sumber. Jika tidak ada, buat public/icons/icon-192.png dan public/icons/icon-512.png dengan warna background #1a1a2e dan inisial "NB" putih — gunakan Canvas API atau tool apapun yang tersedia di environment.

Ukuran yang WAJIB ada: 72, 96, 128, 144, 152, 192, 384, 512.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — UPDATE index.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tambahkan meta tags berikut di dalam <head> index.html:

```html
<!-- PWA Meta Tags -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="NekatMbois">
<meta name="theme-color" content="#1a1a2e">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">

<!-- Touch Icons for iOS -->
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 5 — BUAT KOMPONEN PWA INSTALL PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat file src/components/PWAInstallPrompt.tsx:

```typescript
// Komponen ini menangkap event beforeinstallprompt dan menampilkan
// tombol "Install Aplikasi" yang native-friendly di Android

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installEvent || dismissed) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl p-4 shadow-lg flex items-center gap-3">
      <div className="flex-1">
        <p className="font-semibold text-sm">Install Aplikasi</p>
        <p className="text-xs text-muted-foreground">Akses lebih cepat dari home screen</p>
      </div>
      <Button size="sm" onClick={handleInstall} className="gap-1.5 shrink-0">
        <Download className="w-4 h-4" />
        Install
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground text-xs shrink-0"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>
  );
}
```

Import dan render <PWAInstallPrompt /> di src/App.tsx tepat sebelum closing tag pembungkus utama.

VALIDASI AKHIR FASE 2:
1. `npm run build` lalu `npm run preview`
2. Buka di Chrome → DevTools → Application → Manifest: harus terisi
3. Application → Service Workers: harus terdaftar
4. Lighthouse audit → PWA score minimal 90
5. Di Chrome Android, muncul banner "Add to Home Screen"
```

---

---

# FASE 3 — MIGRASI STORAGE KE INDEXEDDB MURNI

## 🎯 Tujuan Fase Ini
Menggantikan sistem multi-layer yang kompleks (localStorage + IndexedDB + OPFS + File API) dengan IndexedDB yang bersih dan konsisten — seperti database lokal native. Ini membuat data tidak hilang saat browser clear cache ringan, dan siap untuk kapasitas data besar.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior Frontend Engineer spesialisasi browser storage. Proyek: Nekat Mbois Bookkeeping.

TUGAS FASE 3: Ganti sistem storage multi-layer dengan IndexedDB murni yang bersih.

KONTEKS PENTING:
- File src/types/index.ts sudah ada dengan interface BusinessData (dari Fase 1)
- Pertahankan kemampuan export JSON untuk backup manual
- Hapus ketergantungan pada localStorage sebagai primary storage
- OPFS dan File System Access API tetap boleh dipertahankan HANYA sebagai opsi backup opsional di Settings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — BUAT src/utils/db.ts (IndexedDB Layer Baru)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hapus src/utils/dataManager.ts yang lama. Buat src/utils/db.ts baru yang bersih:

```typescript
// src/utils/db.ts
// IndexedDB wrapper — satu-satunya layer penyimpanan primer
import type { BusinessData } from '@/types';
import { DEFAULT_BUSINESS_DATA } from '@/types';

const DB_NAME = 'nekat-mbois-db';
const DB_VERSION = 1;
const STORE_NAME = 'business-data';
const DATA_KEY = 'main';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadData(): Promise<BusinessData> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result ?? { ...DEFAULT_BUSINESS_DATA });
      req.onerror = () => resolve({ ...DEFAULT_BUSINESS_DATA });
    });
  } catch {
    return { ...DEFAULT_BUSINESS_DATA };
  }
}

export async function saveData(data: BusinessData): Promise<void> {
  const db = await openDB();
  const updated: BusinessData = { ...data, lastSaved: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(updated, DATA_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(DATA_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// BACKUP & RESTORE — tetap sebagai utilitas, bukan storage primer
export function exportToJSON(data: BusinessData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nekat-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file: File): Promise<BusinessData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BusinessData;
        // Validasi minimal
        if (!data.employees || !data.dailyRecords) {
          reject(new Error('Format file tidak valid'));
          return;
        }
        // Migrasi version jika perlu
        resolve({ ...DEFAULT_BUSINESS_DATA, ...data, version: '2.0.0' });
      } catch {
        reject(new Error('File JSON rusak atau tidak dapat dibaca'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — BUAT src/hooks/useBusinessData.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat custom hook yang menjadi jembatan antara IndexedDB dan React state:

```typescript
// src/hooks/useBusinessData.ts
import { useState, useEffect, useCallback } from 'react';
import { loadData, saveData } from '@/utils/db';
import type { BusinessData } from '@/types';
import { DEFAULT_BUSINESS_DATA } from '@/types';

export function useBusinessData() {
  const [data, setData] = useState<BusinessData>(DEFAULT_BUSINESS_DATA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const updateData = useCallback(async (updater: (prev: BusinessData) => BusinessData) => {
    setData((prev) => {
      const next = updater(prev);
      saveData(next).catch(console.error);
      return next;
    });
  }, []);

  return { data, updateData, isLoading };
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — UPDATE src/pages/Index.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Di Index.tsx, ganti semua state management businessData yang lama dengan hook baru:

```typescript
// GANTI:
// const [businessData, setBusinessData] = useState(...)
// useEffect(() => { loadData().then(...) }, [])

// DENGAN:
const { data: businessData, updateData: setBusinessData, isLoading } = useBusinessData();
```

Pastikan semua tempat yang memanggil `setBusinessData(newData)` diganti dengan:
`setBusinessData(() => newData)` atau `setBusinessData(prev => ({ ...prev, ...changes }))`

Jika ada loading state, tampilkan spinner sederhana saat `isLoading === true`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — HAPUS KETERGANTUNGAN localStorage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cari dan hapus semua pemanggilan:
- `localStorage.setItem('businessData', ...)`
- `localStorage.getItem('businessData')`
- `localStorage.removeItem('businessData')`

Jika ada localStorage yang digunakan untuk hal lain (seperti menyimpan preferensi UI/tema), BIARKAN — hanya hapus yang berkaitan dengan businessData.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 5 — REQUEST PERSISTENT STORAGE DI App.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Di App.tsx, tambahkan request persistent storage saat aplikasi pertama kali dimuat:

```typescript
useEffect(() => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    navigator.storage.persist().then((granted) => {
      if (!granted) {
        console.warn('Persistent storage tidak diberikan — data mungkin dihapus browser saat storage penuh');
      }
    });
  }
}, []);
```

VALIDASI AKHIR FASE 3:
1. Buka aplikasi, input data baru
2. Buka DevTools → Application → IndexedDB → nekat-mbois-db → business-data: data harus muncul
3. Tutup tab, buka lagi: data harus tetap ada
4. TIDAK ADA data di Application → Local Storage (kecuali preferensi UI)
5. `npm run build` zero errors
```

---

---

# FASE 4 — REDESIGN UI ANDROID-FIRST

## 🎯 Tujuan Fase Ini
Mengubah tampilan dari "web yang responsive" menjadi "aplikasi Android native-feel". Fokus: navigasi bawah (bottom nav), safe area, touch targets 48dp minimum, dan layout yang tidak membutuhkan scroll horizontal.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior Mobile UI Engineer. Proyek: Nekat Mbois Bookkeeping — PWA React + Tailwind + shadcn/ui. Target utama: pengguna Android dengan layar 5–6.7 inci.

TUGAS FASE 4: Redesign layout dan navigasi ke Android-first.

PRINSIP DESAIN YANG WAJIB DIIKUTI:
- Touch target minimum 48x48dp (gunakan min-h-12 atau h-12 = 48px di Tailwind)
- Bottom Navigation Bar (bukan hamburger menu atau top nav)
- Safe area insets untuk layar dengan notch / punch-hole
- Font minimum 14px untuk body, 16px untuk input (mencegah auto-zoom iOS)
- Warna tema: dark background (#1a1a2e atau sejenisnya) dengan accent merah barbershop
- Tidak ada hover state sebagai satu-satunya UI feedback — gunakan active: state

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — UPDATE tailwind.config.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tambahkan custom utilities untuk safe area:

```typescript
// Di bagian plugins tailwind.config.ts, tambahkan:
plugins: [
  require("tailwindcss-animate"),
  function({ addUtilities }: any) {
    addUtilities({
      '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
      '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
      '.pl-safe': { paddingLeft: 'env(safe-area-inset-left)' },
      '.pr-safe': { paddingRight: 'env(safe-area-inset-right)' },
    });
  },
]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — BUAT src/components/BottomNav.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ganti Navigation.tsx yang ada dengan komponen Bottom Navigation Bar:

```typescript
// src/components/BottomNav.tsx
// Bottom navigation bar, Android Material Design 3 inspired

import { LayoutDashboard, PlusCircle, FileText, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type Page = 'dashboard' | 'daily-input' | 'daily-recap' | 'monthly-report' | 'settings';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard'       as Page, label: 'Beranda',  Icon: LayoutDashboard },
  { id: 'daily-input'     as Page, label: 'Input',    Icon: PlusCircle       },
  { id: 'daily-recap'     as Page, label: 'Rekap',    Icon: FileText         },
  { id: 'monthly-report'  as Page, label: 'Laporan',  Icon: BarChart3        },
  { id: 'settings'        as Page, label: 'Setelan',  Icon: Settings         },
] as const;

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]',
                'transition-colors active:bg-accent/10',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn('w-5 h-5 transition-transform', active && 'scale-110')}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — UPDATE LAYOUT UTAMA di Index.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ubah layout pembungkus di Index.tsx:

```typescript
// Layout utama
return (
  <div className="min-h-screen bg-background flex flex-col">
    {/* Header tipis — hanya nama halaman + aksi kontekstual */}
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="font-semibold text-base">{getPageTitle(currentPage)}</h1>
        {/* Slot untuk aksi kontekstual per halaman, misal tombol + di recap */}
      </div>
    </header>

    {/* Konten halaman dengan padding bawah untuk bottom nav */}
    <main className="flex-1 overflow-y-auto pb-20">
      {renderCurrentPage()}
    </main>

    <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    <PWAInstallPrompt />
  </div>
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — UPDATE SEMUA CARD & LIST ITEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Di semua komponen (Dashboard, DailyRecap, ServicesManager, EmployeeManager), terapkan aturan berikut untuk setiap item list/card yang bisa di-tap:

```typescript
// PATTERN STANDAR untuk touchable list item:
<div
  className="bg-card rounded-xl border border-border p-4 active:bg-accent/5 transition-colors"
  role="button"
  tabIndex={0}
>
  {/* konten */}
</div>

// BUKAN:
// <div className="hover:bg-gray-100"> — hover tidak ada di touch
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 5 — UPDATE SEMUA DIALOG/MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ganti semua `alert()` dan `window.confirm()` yang tersisa dengan shadcn/ui AlertDialog.

Pattern standar untuk konfirmasi hapus:
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Hapus</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
      <AlertDialogDescription>
        Tindakan ini tidak bisa dibatalkan.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Batal</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
        Hapus
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

VALIDASI AKHIR FASE 4:
1. Buka di Chrome DevTools → Toggle device toolbar → Pilih Pixel 6 atau Samsung Galaxy S21
2. Bottom nav harus terlihat dan bisa diklik semua
3. Tidak ada elemen yang terpotong di kiri/kanan
4. Semua tombol interaktif minimal 48px tingginya
5. Tidak ada alert() atau confirm() browser native tersisa
```

---

---

# FASE 5 — INPUT UX: TOMBOL CEPAT & STEPPER

## 🎯 Tujuan Fase Ini
Mengubah form input harian dari "isi form web biasa" menjadi "experience seperti kasir digital" — tap sekali untuk pilih layanan, stepper +/- untuk qty, minimal keyboard muncul.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior Mobile UX Engineer. Proyek: Nekat Mbois Bookkeeping.

TUGAS FASE 5: Redesign komponen DailyInput.tsx agar input transaksi harian secepat mungkin di Android.

PRINSIP:
- Zero text input kecuali benar-benar diperlukan
- Pilih layanan dengan tap tombol (bukan dropdown/select)
- Qty dengan stepper +/- (bukan input number ketik manual)
- Flow: Pilih Tanggal → Pilih Karyawan → Tap Layanan → Atur Qty → Submit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — BUAT src/components/ui/Stepper.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buat komponen reusable Stepper:

```typescript
// src/components/ui/Stepper.tsx
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
        className="h-9 w-9 rounded-lg border border-border flex items-center justify-center active:bg-accent/10 disabled:opacity-30 transition-colors"
        aria-label="Kurangi"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-9 w-9 rounded-lg border border-border flex items-center justify-center active:bg-accent/10 disabled:opacity-30 transition-colors"
        aria-label="Tambah"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — BUAT src/components/ui/DatePickerNative.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gunakan input date native Android — jauh lebih baik dari custom date picker di mobile:

```typescript
// src/components/ui/DatePickerNative.tsx
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DatePickerNativeProps {
  value: string; // format: YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

export function DatePickerNative({ value, onChange, className }: DatePickerNativeProps) {
  const displayDate = value
    ? format(new Date(value), 'EEEE, d MMMM yyyy', { locale: id })
    : 'Pilih tanggal';

  return (
    <div className={cn('relative', className)}>
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">{displayDate}</span>
        <span className="text-xs text-muted-foreground">Tap untuk ganti</span>
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        aria-label="Pilih tanggal"
      />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — REDESIGN DailyInput.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rekonstruksi DailyInput.tsx dengan flow berikut. JANGAN gunakan react-hook-form untuk form ini — state manual lebih mudah dikontrol untuk UX stepper.

STRUKTUR STATE:
```typescript
const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
// Map serviceId → qty (default 0, tidak ditampilkan di summary jika 0)
const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
const [bonusQty, setBonusQty] = useState<Record<string, number>>({});
```

STRUKTUR UI (render dalam urutan ini):

**SECTION 1: Tanggal**
```tsx
<section className="px-4 pt-4">
  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tanggal</p>
  <DatePickerNative value={selectedDate} onChange={setSelectedDate} />
</section>
```

**SECTION 2: Pilih Karyawan** — tampilkan sebagai button grid:
```tsx
<section className="px-4 pt-4">
  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Karyawan</p>
  <div className="grid grid-cols-2 gap-2">
    {employees.map(emp => (
      <button
        key={emp.id}
        onClick={() => setSelectedEmployee(emp)}
        className={cn(
          'rounded-xl border p-3 text-left transition-all active:scale-95',
          selectedEmployee?.id === emp.id
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground'
        )}
      >
        <p className="font-semibold text-sm">{emp.name}</p>
        <p className="text-xs text-muted-foreground">{emp.role}</p>
      </button>
    ))}
  </div>
</section>
```

**SECTION 3: Layanan Utama** — hanya tampil jika karyawan sudah dipilih:
Untuk setiap layanan utama (isBonusService === false), tampilkan card dengan nama layanan, harga, dan Stepper di kanan.

**SECTION 4: Bonus Layanan** — hanya tampil jika ada layanan dengan isBonusService === true:
Sama seperti section 3 tapi untuk bonus.

**SECTION 5: Ringkasan & Submit** — sticky di bawah atau di akhir scroll:
```tsx
<div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
  <div className="flex items-center justify-between mb-3">
    <div>
      <p className="text-xs text-muted-foreground">Estimasi Gaji</p>
      <p className="text-xl font-bold">
        {formatRupiah(calculatedSalary)}
      </p>
    </div>
    <div className="text-right">
      <p className="text-xs text-muted-foreground">Total Revenue</p>
      <p className="text-sm font-medium">{formatRupiah(totalRevenue)}</p>
    </div>
  </div>
  <Button
    onClick={handleSubmit}
    disabled={!selectedEmployee || totalRevenue === 0}
    className="w-full h-12 text-base font-semibold"
  >
    Simpan Data Hari Ini
  </Button>
</div>
```

KALKULASI REAL-TIME:
Gunakan useMemo untuk menghitung ulang saat serviceQty atau bonusQty berubah.
Import calculateRevenue, calculateBonus, calculateSalary dari @/utils/salaryCalculator.

FORMAT ANGKA:
Buat helper function `formatRupiah(amount: number): string` yang menghasilkan format "Rp 150.000" (titik sebagai pemisah ribuan).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — TOMBOL QUICK RESET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tambahkan tombol "Reset" di header section layanan untuk mereset semua qty ke 0 dengan satu tap. Berguna saat salah memilih karyawan.

VALIDASI AKHIR FASE 5:
1. Buka Daily Input di emulator Android
2. Pilih karyawan dengan satu tap — TIDAK perlu dropdown
3. Tambah qty layanan dengan tap + — keyboard TIDAK muncul
4. Angka estimasi gaji berubah realtime saat qty diubah
5. Tombol Submit disabled jika belum pilih karyawan atau semua qty = 0
```

---

---

# FASE 6 — AUDIT ALGORITMA & ANTI-COLLISION

## 🎯 Tujuan Fase Ini
Memastikan tidak ada bug tersembunyi pada logika bisnis, data tidak bisa bentrok, dan aplikasi stabil untuk penggunaan jangka panjang.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah Senior Backend Engineer yang teliti. Proyek: Nekat Mbois Bookkeeping.

TUGAS FASE 6: Audit dan perbaiki potensi bug algoritma, data collision, dan edge cases.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — VERIFIKASI TIDAK ADA Date.now() SEBAGAI ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cari seluruh codebase untuk `Date.now()` yang digunakan sebagai ID. Seharusnya sudah diganti di Fase 1. Jika masih ada, ganti dengan generateId() dari @/utils/idGenerator.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — CEGAH DUPLIKASI RECORD HARIAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Saat ini tidak ada pengecekan duplikat: jika user submit data untuk karyawan A tanggal X dua kali, akan ada dua record. Tambahkan logika di DailyInput submit handler:

```typescript
// Sebelum menyimpan record baru, cek apakah sudah ada record
// dengan kombinasi (date + employeeId) yang sama
const existingRecord = businessData.dailyRecords.find(
  r => r.date === selectedDate && r.employeeId === selectedEmployee.id
);

if (existingRecord) {
  // Tampilkan AlertDialog dengan pilihan:
  // "Ganti Data Lama" atau "Batal"
  // JANGAN langsung overwrite tanpa konfirmasi
  setShowDuplicateWarning(true);
  return;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — VALIDASI PERHITUNGAN OWNER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Edge case: Jika Owner bekerja tapi revenue sangat kecil (misal cuma potong 1 orang Rp 20.000), maka gaji Owner = 20.000 - 50.000 = -Rp 30.000 (negatif).

Ini bukan bug — ini memang logika bisnis (tabungan tetap dipotong). Tapi pastikan:
1. Kalkulasi MEMANG bisa menghasilkan angka negatif (jangan di-clamp ke 0)
2. Tampilkan angka negatif dengan warna merah di UI
3. Tambahkan tooltip/keterangan kecil: "Tabungan hari ini: Rp 50.000"

Update komponen ringkasan di DailyInput untuk handle kasus negatif:
```typescript
<p className={cn(
  'text-xl font-bold',
  calculatedSalary < 0 ? 'text-destructive' : 'text-foreground'
)}>
  {formatRupiah(calculatedSalary)}
</p>
{selectedEmployee?.role === 'Owner' && (
  <p className="text-xs text-muted-foreground">
    Tabungan hari ini: {formatRupiah(50000)} dipotong
  </p>
)}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 4 — AUDIT KALKULASI MONTHLY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Di MonthlyReport.tsx, pastikan kalkulasi menggunakan fungsi dari salaryCalculator.ts (bukan logika inline). Verifikasi:

a) Total pendapatan Owner di laporan bulanan = SUM semua record Owner di bulan tersebut (revenue sendiri)
b) Bagian dari karyawan untuk Owner = SUM(revenue karyawan × 50%) untuk semua karyawan di bulan itu
c) Tabungan Owner = 50.000 × jumlah hari Owner hadir (jumlah record Owner di bulan itu)
d) Gaji bersih Owner = (a) + (b) + bonus - (c)

Tambahkan unit test sederhana (jika environment mendukung) atau setidaknya fungsi helper yang bisa dipanggil di console untuk verifikasi:
```typescript
// src/utils/salaryCalculator.ts — tambahkan:
export function verifyMonthlyCalculation(records: DailyRecord[]) {
  // Fungsi debugging untuk verifikasi kalkulasi bulanan
  const ownerRecords = records.filter(r => r.employeeRole === 'Owner');
  const employeeRecords = records.filter(r => r.employeeRole === 'Karyawan');
  
  const ownerRevenue = ownerRecords.reduce((s, r) => s + r.totalRevenue, 0);
  const employeeShareForOwner = employeeRecords.reduce((s, r) => s + r.totalRevenue * 0.5, 0);
  const ownerSavings = ownerRecords.length * 50_000;
  const ownerBonus = ownerRecords.reduce((s, r) => s + r.totalBonus, 0);
  const ownerNetSalary = ownerRevenue + employeeShareForOwner + ownerBonus - ownerSavings;
  
  return { ownerRevenue, employeeShareForOwner, ownerSavings, ownerBonus, ownerNetSalary };
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 5 — BERSIHKAN FILE ORPHAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Review file di src/components/_orphan/ (ProductManager, ProductSales, Urgent).

Untuk setiap file:
- Jika logikanya relevan dan bisa diintegrasikan → integrasikan sekarang
- Jika belum relevan → tetap di _orphan/ dengan komentar kapan akan dibutuhkan
- Jika tidak akan pernah dipakai → hapus

VALIDASI AKHIR FASE 6:
1. Coba submit data yang sama (karyawan + tanggal) dua kali → harus muncul dialog konfirmasi
2. Hitung manual gaji owner untuk 3 hari terakhir → cocokkan dengan laporan bulanan
3. `npm run build` zero errors
4. Tidak ada `Date.now()` sebagai ID di seluruh codebase
```

---

---

# FASE 7 — TESTING & FINALISASI

## 🎯 Tujuan Fase Ini
Memastikan semua fitur bekerja end-to-end sebelum digunakan production, dan dokumen proyek diperbarui.

## 📋 Prompt untuk AI Vibe Coding

```
Kamu adalah QA Engineer + Tech Writer. Proyek: Nekat Mbois Bookkeeping v2.0 — PWA Android-first.

TUGAS FASE 7: Testing end-to-end dan finalisasi dokumentasi.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 1 — SKENARIO TEST MANUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jalankan semua skenario berikut dan catat hasilnya:

SKENARIO A — Setup Awal:
[ ] Buka app pertama kali → businessData default tampil
[ ] Tambah 3 layanan: "Cukur Biasa" Rp 20.000, "Cukur + Cuci" Rp 35.000, "Cream Bath" Rp 50.000 (bonus)
[ ] Tambah 2 karyawan: "Budi" (Karyawan), "Pak Dito" (Owner)
[ ] Tutup dan buka ulang browser → semua data tetap ada (IndexedDB)

SKENARIO B — Input Harian Karyawan:
[ ] Buka Daily Input → pilih hari ini → pilih "Budi"
[ ] Set qty "Cukur Biasa" = 3, "Cukur + Cuci" = 2
[ ] Total revenue = (3 × 20.000) + (2 × 35.000) = 60.000 + 70.000 = 130.000
[ ] Estimasi gaji = 130.000 × 50% = 65.000
[ ] Submit → lihat di Daily Recap → record muncul

SKENARIO C — Input Harian Owner:
[ ] Buka Daily Input → pilih hari ini → pilih "Pak Dito"
[ ] Set qty "Cukur Biasa" = 5
[ ] Total revenue = 5 × 20.000 = 100.000
[ ] Estimasi gaji = 100.000 - 50.000 = 50.000
[ ] Submit → lihat di Daily Recap

SKENARIO D — Laporan Bulanan (bulan yang ada datanya):
[ ] Buka Monthly Report → pilih bulan yang baru saja diinput
[ ] Gaji Budi = 65.000 ✓
[ ] Revenue Budi = 130.000 ✓
[ ] Gaji Pak Dito (dari sendiri + 50% dari Budi - tabungan) = 100.000 + (130.000 × 50%) - 50.000 = 115.000 ✓
[ ] Total tabungan Pak Dito = Rp 50.000 (1 hari) ✓

SKENARIO E — Backup & Restore:
[ ] Export JSON → file terdownload
[ ] Hapus semua data (danger zone di Settings)
[ ] Import JSON yang baru didownload → data kembali
[ ] Refresh halaman → data masih ada

SKENARIO F — PWA Install:
[ ] Buka di Chrome Android → muncul banner install
[ ] Install ke home screen → ikon muncul
[ ] Buka dari home screen → tampil fullscreen (tanpa address bar)
[ ] Matikan koneksi internet → app tetap bisa dibuka

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 2 — UPDATE README.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Update atau buat README.md dengan struktur:

```markdown
# Nekat Mbois Bookkeeping v2.0

Aplikasi pembukuan barbershop — PWA Android-first, offline, tanpa server.

## Cara Install di Android
1. Buka [URL app] di Chrome Android
2. Tap banner "Install Aplikasi" atau menu ⋮ → "Add to Home Screen"
3. Buka dari home screen

## Cara Pakai
1. Settings → Isi nama bisnis
2. Karyawan → Tambah karyawan (Owner + Karyawan)
3. Layanan → Tambah daftar layanan dan harga
4. Input Harian → Input setiap hari setelah tutup
5. Laporan Bulanan → Lihat rekap di akhir bulan

## Skema Gaji
- Karyawan: (Revenue × 50%) + Bonus Layanan
- Owner: Revenue Sendiri + (50% Revenue Karyawan) + Bonus - Rp 50.000/hari (tabungan)

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- IndexedDB (penyimpanan lokal permanen)
- PWA (installable, offline-capable)

## Development
npm install && npm run dev
npm run build
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGKAH 3 — FINAL BUILD CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```bash
npm run lint      # harus 0 error, 0 warning
npm run build     # harus sukses
npm run preview   # test build production di local
```

Pastikan bundle size reasonable:
- Total JS < 500KB gzip
- Jika ada dependency besar yang tidak dipakai (misal React Query yang nyaris tidak dipakai), pertimbangkan untuk dihapus

JIKA ADA MASALAH SAAT TESTING:
Catat bug yang ditemukan, buat issue list, dan perbaiki sebelum merilis.
Prioritas fix: Data corruption > UI bug > Visual glitch.

SELESAI — App siap digunakan. 🎉
```

---

## 📊 RINGKASAN URUTAN & ALASAN

| Fase | Nama | Mengapa di urutan ini |
|------|------|-----------------------|
| **0** | Bersihkan Duplikasi | Fondasi bersih, AI tidak bingung file mana yang aktif |
| **1** | Konsolidasi Types & Logic | Semua fase berikutnya bergantung pada types & salaryCalculator |
| **2** | PWA Config | Tidak bergantung pada fase lain, tapi harus ada sebelum UI diubah |
| **3** | Migrasi IndexedDB | Storage harus stabil sebelum UI di-redesign |
| **4** | Redesign UI Android | Layout baru butuh storage yang sudah bersih |
| **5** | Input UX | Komponen input baru pakai types + layout + storage yang sudah ada |
| **6** | Audit Algoritma | Review menyeluruh setelah semua fitur baru terpasang |
| **7** | Testing & Finalisasi | Selalu di akhir |

---

> **Tips Vibe Coding**: Paste satu blok prompt per sesi. Setelah setiap fase selesai, jalankan `npm run build` dan verifikasi sebelum lanjut ke fase berikutnya. Jangan merge dua fase dalam satu sesi — risiko konflik tinggi.
