import React, { useState, useEffect } from 'react';
import { Calendar, Download, User, DollarSign, Edit, Trash } from 'lucide-react';
import { formatCurrency, exportDailyRecapToExcel } from '../utils/dataManager';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran' | string;
  description: string;
  amount: number;
}

interface BusinessData {
  employees: any[];
  services: any[];
  dailyRecords: Record<string, any>;
  transactions?: Record<string, Transaction>;
}

interface DailyRecapProps {
  businessData: BusinessData;
  updateBusinessData?: (data: Partial<BusinessData>) => void;
}

const DailyRecap: React.FC<DailyRecapProps> = ({ businessData, updateBusinessData }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Transaction form state (add/edit)
  const [txId, setTxId] = useState<string | null>(null);
  const [txDate, setTxDate] = useState<string>(selectedDate);
  const [txType, setTxType] = useState<string>('');
  const [txDesc, setTxDesc] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>('');

  useEffect(() => {
    if (txId === null) setTxDate(selectedDate);
  }, [selectedDate, txId]);

  const getEmployeeName = (employeeId: string) => {
    const employee = businessData.employees?.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const getServiceName = (serviceId: string) => {
    const service = businessData.services?.find(srv => srv.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getDailyRecords = (date: string) => {
    return Object.values(businessData.dailyRecords || {}).filter((record: any) => record.date === date);
  };

  const calculateServiceTotal = (serviceId: string, quantity: number) => {
    const service = businessData.services?.find((s: any) => s.id === serviceId);
    if (!service || !service.price || quantity <= 0) return 0;
    return Number(service.price) * Number(quantity);
  };

  const calculateBonusTotal = (bonusServices: any, bonusQuantities: any) => {
    if (!bonusServices || !bonusQuantities) return 0;
    let total = 0;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]: [string, any]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]: [string, any]) => {
        if (isEnabled) {
          const bonusService = businessData.services?.find((s: any) => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          total += (bonusService?.price || 0) * bonusQty;
        }
      });
    });
    return total;
  };

  const getBonusDetails = (bonusServices: any, bonusQuantities: any) => {
    const details: { name: string; quantity: number; value: number }[] = [];
    if (!bonusServices || !bonusQuantities) return details;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]: [string, any]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]: [string, any]) => {
        if (isEnabled) {
          const bonusService = businessData.services?.find((s: any) => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          if (bonusQty > 0 && bonusService) {
            details.push({
              name: bonusService.name,
              quantity: bonusQty,
              value: (bonusService.price || 0) * bonusQty,
            });
          }
        }
      });
    });
    return details;
  };

  const calculateEmployeeSalary = (record: any, totalEmployeeRevenue: number, employeeCount: number) => {
    const employee = businessData.employees?.find((emp: any) => emp.id === record.employeeId);
    const isOwner = employee?.role === 'Owner';

    const serviceRevenue = Object.entries(record.services || {})
      .filter(([_, quantity]) => Number(quantity) > 0)
      .reduce((sum, [serviceId, quantity]) => {
        return sum + calculateServiceTotal(serviceId, Number(quantity));
      }, 0);

    const bonusTotal = calculateBonusTotal(record.bonusServices, record.bonusQuantities);
    const bonusDetails = getBonusDetails(record.bonusServices, record.bonusQuantities);

    if (isOwner) {
      const employeeShareRevenue = totalEmployeeRevenue * 0.5;
      const dailySavings = 50000;
      return {
        salary: serviceRevenue + bonusTotal + employeeShareRevenue - dailySavings,
        breakdown: { serviceRevenue, bonusTotal, bonusDetails, employeeShareRevenue, dailySavings },
      };
    } else {
      const baseRevenue = serviceRevenue * 0.5;
      return {
        salary: baseRevenue + bonusTotal,
        breakdown: { baseRevenue, bonusTotal, bonusDetails },
      };
    }
  };

  const dailyRecords = getDailyRecords(selectedDate);
  const totalEmployeeRevenue = (dailyRecords as any[]).reduce((sum, record: any) => {
    const employee = businessData.employees?.find((emp: any) => emp.id === record.employeeId);
    if (employee?.role !== 'Owner') {
      const recordTotal = Object.entries(record.services || {})
        .filter(([_, quantity]) => Number(quantity) > 0)
        .reduce((recordSum, [serviceId, quantity]) => {
          return recordSum + calculateServiceTotal(serviceId as string, Number(quantity));
        }, 0);
      return sum + recordTotal;
    }
    return sum;
  }, 0);

  const employeeCount = (dailyRecords as any[]).filter((record: any) => {
    const employee = businessData.employees?.find((emp: any) => emp.id === record.employeeId);
    return employee?.role !== 'Owner';
  }).length;

  const totalGaji = (dailyRecords as any[]).reduce((sum, record: any) => {
    const salaryData = calculateEmployeeSalary(record, totalEmployeeRevenue, employeeCount);
    return sum + salaryData.salary;
  }, 0);

  const handleExport = () => {
    if ((dailyRecords as any[]).length === 0) {
      toast.error('No data to export for this date');
      return;
    }
    try {
      exportDailyRecapToExcel(dailyRecords as any[], businessData as any, selectedDate);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      toast.error('Failed to export Excel file');
    }
  };

  // Transactions by selected date
  const transactions: Transaction[] = Object.values(businessData.transactions || {}).filter((t: any) => t.date === selectedDate) as Transaction[];
  const incomeTotal = transactions.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expenseTotal = transactions.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const netTotal = incomeTotal - expenseTotal;

  const resetTxForm = () => {
    setTxId(null);
    setTxDate(selectedDate);
    setTxType('');
    setTxDesc('');
    setTxAmount('');
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateBusinessData) {
      toast.error('Update function not provided');
      return;
    }
    if (!txType || !txDesc || !txAmount) {
      toast.error('Lengkapi semua field transaksi');
      return;
    }
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error('Nominal tidak valid');
      return;
    }

    const currentMap = businessData.transactions || {};

    if (txId) {
      const updated = { ...currentMap, [txId]: { id: txId, date: txDate, type: txType, description: txDesc, amount: amountNum } } as Record<string, Transaction>;
      updateBusinessData({ transactions: updated });
      toast.success('Transaksi diperbarui');
    } else {
      const id = Date.now().toString();
      const newTx: Transaction = { id, date: txDate, type: txType, description: txDesc, amount: amountNum };
      const updated = { ...currentMap, [id]: newTx } as Record<string, Transaction>;
      updateBusinessData({ transactions: updated });
      toast.success('Transaksi ditambahkan');
    }
    resetTxForm();
  };

  const startEditTx = (tx: Transaction) => {
    setTxId(tx.id);
    setTxDate(tx.date);
    setTxType(tx.type);
    setTxDesc(tx.description);
    setTxAmount(String(tx.amount));
  };

  const deleteTx = (id: string) => {
    if (!updateBusinessData) return;
    if (!window.confirm('Hapus transaksi ini?')) return;
    const currentMap = businessData.transactions || {};
    const updated = { ...currentMap } as Record<string, Transaction>;
    delete (updated as any)[id];
    updateBusinessData({ transactions: updated });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gray-50 rounded-xl shadow-sm p-4 md:p-6 lg:p-8 border border-gray-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Daily Recap</h2>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">View and export daily revenue summary</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm md:text-base"
          >
            <Download size={20} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-gray-50 rounded-xl shadow-sm p-4 md:p-6 border border-gray-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar size={16} />
            <span>Select Date:</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm md:text-base"
          />
        </div>
      </div>

      {/* Summary Cards - Only Active Employees and Total Revenue */}
      {dailyRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-gray-50 rounded-xl shadow-sm p-4 md:p-6 border border-gray-300">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Active Employees</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{dailyRecords.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl shadow-sm p-4 md:p-6 border border-gray-300">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Gaji Hari Ini</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{formatCurrency(totalGaji)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Records Details */}
      <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-300">
        <div className="p-4 md:p-6 lg:p-8 border-b border-gray-300">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">
            Records for {new Date(selectedDate).toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
        </div>

        {dailyRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-gray-400" size={32} />
            </div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">No records found</h4>
            <p className="text-gray-500">No data recorded for this date</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-300">
            {dailyRecords.map((record: any, index: number) => {
              const employee = businessData.employees?.find((emp: any) => emp.id === record.employeeId);
              const isOwner = employee?.role === 'Owner';
              const salaryData = calculateEmployeeSalary(record, totalEmployeeRevenue, employeeCount);

              return (
                <div key={index} className="p-4 md:p-6 lg:p-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-start mb-4 md:mb-6 gap-4 lg:gap-0">
                    <div>
                      <h4 className="text-base md:text-lg font-medium text-gray-800">
                        {getEmployeeName(record.employeeId)}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600">{isOwner ? 'Owner' : 'Employee'}</p>
                    </div>
                    <div className="text-left lg:text-right w-full lg:w-auto">
                      <p className="text-lg md:text-xl font-bold text-blue-600 mb-2 md:mb-3">
                        Gaji: {formatCurrency(salaryData.salary)}
                      </p>
                      <div className="text-xs md:text-sm text-gray-700 space-y-1 bg-blue-50 p-3 md:p-4 rounded-lg border w-full lg:max-w-md">
                        <p className="font-medium text-gray-800 mb-2">Rinciannya:</p>
                        {isOwner ? (
                          <>
                            <div className="flex justify-between">
                              <span>+ Pendapatan Layanan:</span>
                              <span className="text-green-600">{formatCurrency(salaryData.breakdown.serviceRevenue)}</span>
                            </div>
                            {salaryData.breakdown.bonusDetails.map((bonus: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span>+ Bonus {bonus.name}:</span>
                                <span className="text-green-600">{formatCurrency(bonus.value)}</span>
                              </div>
                            ))}
                            {salaryData.breakdown.employeeShareRevenue > 0 && (
                              <div className="flex justify-between">
                                <span>+ 50% Pendapatan Karyawan:</span>
                                <span className="text-green-600">{formatCurrency(salaryData.breakdown.employeeShareRevenue)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>- Tabungan Owner:</span>
                              <span className="text-red-600">-{formatCurrency(salaryData.breakdown.dailySavings)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span>+ 50% Pendapatan:</span>
                              <span className="text-green-600">{formatCurrency(salaryData.breakdown.baseRevenue)}</span>
                            </div>
                            {salaryData.breakdown.bonusDetails.map((bonus: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span>+ Bonus {bonus.name}:</span>
                                <span className="text-green-600">{formatCurrency(bonus.value)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs md:text-sm font-medium text-gray-700">Services Performed:</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
                      {Object.entries(record.services || {})
                        .filter(([_, quantity]) => Number(quantity) > 0)
                        .map(([serviceId, quantity]) => {
                          const quantityNum = Number(quantity);
                          const serviceTotal = calculateServiceTotal(serviceId as string, quantityNum);
                          return (
                            <div key={serviceId as string} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-700">{getServiceName(serviceId as string)}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-800">{quantityNum}x</span>
                                <span className="text-sm text-green-600">{formatCurrency(serviceTotal)}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {record.bonusServices && Object.keys(record.bonusServices).length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Bonus Services:</h5>
                        <div className="space-y-2">
                          {Object.entries(record.bonusServices || {}).map(([serviceId, bonusData]: [string, any]) => (
                            Object.entries(bonusData || {})
                              .filter(([_, isEnabled]) => isEnabled)
                              .map(([bonusId, _]) => {
                                const bonusService = (businessData.services || []).find((s: any) => s.id === bonusId);
                                const bonusQty = record.bonusQuantities?.[serviceId]?.[bonusId] || 0;
                                const bonusValue = (bonusService?.price || 0) * bonusQty;
                                return (
                                  <div key={`${serviceId}-${bonusId}`} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-700">{getServiceName(bonusId)}</span>
                                      <span className="text-xs text-gray-500">({getServiceName(serviceId)})</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-800">{bonusQty}x</span>
                                      <span className="text-sm text-yellow-600 font-medium">{formatCurrency(bonusValue)}</span>
                                    </div>
                                  </div>
                                );
                              })
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="p-8 bg-blue-50 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total Gaji Hari Ini:</span>
                <span className="text-3xl font-bold text-blue-600">{formatCurrency(totalGaji)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions (CRUD) */}
      <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-300">
        <div className="p-4 md:p-6 lg:p-8 border-b border-gray-300 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">Transaksi untuk {new Date(selectedDate).toLocaleDateString('id-ID')}</h3>
          <div className="text-xs md:text-sm text-gray-600">
            <span className="mr-4">Pemasukan: <span className="font-semibold text-green-600">{formatCurrency(incomeTotal)}</span></span>
            <span className="mr-4">Pengeluaran: <span className="font-semibold text-red-600">{formatCurrency(expenseTotal)}</span></span>
            <span>Net: <span className="font-semibold">{formatCurrency(netTotal)}</span></span>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Add/Edit Form */}
          <form onSubmit={handleTxSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <select value={txType} onChange={(e) => setTxType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                <option value="">Pilih tipe</option>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <input type="text" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Deskripsi transaksi" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal</label>
              <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} min={0} step={1000} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" required />
              {txAmount && <p className="text-xs text-gray-500 mt-1">{formatCurrency(parseFloat(txAmount) || 0)}</p>}
            </div>
            <div className="md:col-span-5 flex items-center gap-3">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {txId ? 'Update Transaksi' : 'Tambah Transaksi'}
              </button>
              {txId && (
                <button type="button" onClick={resetTxForm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Batal</button>
              )}
            </div>
          </form>

          {/* List */}
          {transactions.length === 0 ? (
            <div className="text-center text-gray-600">Belum ada transaksi pada tanggal ini</div>
          ) : (
            <div className="space-y-3">
              {transactions
                .sort((a, b) => String(a.description).localeCompare(String(b.description)))
                .map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.date} • {tx.type}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${tx.type === 'Pemasukan' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'Pemasukan' ? '+' : '-'} {formatCurrency(tx.amount)}</span>
                      <button onClick={() => startEditTx(tx)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" aria-label="Edit transaksi"><Edit size={18} /></button>
                      <button onClick={() => deleteTx(tx.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" aria-label="Hapus transaksi"><Trash size={18} /></button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyRecap;
