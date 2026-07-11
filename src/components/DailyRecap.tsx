import React, { useState, useEffect } from 'react';
import { Calendar, Download, User, DollarSign, Edit, Trash, Save, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { exportDailyRecapToExcel } from '../utils/backupManager';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Service {
  id: string;
  name: string;
  price: number;
  bonusable?: boolean;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface ServiceEntry {
  serviceId: string;
  serviceName: string;
  price: number;
  qty: number;
  subtotal: number;
  employeeRate: number;
}

interface BonusEntry {
  serviceId: string;
  serviceName: string;
  price: number;
  qty: number;
  subtotal: number;
}

interface DailyRecord {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  services: ServiceEntry[];
  bonusServices: BonusEntry[];
  totalRevenue: number;
  totalBonus: number;
  employeeRevenue: number;
  ownerShareFromEmployee: number;
  calculatedSalary: number;
  savingsDeduction: number;
  createdAt: string;
  updatedAt: string;
}

interface BusinessData {
  employees: Employee[];
  services: Service[];
  dailyRecords: DailyRecord[];
}

interface DailyRecapProps {
  businessData: BusinessData;
  updateBusinessData?: (data: Partial<BusinessData>) => void;
}

const DailyRecap: React.FC<DailyRecapProps> = ({ businessData, updateBusinessData }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editServices, setEditServices] = useState<Record<string, number>>({});
  const [editBonusServices, setEditBonusServices] = useState<Record<string, Record<string, boolean>>>({});
  const [editBonusQuantities, setEditBonusQuantities] = useState<Record<string, Record<string, number>>>({});

  const mainServices = (businessData.services || []).filter(s => !s.bonusable);
  const bonusServicesList = (businessData.services || []).filter(s => s.bonusable);

  const startEditRecord = (record: DailyRecord) => {
    const key = `${record.date}_${record.employeeId}`;
    setEditingKey(key);
    setEditServices({ ...(record.services || {}) });
    setEditBonusServices({ ...(record.bonusServices || {}) });
    setEditBonusQuantities({ ...(record.bonusQuantities || {}) });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditServices({});
    setEditBonusServices({});
    setEditBonusQuantities({});
  };

  const handleServiceQuantityChange = (serviceId: string, quantity: string) => {
    const qty = Math.max(0, parseInt(quantity || '0', 10) || 0);
    setEditServices(prev => ({ ...prev, [serviceId]: qty }));

    setEditBonusQuantities(prev => {
      const maxQty = qty;
      const current = prev[serviceId] || {};
      const clamped: Record<string, number> = Object.fromEntries(Object.entries(current).map(([bId, bQty]) => [bId, Math.min(Number(bQty) || 0, maxQty)]));
      return { ...prev, [serviceId]: clamped };
    });
  };

  const handleBonusServiceToggle = (serviceId: string, bonusId: string, enabled: boolean) => {
    setEditBonusServices(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [bonusId]: !!enabled,
      },
    }));

    if (!enabled) {
      setEditBonusQuantities(prev => ({
        ...prev,
        [serviceId]: {
          ...(prev[serviceId] || {}),
          [bonusId]: 0,
        },
      }));
    }
  };

  const handleBonusQuantityChange = (serviceId: string, bonusId: string, quantity: string, max: number) => {
    const qty = Math.max(0, Math.min(parseInt(quantity || '0', 10) || 0, max));
    setEditBonusQuantities(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [bonusId]: qty,
      },
    }));
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = (businessData.employees || []).find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const getEmployeeRole = (employeeId: string) => {
    const employee = (businessData.employees || []).find(emp => emp.id === employeeId);
    return employee ? employee.role : '';
  };

  const getServiceName = (serviceId: string) => {
    const service = (businessData.services || []).find(srv => srv.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getDailyRecords = (date: string): DailyRecord[] => {
    const records = Array.isArray(businessData.dailyRecords) ? businessData.dailyRecords : [];
    return records.filter(record => record.date === date);
  };

  const calculateServiceTotal = (serviceId: string, quantity: number) => {
    const service = (businessData.services || []).find(s => s.id === serviceId);
    const servicePrice = Number(service?.price) || 0;
    const serviceQuantity = Number(quantity) || 0;
    return servicePrice * serviceQuantity;
  };

  const calculateBonusTotal = (bonusServices?: Record<string, Record<string, boolean>>, bonusQuantities?: Record<string, Record<string, number>>) => {
    if (!bonusServices || !bonusQuantities) return 0;
    let total = 0;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]) => {
        if (isEnabled) {
          const bonusService = (businessData.services || []).find(s => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          total += (Number(bonusService?.price) || 0) * Number(bonusQty || 0);
        }
      });
    });
    return total;
  };

  const getBonusDetails = (bonusServices?: Record<string, Record<string, boolean>>, bonusQuantities?: Record<string, Record<string, number>>) => {
    const details: { name: string; quantity: number; value: number }[] = [];
    if (!bonusServices || !bonusQuantities) return details;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]) => {
        if (isEnabled) {
          const bonusService = (businessData.services || []).find(s => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          if (bonusQty > 0 && bonusService) {
            details.push({ name: bonusService.name, quantity: bonusQty, value: (Number(bonusService.price) || 0) * Number(bonusQty) });
          }
        }
      });
    });
    return details;
  };

  const calculateEmployeeSalary = (record: DailyRecord) => {
    // v2.1: gunakan nilai yang sudah di-snapshot saat transaksi disimpan
    if (typeof record.calculatedSalary === 'number') {
      return { salary: record.calculatedSalary };
    }
    // Fallback untuk record lama
    const isOwner = record.employeeRole === 'Owner';
    const serviceRevenue = (record.services as ServiceEntry[]).reduce((sum, e) => sum + e.subtotal, 0);
    const bonusTotal = (record.bonusServices as BonusEntry[]).reduce((sum, e) => sum + e.subtotal, 0);
    if (isOwner) {
      return { salary: serviceRevenue + bonusTotal - (record.savingsDeduction ?? 50000) };
    }
    return { salary: serviceRevenue * 0.5 + bonusTotal };
  };

  const dailyRecords = getDailyRecords(selectedDate);

  const totalEmployeeRevenue = dailyRecords
    .filter(r => r.employeeRole !== 'Owner')
    .reduce((sum, r) => sum + r.totalRevenue, 0);

  const employeeCount = dailyRecords.filter(r => r.employeeRole !== 'Owner').length;

  const totalGaji = dailyRecords.reduce((sum, r) => {
    const { salary } = calculateEmployeeSalary(r);
    return sum + salary;
  }, 0);

  const handleExport = () => {
    if ((dailyRecords as DailyRecord[]).length === 0) {
      toast.error('No data to export for this date');
      return;
    }
    try {
      exportDailyRecapToExcel(dailyRecords as any, businessData as any, selectedDate);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      toast.error('Failed to export Excel file');
    }
  };

  const deleteRecord = (record: DailyRecord) => {
    if (!updateBusinessData) return;
    const existing = Array.isArray(businessData.dailyRecords) ? businessData.dailyRecords : [];
    const updated = existing.filter(r => !(r.date === record.date && r.employeeId === record.employeeId));
    updateBusinessData({ dailyRecords: updated });
    toast.success('Data harian dihapus');
  };

  const saveRecord = (record: DailyRecord) => {
    if (!updateBusinessData) return;
    // Edit mode di DailyRecap untuk record v2.1 hanya memperbarui layanan utama (via Stepper)
    // Karena DailyRecap masih pakai format lama untuk edit, untuk sekarang kita hanya
    // update updatedAt dan pertahankan data lainnya
    const now = new Date().toISOString();
    const updatedRecord: DailyRecord = {
      ...record,
      updatedAt: now,
    };
    const existing = Array.isArray(businessData.dailyRecords) ? businessData.dailyRecords : [];
    const updated = existing.map(r =>
      (r.date === record.date && r.employeeId === record.employeeId ? updatedRecord : r)
    );
    updateBusinessData({ dailyRecords: updated });
    cancelEdit();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 lg:p-8 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Daily Recap</h2>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">View and export daily revenue summary</p>
          </div>
          <button onClick={handleExport} className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm md:text-base min-h-[48px]">
            <Download size={20} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
            <Calendar size={16} />
            <span>Select Date:</span>
          </label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto px-3 md:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-muted text-foreground text-sm md:text-base min-h-[44px]" />
        </div>
      </div>

      {dailyRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <User className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Active Employees</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">{dailyRecords.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Gaji Hari Ini</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">{formatCurrency(totalGaji)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-4 md:p-6 lg:p-8 border-b border-border">
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Records for {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
        </div>

        {dailyRecords.length === 0 ? (
          <div className="p-12 text-center bg-card">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-muted-foreground" size={32} />
            </div>
            <h4 className="text-lg font-medium text-muted-foreground mb-2">No records found</h4>
            <p className="text-muted-foreground text-sm">No data recorded for this date</p>
          </div>
        ) : (
          <div className="divide-y divide-border bg-card">
            {dailyRecords.map((record, index) => {
              const isOwner = record.employeeRole === 'Owner';
              const salaryData = calculateEmployeeSalary(record);
              const recordKey = `${record.date}_${record.employeeId}`;

              return (
                <div key={index} className="p-4 md:p-6 lg:p-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-start mb-4 md:mb-6 gap-4 lg:gap-0">
                    <div>
                      <h4 className="text-base md:text-lg font-semibold text-foreground">{getEmployeeName(record.employeeId)}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground">{isOwner ? 'Owner' : 'Employee'}</p>
                    </div>
                    <div className="text-left lg:text-right w-full lg:w-auto">
                      <p className="text-lg md:text-xl font-bold text-blue-400 mb-2 md:mb-3">Gaji: {formatCurrency(salaryData.salary)}</p>
                      <div className="text-xs md:text-sm text-muted-foreground space-y-1 bg-blue-950/20 p-3 md:p-4 rounded-lg border border-blue-500/20 w-full lg:max-w-md">
                        <p className="font-semibold text-foreground mb-2">Rinciannya:</p>
                        {isOwner ? (
                          <>
                            <div className="flex justify-between"><span>+ Pendapatan Layanan:</span><span className="text-emerald-400">{formatCurrency(record.totalRevenue)}</span></div>
                            {record.bonusServices.length > 0 && (
                              <div className="flex justify-between"><span>+ Bonus:</span><span className="text-emerald-400">{formatCurrency(record.totalBonus)}</span></div>
                            )}
                            {record.ownerShareFromEmployee > 0 && (
                              <div className="flex justify-between"><span>+ Share dari Karyawan:</span><span className="text-emerald-400">{formatCurrency(record.ownerShareFromEmployee)}</span></div>
                            )}
                            <div className="flex justify-between"><span>- Tabungan Harian:</span><span className="text-red-400">-{formatCurrency(record.savingsDeduction)}</span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between"><span>+ Bagian Karyawan:</span><span className="text-emerald-400">{formatCurrency(record.employeeRevenue)}</span></div>
                            {record.bonusServices.length > 0 && (
                              <div className="flex justify-between"><span>+ Bonus:</span><span className="text-emerald-400">{formatCurrency(record.totalBonus)}</span></div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingKey === recordKey ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-foreground">Edit Data Layanan</h5>
                        <div className="flex gap-2">
                          <button onClick={() => saveRecord(record)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 min-h-[44px]"><Save size={16} /> Simpan</button>
                          <button onClick={cancelEdit} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 min-h-[44px]"><X size={16} /> Batal</button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {mainServices.map((service) => (
                          <div key={service.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/40">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-foreground text-sm md:text-base">{service.name}</h4>
                                <p className="text-xs md:text-sm text-muted-foreground">{formatRupiah(service.price)} per layanan</p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <label className="text-xs md:text-sm text-muted-foreground">Qty:</label>
                                <input type="number" min={0} value={editServices[service.id] ?? ''} onChange={(e) => handleServiceQuantityChange(service.id, e.target.value)} className="w-16 px-2 py-1.5 border border-border bg-muted rounded text-center text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-transparent min-h-[36px]" placeholder="0" />
                                <span className="text-xs md:text-sm font-semibold text-emerald-400 min-w-16 text-right">{formatRupiah((Number(service.price) || 0) * (Number(editServices[service.id]) || 0))}</span>
                              </div>
                            </div>

                            {bonusServicesList.length > 0 && (Number(editServices[service.id]) || 0) > 0 && (
                              <div className="border-t border-border pt-3">
                                <h5 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Bonus Services:</h5>
                                <div className="space-y-3">
                                  {bonusServicesList.map((bonusService) => {
                                    const isEnabled = editBonusServices?.[service.id]?.[bonusService.id] || false;
                                    const maxQty = Number(editServices[service.id]) || 0;
                                    const bonusQty = editBonusQuantities?.[service.id]?.[bonusService.id] || 0;
                                    return (
                                      <div key={bonusService.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <input id={`bonus-${service.id}-${bonusService.id}`} type="checkbox" checked={isEnabled} onChange={(e) => handleBonusServiceToggle(service.id, bonusService.id, e.target.checked)} className="rounded border-border accent-primary w-4 h-4" />
                                            <label htmlFor={`bonus-${service.id}-${bonusService.id}`} className="text-xs md:text-sm font-medium text-foreground cursor-pointer">{bonusService.name}</label>
                                            <span className="text-xs text-muted-foreground">({formatRupiah(bonusService.price)})</span>
                                          </div>
                                          {isEnabled && (
                                            <div className="flex items-center gap-2">
                                              <label className="text-[10px] md:text-xs text-muted-foreground">Bonus Qty:</label>
                                              <input type="number" min={0} max={maxQty} value={bonusQty} onChange={(e) => handleBonusQuantityChange(service.id, bonusService.id, e.target.value, maxQty)} className="w-12 px-2 py-1 border border-border bg-muted rounded text-center text-foreground text-xs focus:ring-2 focus:ring-ring focus:border-transparent" placeholder="0" />
                                              <span className="text-[10px] text-muted-foreground">/ {maxQty}</span>
                                              <span className="text-xs md:text-sm font-semibold text-amber-400 min-w-14 text-right">{formatRupiah((Number(bonusService.price) || 0) * Number(bonusQty || 0))}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Services Performed:</h5>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
                          {(record.services as ServiceEntry[]).map((entry) => (
                            <div key={entry.serviceId} className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-border">
                              <span className="text-xs md:text-sm text-foreground">{entry.serviceName || getServiceName(entry.serviceId)}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs md:text-sm font-medium text-muted-foreground">{entry.qty}x</span>
                                <span className="text-xs md:text-sm text-emerald-400 font-semibold">{formatRupiah(entry.subtotal)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(record.bonusServices as BonusEntry[]).length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Bonus Services:</h5>
                          <div className="space-y-2">
                            {(record.bonusServices as BonusEntry[]).map((bonus, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                                <span className="text-xs md:text-sm text-foreground">{bonus.serviceName}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs md:text-sm font-medium text-muted-foreground">{bonus.qty}x</span>
                                  <span className="text-xs md:text-sm text-amber-400 font-semibold">{formatRupiah(bonus.subtotal)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => startEditRecord(record)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg active:bg-primary/80 min-h-[44px] text-xs md:text-sm font-semibold"><Edit size={16} /> Edit</button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="inline-flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg active:bg-destructive/80 min-h-[44px] text-xs md:text-sm font-semibold">
                              <Trash size={16} /> Hapus
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus catatan ini?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Data harian <strong>{getEmployeeName(record.employeeId)}</strong> tanggal {record.date} akan dihapus permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRecord(record)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="p-6 md:p-8 bg-blue-500/5 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-base md:text-lg font-semibold text-foreground">Total Gaji Hari Ini:</span>
                <span className="text-2xl md:text-3xl font-bold text-blue-400">{formatRupiah(totalGaji)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Local format helper
function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export default DailyRecap;
