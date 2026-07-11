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
 * Hitung total pendapatan layanan + bonus hari ini dari semua karyawan.
 * Digunakan oleh Dashboard untuk menampilkan pendapatan harian.
 */
export function getTodayTotal(
  businessData: Pick<BusinessData, 'dailyRecords' | 'services'>
): number {
  const today = new Date().toISOString().split('T')[0];

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
    const serviceRevenue = Object.entries(
      Array.isArray(record.services) ? {} : (record.services as Record<string, number>)
    )
      .filter(([, qty]) => Number(qty) > 0)
      .reduce((serviceSum, [serviceId, qty]) => {
        const services = Array.isArray(businessData.services) ? businessData.services : [];
        const service = services.find((s) => s.id === serviceId);
        return serviceSum + (service?.price ?? 0) * Number(qty);
      }, 0);

    let bonusTotal = 0;
    if (!Array.isArray(record.services) && record.bonusServices && record.bonusQuantities) {
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
  const today = new Date().toISOString().split('T')[0];
  const sales = businessData.productSales;
  if (!sales || Array.isArray(sales)) return 0;
  return Object.values(sales as Record<string, { date: string; total: number }>)
    .filter((sale) => sale.date === today)
    .reduce((sum, sale) => sum + sale.total, 0);
}

/**
 * Hitung jumlah produk yang terdaftar.
 */
export function getTotalProducts(businessData: Pick<BusinessData, 'products'>): number {
  return Array.isArray(businessData.products) ? businessData.products.length : 0;
}
