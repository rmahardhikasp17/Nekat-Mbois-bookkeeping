// src/utils/backupManager.ts
// ─── Backup opsional: File System Access API & kompresi ──────────────────────
// Fungsi-fungsi ini HANYA digunakan sebagai opsi backup opsional di Settings.
// Bukan bagian dari storage primer (IndexedDB di db.ts).

// ─── Compression ──────────────────────────────────────────────────────────────

const supportsCompression = (): boolean =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function compressToGzip(str: string): Promise<Blob> {
  if (!supportsCompression()) return new Blob([str], { type: 'application/json' });
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(str));
  await writer.close();
  const ab = await new Response(cs.readable).arrayBuffer();
  return new Blob([ab], { type: 'application/gzip' });
}

export async function decompressGzip(blob: Blob): Promise<string> {
  if (!supportsCompression()) return blob.text();
  const ds = new DecompressionStream('gzip');
  const stream = blob.stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(ab);
}

// ─── Compression preference (localStorage OK — ini preferensi UI, bukan data bisnis) ──

const COMPRESSION_PREF_KEY = 'backupCompression';

export const setCompressionPreference = (enabled: boolean): void => {
  try { localStorage.setItem(COMPRESSION_PREF_KEY, enabled ? '1' : '0'); } catch (_) {}
};

export const getCompressionPreference = (): boolean => {
  try { return localStorage.getItem(COMPRESSION_PREF_KEY) === '1'; } catch (_) { return false; }
};

// ─── Download JSON backup ──────────────────────────────────────────────────────

