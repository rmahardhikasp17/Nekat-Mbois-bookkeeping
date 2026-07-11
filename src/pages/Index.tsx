import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import ServicesManager from '../components/ServicesManager';
import EmployeeManager from '../components/EmployeeManager';
import DailyInput from '../components/DailyInput';
import TransactionForm from '../components/TransactionForm';
import DailyRecap from '../components/DailyRecap';
import MonthlyReport from '../components/MonthlyReport';
import Settings from '../components/Settings';
import { BottomNav } from '@/components/BottomNav';
import type { AppPage } from '@/components/BottomNav';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { useBusinessData } from '@/hooks/useBusinessData';
import type { BusinessData } from '@/types';

// ─── Halaman yang tidak muncul di BottomNav (navigasi kontekstual) ────────────
type FullPage = AppPage | 'employees' | 'transactions';

const PAGE_TITLES: Record<FullPage, string> = {
  'dashboard':      'Beranda',
  'daily-input':    'Input Harian',
  'daily-recap':    'Rekap Harian',
  'monthly-report': 'Laporan Bulanan',
  'settings':       'Pengaturan',
  'employees':      'Karyawan',
  'transactions':   'Transaksi',
};

const Index = () => {
  const [currentPage, setCurrentPage] = useState<FullPage>('dashboard');
  const { data: businessData, updateData, isLoading } = useBusinessData();

  /**
   * Adapter API lama: updateBusinessData(partial) → updater function.
   * Komponen child memanggil ini dengan partial object.
   */
  const updateBusinessData = (changes: Partial<BusinessData>) => {
    updateData((prev) => ({ ...prev, ...changes }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Barbershop spinner */}
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            businessData={businessData}
            setCurrentPage={(page: string) => setCurrentPage(page as FullPage)}
          />
        );
      case 'daily-input':
        return <DailyInput businessData={businessData} updateBusinessData={updateBusinessData} />;
      case 'daily-recap':
        return <DailyRecap businessData={businessData} updateBusinessData={updateBusinessData} />;
      case 'monthly-report':
        return <MonthlyReport businessData={businessData} />;
      case 'settings':
        return <Settings businessData={businessData} updateBusinessData={updateBusinessData} />;
      // Halaman kontekstual (dipanggil dari Dashboard atau Settings)
      case 'employees':
        return <EmployeeManager businessData={businessData} updateBusinessData={updateBusinessData} />;
      case 'transactions':
        return <TransactionForm businessData={businessData} updateBusinessData={updateBusinessData} />;
      case 'services':
        return <ServicesManager businessData={businessData} updateBusinessData={updateBusinessData} />;
      default:
        return (
          <Dashboard
            businessData={businessData}
            setCurrentPage={(page: string) => setCurrentPage(page as FullPage)}
          />
        );
    }
  };

  // Tentukan apakah halaman ini adalah halaman BottomNav atau kontekstual
  const isBottomNavPage = ['dashboard', 'daily-input', 'daily-recap', 'monthly-report', 'settings'].includes(currentPage);
  const pageTitle = PAGE_TITLES[currentPage as FullPage] ?? 'Nekat Mbois';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Sticky Header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Back button untuk halaman kontekstual */}
          {!isBottomNavPage && (
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground transition-colors min-h-[44px] -ml-2 px-2"
              aria-label="Kembali ke beranda"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
          )}

          <h1 className="font-semibold text-base text-foreground truncate">
            {pageTitle}
          </h1>

          {/* Slot kanan — kosong untuk sementara, bisa diisi aksi kontekstual */}
          <div className="w-20" />
        </div>
      </header>

      {/* ─── Konten utama ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 content-with-bottom-nav">
        {renderCurrentPage()}
      </main>

      {/* ─── Bottom Navigation ──────────────────────────────────────────────── */}
      <BottomNav
        currentPage={isBottomNavPage ? (currentPage as AppPage) : 'dashboard'}
        onNavigate={(page) => setCurrentPage(page)}
      />

      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
