import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid
} from 'recharts';
import { Calendar, TrendingUp, Users, Scissors, DollarSign, Wallet, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { calculateMonthlyOwnerSalary, OWNER_DAILY_SAVINGS } from '@/utils/salaryCalculator';

interface BusinessData {
  services: any[];
  employees: any[];
  dailyRecords: any[];
  transactions: any[];
  productSales?: any[];
  urgentOverrides?: Record<string, {
    totalPendapatan?: number;
    totalPengeluaran?: number;
    totalGajiDibayarkan?: number;
    tabunganOwner?: number;
    pendapatanProduk?: number;
  }>;
}

interface VisualDataProps {
  businessData: BusinessData;
  setCurrentPage?: (page: any) => void;
}

const VisualData: React.FC<VisualDataProps> = ({ businessData, setCurrentPage }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Helper calculation functions (Identical to MonthlyReport to maintain math consistency)
  const calculateServiceTotal = (serviceId: string, quantity: number) => {
    const service = businessData.services?.find(s => s.id === serviceId);
    if (!service || !service.price || quantity <= 0) return 0;
    return service.price * quantity;
  };

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

  const getServiceRevenue = (record: any): number => {
    const services = record.services;
    if (!services) return 0;
    if (Array.isArray(services)) {
      return services.reduce((sum: number, e: any) => sum + (e.subtotal ?? 0), 0);
    }
    return Object.entries(services as Record<string, number>)
      .reduce((sum: number, [serviceId, qty]) => sum + calculateServiceTotal(serviceId, Number(qty)), 0);
  };

  const getBonusRevenue = (record: any): number => {
    const bonusServices = record.bonusServices;
    if (!bonusServices) return 0;
    if (Array.isArray(bonusServices)) {
      return bonusServices.reduce((sum: number, e: any) => sum + (e.subtotal ?? 0), 0);
    }
    return calculateBonusTotal(bonusServices, record.bonusQuantities);
  };

  // Memoized report data calculations
  const visualReportData = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

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

    // 1. Generate Timeline Data (Daily breakdown)
    const daysInMonth = endDate.getDate();
    const timelineMap: Record<string, { dateStr: string; pendapatan: number; pengeluaran: number; produk: number }> = {};
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${month}-${String(d).padStart(2, '0')}`;
      timelineMap[dateKey] = {
        dateStr: `${d}`,
        pendapatan: 0,
        pengeluaran: 0,
        produk: 0
      };
    }

    // Populate baseline values
    monthlyRecords.forEach(r => {
      if (timelineMap[r.date]) {
        timelineMap[r.date].pendapatan += getServiceRevenue(r) + getBonusRevenue(r);
      }
    });

    monthlyTransactions.forEach(t => {
      if (t.type === 'Pengeluaran' && timelineMap[t.date]) {
        timelineMap[t.date].pengeluaran += t.amount || 0;
      }
    });

    monthlyProductSales.forEach(s => {
      if (timelineMap[s.date]) {
        timelineMap[s.date].produk += s.total || 0;
      }
    });

    // Apply Overrides to timeline and calculate overall stats
    let totalPendapatan = 0;
    let totalPengeluaran = 0;
    let totalPendapatanProduk = 0;

    const ovMap = businessData.urgentOverrides || {};

    Object.keys(timelineMap).forEach(d => {
      const ov = ovMap[d];
      if (ov) {
        if (typeof ov.totalPendapatan === 'number') timelineMap[d].pendapatan = ov.totalPendapatan;
        if (typeof ov.totalPengeluaran === 'number') timelineMap[d].pengeluaran = ov.totalPengeluaran;
        if (typeof ov.pendapatanProduk === 'number') timelineMap[d].produk = ov.pendapatanProduk;
      }
      totalPendapatan += timelineMap[d].pendapatan;
      totalPengeluaran += timelineMap[d].pengeluaran;
      totalPendapatanProduk += timelineMap[d].produk;
    });

    const timelineData = Object.values(timelineMap);

    // 2. Owner Salary Breakdown calculations
    const ownerRecords = monthlyRecords.filter(record => {
      const employee = businessData.employees?.find(emp => emp.id === record.employeeId);
      return employee?.role === 'Owner';
    });

    const karyawanRecords = monthlyRecords.filter(record => {
      const employee = businessData.employees?.find(emp => emp.id === record.employeeId);
      return employee?.role === 'Karyawan';
    });

    const ownerServiceRevenue = ownerRecords.reduce((sum: number, record: any) => {
      return sum + getServiceRevenue(record);
    }, 0);

    const ownerBonus = ownerRecords.reduce((sum: number, record: any) => sum + getBonusRevenue(record), 0);

    const ownerShareFromEmployees = karyawanRecords.reduce((sum: number, record: any) => {
      if (typeof record.ownerShareFromEmployee === 'number') return sum + record.ownerShareFromEmployee;
      return sum + Math.round(getServiceRevenue(record) * 0.5);
    }, 0);

    const { salary: gajiOwner, savings: tabunganHarian } = calculateMonthlyOwnerSalary({
      ownerOwnRevenue: ownerServiceRevenue,
      ownerShareFromAllEmployees: ownerShareFromEmployees,
      ownerBonus,
      ownerAttendanceDays: ownerRecords.length,
    });

    // 3. Employee salary calculations
    const employeeIds = [...new Set(karyawanRecords.map(r => r.employeeId))];
    const perEmployeeSalaries = employeeIds.map(empId => {
      const empRecords = karyawanRecords.filter(r => r.employeeId === empId);
      const employee = businessData.employees?.find(e => e.id === empId);
      
      const totalGajiSesi = empRecords.reduce((sum: number, record: any) => {
        if (typeof record.calculatedSalary === 'number') return sum + record.calculatedSalary;
        if (typeof record.employeeRevenue === 'number') return sum + record.employeeRevenue;
        return sum + getServiceRevenue(record) * 0.5;
      }, 0);

      const totalBonus = empRecords.reduce((sum: number, record: any) => sum + getBonusRevenue(record), 0);

      return {
        name: employee?.name || 'Karyawan',
        gaji: totalGajiSesi + totalBonus,
      };
    });

    // 4. Service popularities (count completed)
    const serviceCounts: Record<string, { name: string; qty: number; value: number }> = {};
    monthlyRecords.forEach(record => {
      const services = record.services || [];
      if (Array.isArray(services)) {
        services.forEach((s: any) => {
          if (!serviceCounts[s.serviceId]) {
            const orig = businessData.services?.find(x => x.id === s.serviceId);
            serviceCounts[s.serviceId] = { name: orig?.name || 'Unknown', qty: 0, value: 0 };
          }
          serviceCounts[s.serviceId].qty += s.quantity || 0;
          serviceCounts[s.serviceId].value += s.subtotal || 0;
        });
      }
    });

    const servicesChartData = Object.values(serviceCounts).sort((a, b) => b.qty - a.qty);

    return {
      totalPendapatan,
      totalPengeluaran,
      totalPendapatanProduk,
      gajiOwner,
      tabunganHarian,
      netOwnerProfit: gajiOwner - totalPengeluaran,
      timelineData,
      perEmployeeSalaries,
      servicesChartData,
      ownerBreakdownData: [
        { name: 'Jasa Sendiri', value: ownerServiceRevenue },
        { name: 'Bagi Hasil Karyawan', value: ownerShareFromEmployees },
        { name: 'Bonus', value: ownerBonus },
      ]
    };
  }, [selectedMonth, businessData]);

  // Color variables for charts
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-6 pb-24">
      {/* Navigation Header */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage?.('settings')}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors min-h-[44px] shrink-0"
            aria-label="Kembali ke Pengaturan"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Visualisasi Data Bulanan</h2>
            <p className="text-xs text-muted-foreground">Tampilan diagram & tren performa bisnis</p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Calendar className="text-primary w-5 h-5 shrink-0" />
          <span className="text-sm font-medium text-foreground">Pilih Periode Laporan</span>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-border rounded-lg bg-white text-black focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pendapatan Jasa', value: visualReportData.totalPendapatan, icon: DollarSign, color: 'text-emerald-500' },
          { label: 'Penjualan Produk', value: visualReportData.totalPendapatanProduk, icon: Wallet, color: 'text-blue-500' },
          { label: 'Pengeluaran Ops', value: visualReportData.totalPengeluaran, icon: TrendingUp, color: 'text-red-500' },
          { label: 'Tabungan Owner', value: visualReportData.tabunganHarian, icon: Users, color: 'text-purple-500' }
        ].map((item, idx) => (
          <div key={idx} className="bg-card rounded-xl border border-border p-3 space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">{item.label}</span>
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            </div>
            <p className="text-sm sm:text-base font-bold text-foreground">
              Rp {item.value.toLocaleString('id-ID')}
            </p>
          </div>
        ))}
      </div>

      {/* Chart 1: Daily Revenue vs Expenses Trend */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-foreground">Tren Keuangan Harian</h4>
          <p className="text-xs text-muted-foreground">Grafik pendapatan (Jasa + Produk) dibandingkan pengeluaran operasional</p>
        </div>
        <div className="h-64 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visualReportData.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="dateStr" tickLine={false} style={{ fontSize: '10px' }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px' }} tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`]}
                labelFormatter={(label) => `Tanggal ${label}`}
                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
              />
              <Area type="monotone" name="Pendapatan (Jasa+Prd)" dataKey={(d) => d.pendapatan + d.produk} stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" name="Pengeluaran" dataKey="pengeluaran" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 2: Revenue vs Expenses summary */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground">Struktur Arus Kas Utama</h4>
            <p className="text-xs text-muted-foreground">Komparasi total Pendapatan, Pengeluaran, Gaji Karyawan, dan Profit Bersih</p>
          </div>
          <div className="h-60 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Pendapatan', value: visualReportData.totalPendapatan + visualReportData.totalPendapatanProduk, fill: '#10b981' },
                  { name: 'Pengeluaran', value: visualReportData.totalPengeluaran, fill: '#ef4444' },
                  { name: 'Gaji Owner', value: visualReportData.gajiOwner, fill: '#3b82f6' },
                  { name: 'Profit Net', value: visualReportData.netOwnerProfit, fill: '#f59e0b' }
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px' }} tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`]}
                  contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {
                    [
                      { fill: '#10b981' },
                      { fill: '#ef4444' },
                      { fill: '#3b82f6' },
                      { fill: '#f59e0b' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Owner Share Breakdown */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground">Sumber Gaji Owner</h4>
            <p className="text-xs text-muted-foreground">Komposisi pembagian porsi gaji kotor owner bulan ini</p>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visualReportData.ownerBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {visualReportData.ownerBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`]}
                  contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 4: Top Services completed */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-foreground">Layanan Terpopuler</h4>
            <p className="text-xs text-muted-foreground">Jumlah kuantitas layanan utama yang diselesaikan bulan ini</p>
          </div>
          {visualReportData.servicesChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              Tidak ada data layanan bulan ini
            </div>
          ) : (
            <div className="h-60 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visualReportData.servicesChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" tickLine={false} style={{ fontSize: '10px' }} />
                  <YAxis dataKey="name" type="category" width={80} tickLine={false} style={{ fontSize: '9px' }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} kali`]}
                    contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="qty" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 5: Employee Performance */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-foreground">Performa Karyawan (Gaji & Bonus)</h4>
            <p className="text-xs text-muted-foreground">Grafik perbandingan total gaji bersih yang diperoleh karyawan</p>
          </div>
          {visualReportData.perEmployeeSalaries.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              Tidak ada data karyawan aktif bulan ini
            </div>
          ) : (
            <div className="h-60 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visualReportData.perEmployeeSalaries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px' }} tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`]}
                    contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="gaji" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualData;
