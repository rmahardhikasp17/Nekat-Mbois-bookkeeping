import React, { useState } from 'react';
import { ShoppingCart, Plus, Save, Trash2, Package, X } from 'lucide-react';
import { formatCurrency, getLocalDateString } from '../utils/formatters';
import { generateId } from '@/utils/idGenerator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePickerNative } from '@/components/ui/DatePickerNative';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
}

interface ProductSale {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sellerName: string;
  createdAt: string;
}

interface BusinessData {
  [key: string]: any;
  products: Product[];
  productSales: Record<string, ProductSale> | ProductSale[];
}

interface ProductSalesProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
}

const ProductSales: React.FC<ProductSalesProps> = ({ businessData, updateBusinessData }) => {
  const products = businessData.products || [];
  
  // Normalize sales data (might be object map or array)
  const rawSales = businessData.productSales;
  const salesArray: ProductSale[] = Array.isArray(rawSales)
    ? rawSales
    : rawSales && typeof rawSales === 'object'
      ? Object.values(rawSales)
      : [];

  const [newSale, setNewSale] = useState({
    date: getLocalDateString(),
    productId: '',
    quantity: 1,
    unitPrice: '',
    sellerName: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const today = getLocalDateString();
  const todaySales = salesArray.filter(sale => sale.date === today);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setNewSale({
      ...newSale,
      productId,
      unitPrice: product ? product.price.toString() : ''
    });
  };

  const calculateTotal = () => {
    return Number(newSale.quantity) * Number(newSale.unitPrice || 0);
  };

  const handleAddSale = () => {
    if (!newSale.productId || !newSale.quantity || !newSale.unitPrice) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const product = products.find(p => p.id === newSale.productId);
    if (!product) {
      toast.error('Produk tidak ditemukan');
      return;
    }

    const saleQty = Number(newSale.quantity);
    if (isNaN(saleQty) || saleQty <= 0) {
      toast.error('Jumlah penjualan harus lebih dari 0');
      return;
    }

    const sale: ProductSale = {
      id: generateId(),
      date: newSale.date,
      productId: newSale.productId,
      productName: product.name,
      quantity: saleQty,
      unitPrice: Number(newSale.unitPrice),
      total: calculateTotal(),
      sellerName: newSale.sellerName.trim() || 'Umum',
      createdAt: new Date().toISOString()
    };

    // Update stock in products list
    const updatedProducts = products.map(p =>
      p.id === product.id ? { ...p, stock: Math.max(0, p.stock - saleQty) } : p
    );

    // Persist as array format to stay consistent with other collections
    const updatedSales = [...salesArray, sale];

    updateBusinessData({
      productSales: updatedSales,
      products: updatedProducts
    });

    // Reset form
    setNewSale({
      date: newSale.date,
      productId: '',
      quantity: 1,
      unitPrice: '',
      sellerName: ''
    });
    setShowAddForm(false);
    toast.success('Penjualan produk berhasil dicatat');
  };

  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = salesArray.find(s => s.id === saleId);
    
    // Restore stock if product exists
    let updatedProducts = products;
    if (saleToDelete) {
      updatedProducts = products.map(p =>
        p.id === saleToDelete.productId ? { ...p, stock: p.stock + saleToDelete.quantity } : p
      );
    }

    const updatedSales = salesArray.filter(sale => sale.id !== saleId);
    updateBusinessData({
      productSales: updatedSales,
      products: updatedProducts
    });
    toast.success('Transaksi penjualan dihapus');
  };

  const getTodayTotal = () => {
    return todaySales.reduce((sum, s) => sum + s.total, 0);
  };

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3 py-2 text-foreground ' +
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ' +
    'text-base min-h-[44px]';

  return (
    <div className="space-y-4 pb-24">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Penjualan Hari Ini</span>
          <span className="text-lg font-bold text-emerald-400">{formatCurrency(getTodayTotal())}</span>
        </div>
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Catat Penjualan
          </Button>
        )}
      </div>

      {/* Add Sale Form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            Catat Penjualan Baru
          </h3>
          
          {products.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Belum ada produk terdaftar</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tanggal</label>
                <DatePickerNative
                  value={newSale.date}
                  onChange={(d) => setNewSale({ ...newSale, date: d })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Produk</label>
                <select
                  value={newSale.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih Produk</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({formatCurrency(product.price)} · stok: {product.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={newSale.quantity}
                    onChange={(e) => setNewSale({ ...newSale, quantity: Number(e.target.value) || 1 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={newSale.unitPrice}
                    onChange={(e) => setNewSale({ ...newSale, unitPrice: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Penjual / Kasir</label>
                <input
                  type="text"
                  value={newSale.sellerName}
                  onChange={(e) => setNewSale({ ...newSale, sellerName: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: Admin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Total</label>
                <div className="w-full px-3 py-2 bg-muted rounded-lg text-lg font-bold text-emerald-400 border border-border">
                  {formatCurrency(calculateTotal())}
                </div>
              </div>
            </div>
          )}
          
          {products.length > 0 && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleAddSale}
                size="sm"
                className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-4 h-4 mr-1.5" /> Simpan Penjualan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSale({
                    date: getLocalDateString(),
                    productId: '',
                    quantity: 1,
                    unitPrice: '',
                    sellerName: ''
                  });
                }}
                className="min-h-[44px] px-4"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Today's Sales List */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Daftar Penjualan Hari Ini</h3>
        </div>
        <div className="divide-y divide-border">
          {todaySales.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada penjualan produk hari ini.
            </div>
          ) : (
            todaySales.map((sale) => (
              <div key={sale.id} className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-semibold text-sm text-foreground truncate">{sale.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sale.quantity}x @ {formatCurrency(sale.unitPrice)} · oleh: {sale.sellerName}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(sale.total)}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-destructive active:bg-destructive/10 transition-colors"
                        aria-label={`Hapus penjualan ${sale.productName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Transaksi penjualan <strong>{sale.productName}</strong> akan dihapus dan stok produk akan dikembalikan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSale(sale.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSales;
