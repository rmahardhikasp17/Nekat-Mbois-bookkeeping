import React, { useEffect, useMemo, useState } from 'react';
import {
  Save, Building, Trash2, Download, Upload,
  ShieldCheck, HardDrive, FilePlus2, FileOutput, AlarmClock, Info, BarChart3,
} from 'lucide-react';
import {
  downloadJSONBackup, importJSONFile, requestAutoBackupFile,
  clearAutoBackup, saveAutoBackup, setCompressionPreference,
  getCompressionPreference, getStorageEstimate,
} from '../utils/backupManager';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  price: number;
  bonusable?: boolean;
  isBonusService?: boolean;
  /** Persentase bagi hasil karyawan (0–100). Default 50. */
  employeeRate?: number;
}
interface Employee { id: string; name: string; role: string; }

interface BusinessData {
  businessName: string;
  services: Service[];
  employees: Employee[];
  products: unknown[];
  dailyRecords: unknown[];  // DailyRecord[] — v2.1 format (Array)
  transactions: unknown[];  // Transaction[]
  productSales: unknown[];
  sisaPendapatanRecords: unknown[];
}

interface StorageEstimate { quota?: number; usage?: number; }
type PersistStatus = 'granted' | 'denied' | 'unsupported' | 'error' | null;

interface SettingsProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
  setCurrentPage?: (page: any) => void;
}

// ─── Section Card ──────────────────────────────────────────────────────────────

