// src/components/DailyInput.tsx
// ─── Input harian barbershop — Android-first, zero keyboard UX ───────────────
// v2.1: ServiceEntry dengan snapshot employeeRate, bagi hasil dinamis per layanan.
// Flow: Pilih Tanggal → Pilih Karyawan → Tap +/- Layanan → Submit

import React, { useMemo, useState } from 'react';
import { RotateCcw, CheckCircle2, User, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import {
  calculateSalary, calculateGrossRevenue, OWNER_DAILY_SAVINGS,
  getEmployeeShare, getOwnerShare,
} from '@/utils/salaryCalculator';
import { generateId } from '@/utils/idGenerator';
import { DatePickerNative } from '@/components/ui/DatePickerNative';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Service, Employee, ServiceEntry, BonusEntry, DailyRecord } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessData {
  services: Service[];
  employees: Employee[];
  dailyRecords: DailyRecord[];
  [key: string]: unknown;
}

interface DailyInputProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format angka ke "Rp 150.000" */
function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

function isBonusService(service: Service): boolean {
  return service.isBonusService === true || (service as any).bonusable === true;
}

/** Buat ServiceEntry dengan snapshot employeeRate dari definisi layanan saat ini */
function buildServiceEntry(service: Service, qty: number): ServiceEntry {
  return {
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    qty,
    subtotal: service.price * qty,
    employeeRate: service.employeeRate ?? 50, // snapshot rate saat transaksi
  };
}

/** Cari record duplikat berdasarkan date + employeeId dalam Array */
function findExistingRecord(records: DailyRecord[], date: string, employeeId: string): DailyRecord | undefined {
  return records.find(r => r.date === date && r.employeeId === employeeId);
}

// ─── Component ────────────────────────────────────────────────────────────────

