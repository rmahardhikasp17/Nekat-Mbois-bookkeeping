// src/utils/formatters.ts
// ─── Utility functions: format, kalkulasi dashboard ──────────────────────────
// Dipindahkan dari dataManager.ts. Tidak ada dependency ke storage layer.

import type { BusinessData } from '@/types';

/**
 * Format angka ke format Rupiah Indonesia.
 * Contoh: 150000 → "Rp 150.000"
 */
export function formatCurrency(value: number | string): string {
  const numValue = Number(value) || 0;
  return `Rp ${numValue.toLocaleString('id-ID')}`;
}

/**
 * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD menggunakan
 * LOCAL timezone (bukan UTC). Menggantikan anti-pattern toISOString().split('T')[0]
 * yang salah untuk timezone UTC+7 antara jam 00:00-06:59 WIB.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Hitung total pendapatan layanan + bonus hari ini dari semua karyawan.
 * Digunakan oleh Dashboard untuk menampilkan pendapatan harian.
 */
export function getTodayTotal(
  businessData: Pick<BusinessData, 'dailyRecords' | 'services'>
): number {
  const today = getLocalDateString();

  // dailyRecords bisa array (v2) atau Record (v1 legacy)
  const records = Array.isArray(businessData.dailyRecords)
    ? businessData.dailyRecords.filter((r) => r.date === today)
    : Object.values(businessData.dailyRecords as Record<string, {
        date: string;
        services: Record<string, number>;
        bonusServices?: Record<string, Record<string, boolean>>;
        bonusQuantities?: Record<string, Record<string, number>>;
      }>).filter((r) => r.date === today);

  return records.reduce((sum, record) => {
    // ── v2.1: services adalah ServiceEntry[] — jumlahkan subtotal langsung ──
    if (Array.isArray(record.services)) {
      const serviceRevenue = record.services.reduce(
        (s: number, e: any) => s + (e.subtotal ?? 0), 0
      );
      const bonusRevenue = Array.isArray(record.bonusServices)
        ? record.bonusServices.reduce((s: number, b: any) => s + (b.subtotal ?? 0), 0)
        : 0;
      return sum + serviceRevenue + bonusRevenue;
    }

    // ── v1 legacy: services adalah Record<serviceId, qty> ─────────────────
    const serviceRevenue = Object.entries(
      record.services as Record<string, number>
    )
      .filter(([, qty]) => Number(qty) > 0)
      .reduce((serviceSum, [serviceId, qty]) => {
        const services = Array.isArray(businessData.services) ? businessData.services : [];
        const service = services.find((s) => s.id === serviceId);
        return serviceSum + (service?.price ?? 0) * Number(qty);
      }, 0);

    let bonusTotal = 0;
    if (record.bonusServices && record.bonusQuantities) {
      Object.entries(record.bonusServices ?? {}).forEach(([serviceId, bonusData]) => {
        Object.entries(bonusData ?? {}).forEach(([bonusId, isEnabled]) => {
          if (isEnabled) {
            const services = Array.isArray(businessData.services) ? businessData.services : [];
            const bonusService = services.find((s) => s.id === bonusId);
            const bonusQty = (record.bonusQuantities as Record<string, Record<string, number>>)[serviceId]?.[bonusId] ?? 0;
            bonusTotal += (bonusService?.price ?? 0) * bonusQty;
          }
        });
      });
    }

    return sum + serviceRevenue + bonusTotal;
  }, 0);
}

/**
 * Hitung total penjualan produk hari ini.
 */
export function getTodayProductSales(
  businessData: Pick<BusinessData, 'productSales'>
): number {
  const today = getLocalDateString();
  const sales = businessData.productSales;
  if (!sales) return 0;
  // Mendukung format array (baru) dan object map (lama)
  const salesArray = Array.isArray(sales)
    ? sales
    : Object.values(sales as Record<string, { date: string; total: number }>);
  return salesArray
    .filter((sale: any) => sale.date === today)
    .reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
}

/**
 * Hitung jumlah produk yang terdaftar.
 */
export function getTotalProducts(businessData: Pick<BusinessData, 'products'>): number {
  return Array.isArray(businessData.products) ? businessData.products.length : 0;
}
