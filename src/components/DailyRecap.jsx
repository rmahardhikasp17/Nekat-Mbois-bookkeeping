import React, { useState, useEffect } from 'react';
import { Calendar, Download, User, DollarSign, Edit, Trash, Save, X } from 'lucide-react';
import { formatCurrency, exportDailyRecapToExcel } from '../utils/dataManager';

const DailyRecap = ({ businessData, updateBusinessData }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit state for daily input records
  const [editingKey, setEditingKey] = useState(null);
  const [editServices, setEditServices] = useState({});
  const [editBonusServices, setEditBonusServices] = useState({});
  const [editBonusQuantities, setEditBonusQuantities] = useState({});

  const mainServices = (businessData.services || []).filter(s => !s.bonusable);
  const bonusServicesList = (businessData.services || []).filter(s => s.bonusable);

  const startEditRecord = (record) => {
    const key = `${record.date}_${record.employeeId}`;
    setEditingKey(key);
    setEditServices({ ...(record.services || {}) });
    setEditBonusServices({ ...(record.bonusServices || {}) });
    setEditBonusQuantities({ ...(record.bonusQuantities || {}) });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditServices({});
    setEditBonusServices({});
    setEditBonusQuantities({});
  };

  const handleServiceQuantityChange = (serviceId, quantity) => {
    const qty = Math.max(0, parseInt(quantity || '0', 10) || 0);
    setEditServices(prev => ({ ...prev, [serviceId]: qty }));

    // Clamp all bonus quantities under this service to new max
    setEditBonusQuantities(prev => {
      const maxQty = qty;
      const current = prev[serviceId] || {};
      const clamped = Object.fromEntries(Object.entries(current).map(([bId, bQty]) => [bId, Math.min(Number(bQty) || 0, maxQty)]));
      return { ...prev, [serviceId]: clamped };
    });
  };

  const handleBonusServiceToggle = (serviceId, bonusId, enabled) => {
    setEditBonusServices(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [bonusId]: !!enabled,
      },
    }));

    if (!enabled) {
      setEditBonusQuantities(prev => ({
        ...prev,
        [serviceId]: {
          ...(prev[serviceId] || {}),
          [bonusId]: 0,
        },
      }));
    }
  };

  const handleBonusQuantityChange = (serviceId, bonusId, quantity, max) => {
    const qty = Math.max(0, Math.min(parseInt(quantity || '0', 10) || 0, max));
    setEditBonusQuantities(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [bonusId]: qty,
      },
    }));
  };

  const getEmployeeName = (employeeId) => {
    const employee = (businessData.employees || []).find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const getEmployeeRole = (employeeId) => {
    const employee = (businessData.employees || []).find(emp => emp.id === employeeId);
    return employee ? employee.role : '';
  };

  const getServiceName = (serviceId) => {
    const service = (businessData.services || []).find(srv => srv.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getDailyRecords = (date) => {
    return Object.values(businessData.dailyRecords || {}).filter(record => record.date === date);
  };

  const calculateServiceTotal = (serviceId, quantity) => {
    const service = (businessData.services || []).find(s => s.id === serviceId);
    const servicePrice = Number(service?.price) || 0;
    const serviceQuantity = Number(quantity) || 0;
    return servicePrice * serviceQuantity;
  };

  const calculateBonusTotal = (bonusServices, bonusQuantities) => {
    if (!bonusServices || !bonusQuantities) return 0;
    let total = 0;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]) => {
        if (isEnabled) {
          const bonusService = (businessData.services || []).find(s => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          total += (Number(bonusService?.price) || 0) * Number(bonusQty || 0);
        }
      });
    });
    return total;
  };

  const getBonusDetails = (bonusServices, bonusQuantities) => {
    const details = [];
    if (!bonusServices || !bonusQuantities) return details;
    Object.entries(bonusServices).forEach(([serviceId, bonusData]) => {
      Object.entries(bonusData || {}).forEach(([bonusId, isEnabled]) => {
        if (isEnabled) {
          const bonusService = (businessData.services || []).find(s => s.id === bonusId);
          const bonusQty = bonusQuantities[serviceId]?.[bonusId] || 0;
          if (bonusQty > 0 && bonusService) {
            details.push({ name: bonusService.name, quantity: bonusQty, value: (bonusService.price || 0) * bonusQty });
          }
        }
      });
    });
    return details;
  };

  const calculateEmployeeSalary = (record, totalEmployeeRevenue, employeeCount) => {
    const employee = (businessData.employees || []).find(emp => emp.id === record.employeeId);
    const isOwner = employee?.role === 'Owner';

    const serviceRevenue = Object.entries(record.services || {})
      .filter(([_, quantity]) => Number(quantity) > 0)
      .reduce((sum, [serviceId, quantity]) => sum + calculateServiceTotal(serviceId, Number(quantity)), 0);

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

  const totalEmployeeRevenue = dailyRecords.reduce((sum, record) => {
    const employee = (businessData.employees || []).find(emp => emp.id === record.employeeId);
    if (employee?.role !== 'Owner') {
      const recordTotal = Object.entries(record.services || {})
        .filter(([_, quantity]) => Number(quantity) > 0)
        .reduce((recordSum, [serviceId, quantity]) => recordSum + calculateServiceTotal(serviceId, quantity), 0);
      return sum + recordTotal;
    }
    return sum;
  }, 0);

  const employeeCount = dailyRecords.filter(record => {
    const employee = (businessData.employees || []).find(emp => emp.id === record.employeeId);
    return employee?.role !== 'Owner';
  }).length;

  const totalGaji = dailyRecords.reduce((sum, record) => {
    const salaryData = calculateEmployeeSalary(record, totalEmployeeRevenue, employeeCount);
    return sum + salaryData.salary;
  }, 0);

  const handleExport = () => {
    exportDailyRecapToExcel(dailyRecords, businessData, selectedDate);
  };

  const deleteRecord = (record) => {
    if (!updateBusinessData) return;
    if (!window.confirm('Hapus data harian untuk karyawan ini?')) return;
    const key = `${record.date}_${record.employeeId}`;
    const updated = { ...(businessData.dailyRecords || {}) };
    delete updated[key];
    updateBusinessData({ dailyRecords: updated });
  };

  const saveRecord = (record) => {
    if (!updateBusinessData) return;
    const key = `${record.date}_${record.employeeId}`;

    const serviceRevenue = mainServices.reduce((sum, svc) => sum + (Number(svc.price) || 0) * (Number(editServices[svc.id]) || 0), 0);
    const bonusTotal = Object.entries(editBonusServices || {}).reduce((sum, [serviceId, bonusMap]) => {
      return sum + Object.entries(bonusMap || {}).reduce((bSum, [bonusId, isEnabled]) => {
        if (!isEnabled) return bSum;
        const bonusService = bonusServicesList.find(s => s.id === bonusId);
        const qty = editBonusQuantities?.[serviceId]?.[bonusId] || 0;
        return bSum + (bonusService ? Number(bonusService.price) * Number(qty) : 0);
      }, 0);
    }, 0);

    const role = getEmployeeRole(record.employeeId);
    let potongan = 0;
    let gajiDiterima = 0;
    if (role === 'Karyawan') {
      potongan = serviceRevenue * 0.5;
      gajiDiterima = (serviceRevenue * 0.5) + bonusTotal;
    } else if (role === 'Owner') {
      potongan = 50000;
      gajiDiterima = serviceRevenue - 50000 + bonusTotal;
    }

    const newRecord = {
      ...record,
      services: { ...editServices },
      bonusServices: { ...editBonusServices },
      bonusQuantities: { ...editBonusQuantities },
      totalRevenue: serviceRevenue,
      bonusTotal,
      potongan,
      gajiDiterima,
    };

    const updated = { ...(businessData.dailyRecords || {}), [key]: newRecord };
    updateBusinessData({ dailyRecords: updated });
    cancelEdit();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Daily Recap</h2>
            <p className="text-gray-600 mt-1">View and export daily revenue summary</p>
          </div>
          {dailyRecords.length > 0 && (
            <button onClick={handleExport} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              <Download size={20} />
              <span>Export Excel</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar size={16} />
            <span>Select Date:</span>
          </label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-barbershop-red focus:border-transparent" />
        </div>
      </div>

      {dailyRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold text-gray-800">{dailyRecords.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Gaji Hari Ini</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(dailyRecords.reduce((sum, r) => sum + calculateEmployeeSalary(r, totalEmployeeRevenue, employeeCount).salary, 0))}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Records for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
        </div>

        {dailyRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-gray-400" size={32} />
            </div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">No records found</h4>
            <p className="text-gray-500">No data recorded for this date</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dailyRecords.map((record, index) => {
              const employee = (businessData.employees || []).find(emp => emp.id === record.employeeId);
              const isOwner = employee?.role === 'Owner';
              const salaryData = calculateEmployeeSalary(record, totalEmployeeRevenue, employeeCount);
              const recordKey = `${record.date}_${record.employeeId}`;

              return (
                <div key={index} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-800">{getEmployeeName(record.employeeId)}</h4>
                      <p className="text-sm text-gray-600">{isOwner ? 'Owner' : 'Employee'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600 mb-3">Gaji: {formatCurrency(salaryData.salary)}</p>
                      <div className="text-sm text-gray-700 space-y-1 bg-blue-50 p-4 rounded-lg border max-w-md">
                        <p className="font-medium text-gray-800 mb-2">Rinciannya:</p>
                        {isOwner ? (
                          <>
                            <div className="flex justify-between"><span>+ Pendapatan Layanan:</span><span className="text-green-600">{formatCurrency(salaryData.breakdown.serviceRevenue)}</span></div>
                            {salaryData.breakdown.bonusDetails.map((bonus, idx) => (
                              <div key={idx} className="flex justify-between"><span>+ Bonus {bonus.name}:</span><span className="text-green-600">{formatCurrency(bonus.value)}</span></div>
                            ))}
                            {salaryData.breakdown.employeeShareRevenue > 0 && (
                              <div className="flex justify-between"><span>+ 50% Pendapatan Karyawan:</span><span className="text-green-600">{formatCurrency(salaryData.breakdown.employeeShareRevenue)}</span></div>
                            )}
                            <div className="flex justify-between"><span>- Tabungan Owner:</span><span className="text-red-600">-{formatCurrency(salaryData.breakdown.dailySavings)}</span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between"><span>+ 50% Pendapatan:</span><span className="text-green-600">{formatCurrency(salaryData.breakdown.baseRevenue)}</span></div>
                            {salaryData.breakdown.bonusDetails.map((bonus, idx) => (
                              <div key={idx} className="flex justify-between"><span>+ Bonus {bonus.name}:</span><span className="text-green-600">{formatCurrency(bonus.value)}</span></div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingKey === recordKey ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-gray-800">Edit Data Layanan</h5>
                        <div className="flex gap-2">
                          <button onClick={() => saveRecord(record)} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={16} /> Simpan</button>
                          <button onClick={cancelEdit} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"><X size={16} /> Batal</button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {mainServices.map((service) => (
                          <div key={service.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-800">{service.name}</h4>
                                <p className="text-sm text-gray-600">{formatCurrency(service.price)} per service</p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <label className="text-sm text-gray-600">Qty:</label>
                                <input type="number" min="0" value={editServices[service.id] ?? ''} onChange={(e) => handleServiceQuantityChange(service.id, e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" />
                                <span className="text-sm font-medium text-green-600 min-w-20 text-right">{formatCurrency((Number(service.price) || 0) * (Number(editServices[service.id]) || 0))}</span>
                              </div>
                            </div>

                            {bonusServicesList.length > 0 && (Number(editServices[service.id]) || 0) > 0 && (
                              <div className="border-t border-gray-100 pt-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-3">Bonus Services:</h5>
                                <div className="space-y-3">
                                  {bonusServicesList.map((bonusService) => {
                                    const isEnabled = editBonusServices?.[service.id]?.[bonusService.id] || false;
                                    const maxQty = Number(editServices[service.id]) || 0;
                                    const bonusQty = editBonusQuantities?.[service.id]?.[bonusService.id] || 0;
                                    return (
                                      <div key={bonusService.id} className="bg-yellow-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <input id={`bonus-${service.id}-${bonusService.id}`} type="checkbox" checked={isEnabled} onChange={(e) => handleBonusServiceToggle(service.id, bonusService.id, e.target.checked)} />
                                            <label htmlFor={`bonus-${service.id}-${bonusService.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">{bonusService.name}</label>
                                            <span className="text-sm text-gray-600">({formatCurrency(bonusService.price)})</span>
                                          </div>
                                          {isEnabled && (
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-gray-600">Bonus Qty:</label>
                                              <input type="number" min="0" max={maxQty} value={bonusQty} onChange={(e) => handleBonusQuantityChange(service.id, bonusService.id, e.target.value, maxQty)} className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent" placeholder="0" />
                                              <span className="text-xs text-gray-500">/ {maxQty}</span>
                                              <span className="text-sm font-medium text-yellow-600 min-w-16 text-right">{formatCurrency((Number(bonusService.price) || 0) * Number(bonusQty || 0))}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Main Services Performed:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(record.services || {})
                            .filter(([_, quantity]) => Number(quantity) > 0)
                            .map(([serviceId, quantity]) => {
                              const serviceTotal = calculateServiceTotal(serviceId, quantity);
                              return (
                                <div key={serviceId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm text-gray-700">{getServiceName(serviceId)}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-800">{Number(quantity)}x</span>
                                    <span className="text-sm text-green-600">{formatCurrency(serviceTotal)}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {record.bonusServices && Object.keys(record.bonusServices).length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Bonus Services:</h5>
                          <div className="space-y-2">
                            {Object.entries(record.bonusServices || {}).map(([serviceId, bonusData]) => (
                              Object.entries(bonusData || {})
                                .filter(([_, isEnabled]) => isEnabled)
                                .map(([bonusId, _]) => {
                                  const bonusService = (businessData.services || []).find(s => s.id === bonusId);
                                  const bonusQty = record.bonusQuantities?.[serviceId]?.[bonusId] || 0;
                                  const bonusValue = (Number(bonusService?.price) || 0) * Number(bonusQty || 0);
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

                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => startEditRecord(record)} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Edit size={16} /> Edit</button>
                        <button onClick={() => deleteRecord(record)} className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><Trash size={16} /> Hapus</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total Gaji Hari Ini:</span>
                <span className="text-3xl font-bold text-green-600">{formatCurrency(totalGaji)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note: Create daily records hanya di halaman Daily Input */}
    </div>
  );
};

export default DailyRecap;
