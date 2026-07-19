import React, { useState } from 'react';
import { Calendar, DollarSign, FileText, Save } from 'lucide-react';
import { formatCurrency, getLocalDateString } from '../utils/formatters';
import { generateId } from '../utils/idGenerator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
}

interface BusinessData {
  transactions: Transaction[];
  [key: string]: any;
}

interface TransactionFormProps {
  businessData: BusinessData;
  updateBusinessData: (data: Partial<BusinessData>) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ businessData, updateBusinessData }) => {
  // 3.1: getLocalDateString() menghindari off-by-one UTC antara 00:00–06:59 WIB
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [transactionType, setTransactionType] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionType || !description || !amount) {
      toast.warning('Lengkapi semua field transaksi');
      return;
    }

    const newTransaction: Transaction = {
      id: generateId(),
      date: selectedDate,
      type: transactionType,
      description,
      amount: parseFloat(amount),
    };

    const existing = Array.isArray(businessData.transactions) ? businessData.transactions : [];
    const updatedTransactions = [...existing, newTransaction];

    updateBusinessData({ transactions: updatedTransactions });
    setTransactionType('');
    setDescription('');
    setAmount('');
    toast.success('Transaksi berhasil disimpan');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-card rounded-xl p-5 md:p-6 border border-border shadow-sm">
        <h2 className="text-xl font-bold text-foreground">Pemasukan & Pengeluaran</h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">Record business income and expenses</p>
      </div>

      {/* Transaction Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-5 md:p-6 border border-border space-y-4 shadow-sm">
        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <Calendar className="inline mr-2 text-primary" size={16} />
            Tanggal
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-base min-h-[48px]"
            required
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <DollarSign className="inline mr-2 text-primary" size={16} />
            Tipe Transaksi
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-3 py-2.5 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-base min-h-[48px] appearance-none"
            required
          >
            <option value="" className="bg-card text-foreground">Select transaction type</option>
            <option value="Pemasukan" className="bg-card text-foreground">Pemasukan</option>
            <option value="Pengeluaran" className="bg-card text-foreground">Pengeluaran</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="inline mr-2 text-primary" size={16} />
            Deskripsi
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-base min-h-[48px]"
            placeholder="Enter transaction description"
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <DollarSign className="inline mr-2 text-primary" size={16} />
            Nominal
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-base min-h-[48px]"
            placeholder="Enter amount"
            min="0"
            step="1000"
            required
          />
          {amount && (
            <p className="text-xs md:text-sm text-primary font-semibold mt-1.5">
              {formatRupiah(parseFloat(amount) || 0)}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="border-t border-border pt-4">
          <Button
            type="submit"
            className="w-full min-h-[48px] text-base font-semibold"
          >
            <Save size={20} className="mr-2" />
            <span>Simpan Transaksi</span>
          </Button>
        </div>
      </form>

      {/* Recent Transactions */}
      {Array.isArray(businessData.transactions) && businessData.transactions.length > 0 && (
        <div className="bg-card rounded-xl p-5 md:p-6 border border-border shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {[...businessData.transactions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border border-border bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      transaction.type === 'Pemasukan' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'Pemasukan' ? '+' : '-'} {formatRupiah(transaction.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{transaction.type}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

// Local format helper
function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export default TransactionForm;