const DailyInput: React.FC<DailyInputProps> = ({ businessData, updateBusinessData }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  /** serviceId → qty (layanan utama) */
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
  /** serviceId → qty (bonus services) */
  const [bonusQty, setBonusQty] = useState<Record<string, number>>({});
  /** Kontrol dialog konfirmasi overwrite duplikat */
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  /** Pending record untuk overwrite */
  const [pendingRecord, setPendingRecord] = useState<{ key: string; record: DailyRecord } | null>(null);

  const mainServices = useMemo(
    () => businessData.services.filter(s => !isBonusService(s)),
    [businessData.services]
  );
  const bonusServices = useMemo(
    () => businessData.services.filter(s => isBonusService(s)),
    [businessData.services]
  );

  // ─── Bangun ServiceEntry list dari qty state ───────────────────────────────

  const activeServiceEntries = useMemo<ServiceEntry[]>(() =>
    mainServices
      .filter(s => (serviceQty[s.id] ?? 0) > 0)
      .map(s => buildServiceEntry(s, serviceQty[s.id])),
    [mainServices, serviceQty]
  );

  const activeBonusEntries = useMemo<BonusEntry[]>(() =>
    bonusServices
      .filter(s => (bonusQty[s.id] ?? 0) > 0)
      .map(s => ({
        serviceId: s.id,
        serviceName: s.name,
        price: s.price,
        qty: bonusQty[s.id],
        subtotal: s.price * bonusQty[s.id],
      })),
    [bonusServices, bonusQty]
  );

  // ─── Kalkulasi real-time ───────────────────────────────────────────────────

  const calc = useMemo(() => {
    if (!selectedEmployee) {
      return { salary: 0, grossRevenue: 0, employeeRevenue: 0, ownerShareFromEmployee: 0, totalBonus: 0, savingsDeduction: 0 };
    }
    const role = (selectedEmployee.role === 'Owner' || selectedEmployee.role === 'Karyawan')
      ? selectedEmployee.role : 'Karyawan';
    return calculateSalary(activeServiceEntries, activeBonusEntries, role as 'Owner' | 'Karyawan');
  }, [selectedEmployee, activeServiceEntries, activeBonusEntries]);

  const hasAnyQty = activeServiceEntries.length > 0 || activeBonusEntries.length > 0;

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleReset = () => { setServiceQty({}); setBonusQty({}); };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(prev => (prev?.id === emp.id ? null : emp));
    setServiceQty({});
    setBonusQty({});
  };

  const buildRecord = (): { key: string; record: DailyRecord } | null => {
    if (!selectedEmployee) return null;
    const key = `${selectedDate}_${selectedEmployee.id}`;
    const now = new Date().toISOString();
    const record: DailyRecord = {
      id: generateId(),
      date: selectedDate,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      employeeRole: (selectedEmployee.role as 'Owner' | 'Karyawan') ?? 'Karyawan',
      services: activeServiceEntries,
      bonusServices: activeBonusEntries,
      totalRevenue: calc.grossRevenue,
      totalBonus: calc.totalBonus,
      employeeRevenue: calc.employeeRevenue,
      ownerShareFromEmployee: calc.ownerShareFromEmployee,
      calculatedSalary: calc.salary,
      savingsDeduction: calc.savingsDeduction,
      createdAt: now,
      updatedAt: now,
    };
    return { key, record };
  };

  const commitRecord = (_key: string, record: DailyRecord) => {
    const existing = Array.isArray(businessData.dailyRecords) ? businessData.dailyRecords : [];
    // Replace jika sudah ada (overwrite), tambah jika belum
    const alreadyExists = existing.some(r => r.date === record.date && r.employeeId === record.employeeId);
    const updated: DailyRecord[] = alreadyExists
      ? existing.map(r => (r.date === record.date && r.employeeId === record.employeeId ? record : r))
      : [...existing, record];
    updateBusinessData({ dailyRecords: updated });
    toast.success(`Data ${selectedEmployee?.name} disimpan`, {
      description: `Gaji: ${formatRupiah(calc.salary)}`,
    });
    setServiceQty({});
    setBonusQty({});
    setPendingRecord(null);
  };

  const handleSubmit = () => {
    if (!selectedEmployee) { toast.warning('Pilih karyawan terlebih dahulu'); return; }
    if (!hasAnyQty) { toast.warning('Tambahkan setidaknya satu layanan'); return; }

    const built = buildRecord();
    if (!built) return;

    const existing = Array.isArray(businessData.dailyRecords) ? businessData.dailyRecords : [];
    const duplicate = findExistingRecord(existing, built.record.date, built.record.employeeId);
    if (duplicate) {
      setPendingRecord(built);
      setShowDuplicateWarning(true);
      return;
    }
    commitRecord(built.key, built.record);
  };

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (businessData.services.length === 0 || businessData.employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          {businessData.employees.length === 0
            ? <User className="w-8 h-8 text-muted-foreground" />
            : <Scissors className="w-8 h-8 text-muted-foreground" />}
        </div>
        <p className="font-semibold text-foreground mb-1">
          {businessData.employees.length === 0 ? 'Belum ada karyawan' : 'Belum ada layanan'}
        </p>
        <p className="text-sm text-muted-foreground">
          {businessData.employees.length === 0
            ? 'Tambahkan karyawan terlebih dahulu'
            : 'Tambahkan layanan terlebih dahulu'}
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="pb-52">

      {/* ── SECTION 1: Tanggal ─────────────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Tanggal
        </p>
        <DatePickerNative value={selectedDate} onChange={setSelectedDate} />
      </section>

      {/* ── SECTION 2: Karyawan ────────────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Karyawan
        </p>
        <div className="grid grid-cols-2 gap-2">
          {businessData.employees.map(emp => {
            const active = selectedEmployee?.id === emp.id;
            return (
              <button
                key={emp.id}
                onClick={() => handleSelectEmployee(emp)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all duration-150',
                  'min-h-[64px] active:scale-95',
                  active ? 'border-primary bg-primary/10' : 'border-border bg-card active:bg-accent/20'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    active ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    <User className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('font-semibold text-sm leading-tight truncate', active ? 'text-primary' : 'text-foreground')}>
                      {emp.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.role}</p>
                  </div>
                  {active && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-auto" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3 & 4: Layanan — hanya tampil saat karyawan dipilih ────── */}
      {selectedEmployee && (
        <>
          {mainServices.length > 0 && (
            <section className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Layanan Utama
                </p>
                {hasAnyQty && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-muted-foreground active:text-foreground transition-colors min-h-[32px] px-2"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {mainServices.map(service => {
                  const qty = serviceQty[service.id] ?? 0;
                  const entry = qty > 0 ? buildServiceEntry(service, qty) : null;
                  const empShare = entry ? getEmployeeShare(entry) : 0;
                  const ownerShareAmt = entry ? getOwnerShare(entry) : 0;
                  const isOwner = selectedEmployee.role === 'Owner';

                  return (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center gap-3 bg-card rounded-xl border px-4 py-3 transition-colors',
                        qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">{service.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRupiah(service.price)} · bagi {service.employeeRate ?? 50}/{100 - (service.employeeRate ?? 50)}
                        </p>
                        {/* Preview bagi hasil saat qty > 0 */}
                        {qty > 0 && (
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] font-medium text-primary">
                              {isOwner ? '→ ' : ''}
                              {isOwner
                                ? `Revenue: ${formatRupiah(entry!.subtotal)}`
                                : `Kamu: ${formatRupiah(empShare)}`}
                            </span>
                            {!isOwner && (
                              <span className="text-[10px] text-muted-foreground">
                                Owner: {formatRupiah(ownerShareAmt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Stepper
                        value={qty}
                        onChange={v => setServiceQty(prev => ({ ...prev, [service.id]: v }))}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {bonusServices.length > 0 && (
            <section className="mb-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Bonus Layanan
              </p>
              <div className="space-y-2">
                {bonusServices.map(service => {
                  const qty = bonusQty[service.id] ?? 0;
                  const subtotal = qty * service.price;
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center gap-3 bg-card rounded-xl border px-4 py-3 transition-colors',
                        qty > 0 ? 'border-amber-400/40 bg-amber-400/5' : 'border-border'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">{service.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRupiah(service.price)}
                          {subtotal > 0 && (
                            <span className="text-amber-400 font-semibold ml-1.5">
                              = {formatRupiah(subtotal)}
                            </span>
                          )}
                        </p>
                      </div>
                      <Stepper
                        value={qty}
                        onChange={v => setBonusQty(prev => ({ ...prev, [service.id]: v }))}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── SECTION 5: Sticky Summary & Submit ──────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border p-4 shadow-lg"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
      >
        {selectedEmployee ? (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Estimasi Gaji</p>
                <p className={cn(
                  'text-2xl font-bold tabular-nums transition-all duration-200',
                  calc.salary < 0 ? 'text-destructive' : calc.salary > 0 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {formatRupiah(calc.salary)}
                </p>
                {selectedEmployee.role === 'Owner' && (
                  <p className="text-[10px] text-muted-foreground">
                    Tabungan hari ini: {formatRupiah(OWNER_DAILY_SAVINGS)} dipotong
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Gross Revenue</p>
                <p className="text-base font-semibold text-foreground tabular-nums">
                  {formatRupiah(calc.grossRevenue + calc.totalBonus)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedEmployee.name} · {selectedEmployee.role}
                </p>
              </div>
            </div>
            <Button
              id="daily-input-submit"
              onClick={handleSubmit}
              disabled={!hasAnyQty}
              className="w-full h-12 text-base font-semibold"
            >
              Simpan Data Hari Ini
            </Button>
          </>
        ) : (
          <div className="text-center py-1">
            <p className="text-sm text-muted-foreground">Pilih karyawan untuk mulai input</p>
          </div>
        )}
      </div>

      {/* ── AlertDialog: konfirmasi overwrite duplikat ─────────────────────── */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data sudah ada</AlertDialogTitle>
            <AlertDialogDescription>
              Sudah ada catatan untuk <strong>{selectedEmployee?.name}</strong> pada tanggal{' '}
              <strong>{selectedDate}</strong>. Mengganti data lama akan menghapus catatan sebelumnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRecord(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRecord) {
                  commitRecord(pendingRecord.key, pendingRecord.record);
                  setShowDuplicateWarning(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ganti Data Lama
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyInput;
