import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Scissors } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import { generateId } from '@/utils/idGenerator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Service {
  id: string;
  name: string;
  price: number;
  isBonusService?: boolean;
  bonusable?: boolean;
  employeeRate?: number;
}


interface BusinessData {
  services: Service[];
  [key: string]: unknown;
}

interface ServicesManagerProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
}

const ServicesManager: React.FC<ServicesManagerProps> = ({ businessData, updateBusinessData }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;
    const newService: Service = {
      id: generateId(),
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      isBonusService: false,
      employeeRate: 50, // default 50/50, bisa diubah di Settings → Bagi Hasil
    };
    updateBusinessData({ services: [...businessData.services, newService] });
    setFormData({ name: '', price: '' });
    setIsAdding(false);
    toast.success('Layanan berhasil ditambahkan');
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({ name: service.name, price: service.price.toString() });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedServices = businessData.services.map(s =>
      s.id === editingId
        ? { ...s, name: formData.name.trim(), price: parseFloat(formData.price) }
        : s
    );
    updateBusinessData({ services: updatedServices });
    setEditingId(null);
    setFormData({ name: '', price: '' });
    toast.success('Layanan berhasil diperbarui');
  };

  const handleDelete = (serviceId: string) => {
    const updated = businessData.services.filter(s => s.id !== serviceId);
    updateBusinessData({ services: updated });
    toast.success('Layanan dihapus');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', price: '' });
  };

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3 py-3 text-foreground ' +
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ' +
    'text-base min-h-[48px]';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {businessData.services.length} layanan
          </span>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            className="gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Tambah Layanan
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Tambah Layanan Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Nama Layanan
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Cukur Rambut"
                className={inputClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Harga (Rp)
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1000"
                min="0"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className={inputClass}
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="flex-1 min-h-[48px]">
                <Save className="w-4 h-4 mr-1.5" /> Simpan
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="min-h-[48px] px-4">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      {businessData.services.length === 0 && !isAdding ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Scissors className="text-muted-foreground w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Belum ada layanan</p>
          <Button onClick={() => setIsAdding(true)} size="sm" className="min-h-[48px]">
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Layanan Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {businessData.services.map(service => (
            <div
              key={service.id}
              className="bg-card rounded-xl border border-border transition-colors active:bg-accent/20"
            >
              {editingId === service.id ? (
                <form onSubmit={handleUpdate} className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      required
                      autoFocus
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      step="1000"
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="flex-1 min-h-[44px]">
                      <Save className="w-3.5 h-3.5 mr-1" /> Simpan
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="min-h-[44px] px-4">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-medium text-foreground text-sm truncate">{service.name}</p>
                    <p className="text-primary font-bold text-base">{formatCurrency(service.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground active:bg-accent/30 transition-colors"
                      aria-label={`Edit ${service.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {/* AlertDialog untuk konfirmasi hapus */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-destructive active:bg-destructive/10 transition-colors"
                          aria-label={`Hapus ${service.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus layanan ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{service.name}</strong> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(service.id)}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesManager;
