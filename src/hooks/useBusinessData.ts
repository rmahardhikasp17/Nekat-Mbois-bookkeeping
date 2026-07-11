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
}

export function useBusinessData(): UseBusinessDataReturn {
  const [data, setData] = useState<BusinessData>(DEFAULT_BUSINESS_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // Load dari IndexedDB saat mount
  useEffect(() => {
    loadData()
      .then(setData)
      .catch(() => setData({ ...DEFAULT_BUSINESS_DATA }))
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Update data bisnis secara atomik.
   * - State diupdate secara sinkron (UI langsung responsif)
   * - Persist ke IndexedDB secara async (fire-and-forget dengan error log)
   *
   * @param updater - Fungsi murni: (prev: BusinessData) => BusinessData
   */
  const updateData = useCallback((updater: (prev: BusinessData) => BusinessData) => {
    setData((prev) => {
      const next = updater(prev);
      // Async persist — jangan blokir UI
      saveData(next).catch((err) => {
        console.error('[useBusinessData] Failed to persist to IndexedDB:', err);
      });
      return next;
    });
  }, []);

  return { data, updateData, isLoading };
}
