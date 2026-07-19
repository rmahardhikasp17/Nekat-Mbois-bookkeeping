import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, User, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/utils/idGenerator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface BusinessData {
  employees: Employee[];
  [key: string]: unknown;
}

interface EmployeeManagerProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ businessData, updateBusinessData }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', role: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role) return;
    if (
      formData.role === 'Owner' &&
      businessData.employees.some((e) => e.role === 'Owner')
    ) {
      toast.warning('Sudah ada 1 Owner terdaftar. Sistem hanya mendukung 1 Owner.');
      return;
    }
    const newEmployee: Employee = {
      id: generateId(),
      name: formData.name.trim(),
      role: formData.role,
    };
    updateBusinessData({ employees: [...businessData.employees, newEmployee] });
    setFormData({ name: '', role: '' });
    setIsAdding(false);
    toast.success('Karyawan berhasil ditambahkan');
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setFormData({ name: employee.name, role: employee.role });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    // 2.3 — Tolak nama kosong atau spasi saja
    if (!formData.name.trim()) {
      toast.error('Nama tidak boleh kosong atau spasi saja');
      return;
    }

    // 2.1 — Cegah multi-Owner: periksa karyawan LAIN (bukan yang sedang diedit)
    if (
      formData.role === 'Owner' &&
      businessData.employees.some((emp) => emp.id !== editingId && emp.role === 'Owner')
    ) {
      toast.warning('Barbershop hanya boleh memiliki 1 Owner.');
      return;
    }

    const updated = businessData.employees.map(emp =>
      emp.id === editingId
        ? { ...emp, name: formData.name.trim(), role: formData.role }
        : emp
    );
    updateBusinessData({ employees: updated });
    setEditingId(null);
    setFormData({ name: '', role: '' });
    toast.success('Data karyawan diperbarui');
  };

  const handleDelete = (employeeId: string) => {
    const updated = businessData.employees.filter(emp => emp.id !== employeeId);
    updateBusinessData({ employees: updated });
    toast.success('Karyawan dihapus');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', role: '' });
  };

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3 py-3 text-foreground ' +
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ' +
    'text-base min-h-[48px]';

  const selectClass =
    'w-full rounded-lg bg-muted border border-border px-3 py-3 text-foreground ' +
    'focus:outline-none focus:ring-2 focus:ring-ring text-base min-h-[48px] ' +
    'appearance-none';

  const EmployeeForm = ({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Contoh: Budi"
          className={inputClass}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
        <select
          value={formData.role}
          onChange={e => setFormData({ ...formData, role: e.target.value })}
          className={selectClass}
          required
        >
          <option value="">Pilih Role</option>
          <option value="Owner">Owner</option>
          <option value="Karyawan">Karyawan</option>
        </select>
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
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {businessData.employees.length} karyawan
          </span>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="gap-1.5 min-h-[44px]">
            <Plus className="w-4 h-4" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-1">
          <h3 className="font-semibold text-sm text-foreground mb-3">Tambah Karyawan Baru</h3>
          <EmployeeForm onSubmit={handleSubmit} />
        </div>
      )}

      {/* Employee List */}
      {businessData.employees.length === 0 && !isAdding ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="text-muted-foreground w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Belum ada karyawan</p>
          <Button onClick={() => setIsAdding(true)} size="sm" className="min-h-[48px]">
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Karyawan Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {businessData.employees.map(employee => (
            <div
              key={employee.id}
              className="bg-card rounded-xl border border-border transition-colors active:bg-accent/20"
            >
              {editingId === employee.id ? (
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-3">Edit: {employee.name}</p>
                  <EmployeeForm onSubmit={handleUpdate} />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      employee.role === 'Owner'
                        ? 'bg-primary/15'
                        : 'bg-muted'
                    }`}>
                      {employee.role === 'Owner'
                        ? <Crown className="w-5 h-5 text-primary" />
                        : <User className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{employee.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        employee.role === 'Owner'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {employee.role || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground active:bg-accent/30 transition-colors"
                      aria-label={`Edit ${employee.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-destructive active:bg-destructive/10 transition-colors"
                          aria-label={`Hapus ${employee.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus karyawan ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{employee.name}</strong> ({employee.role}) akan dihapus permanen beserta riwayat yang terkait.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(employee.id)}
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

export default EmployeeManager;
