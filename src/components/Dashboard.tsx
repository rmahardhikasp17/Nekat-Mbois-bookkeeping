
import React from 'react';
import { Scissors, Users, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { getTodayTotal, getTodayProductSales, getTotalProducts, formatCurrency } from '../utils/formatters';


interface BusinessData {
  businessName: string;
  services: any[];
  employees: any[];
  products: any[];
  dailyRecords: any[];  // DailyRecord[] — v2.1 format
  transactions: any[];
  productSales: any[];
}

interface DashboardProps {
  businessData: BusinessData;
  setCurrentPage: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ businessData, setCurrentPage }) => {
  const todayServiceTotal = getTodayTotal(businessData) || 0;
  const todayProductSales = getTodayProductSales(businessData) || 0;
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const stats = [
    {
      title: 'Total Layanan',
      value: businessData.services?.length || 0,
      icon: Scissors,
      color: 'bg-barbershop-red',
      emoji: '✂️'
    },
    {
      title: 'Total Karyawan',
      value: businessData.employees?.length || 0,
      icon: Users,
      color: 'bg-barbershop-blue',
      emoji: '👤'
    },
    {
      title: "Pendapatan Layanan Hari Ini",
      value: formatCurrency(todayServiceTotal),
      icon: DollarSign,
      color: 'bg-green-600',
      emoji: '💰'
    },
    {
      title: 'Penjualan Produk Hari Ini',
      value: formatCurrency(todayProductSales),
      icon: Calendar,
    }
  ];

  const quickActions = [
    {
      title: 'Kelola Layanan',
      description: 'Tambah atau edit layanan barbershop',
      icon: Scissors,
      color: 'hover:border-primary hover:bg-primary/5',
      emoji: '✂️',
      action: () => setCurrentPage('services')
    },
    {
      title: 'Kelola Karyawan',
      description: 'Tambah atau kelola tim barbershop',
      icon: Users,
      color: 'hover:border-blue-500 hover:bg-blue-500/5',
      emoji: '👥',
      action: () => setCurrentPage('employees')
    },
    {
      title: 'Input Pendapatan',
      description: 'Catat transaksi harian barbershop',
      icon: DollarSign,
      color: 'hover:border-emerald-500 hover:bg-emerald-500/5',
      emoji: '💵',
      action: () => setCurrentPage('daily-recap')
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Section with Barbershop Theme */}
      <div className="bg-card rounded-xl border border-border p-5 md:p-6 lg:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 barber-pole opacity-10 rounded-full"></div>
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 font-poppins">
            💈 Selamat Datang di {businessData.businessName}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm lg:text-base font-poppins">
            {today} — Siap melayani pelanggan dengan profesional
          </p>
        </div>
      </div>

      {/* Stats Grid with Barbershop Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-card rounded-xl border border-border p-4 md:p-5 shadow-sm active:bg-accent/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-poppins">{stat.title}</p>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground font-poppins">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg shadow-sm flex items-center justify-center text-white`}>
                  <span className="text-2xl">{stat.emoji}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions with Barbershop Theme */}
      <div className="bg-card rounded-xl border border-border p-5 md:p-6 lg:p-8 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6 font-poppins flex items-center gap-2">
          <Scissors className="text-primary" size={20} />
          Menu Utama {businessData.businessName}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className={`p-4 md:p-6 border border-border rounded-xl text-center transition-all duration-200 ${action.color} group bg-card active:scale-95 shadow-sm min-h-[120px] md:min-h-[140px] flex flex-col justify-between`}
              >
                <div className="text-2xl md:text-3xl mb-1.5 md:mb-2">{action.emoji}</div>
                <h4 className="font-semibold text-foreground mb-1 font-poppins text-xs md:text-sm">{action.title}</h4>
                <p className="text-[11px] md:text-xs text-muted-foreground mb-2 font-poppins leading-tight">{action.description}</p>
                <ArrowRight className="mx-auto text-muted-foreground group-hover:text-primary transition-colors" size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
