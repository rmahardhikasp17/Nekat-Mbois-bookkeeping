// src/types/index.ts
// ─── Single source of truth untuk semua interface data aplikasi ───────────────
// v2.1.0: Tambah employeeRate per layanan + ownerShareFromEmployee per record

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
  /**
   * Persentase bagi hasil untuk karyawan (0–100).
   * - Bagian owner = 100 - employeeRate (tidak disimpan, dihitung on-the-fly)
   * - Default: 50 (bagi rata 50/50)
   * - Untuk layanan bonus (isBonusService=true), 100% milik karyawan — tapi field
   *   ini tetap tersimpan agar konsisten.
   */
  employeeRate: number;
  createdAt: string;
}

/** Hitung persentase bagian owner dari sebuah layanan. */
export function getOwnerRate(service: Pick<Service, 'employeeRate'>): number {
  return 100 - service.employeeRate;
}

export interface ServiceEntry {
  serviceId: string;
  serviceName: string;
  price: number;
  qty: number;
  subtotal: number;         // price × qty
  /**
   * SNAPSHOT employeeRate saat transaksi dibuat.
   * Nilai ini TIDAK berubah jika owner mengubah rate di masa depan.
   * Ini menjamin akurasi laporan historis.
   */
  employeeRate: number;
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
  date: string;           // format: YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  services: ServiceEntry[];
  bonusServices: BonusEntry[];
  totalRevenue: number;         // gross: subtotal semua layanan sebelum split
  totalBonus: number;           // total dari bonus service
  /**
   * Bagian karyawan dari semua layanan (setelah split employeeRate).
   * Untuk Owner: = totalRevenue (Owner dapat 100% revenue layanannya sendiri).
   */
  employeeRevenue: number;
  /**
   * Bagian owner yang berasal dari layanan karyawan.
   * = Σ(subtotal × (1 - employeeRate/100)) per entry.
   * Untuk Owner: = 0 (owner tidak share dari dirinya sendiri).
   * Digunakan oleh laporan bulanan untuk menghitung gaji owner.
   */
  ownerShareFromEmployee: number;
  calculatedSalary: number;     // gaji bersih yang diterima
  savingsDeduction: number;     // hanya untuk Owner (OWNER_DAILY_SAVINGS/hari)
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
  version: string;
}

export const DEFAULT_BUSINESS_DATA: BusinessData = {
  businessName: 'Nekat Barbershop',
  employees: [],
  services: [],
  dailyRecords: [],
  transactions: [],
  monthlyOverrides: [],
  lastSaved: new Date().toISOString(),
  version: '2.1.0',
};
