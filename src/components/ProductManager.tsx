import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { generateId } from '@/utils/idGenerator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  createdAt: string;
}

interface BusinessData {
  products: Product[];
  [key: string]: any;
}

interface ProductManagerProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ businessData, updateBusinessData }) => {
  const products = businessData.products || [];
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    stock: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddProduct = () => {
    if (!newProduct.name.trim() || !newProduct.price) {
      toast.error('Nama produk dan harga wajib diisi');
      return;
    }

    const price = parseFloat(newProduct.price);
    if (isNaN(price) || price < 0) {
      toast.error('Harga produk harus angka positif');
      return;
    }

    const product: Product = {
      id: generateId(),
      name: newProduct.name.trim(),
      price: price,
      category: newProduct.category.trim() || 'Umum',
      stock: Number(newProduct.stock) || 0,
      createdAt: new Date().toISOString()
    };

    const updatedProducts = [...products, product];
    updateBusinessData({ products: updatedProducts });
    
    setNewProduct({ name: '', price: '', category: '', stock: '' });
    setShowAddForm(false);
    toast.success('Produk berhasil ditambahkan');
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct({
      ...product,
      price: product.price.toString(),
      stock: product.stock.toString()
    });
  };

  const handleUpdateProduct = () => {
    if (!editingProduct.name.trim() || !editingProduct.price) {
      toast.error('Nama produk dan harga wajib diisi');
      return;
    }

    const price = parseFloat(editingProduct.price);
    if (isNaN(price) || price < 0) {
      toast.error('Harga produk harus angka positif');
      return;
    }

    const updatedProducts = products.map(product =>
      product.id === editingProduct.id
        ? {
            ...editingProduct,
            price: price,
            stock: Number(editingProduct.stock) || 0
          }
        : product
    );

    updateBusinessData({ products: updatedProducts });
    setEditingProduct(null);
    toast.success('Produk berhasil diperbarui');
  };

  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = products.filter(product => product.id !== productId);
    updateBusinessData({ products: updatedProducts });
    toast.success('Produk berhasil dihapus');
  };

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3 py-2 text-foreground ' +
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ' +
    'text-base min-h-[44px]';

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {products.length} produk terdaftar
          </span>
        </div>
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        )}
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Tambah Produk Baru</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Produk</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className={inputClass}
                placeholder="Contoh: Pomade Heavy Hold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Harga (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Stok Awal</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Kategori</label>
              <input
                type="text"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className={inputClass}
                placeholder="Contoh: Hair Care, Pomade"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAddProduct}
              size="sm"
              className="flex-1 min-h-[44px]"
            >
              <Save className="w-4 h-4 mr-1.5" /> Simpan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewProduct({ name: '', price: '', category: '', stock: '' });
              }}
              className="min-h-[44px] px-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 && !showAddForm ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="text-muted-foreground w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Belum ada produk terdaftar</p>
          <Button onClick={() => setShowAddForm(true)} size="sm" className="min-h-[44px]">
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Produk Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-xl border border-border transition-colors active:bg-accent/10"
            >
              {editingProduct?.id === product.id ? (
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className={inputClass}
                      placeholder="Nama Produk"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                        className={inputClass}
                        placeholder="Harga"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                        className={inputClass}
                        placeholder="Stok"
                      />
                    </div>
                    <input
                      type="text"
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className={inputClass}
                      placeholder="Kategori"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateProduct} size="sm" className="flex-1 min-h-[40px]">
                      <Save className="w-3.5 h-3.5 mr-1" /> Simpan
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingProduct(null)} className="min-h-[40px] px-4">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-foreground text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-primary font-bold text-sm">{formatCurrency(product.price)}</span>
                      <span className="text-xs text-muted-foreground">· Stok: {product.stock}</span>
                      {product.category && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-muted text-muted-foreground rounded">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-muted-foreground active:bg-accent/30 transition-colors"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-destructive active:bg-destructive/10 transition-colors"
                          aria-label={`Hapus ${product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus produk ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>{product.name}</strong> akan dihapus permanen dari daftar produk.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id)}
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

export default ProductManager;