const SectionCard = ({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card rounded-xl border border-border p-4 space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Settings: React.FC<SettingsProps> = ({ businessData, updateBusinessData, setCurrentPage }) => {
  const [businessName, setBusinessName] = useState<string>(businessData.businessName);
  const [persistStatus, setPersistStatus] = useState<PersistStatus>(null);
  const [useGzip, setUseGzip] = useState<boolean>(getCompressionPreference());
  const [storageInfo, setStorageInfo] = useState<StorageEstimate | null>(null);
  /** Draft bagi hasil lokal — nilai ini hanya di-commit ke storage saat user klik Simpan */
  const [draftRates, setDraftRates] = useState<Record<string, number>>({});

  const lastBackupTs = useMemo<number | null>(() => {
    try { return Number(localStorage.getItem('autoBackupLastTs')) || null; } catch (_) { return null; }
  }, [businessData]);

  useEffect(() => { setCompressionPreference(useGzip); }, [useGzip]);
  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  const nearQuota = useMemo<boolean>(() => {
    if (!storageInfo?.quota) return false;
    return ((storageInfo.usage || 0) / storageInfo.quota) >= 0.8;
  }, [storageInfo]);

  const staleBackup = useMemo<boolean>(() => {
    if (!lastBackupTs) return true;
    return Date.now() - lastBackupTs > 24 * 60 * 60 * 1000;
  }, [lastBackupTs]);

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3 py-3 text-foreground ' +
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ' +
    'text-base min-h-[48px]';

  const handleSaveBusinessName = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    updateBusinessData({ businessName: businessName.trim() });
    toast.success('Nama usaha berhasil disimpan');
  };

  const handleClearAllData = () => {
    updateBusinessData({
      services: [], employees: [], products: [],
      dailyRecords: [], transactions: [], productSales: [], sisaPendapatanRecords: [],
    });
    toast.success('Semua data berhasil dihapus');
  };

  const handleExportJSON = async () => {
    try {
      await downloadJSONBackup(businessData, useGzip);
      toast.success(`Backup ${useGzip ? 'terkompresi' : 'JSON'} berhasil diunduh`);
    } catch {
      toast.error('Gagal mengekspor backup');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importJSONFile(file);
      updateBusinessData(data as Partial<BusinessData>);
      toast.success('Data berhasil dipulihkan dari backup');
    } catch {
      toast.error('File backup tidak valid atau rusak');
    } finally {
      e.target.value = '';
    }
  };

  const requestPersistentStorage = async () => {
    try {
      if (navigator.storage?.persist) {
        const persisted = await navigator.storage.persist();
        setPersistStatus(persisted ? 'granted' : 'denied');
        toast[persisted ? 'success' : 'warning'](
          persisted ? 'Penyimpanan persisten aktif' : 'Izin ditolak browser'
        );
      } else {
        setPersistStatus('unsupported');
        toast.warning('Browser tidak mendukung persistent storage');
      }
    } catch {
      setPersistStatus('error');
      toast.error('Gagal meminta izin penyimpanan');
    }
  };

  const setupAutoBackup = async () => {
    const res = await requestAutoBackupFile();
    if (!res.supported) {
      toast.warning('Browser tidak mendukung auto-backup ke file');
      return;
    }
    toast[res.ok ? 'success' : 'warning'](
      res.ok ? 'Auto-backup berhasil di-setup' : 'Otorisasi dibatalkan'
    );
  };

  const backupNow = async () => {
    try {
      const ok = await saveAutoBackup(JSON.stringify(businessData));
      toast[ok ? 'success' : 'error'](
        ok ? 'Backup tersimpan ke file' : 'Gagal menyimpan — pastikan file sudah di-setup'
      );
    } catch {
      toast.error('Gagal menyimpan backup');
    }
  };

  const disableAutoBackup = async () => {
    await clearAutoBackup();
    toast.success('Auto-backup dimatikan');
  };

  const refreshStorage = async () => {
    setStorageInfo(await getStorageEstimate());
  };

  const getTotalRecords = () => Array.isArray(businessData.dailyRecords) ? businessData.dailyRecords.length : 0;

  /** Simpan draft rate ke storage untuk satu layanan */
  const handleSaveRate = (serviceId: string) => {
    const newRate = draftRates[serviceId] ?? businessData.services.find(s => s.id === serviceId)?.employeeRate ?? 50;
    updateBusinessData({
      services: businessData.services.map(s =>
        s.id === serviceId ? { ...s, employeeRate: newRate } : s
      ),
    });
    toast.success('Bagi hasil berhasil disimpan');
  };

  /** Update draft lokal (belum disimpan ke storage) */
  const handleDraftRate = (serviceId: string, val: number) => {
    setDraftRates(prev => ({ ...prev, [serviceId]: val }));
  };

  // Filter layanan utama (bukan bonus)
  const mainServices = businessData.services.filter(
    s => !s.isBonusService && !s.bonusable
  );


  return (
    <div className="space-y-4 pb-48">
      {/* Warning Banner */}
      {(nearQuota || staleBackup) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlarmClock className="text-amber-400 w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-300">Backup Disarankan</p>
            {nearQuota && <p className="text-xs text-amber-400/80">Mendekati batas penyimpanan browser.</p>}
            {staleBackup && <p className="text-xs text-amber-400/80">Backup terakhir lebih dari 1 hari lalu.</p>}
          </div>
        </div>
      )}

      {/* Business Info */}
      <SectionCard icon={Building} title="Informasi Usaha">
        <form onSubmit={handleSaveBusinessName} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama Usaha</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <Button type="submit" size="sm" className="w-full min-h-[48px]">
            <Save className="w-4 h-4 mr-2" /> Simpan Nama Usaha
          </Button>
        </form>
      </SectionCard>

      {/* Revenue Split (Bagi Hasil) per Layanan */}
      {mainServices.length > 0 && (
        <SectionCard icon={ShieldCheck} title="Bagi Hasil per Layanan">
          <p className="text-xs text-muted-foreground -mt-2">
            Perubahan hanya berlaku untuk transaksi <strong>baru</strong> — data historis tidak terpengaruh.
          </p>
          <div className="space-y-5">
            {mainServices.map(service => {
              // Gunakan draft jika ada, fallback ke nilai yang tersimpan
              const savedRate = service.employeeRate ?? 50;
              const draftRate = draftRates[service.id] ?? savedRate;
              const isDirty = draftRate !== savedRate;
              const ownerRate = 100 - draftRate;
              const empAmount = Math.round(service.price * draftRate / 100);
              const ownerAmount = service.price - empAmount;
              return (
                <div key={service.id} className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border">
                  {/* Header: Nama & Input Persen */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">Rp {service.price.toLocaleString('id-ID')}/layanan</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftRate}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          if (!isNaN(val)) handleDraftRate(service.id, Math.max(0, Math.min(100, val)));
                        }}
                        className="w-14 h-9 rounded-lg border border-border text-center text-sm font-bold bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        aria-label={`Persentase karyawan ${service.name}`}
                      />
                      <span className="text-xs text-muted-foreground font-semibold">/ {ownerRate}%</span>
                    </div>
                  </div>

                  {/* Preview Nominal */}
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-primary">Karyawan {draftRate}% = Rp {empAmount.toLocaleString('id-ID')}</span>
                    <span className="text-amber-400">Owner {ownerRate}% = Rp {ownerAmount.toLocaleString('id-ID')}</span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={draftRate}
                    onChange={e => handleDraftRate(service.id, Number(e.target.value))}
                    className="w-full h-2 rounded-full accent-primary cursor-pointer touch-manipulation"
                    aria-label={`Bagi hasil ${service.name}`}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0% karyawan</span>
                    <span>50/50</span>
                    <span>100% karyawan</span>
                  </div>

                  {/* Tombol Simpan — hanya aktif jika ada perubahan draft */}
                  <Button
                    size="sm"
                    onClick={() => handleSaveRate(service.id)}
                    disabled={!isDirty}
                    className="w-full min-h-[44px] gap-2 mt-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isDirty ? 'Simpan Bagi Hasil' : 'Tersimpan'}
                  </Button>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard icon={Info} title="Ringkasan Data">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Layanan', value: businessData.services.length },
            { label: 'Karyawan', value: businessData.employees.length },
            { label: 'Catatan', value: getTotalRecords() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-primary">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage?.('services')}
            className="w-full min-h-[44px] gap-2 text-xs"
          >
            Kelola Layanan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage?.('employees')}
            className="w-full min-h-[44px] gap-2 text-xs"
          >
            Kelola Karyawan
          </Button>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => setCurrentPage?.('visual-data')}
          className="w-full min-h-[44px] gap-2 text-xs mt-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
        >
          <BarChart3 className="w-4 h-4" /> Visualisasi Data (Diagram)
        </Button>
      </SectionCard>

      {/* Backup & Export */}
      <SectionCard icon={Download} title="Backup & Export">
        <div className="flex items-center gap-3 pb-1">
          <input
            id="gzip"
            type="checkbox"
            checked={useGzip}
            onChange={e => setUseGzip(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="gzip" className="text-sm text-foreground">Gunakan kompresi (gzip)</label>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleExportJSON} variant="outline" className="w-full min-h-[48px] justify-start gap-2">
            <Download className="w-4 h-4" />
            Download {useGzip ? 'JSON (gzip)' : 'JSON'}
          </Button>
          <label className="w-full">
            <Button asChild variant="outline" className="w-full min-h-[48px] justify-start gap-2 cursor-pointer">
              <span>
                <Upload className="w-4 h-4" />
                Restore dari File JSON / GZIP
              </span>
            </Button>
            <input
              type="file"
              accept=".json,.gz,application/json,application/gzip"
              className="hidden"
              onChange={handleImportJSON}
            />
          </label>
        </div>
      </SectionCard>

      {/* Auto-backup */}
      <SectionCard icon={HardDrive} title="Auto-backup ke File">
        <p className="text-xs text-muted-foreground">
          Menggunakan File System Access API. Tidak tersedia di semua browser.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={setupAutoBackup} variant="outline" className="w-full min-h-[48px] justify-start gap-2">
            <FilePlus2 className="w-4 h-4" /> Setup Auto-backup
          </Button>
          <Button onClick={backupNow} variant="outline" className="w-full min-h-[48px] justify-start gap-2">
            <FileOutput className="w-4 h-4" /> Backup Sekarang
          </Button>
          <Button onClick={disableAutoBackup} variant="ghost" size="sm" className="w-full text-destructive min-h-[44px]">
            <Trash2 className="w-4 h-4 mr-2" /> Matikan Auto-backup
          </Button>
        </div>
      </SectionCard>

      {/* Storage Settings */}
      <SectionCard icon={ShieldCheck} title="Penyimpanan">
        <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
          {storageInfo?.quota ? (
            <>
              <div className="flex justify-between mb-1.5">
                <span>Terpakai</span>
                <span className={nearQuota ? 'text-amber-400 font-semibold' : 'text-foreground'}>
                  {((storageInfo.usage || 0) / (1024 * 1024)).toFixed(1)} MB /{' '}
                  {(storageInfo.quota / (1024 * 1024)).toFixed(0)} MB
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${nearQuota ? 'bg-amber-400' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, ((storageInfo.usage || 0) / storageInfo.quota) * 100).toFixed(0)}%` }}
                />
              </div>
            </>
          ) : 'Informasi storage tidak tersedia'}
        </div>
        <div className="flex gap-2">
          <Button onClick={requestPersistentStorage} variant="outline" size="sm" className="flex-1 min-h-[48px] gap-2">
            <ShieldCheck className="w-4 h-4" />
            Aktifkan Persistent
          </Button>
          <Button onClick={refreshStorage} variant="ghost" size="sm" className="min-h-[48px] px-4">
            Refresh
          </Button>
        </div>
        {persistStatus && (
          <p className="text-xs text-muted-foreground">
            Status: <span className={persistStatus === 'granted' ? 'text-green-400' : 'text-amber-400'}>{persistStatus}</span>
          </p>
        )}
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard icon={Trash2} title="Zona Bahaya">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-3">
          <p className="text-xs text-destructive/80">
            Menghapus seluruh data layanan, karyawan, dan catatan harian secara permanen.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full min-h-[48px] gap-2">
                <Trash2 className="w-4 h-4" /> Hapus Semua Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus semua data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Seluruh layanan, karyawan, dan catatan harian akan dihapus permanen.
                  Pastikan sudah melakukan backup sebelum melanjutkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ya, Hapus Semua
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>

      {/* App Info */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-xs text-muted-foreground">
        <p><span className="font-medium text-foreground">Versi:</span> 2.0.0</p>
        <p><span className="font-medium text-foreground">Storage:</span> IndexedDB (offline-first)</p>
        <p><span className="font-medium text-foreground">PWA:</span> Dapat diinstal di Android</p>
      </div>
    </div>
  );
};

export default Settings;
