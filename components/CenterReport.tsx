
import React, { useState, useMemo } from 'react';
import { CenterCollectionRecord, Branch, Employee, Center } from '../types';
import { Calendar, Building, User, Filter, Trophy, TrendingUp, MapPin } from 'lucide-react';

interface CenterReportProps {
  records: CenterCollectionRecord[];
  branches: Branch[];
  employees: Employee[];
  centers?: Center[];
}

const CenterReport: React.FC<CenterReportProps> = ({ records, branches, employees, centers = [] }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

  // "Hydrate" records to reflect current master data (handles moved centers)
  // This fixes the issue where a center moved to a new branch (e.g. Madaripur -> Chilarchar)
  // would hide historical records created under the old branch.
  const effectiveRecords = useMemo(() => {
      return records.map(r => {
          // 1. Try strict match first
          const strictMatch = centers.find(c => c.centerCode === r.centerCode && c.branchId === r.branchId);
          if (strictMatch) return r;

          // 2. If strict match fails, check if this center code is unique in the system
          // If so, assume the record belongs to the current definition of the center
          const matches = centers.filter(c => c.centerCode === r.centerCode);
          if (matches.length === 1) {
              const master = matches[0];
              // Return a new object with updated branchId matching the master
              // We also align the type just in case
              const resolvedType: 'OWN' | 'OFFICE' = master.type === 'OFFICE' ? 'OFFICE' : (master.assignedEmployeeId === r.employeeId ? 'OWN' : 'OFFICE');
              return { 
                  ...r, 
                  branchId: master.branchId, 
                  type: resolvedType
              };
          }
          
          return r;
      });
  }, [records, centers]);

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return effectiveRecords.filter(r => {
      // 1. Month Check
      if (!r.createdAt.startsWith(selectedMonth)) return false;

      // 2. Visibility Check (Security)
      if (!branches.some(b => b.id === r.branchId)) return false;
      // Note: We don't strictly check employee visibility here as effectiveRecords might map to any emp
      
      // 3. User Selection Filters
      if (selectedBranchId !== 'all' && r.branchId !== selectedBranchId) return false;
      if (selectedEmployeeId !== 'all' && r.employeeId !== selectedEmployeeId) return false;

      return true;
    });
  }, [effectiveRecords, selectedMonth, selectedBranchId, selectedEmployeeId, branches]);

  // Aggregation: Group by Center + Employee
  const aggregatedData = useMemo(() => {
    const groups: Record<string, {
      key: string;
      centerCode: number;
      type: 'OWN' | 'OFFICE';
      employeeId: string;
      branchId: string;
      count: number;
      totalAmount: number;
    }> = {};

    filteredRecords.forEach(r => {
      // DYNAMIC TYPE RESOLUTION
      let effectiveType: 'OWN' | 'OFFICE' = r.type;
      const center = centers.find(c => c.centerCode === r.centerCode && c.branchId === r.branchId);
      
      if (center) {
          // If explicit OFFICE type is set in management, force OFFICE
          if (center.type === 'OFFICE') {
              effectiveType = 'OFFICE';
          } else {
              // Otherwise check ownership: If collector matches assigned owner -> OWN, else OFFICE
              effectiveType = center.assignedEmployeeId === r.employeeId ? 'OWN' : 'OFFICE';
          }
      }

      const key = `${r.centerCode}-${r.employeeId}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          centerCode: r.centerCode,
          type: effectiveType, // Use dynamic type
          employeeId: r.employeeId,
          branchId: r.branchId,
          count: 0,
          totalAmount: 0
        };
      }
      groups[key].count += 1;
      groups[key].totalAmount += r.amount;
    });

    // Sort by Center Code (asc), then Total Amount (desc)
    return Object.values(groups).sort((a, b) => {
      if (a.centerCode !== b.centerCode) return a.centerCode - b.centerCode;
      return b.totalAmount - a.totalAmount;
    });
  }, [filteredRecords, centers]);

  // Summary Stats
  const summary = useMemo(() => {
    let ownTotal = 0;
    let officeTotal = 0;
    
    aggregatedData.forEach(item => {
      if (item.type === 'OWN') ownTotal += item.totalAmount;
      else officeTotal += item.totalAmount;
    });

    return {
      ownTotal,
      officeTotal,
      grandTotal: ownTotal + officeTotal
    };
  }, [aggregatedData]);

  // Top Performer Insight
  const topPerformer = useMemo(() => {
    const empStats: Record<string, number> = {};
    filteredRecords.forEach(r => {
        empStats[r.employeeId] = (empStats[r.employeeId] || 0) + r.amount;
    });

    let maxId = '';
    let maxAmount = 0;

    Object.entries(empStats).forEach(([id, amount]) => {
        if (amount > maxAmount) {
            maxAmount = amount;
            maxId = id;
        }
    });

    if (!maxId) return null;
    const emp = employees.find(e => e.id === maxId);
    return {
        name: emp?.name || 'Unknown',
        id: maxId,
        designation: emp?.designation || '',
        amount: maxAmount
    };
  }, [filteredRecords, employees]);

  // Helpers
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  
  // Find center Name helper
  const getCenterName = (code: number, branchId: string) => {
      const center = centers.find(c => c.centerCode === code && c.branchId === branchId);
      return center ? center.centerName : '';
  };

  // Dropdown Options
  const visibleEmployees = useMemo(() => {
    if (selectedBranchId === 'all') return employees;
    return employees.filter(e => e.branch_id === selectedBranchId);
  }, [employees, selectedBranchId]);

  return (
    <div className="h-full flex flex-col space-y-4">
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
           <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Month
                 </label>
                 <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>
              
              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Building size={14} /> Branch
                 </label>
                 <select 
                    value={selectedBranchId}
                    onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedEmployeeId('all'); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 >
                    <option value="all">All Branches</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                 </select>
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <User size={14} /> Employee
                 </label>
                 <select 
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 >
                    <option value="all">All Employees</option>
                    {visibleEmployees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                 </select>
              </div>
           </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Own Centers</h4>
                <p className="text-2xl font-bold text-slate-800 mt-1">৳{summary.ownTotal.toLocaleString()}</p>
            </div>
            <div className="absolute right-0 top-0 w-20 h-20 bg-blue-50 rounded-full -mr-8 -mt-8"></div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Office Centers</h4>
                <p className="text-2xl font-bold text-slate-800 mt-1">৳{summary.officeTotal.toLocaleString()}</p>
             </div>
             <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-50 rounded-full -mr-8 -mt-8"></div>
         </div>

         <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm text-white relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Grand Total</h4>
                <p className="text-2xl font-bold mt-1">৳{summary.grandTotal.toLocaleString()}</p>
             </div>
             <div className="absolute right-0 top-0 w-20 h-20 bg-slate-700 rounded-full -mr-8 -mt-8 opacity-50"></div>
         </div>

         {/* Top Performer Card */}
         <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-xl border border-indigo-500 shadow-sm text-white relative overflow-hidden">
             {topPerformer ? (
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy size={14} className="text-yellow-300" />
                        <h4 className="text-xs font-bold text-indigo-100 uppercase tracking-wide">Top Performer</h4>
                    </div>
                    <p className="text-lg font-bold truncate">{topPerformer.name}</p>
                    <p className="text-xs text-indigo-200 truncate">{topPerformer.designation}</p>
                    <div className="mt-2 text-xl font-bold text-yellow-300">৳{topPerformer.amount.toLocaleString()}</div>
                 </div>
             ) : (
                 <div className="relative z-10 flex flex-col justify-center h-full text-indigo-200 text-sm">
                     No data available
                 </div>
             )}
             <div className="absolute right-0 bottom-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-6 -mb-6"></div>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
         <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-400" />
                <span className="font-bold text-slate-700 text-sm">Center & Employee Breakdown</span>
             </div>
             <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                {aggregatedData.length} Rows
             </span>
         </div>
         
         <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="p-4 bg-slate-50/50">Center Code</th>
                        <th className="p-4 bg-slate-50/50 text-center">Type</th>
                        <th className="p-4 bg-slate-50/50">Employee Name</th>
                        <th className="p-4 bg-slate-50/50">Employee Code</th>
                        <th className="p-4 bg-slate-50/50 text-center">Entries</th>
                        <th className="p-4 bg-slate-50/50 text-right">Collected Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {aggregatedData.length > 0 ? (
                        aggregatedData.map((item) => {
                            const centerName = getCenterName(item.centerCode, item.branchId);

                            return (
                                <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4">
                                        <div className="font-mono font-bold text-slate-700 text-base">{item.centerCode}</div>
                                        {centerName && (
                                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                <MapPin size={10} /> {centerName}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                            item.type === 'OWN' 
                                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-slate-700">
                                        {getEmployeeName(item.employeeId)}
                                    </td>
                                    <td className="p-4 font-mono text-slate-500 text-xs">
                                        {item.employeeId}
                                    </td>
                                    <td className="p-4 text-center text-slate-600 font-medium">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                                            {item.count}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-800">৳{item.totalAmount.toLocaleString()}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                                No records found for the selected criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
         
         <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
             Report Generated • {selectedMonth}
         </div>
      </div>
    </div>
  );
};

export default CenterReport;
