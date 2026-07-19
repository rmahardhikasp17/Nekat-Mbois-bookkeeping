// src/utils/db.ts
// ─── IndexedDB wrapper — satu-satunya layer penyimpanan primer ────────────────
// Menggantikan sistem storage multi-layer (localStorage + IndexedDB + OPFS).
// Data di-persist di IndexedDB; localStorage tidak lagi digunakan sebagai
// primary storage data bisnis.

import type { BusinessData, DailyRecord } from '@/types';
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

/**
 * Muat data bisnis dari IndexedDB.
 * Jika belum ada data, kembalikan DEFAULT_BUSINESS_DATA.
 * Jika data lama (v2.0.0), jalankan migrasi on-the-fly ke v2.1.0.
 */
export async function loadData(): Promise<BusinessData> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => {
        const raw = req.result;
        if (!raw) { resolve({ ...DEFAULT_BUSINESS_DATA }); return; }
        resolve(migrateData(raw));
      };
      req.onerror = () => resolve({ ...DEFAULT_BUSINESS_DATA });
    });
  } catch {
    return { ...DEFAULT_BUSINESS_DATA };
  }
}

/**
 * Migrasi data dari versi lama ke versi saat ini.
 * Idempoten — aman dipanggil berkali-kali.
 */
function migrateData(data: BusinessData): BusinessData {
  // ── Normalisasi dailyRecords: bisa Array (v2+) atau Object Map (v1 legacy) ─
  // Jika Object Map, konversi ke Array agar .map() tidak crash
  const rawDailyRecords = data.dailyRecords;
  const dailyRecordsArray: DailyRecord[] = Array.isArray(rawDailyRecords)
    ? rawDailyRecords
    : rawDailyRecords && typeof rawDailyRecords === 'object'
      ? Object.values(rawDailyRecords as Record<string, DailyRecord>)
      : [];

  return {
    ...DEFAULT_BUSINESS_DATA,
    ...data,
    version: '2.1.0',
    // ── Migrasi Service: tambahkan employeeRate jika belum ada ────────────────
    services: (data.services ?? []).map(s => ({
      employeeRate: 50, // default 50/50 untuk data lama
      ...s,
    })),
    // ── Migrasi DailyRecord: tambahkan field v2.1 jika belum ada ─────────────
    dailyRecords: dailyRecordsArray.map((r) => {
      // Jika record sudah punya employeeRevenue DAN services sebagai Array, tidak perlu migrasi
      if ('employeeRevenue' in r && Array.isArray((r as any).services)) return r;

      // ── Migrasi format services: Object Map → ServiceEntry[] ─────────────
      let services = (r as any).services;
      if (services && !Array.isArray(services)) {
        // Format lama: { serviceId: qty } → konversi ke ServiceEntry[]
        services = Object.entries(services as Record<string, number>)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([serviceId, qty]) => ({
            serviceId,
            serviceName: serviceId, // nama akan dicari dari services list
            price: 0,               // price tidak tersimpan di format lama
            qty: Number(qty),
            subtotal: 0,
            employeeRate: 50,
          }));
      }

      // ── Migrasi format bonusServices: Object Map → BonusEntry[] ─────────
      let bonusServices = (r as any).bonusServices;
      if (bonusServices && !Array.isArray(bonusServices)) {
        // Format lama: { serviceId: { bonusId: bool } } — abaikan, set kosong
        bonusServices = [];
      }

      // Estimasi untuk record lama
      const grossRevenue = (r as any).totalRevenue ?? 0;
      const role = (r as any).employeeRole ?? 'Karyawan';
      return {
        ...r,
        services: services ?? [],
        bonusServices: bonusServices ?? [],
        employeeRevenue: 'employeeRevenue' in r
          ? (r as any).employeeRevenue
          : role === 'Owner' ? grossRevenue : Math.round(grossRevenue * 0.5),
        ownerShareFromEmployee: 'ownerShareFromEmployee' in r
          ? (r as any).ownerShareFromEmployee
          : role === 'Karyawan' ? Math.round(grossRevenue * 0.5) : 0,
        calculatedSalary: (r as any).gajiDiterima ?? (r as any).calculatedSalary ?? 0,
        savingsDeduction: (r as any).potongan ?? (r as any).savingsDeduction ?? 0,
        createdAt: (r as any).createdAt ?? new Date().toISOString(),
        updatedAt: (r as any).updatedAt ?? new Date().toISOString(),
      };
    }),
  };
}


/**
 * Simpan data bisnis ke IndexedDB, update lastSaved otomatis.
 */
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

/**
 * Hapus semua data bisnis dari IndexedDB.
 * Digunakan oleh fitur "Clear All Data" di Settings.
 */
export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(DATA_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Backup & Restore — utilitas saja, bukan storage primer ──────────────────

/**
 * Download data sebagai file JSON ke perangkat user.
 */
export function exportToJSON(data: BusinessData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nekat-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validasi skema minimal BusinessData.
 * Mencegah crash layar putih akibat tipe field yang salah
 * (misal: "employees": "bukan array").
 *
 * @returns true jika data aman diproses, false jika skema tidak valid
 */
export function validateBusinessData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.employees && !Array.isArray(data.employees)) return false;
  if (data.services && !Array.isArray(data.services)) return false;
  if (data.dailyRecords && !Array.isArray(data.dailyRecords)) return false;
  return true;
}

/**
 * Import dan parse file JSON backup.
 * Lakukan validasi minimal dan merge dengan DEFAULT_BUSINESS_DATA
 * agar field baru (dari upgrade versi) terisi dengan default.
 */
export async function importFromJSON(file: File): Promise<BusinessData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as BusinessData;
        // Validasi minimal: harus ada setidaknya satu dari field utama
        if (!parsed.employees && !parsed.dailyRecords && !parsed.services) {
          reject(new Error('Format file tidak valid'));
          return;
        }
        // 3.2: Validasi skema — pastikan field utama bertipe Array (bukan string/object)
        if (!validateBusinessData(parsed)) {
          reject(new Error('Skema data tidak valid: field utama harus berupa Array'));
          return;
        }
        // Merge dengan default agar field baru (v2+) tidak undefined
        resolve({ ...DEFAULT_BUSINESS_DATA, ...parsed, version: '2.0.0' });
      } catch {
        reject(new Error('File JSON rusak atau tidak dapat dibaca'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}
