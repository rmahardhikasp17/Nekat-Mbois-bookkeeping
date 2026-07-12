import React, { useState } from 'react';
import { Calendar, Download, FileText, DollarSign, Users, PiggyBank, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { calculateMonthlyOwnerSalary, OWNER_DAILY_SAVINGS } from '@/utils/salaryCalculator';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface BusinessData {
  services: any[];
  employees: any[];
  dailyRecords: any[];  // DailyRecord[] — v2.1 format
  transactions: any[];  // Transaction[]
  productSales?: any[];
  urgentOverrides?: Record<string, {
    totalPendapatan?: number;
    totalPengeluaran?: number;
    totalGajiDibayarkan?: number;
    tabunganOwner?: number;
    pendapatanProduk?: number;
  }>;
}

interface MonthlyReportProps {
  businessData: BusinessData;
}

interface EmployeeSalary {
  employeeId: string;
  name: string;
  role: string;
  gaji: number;
  bonus: number;
  potongan: number;
  uangHadir: number;
}

interface OwnerBreakdown {
  ownerServiceRevenue: number;
  ownerBonus: number;
  ownerShareFromKaryawan: number;
  tabunganHarian: number;
  uangHadirKaryawan: number;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ businessData }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [reportData, setReportData] = useState<any>(null);

  // Helper function to calculate service total from service ID and quantity
  const calculateServiceTotal = (serviceId: string, quantity: number) => {
    const service = businessData.services?.find(s => s.id === serviceId);
    if (!service || !service.price || quantity <= 0) return 0;
    return service.price * quantity;
  };

  // Helper function to calculate bonus total
  const calculateBonusTotal = (bonusServices: any, bonusQuantities: any) => {
    if (!bonusServices || !bonusQuantities) return 0;
    
    let total = 0;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]: [string, any]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]: [string, any]) => {
        if (isEnabled) {
          const bonusService = businessData.services?.find(s => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          total += (bonusService?.price || 0) * bonusQty;
        }
      });
    });
    
    return total;
  };

  // Helper untuk hitung revenue dari ServiceEntry[] (v2.1) atau Record<string,number> (v1 lama)
  const getServiceRevenue = (record: any): number => {
    const services = record.services;
    if (!services) return 0;
    // Format v2.1: ServiceEntry[]
    if (Array.isArray(services)) {
      return services.reduce((sum: number, e: any) => sum + (e.subtotal ?? 0), 0);
    }
    // Format lama: Record<serviceId, qty>
    return Object.entries(services as Record<string, number>)
      .reduce((sum: number, [serviceId, qty]) => sum + calculateServiceTotal(serviceId, Number(qty)), 0);
  };

  // Helper untuk hitung bonus total dari BonusEntry[] (v2.1) atau Object Map (v1 lama)
  const getBonusRevenue = (record: any): number => {
    const bonusServices = record.bonusServices;
    if (!bonusServices) return 0;
    // Format v2.1: BonusEntry[]
    if (Array.isArray(bonusServices)) {
      return bonusServices.reduce((sum: number, e: any) => sum + (e.subtotal ?? 0), 0);
    }
    // Format lama: Record<serviceId, Record<bonusId, bool>>
    return calculateBonusTotal(bonusServices, record.bonusQuantities);
  };

  // Helpers to compute baseline totals by date
  const calcPendapatanForDate = (date: string) => {
    const records = (businessData.dailyRecords || []).filter((r: any) => r.date === date);
    return records.reduce((sum: number, record: any) => {
      return sum + getServiceRevenue(record) + getBonusRevenue(record);
    }, 0);
  };
  const calcPengeluaranForDate = (date: string) => {
    return (businessData.transactions || [])
      .filter((t: any) => t.date === date && t.type === 'Pengeluaran')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  };
  const calcPendapatanProdukForDate = (date: string) => {
    return (businessData.productSales || [])
      .filter((s: any) => s.date === date)
      .reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  };
  const calcGajiDibayarkanForDate = (date: string) => {
    const dayRecords = (businessData.dailyRecords || []).filter((r: any) => r.date === date);
    return dayRecords.reduce((sum: number, record: any) => {
      if (typeof record.calculatedSalary === 'number') return sum + record.calculatedSalary;
      const employee = businessData.employees?.find((emp: any) => emp.id === record.employeeId);
      const isOwner = employee?.role === 'Owner';
      const serviceRevenue = getServiceRevenue(record);
      const bonusTotal = getBonusRevenue(record);
      if (isOwner) return sum + Math.max(0, serviceRevenue - OWNER_DAILY_SAVINGS + bonusTotal);
      return sum + serviceRevenue * 0.5 + bonusTotal;
    }, 0);
  };
  const calcTabunganOwnerForDate = (date: string) => {
    const ownerCount = (businessData.dailyRecords || []).filter((r: any) => r.date === date && (businessData.employees?.find((e: any) => e.id === r.employeeId)?.role === 'Owner')).length;
    return ownerCount * OWNER_DAILY_SAVINGS;
  };

  const calculateMonthlyReport = () => {
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    // Filter data for the selected month
    const monthlyRecords = (businessData.dailyRecords || []).filter((record: any) => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });

    const monthlyTransactions = (businessData.transactions || []).filter((transaction: any) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    const monthlyProductSales = (businessData.productSales || []).filter((sale: any) => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // 1. 🔢 Baseline Total Pendapatan - HANYA dari layanan murni + bonus (TIDAK termasuk produk)
    let totalPendapatan = monthlyRecords.reduce((sum: number, record: any) => {
      return sum + getServiceRevenue(record) + getBonusRevenue(record);
    }, 0);

    // 2. 💸 Baseline Total Pengeluaran - dari transactions type "Pengeluaran"
    let totalPengeluaran = monthlyTransactions
      .filter((t: any) => t.type === 'Pengeluaran')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    // 7. 📦 Baseline Total Pendapatan Produk - dari productSales.total
    let totalPendapatanProduk = monthlyProductSales.reduce((sum: number, sale: any) => {
      return sum + (sale.total || 0);
    }, 0);

    // 3/6. Baseline gaji/tabungan akan dihitung di bawah, override diterapkan setelah baseline tersedia

    // Separate records by role
    const ownerRecords = monthlyRecords.filter(record => {
      const employee = businessData.employees?.find(emp => emp.id === record.employeeId);
      return employee?.role === 'Owner';
    });

    const karyawanRecords = monthlyRecords.filter(record => {
      const employee = businessData.employees?.find(emp => emp.id === record.employeeId);
      return employee?.role === 'Karyawan';
    });

    // 4. 👤 Gaji Owner — gunakan ownerShareFromEmployee yang sudah di-snapshot per record karyawan
    // Ini memastikan laporan historis akurat meski rate berubah di masa depan
    const ownerServiceRevenue = ownerRecords.reduce((sum: number, record: any) => {
      if (typeof record.totalRevenue === 'number' && record.employeeRole === 'Owner') {
        return sum + record.totalRevenue;
      }
      return sum + getServiceRevenue(record);
    }, 0);

    const ownerBonus = ownerRecords.reduce((sum: number, record: any) =>
      sum + getBonusRevenue(record), 0
    );

    // ── v2.1: Gunakan ownerShareFromEmployee yang sudah di-snapshot saat transaksi ──
    const ownerShareFromEmployees = karyawanRecords.reduce((sum: number, record: any) => {
      if (typeof record.ownerShareFromEmployee === 'number') {
        return sum + record.ownerShareFromEmployee;
      }
      // Fallback untuk record lama
      return sum + Math.round(getServiceRevenue(record) * 0.5);
    }, 0);

    const { salary: gajiOwner, savings: tabunganHarian } = calculateMonthlyOwnerSalary({
      ownerOwnRevenue: ownerServiceRevenue,
      ownerShareFromAllEmployees: ownerShareFromEmployees,
      ownerBonus,
      ownerAttendanceDays: ownerRecords.length,
    });
    const ownerShareFromKaryawan = ownerShareFromEmployees; // untuk ownerBreakdown

    // 📌 Hitung Pendapatan Bersih Owner (Gaji Owner - Total Pengeluaran)
    const ownerBreakdown: OwnerBreakdown = {
      ownerServiceRevenue,
      ownerBonus,
      ownerShareFromKaryawan,
      tabunganHarian,
      uangHadirKaryawan: 0
    };

    // 📌 Hitung Pendapatan Bersih Owner (Gaji Owner - Total Pengeluaran)
    const pendapatanBersihOwner = gajiOwner - totalPengeluaran;

    // 5. 🧑‍🔧 Rangkuman Gaji Karyawan per individu
    const employeeIds = [...new Set(karyawanRecords.map(r => r.employeeId))];
    const perEmployeeSalaries: EmployeeSalary[] = employeeIds.map(empId => {
      const empRecords = karyawanRecords.filter(r => r.employeeId === empId);
      const employee = businessData.employees?.find(e => e.id === empId);

      // Hitung total revenue dan bonus seluruh sesi dalam bulan ini
      // v2.1: Gunakan employeeRevenue yang sudah di-snapshot jika tersedia
      const totalGajiSesi = empRecords.reduce((sum: number, record: any) => {
        if (typeof record.calculatedSalary === 'number') return sum + record.calculatedSalary;
        if (typeof record.employeeRevenue === 'number') return sum + record.employeeRevenue;
        return sum + getServiceRevenue(record) * 0.5;
      }, 0);

      const totalBonus = empRecords.reduce((sum: number, record: any) =>
        sum + getBonusRevenue(record), 0
      );

      return {
        employeeId: empId,
        name: employee?.name || 'Unknown',
        role: employee?.role || 'Unknown',
        gaji: totalGajiSesi + totalBonus,
        bonus: totalBonus,
        potongan: 0,
        uangHadir: 0
      };
    });

    // Owner sebagai employee salary
    if (ownerRecords.length > 0) {
      const ownerEmployee = businessData.employees?.find(emp => emp.role === 'Owner');
      if (ownerEmployee) {
        perEmployeeSalaries.push({
          employeeId: ownerEmployee.id,
          name: ownerEmployee.name,
          role: 'Owner',
          gaji: gajiOwner,
          bonus: ownerBonus,
          potongan: 0,
          uangHadir: 0
        });
      }
    }

    // 3. 💼 Total Gaji Dibayarkan (baseline)
    const totalGajiKaryawan = perEmployeeSalaries
      .filter(emp => emp.role === 'Karyawan')
      .reduce((sum, emp) => sum + emp.gaji, 0);

    let totalGajiDibayarkan = totalGajiKaryawan + gajiOwner;

    // 6. 💰 Tabungan Owner (baseline)
    let totalTabunganOwner = tabunganHarian;

    // 🔧 Apply urgent overrides per-date (replace baseline)
    const ovMap = businessData.urgentOverrides || {};
    const baseDates = new Set<string>([...monthlyRecords.map((r: any) => r.date), ...monthlyTransactions.map((t: any) => t.date), ...monthlyProductSales.map((p: any) => p.date)]);
    const ovDatesInMonth = Object.keys(ovMap as any).filter((d) => {
      const dd = new Date(d);
      return dd >= startDate && dd <= endDate;
    });
    const allDatesInMonth = new Set<string>([...baseDates, ...ovDatesInMonth]);
    Array.from(allDatesInMonth).forEach((d) => {
      const ov: any = (ovMap as any)[d];
      if (!ov) return;
      if (typeof ov.totalPendapatan === 'number') {
        totalPendapatan -= calcPendapatanForDate(d);
        totalPendapatan += ov.totalPendapatan;
      }
      if (typeof ov.totalPengeluaran === 'number') {
        totalPengeluaran -= calcPengeluaranForDate(d);
        totalPengeluaran += ov.totalPengeluaran;
      }
      if (typeof ov.pendapatanProduk === 'number') {
        totalPendapatanProduk -= calcPendapatanProdukForDate(d);
        totalPendapatanProduk += ov.pendapatanProduk;
      }
      if (typeof ov.totalGajiDibayarkan === 'number') {
        totalGajiDibayarkan -= calcGajiDibayarkanForDate(d);
        totalGajiDibayarkan += ov.totalGajiDibayarkan;
      }
      if (typeof ov.tabunganOwner === 'number') {
        totalTabunganOwner -= calcTabunganOwnerForDate(d);
        totalTabunganOwner += ov.tabunganOwner;
      }
    });

    // 8. 📊 Statistik tambahan
    const activeDays = new Set(monthlyRecords.map((record: any) => record.date)).size;
    const activeEmployees = new Set(monthlyRecords.map((record: any) => record.employeeId)).size;

    setReportData({
      totalPendapatan,
      totalPengeluaran,
      totalGajiDibayarkan,
      gajiOwner,
      pendapatanBersihOwner,
      totalGajiKaryawan,
      totalTabunganOwner,
      totalPendapatanProduk,
      activeDays,
      activeEmployees,
      ownerBreakdown,
      perEmployeeSalaries,
      monthlyRecords,
      monthlyTransactions,
      monthlyProductSales
    });
  };

  const exportToExcel = async () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    try {
      toast.loading('Generating Excel file...');
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Ringkasan (Hanya Menampilkan Data Penting)
      const summaryData = [
        ['LAPORAN BULANAN', selectedMonth],
        [''],
        ['RINGKASAN UTAMA'],
        ['Total Pendapatan Jasa', reportData.totalPendapatan],
        ['Total Pendapatan Produk', reportData.totalPendapatanProduk],
        ['Total Pengeluaran Operasional', reportData.totalPengeluaran],
        ['Total Gaji Karyawan', reportData.totalGajiKaryawan],
        ['Tabungan Owner', reportData.totalTabunganOwner],
        ['Pendapatan Bersih Owner (Net)', reportData.pendapatanBersihOwner],
        [''],
        ['INFORMASI AKTIVITAS'],
        ['Hari Kerja Aktif', reportData.activeDays],
        ['Karyawan Aktif', reportData.activeEmployees]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

      // Sheet 2: Gaji Karyawan
      const perEmployeeSalaries = reportData.perEmployeeSalaries || [];
      const salaryData = [
        ['Nama', 'Peran', 'Gaji Total', 'Bonus', 'Potongan', 'Status UMR'],
        ...perEmployeeSalaries.map((emp: EmployeeSalary) => [
          emp.name,
          emp.role,
          emp.gaji,
          emp.bonus,
          emp.potongan,
          emp.gaji >= 2000000 ? 'Sesuai UMR' : 'Belum UMR'
        ])
      ];
      const salarySheet = XLSX.utils.aoa_to_sheet(salaryData);
      XLSX.utils.book_append_sheet(workbook, salarySheet, 'Gaji Karyawan');

      // Sheet 3: Recap Harian Selama 1 Bulan (Diperbaiki untuk format v2.1)
      const monthlyRecords = reportData.monthlyRecords || [];
      const dailyData = [
        ['Tanggal', 'Nama', 'Peran', 'Layanan Utama', 'Bonus', 'Pendapatan Murni', 'Gaji Final'],
        ...monthlyRecords.map((record: any) => {
          const employee = businessData.employees?.find(emp => emp.id === record.employeeId);
          const serviceRevenue = getServiceRevenue(record);
          const bonusTotal = getBonusRevenue(record);
          
          let finalSalary = record.calculatedSalary;
          if (record.employeeRole === 'Owner') {
            // Dapatkan akumulasi share dari karyawan lain pada tanggal ini
            const sharesOnDate = monthlyRecords
              .filter((r: any) => r.date === record.date && r.employeeRole !== 'Owner')
              .reduce((sum: number, r: any) => sum + (r.ownerShareFromEmployee ?? 0), 0);
            
            const baseSalary = typeof finalSalary === 'number'
              ? finalSalary
              : serviceRevenue + bonusTotal - (record.savingsDeduction ?? 50000);
            
            finalSalary = baseSalary + sharesOnDate;
          } else {
            if (typeof finalSalary !== 'number') {
              finalSalary = serviceRevenue * 0.5 + bonusTotal;
            }
          }
          
          return [
            record.date,
            record.employeeName ?? employee?.name ?? 'Unknown',
            record.employeeRole ?? (employee?.role === 'Owner' ? 'Owner' : 'Karyawan'),
            serviceRevenue,
            bonusTotal,
            serviceRevenue,
            finalSalary
          ];
        })
      ];
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Recap Harian');

      // Sheet 4: Penjualan Produk (Selalu diekspor meskipun kosong)
      const monthlyProductSales = reportData.monthlyProductSales || [];
      const productData = [
        ['Nama Produk', 'Jumlah Terjual', 'Total Penjualan', 'Tanggal'],
        ...monthlyProductSales.map((sale: any) => [
          sale.productName || 'Unknown Product',
          sale.quantity || 0,
          sale.total || 0,
          sale.date
        ])
      ];
      const productSheet = XLSX.utils.aoa_to_sheet(productData);
      XLSX.utils.book_append_sheet(workbook, productSheet, 'Penjualan Produk');

      // Sheet 5: Transaksi (Selalu diekspor meskipun kosong)
      const monthlyTransactions = reportData.monthlyTransactions || [];
      const transactionData = [
        ['Tanggal', 'Tipe Transaksi', 'Deskripsi', 'Nominal'],
        ...monthlyTransactions.map((transaction: any) => [
          transaction.date,
          transaction.type,
          transaction.description,
          transaction.amount
        ])
      ];
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transaksi');

      XLSX.writeFile(workbook, `Laporan_Bulanan_${selectedMonth}.xlsx`);
      toast.dismiss();
      toast.success('Excel file exported successfully with 5 sheets!');
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast.dismiss();
      toast.error(`Failed to export to Excel: ${error.message}`);
    }
  };

  const stats = [
    {
      title: 'Total Pendapatan',
      value: reportData ? formatCurrency(reportData.totalPendapatan) : formatCurrency(0),
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Total Pengeluaran',
      value: reportData ? formatCurrency(reportData.totalPengeluaran) : formatCurrency(0),
      icon: TrendingUp,
      color: 'bg-red-500'
    },
    {
      title: 'Gaji Owner',
      value: reportData ? formatCurrency(reportData.gajiOwner) : formatCurrency(0),
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pendapatan Bersih Owner',
      value: reportData ? formatCurrency(reportData.pendapatanBersihOwner) : formatCurrency(0),
      icon: DollarSign,
      color: 'bg-emerald-600'
    },
    {
      title: 'Tabungan Owner',
      value: reportData ? formatCurrency(reportData.totalTabunganOwner) : formatCurrency(0),
      icon: PiggyBank,
      color: 'bg-purple-500'
    },
    {
      title: 'Pendapatan Produk',
      value: reportData ? formatCurrency(reportData.totalPendapatanProduk) : formatCurrency(0),
      icon: FileText,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 lg:p-8 border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Laporan Bulanan (Knowledge Base Baru)</h2>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Generate monthly business reports</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={!reportData}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            <Download size={20} />
            <span>Export to Excel (5 Sheets)</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 lg:p-8 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="flex items-center space-x-3">
            <Calendar size={20} className="text-muted-foreground" />
            <label className="text-sm font-medium">Bulan & Tahun:</label>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto px-3 md:px-4 py-2 border border-border rounded-lg bg-white text-black focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base"
            />
            <button
              onClick={calculateMonthlyReport}
              className="w-full sm:w-auto bg-primary text-primary-foreground px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm md:text-base"
            >
              Hitung Rekap Bulanan
            </button>
          </div>
        </div>
      </div>

          {/* Stats */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-card rounded-xl shadow-sm p-4 md:p-6 border">
                  <div className="flex items-center justify-between min-w-0 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{stat.title}</p>
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg shrink-0`}>
                      <Icon className="text-white" size={20} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Owner Breakdown Section */}
          {reportData.ownerBreakdown && (
            <div className="bg-card rounded-xl shadow-sm p-4 md:p-6 lg:p-8 border">
              <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">👤 Breakdown Gaji Owner</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">Layanan Owner</div>
                    <div className="font-bold text-sm sm:text-base md:text-lg text-emerald-400 truncate">{formatCurrency(reportData.ownerBreakdown.ownerServiceRevenue)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">Share dari Karyawan (50%)</div>
                    <div className="font-bold text-sm sm:text-base md:text-lg text-emerald-400 truncate">{formatCurrency(reportData.ownerBreakdown.ownerShareFromKaryawan)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">Bonus Owner</div>
                    <div className="font-bold text-sm sm:text-base md:text-lg text-emerald-400 truncate">{formatCurrency(reportData.ownerBreakdown.ownerBonus)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">Tabungan Harian (50K)</div>
                    <div className="font-bold text-sm sm:text-base md:text-lg text-red-400 truncate">-{formatCurrency(reportData.ownerBreakdown.tabunganHarian)}</div>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-semibold text-xs sm:text-sm md:text-base truncate">Gaji Owner (sebelum pengeluaran):</span>
                    <span className="font-bold text-sm sm:text-base md:text-xl text-blue-400 shrink-0">
                      {formatCurrency(reportData.gajiOwner)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-red-400 truncate">Pengeluaran Bulanan:</span>
                    <span className="font-bold text-sm sm:text-base md:text-xl text-red-400 shrink-0">
                      -{formatCurrency(reportData.totalPengeluaran)}
                    </span>
                  </div>
                  <div className="border border-emerald-500/20 pt-3 flex justify-between items-center bg-emerald-950/20 p-4 rounded-lg gap-4">
                    <span className="font-bold text-xs sm:text-sm md:text-base lg:text-lg truncate">💰 Pendapatan Bersih Owner:</span>
                    <span className="font-bold text-base sm:text-lg md:text-2xl lg:text-3xl text-emerald-400 shrink-0">
                      {formatCurrency(reportData.pendapatanBersihOwner)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Salaries Section */}
          {reportData.perEmployeeSalaries && reportData.perEmployeeSalaries.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm p-8 border">
              <h3 className="text-lg font-semibold mb-6">🧑‍🔧 Rangkuman Gaji Karyawan Bulan Ini</h3>
              <div className="space-y-4">
                {reportData.perEmployeeSalaries.map((emp: EmployeeSalary, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">
                        {emp.role === 'Owner' ? '👤' : '🧑‍🔧'}
                      </span>
                      <div>
                        <div className="font-medium">
                          {emp.name} ({emp.role})
                        </div>
                        {emp.bonus > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Bonus: {formatCurrency(emp.bonus)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-lg">{formatCurrency(emp.gaji)}</span>
                      <Badge 
                        variant={emp.gaji >= 2000000 ? "default" : "destructive"}
                      >
                        {emp.gaji >= 2000000 ? 'Sesuai UMR' : 'Belum UMR'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl shadow-sm p-6 border">
              <h3 className="text-lg font-semibold mb-4">📦 Pendapatan Produk</h3>
              <p className="text-3xl font-bold text-orange-400">
                {formatCurrency(reportData.totalPendapatanProduk)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Penjualan produk bulan ini
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6 border">
              <h3 className="text-lg font-semibold mb-4">📅 Hari Aktif</h3>
              <p className="text-3xl font-bold text-blue-400">{reportData.activeDays}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Hari dengan aktivitas bisnis
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6 border">
              <h3 className="text-lg font-semibold mb-4">👥 Karyawan Aktif</h3>
              <p className="text-3xl font-bold text-purple-400">{reportData.activeEmployees}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Karyawan yang bekerja bulan ini
              </p>
            </div>
          </div>
        </>
      )}

      {/* No Data Message */}
      {!reportData && (
        <div className="bg-card rounded-xl shadow-sm p-12 border text-center">
          <FileText className="mx-auto text-muted-foreground mb-4" size={48} />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Pilih Bulan untuk Melihat Laporan</h3>
          <p className="text-muted-foreground">
            Klik "Hitung Rekap Bulanan" untuk generate laporan bulan yang dipilih
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
