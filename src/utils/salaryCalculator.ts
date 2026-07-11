// src/utils/salaryCalculator.ts
// ─── SATU-SATUNYA sumber logika kalkulasi gaji di seluruh aplikasi ────────────
// v2.1.0: Kalkulasi sadar employeeRate per layanan (bagi hasil dinamis).
// Semua kalkulasi gaji HARUS menggunakan fungsi dari file ini.

import type { EmployeeRole, ServiceEntry, BonusEntry } from '@/types';

/** Potongan harian tetap untuk Owner (tabungan). */
export const OWNER_DAILY_SAVINGS = 50_000;

// ─── Per-entry share helpers ──────────────────────────────────────────────────

/**
 * Hitung bagian karyawan dari satu ServiceEntry.
 * Menggunakan employeeRate yang di-snapshot pada saat transaksi.
 */
export function getEmployeeShare(entry: ServiceEntry): number {
  return Math.round(entry.subtotal * (entry.employeeRate / 100));
}

/**
 * Hitung bagian owner dari satu ServiceEntry layanan karyawan.
 * = subtotal - bagian karyawan (memastikan total selalu = subtotal)
 */
export function getOwnerShare(entry: ServiceEntry): number {
  return entry.subtotal - getEmployeeShare(entry);
}

// ─── Aggregate calculators ────────────────────────────────────────────────────

/** Total revenue gross (sebelum split) dari semua ServiceEntry. */
export function calculateGrossRevenue(services: ServiceEntry[]): number {
  return services.reduce((sum, s) => sum + s.subtotal, 0);
}

/** Total bagian karyawan dari semua ServiceEntry (setelah split). */
export function calculateEmployeeRevenue(services: ServiceEntry[]): number {
  return services.reduce((sum, s) => sum + getEmployeeShare(s), 0);
}

/**
 * Total bagian owner yang berasal dari layanan karyawan.
 * Digunakan saat menghitung gaji bulanan owner.
 */
export function calculateOwnerShareFromEmployee(services: ServiceEntry[]): number {
  return services.reduce((sum, s) => sum + getOwnerShare(s), 0);
}

/** Total dari bonus services (selalu 100% milik yang bersangkutan). */
export function calculateBonus(bonusServices: BonusEntry[]): number {
  return bonusServices.reduce((sum, b) => sum + b.subtotal, 0);
}

// ─── Main salary calculator ───────────────────────────────────────────────────

/**
 * Hitung gaji bersih berdasarkan services, bonus, dan role.
 *
 * - Karyawan: gaji = employeeRevenue (setelah split) + bonus
 * - Owner:    gaji = grossRevenue (penuh) - OWNER_DAILY_SAVINGS + bonus
 *
 * @returns Objek detail breakdown untuk UI dan penyimpanan record
 */
export function calculateSalary(
  services: ServiceEntry[],
  bonusServices: BonusEntry[],
  role: EmployeeRole
): {
  salary: number;
  grossRevenue: number;
  employeeRevenue: number;
  ownerShareFromEmployee: number;
  totalBonus: number;
  savingsDeduction: number;
} {
  const grossRevenue = calculateGrossRevenue(services);
  const totalBonus = calculateBonus(bonusServices);

  if (role === 'Karyawan') {
    const employeeRevenue = calculateEmployeeRevenue(services);
    return {
      salary: employeeRevenue + totalBonus,
      grossRevenue,
      employeeRevenue,
      ownerShareFromEmployee: calculateOwnerShareFromEmployee(services),
      totalBonus,
      savingsDeduction: 0,
    };
  }

  // Owner: mendapat gross revenue penuh dari layanannya sendiri
  return {
    salary: grossRevenue - OWNER_DAILY_SAVINGS + totalBonus,
    grossRevenue,
    employeeRevenue: grossRevenue, // Owner dapat 100% revenue sendiri
    ownerShareFromEmployee: 0,     // Owner tidak share dari dirinya
    totalBonus,
    savingsDeduction: OWNER_DAILY_SAVINGS,
  };
}

// ─── Monthly Owner calculation ────────────────────────────────────────────────

/**
 * Hitung gaji bulanan Owner.
 *
 * Formula:
 *   salary = ownerOwnRevenue + ownerShareFromAllEmployees + ownerBonus - savings
 *
 * Catatan: ownerShareFromAllEmployees sudah di-snapshot per record karyawan,
 * jadi laporan historis tidak terpengaruh perubahan rate di masa depan.
 *
 * @param ownerShareFromAllEmployees - Σ ownerShareFromEmployee dari semua record Karyawan bulan ini
 */
export function calculateMonthlyOwnerSalary(params: {
  ownerOwnRevenue: number;
  ownerShareFromAllEmployees: number;
  ownerBonus: number;
  ownerAttendanceDays: number;
}): { salary: number; savings: number } {
  const { ownerOwnRevenue, ownerShareFromAllEmployees, ownerBonus, ownerAttendanceDays } = params;
  const savings = OWNER_DAILY_SAVINGS * ownerAttendanceDays;
  return {
    salary: ownerOwnRevenue + ownerShareFromAllEmployees + ownerBonus - savings,
    savings,
  };
}

// ─── Debugging helper ─────────────────────────────────────────────────────────

export interface VerifiableRecord {
  employeeRole?: string;
  totalRevenue?: number;
  bonusTotal?: number;
  ownerShareFromEmployee?: number;
}

/**
 * Verifikasi kalkulasi bulanan Owner dari array records.
 * Bisa dipanggil di browser DevTools console untuk audit manual.
 */
export function verifyMonthlyCalculation(records: VerifiableRecord[]): {
  ownerRevenue: number;
  ownerShareFromEmployees: number;
  ownerSavings: number;
  ownerBonus: number;
  ownerNetSalary: number;
  karyawanNetSalary: number;
  attendanceDays: { owner: number; karyawan: number };
} {
  const ownerRec = records.filter(r => r.employeeRole === 'Owner');
  const karyawanRec = records.filter(r => r.employeeRole === 'Karyawan');

  const ownerRevenue = ownerRec.reduce((s, r) => s + (r.totalRevenue ?? 0), 0);
  // Gunakan ownerShareFromEmployee yang sudah di-snapshot (akurat historis)
  const ownerShareFromEmployees = karyawanRec.reduce(
    (s, r) => s + (r.ownerShareFromEmployee ?? 0), 0
  );
  const ownerSavings = ownerRec.length * OWNER_DAILY_SAVINGS;
  const ownerBonus = ownerRec.reduce((s, r) => s + (r.bonusTotal ?? 0), 0);
  const ownerNetSalary = ownerRevenue + ownerShareFromEmployees + ownerBonus - ownerSavings;
  const karyawanNetSalary = karyawanRec.reduce(
    (s, r) => s + (r.totalRevenue ?? 0) + (r.bonusTotal ?? 0), 0
  );

  return {
    ownerRevenue,
    ownerShareFromEmployees,
    ownerSavings,
    ownerBonus,
    ownerNetSalary,
    karyawanNetSalary,
    attendanceDays: { owner: ownerRec.length, karyawan: karyawanRec.length },
  };
}