export async function downloadJSONBackup(data: object, compressed = false): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const blob = compressed ? await compressToGzip(json) : new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = compressed ? `backup_${ts}.json.gz` : `backup_${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importJSONFile(file: File): Promise<unknown> {
  if (!file) throw new Error('No file');
  const isGzip = file.name.endsWith('.gz') || file.type === 'application/gzip';
  const text = isGzip ? await decompressGzip(file) : await file.text();
  const data: unknown = JSON.parse(text);
  if (typeof data !== 'object' || data === null) throw new Error('Invalid JSON');
  return data;
}

// ─── Storage estimate ──────────────────────────────────────────────────────────

export const getStorageEstimate = async (): Promise<StorageEstimate | null> => {
  try {
    if (!navigator.storage?.estimate) return null;
    return await navigator.storage.estimate();
  } catch (_) {
    return null;
  }
};

// ─── File System Access API (auto-backup ke file) ────────────────────────────

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept?: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

const IDB_DB_NAME = 'backupHandleDB';
const IDB_STORE = 'handles';
const HANDLE_KEY = 'auto_backup_handle';
const HANDLE_META_KEY = 'auto_backup_meta';
const LAST_BACKUP_TS_KEY = 'autoBackupLastTs';

const isFSASupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';

// Dedicated IDB untuk menyimpan FSA handle (tidak mix dengan data bisnis)
function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbHandleGet(key: string): Promise<unknown> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbHandleSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openHandleDB();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* swallow */ }
}

export const requestAutoBackupFile = async (): Promise<{ supported: boolean; ok: boolean }> => {
  if (!isFSASupported()) return { supported: false, ok: false };
  try {
    const compressed = getCompressionPreference();
    const suggestedName = compressed ? 'nekat-mbois-backup.json.gz' : 'nekat-mbois-backup.json';
    const types = [{
      description: compressed ? 'Gzip JSON' : 'JSON',
      accept: compressed ? { 'application/gzip': ['.gz'] } : { 'application/json': ['.json'] },
    }];
    const handle = await window.showSaveFilePicker!({ suggestedName, types });
    await idbHandleSet(HANDLE_KEY, handle);
    await idbHandleSet(HANDLE_META_KEY, { compressed });
    return { supported: true, ok: true };
  } catch (_) {
    return { supported: true, ok: false };
  }
};

export const clearAutoBackup = async (): Promise<void> => {
  await idbHandleSet(HANDLE_KEY, null);
  await idbHandleSet(HANDLE_META_KEY, null);
};

export const saveAutoBackup = async (jsonString: string): Promise<boolean> => {
  try {
    const handle = (await idbHandleGet(HANDLE_KEY)) as FileSystemFileHandle | null;
    const meta = (await idbHandleGet(HANDLE_META_KEY)) as { compressed: boolean } | null;
    if (!handle) return false;

    const mode = { mode: 'readwrite' as FileSystemPermissionMode };
    const p = await handle.queryPermission(mode);
    if (p === 'denied') return false;
    if (p === 'prompt') {
      const r = await handle.requestPermission(mode);
      if (r !== 'granted') return false;
    }

    const blob = meta?.compressed
      ? await compressToGzip(jsonString)
      : new Blob([jsonString], { type: 'application/json' });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    try { localStorage.setItem(LAST_BACKUP_TS_KEY, String(Date.now())); } catch (_) {}
    return true;
  } catch (_) {
    return false;
  }
};

// ─── Excel export (menggunakan xlsx library, lazy import) ─────────────────────

import { calculateSalary, calculateMonthlyOwnerSalary } from '@/utils/salaryCalculator';

interface LegacyRecord {
  date: string;
  employeeId: string;
  services: Record<string, number>;
  bonusServices?: Record<string, Record<string, boolean>>;
  bonusQuantities?: Record<string, Record<string, number>>;
}

interface ExportableData {
  employees: Array<{ id: string; name: string; role: string }>;
  services: Array<{ id: string; name: string; price: number }>;
}

export function exportDailyRecapToExcel(
  dailyRecords: any[],
  businessData: ExportableData,
  selectedDate: string
): void {
  if (!dailyRecords || dailyRecords.length === 0) {
    throw new Error('No records to export for this date');
  }

  import('xlsx').then((XLSX) => {
    // Helper: hitung service revenue dari ServiceEntry[] (v2.1) atau Record (lama)
    const getServiceRevenue = (record: any): number => {
      const services = record.services;
      if (!services) return 0;
      if (Array.isArray(services)) {
        return services.reduce((sum: number, e: any) => sum + (e.subtotal ?? 0), 0);
      }
      return Object.entries(services as Record<string, number>)
        .filter(([, qty]) => Number(qty) > 0)
        .reduce((sum: number, [serviceId, qty]) => {
          const service = businessData.services?.find((s) => s.id === serviceId);
          return sum + (service?.price ?? 0) * Number(qty);
        }, 0);
    };

    // Helper: hitung bonus revenue dari BonusEntry[] (v2.1) atau Object Map (lama)
    const getBonusRevenue = (record: any): number => {
      const bonusServices = record.bonusServices;
      if (!bonusServices) return 0;
      if (Array.isArray(bonusServices)) {
        return bonusServices.reduce((sum: number, e: any) => sum + (e.subtotal ?? 0), 0);
      }
      // Format lama
      let total = 0;
      if (record.bonusQuantities) {
        Object.entries(bonusServices as Record<string, Record<string, boolean>>).forEach(([, bonusData]) => {
          Object.entries(bonusData ?? {}).forEach(([bonusId, isEnabled]) => {
            if (isEnabled) {
              const bonusService = businessData.services?.find((s) => s.id === bonusId);
              total += (bonusService?.price ?? 0);
            }
          });
        });
      }
      return total;
    };

    const exportData = dailyRecords.map((record: any) => {
      const employee = businessData.employees?.find((emp) => emp.id === record.employeeId);
      const serviceRevenue = getServiceRevenue(record);
      const bonusTotal = getBonusRevenue(record);

      // Gunakan pre-calculated salary jika tersedia (record v2.1)
      const salary = typeof record.calculatedSalary === 'number'
        ? record.calculatedSalary
        : typeof record.gajiDiterima === 'number'
          ? record.gajiDiterima
          : 0;

      return {
        'Tanggal': record.date,
        'Nama Karyawan': record.employeeName ?? employee?.name ?? 'Unknown',
        'Role': record.employeeRole ?? (employee?.role === 'Owner' ? 'Owner' : 'Karyawan'),
        'Pendapatan Layanan': serviceRevenue,
        'Bonus Layanan': bonusTotal,
        'Total Gaji': salary,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Recap');
    XLSX.writeFile(wb, `daily_recap_${selectedDate}.xlsx`);
  }).catch((err) => {
    console.error('Failed to load XLSX library:', err);
    throw new Error('Gagal export Excel');
  });
}

