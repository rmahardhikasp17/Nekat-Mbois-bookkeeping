// src/hooks/useBusinessData.ts
// ─── Custom hook: jembatan antara IndexedDB dan React state ──────────────────
// Semua komponen yang butuh data bisnis HARUS menggunakan hook ini melalui
// Index.tsx (prop drilling), bukan mengakses db.ts langsung.

import { useState, useEffect, useCallback } from 'react';
import { loadData, saveData } from '@/utils/db';
import type { BusinessData } from '@/types';
import { DEFAULT_BUSINESS_DATA } from '@/types';

export interface UseBusinessDataReturn {
  data: BusinessData;
  updateData: (updater: (prev: BusinessData) => BusinessData) => void;
  isLoading: boolean;
  /** null = ok, string = pesan error (tampilkan banner) */
  dbError: string | null;
}

export function useBusinessData(): UseBusinessDataReturn {
  const [data, setData] = useState<BusinessData>(DEFAULT_BUSINESS_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // ── Load dari IndexedDB saat mount ────────────────────────────────────────
  useEffect(() => {
    loadData()
      .then((loaded) => {
        setData(loaded);
        setDbError(null);
      })
      .catch(() => {
        setData({ ...DEFAULT_BUSINESS_DATA });
        // H7: tunjukkan banner error jika IndexedDB gagal load
        setDbError('Gagal memuat data dari penyimpanan lokal. Data baru yang kamu masukkan mungkin tidak tersimpan.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Debounced write ke IndexedDB — H6: cegah race condition ──────────────
  // Setiap kali `data` berubah, jadwalkan write setelah 300ms.
  // Jika ada perubahan baru sebelum timer habis, cleanup membatalkan timer
  // lama dan useEffect baru membuat timer baru → debounce alami tanpa ref.
  // isLoading dijadikan guard agar initial load tidak memicu write percuma.
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      saveData(data).catch((err) => {
        console.error('[useBusinessData] Failed to persist to IndexedDB:', err);
        // H7: tunjukkan banner error jika save gagal
        setDbError('Gagal menyimpan data. Periksa ruang penyimpanan perangkat kamu.');
      });
    }, 300);

    // Cleanup: batalkan timer lama saat data berubah lagi (debounce)
    return () => clearTimeout(timer);
  }, [data, isLoading]);

  /**
   * Update data bisnis secara atomik.
   * - State diupdate secara sinkron (UI langsung responsif).
   * - Fungsi ini murni: tidak ada side-effect di sini; persist ditangani
   *   oleh useEffect di atas yang mengamati perubahan `data`.
   *
   * @param updater - Fungsi murni: (prev: BusinessData) => BusinessData
   */
  const updateData = useCallback((updater: (prev: BusinessData) => BusinessData) => {
    setData(updater);
  }, []);

  return { data, updateData, isLoading, dbError };
}
