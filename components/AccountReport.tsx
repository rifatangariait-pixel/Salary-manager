
import React, { useState, useMemo, useEffect } from 'react';
import { AccountOpening, Branch, Employee, UserRole } from '../types';
import { exportAccountsToCSV, exportAccountDetails } from '../services/exportService';
import { Download, Search, Edit2, Trash2, X, Save, AlertTriangle, FileDown, CheckCircle, Users, Wallet, Clock, AlertCircle, Coins, BadgeCheck, Timer, User, UserCheck, RefreshCw } from 'lucide-react';

interface AccountReportProps {
  accounts: AccountOpening[];
  employees: Employee[];
  branches: Branch[];
  onEdit: (id: number, data: Partial<AccountOpening>) => void;
  onDelete: (id: number) => void;
  onRefresh?: () => void;
  userRole: UserRole;
}

const AccountReport: React.FC<AccountReportProps> = ({ accounts, employees, branches, onEdit, onDelete, onRefresh, userRole }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccountOpening>>({});
  
  // Feedback State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Role Checks
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'].includes(userRole);
  const canDelete = ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(userRole); // Managers usually can't delete history

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    console.log(`[AccountReport] Received ${accounts.length} accounts from parent.`);
  }, [accounts]);

  // Dynamic Employee Options based on Branch Selection
  const employeeOptions = useMemo(() => {
    if (selectedBranchId === 'all') return employees;
    return employees.filter(e => e.branch_id === selectedBranchId);
  }, [employees, selectedBranchId]);

  const filteredData = useMemo(() => {
    const filtered = accounts.filter(acc => {
      // 1. Filter by Branch
      if (selectedBranchId !== 'all' && acc.branch_id !== selectedBranchId) return false;
      
      // 2. Filter by Employee (New)
      if (selectedEmployeeId !== 'all' && acc.opened_by_employee_id !== selectedEmployeeId) return false;

      // 3. Filter by Month (Comparing Opening Date YYYY-MM)
      if (selectedMonth) {
        const openingMonth = acc.opening_date.substring(0, 7);
        if (openingMonth !== selectedMonth) return false;
      }

      // 4. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const emp = employees.find(e => e.id === acc.opened_by_employee_id);
        const codeMatch = acc.account_code.toLowerCase().includes(term);
        const empMatch = emp?.name.toLowerCase().includes(term);
        const empIdMatch = emp?.id.toLowerCase().includes(term);
        if (!codeMatch && !empMatch && !empIdMatch) return false;
      }

      return true;
    });
    console.log(`[AccountReport] Total accounts shown: ${filtered.length}`);
    return filtered;
  }, [accounts, employees, selectedBranchId, selectedEmployeeId, selectedMonth, searchTerm]);

  // Summary Statistics
  const summary = useMemo(() => {
    let total = 0;
    let bonusable = 0;
    let expired = 0;
    let totalCollection = 0;
    let counted = 0;

    const today = new Date();
    const currentY = today.getFullYear();
    const currentM = today.getMonth() + 1;

    filteredData.forEach(acc => {
        total++;
        totalCollection += acc.collection_amount;
        
        if (acc.collection_amount >= 600) bonusable++;
        if (acc.is_counted) counted++;

        const [openY, openM] = acc.opening_date.split('-').map(Number);
        const diff = (currentY - openY) * 12 + (currentM - openM);
        
        if (!acc.is_counted && diff > 1) expired++;
    });

    return { total, bonusable, expired, totalCollection, counted };
  }, [filteredData]);

  const selectedEmployeeDetails = useMemo(() => {
      if (selectedEmployeeId === 'all') return null;
      return employees.find(e => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);

  const handleExport = () => {
    const filename = `Account_Report_${selectedMonth || 'All_Months'}`;
    exportAccountsToCSV(filteredData, employees, branches, filename);
  };

  const handleDownloadSingle = (acc: AccountOpening) => {
    const emp = employees.find(e => e.id === acc.opened_by_employee_id);
    const branch = branches.find(b => b.id === acc.branch_id);
    // Include ID in the single export as well
    const empNameWithId = emp ? `${emp.name} (${emp.id})` : 'Unknown';
    exportAccountDetails(acc, empNameWithId, branch?.name || 'Unknown');
  };

  const handleDelete = (id: number) => {
    if (!canDelete) return;
    if (confirm("Are you sure you want to delete this account record?")) {
        onDelete(id);
        setSuccessMessage("Account record deleted successfully.");
    }
  };

  const startEdit = (acc: AccountOpening) => {
    if (!canEdit) return;
    setEditingId(acc.id);
    setEditForm({
        account_code: acc.account_code,
        center_code: acc.center_code,
        customer_name: acc.customer_name,
        father_husband_name: acc.father_husband_name,
        gender: acc.gender,
        dob: acc.dob,
        nid: acc.nid,
        mobile: acc.mobile,
        address: acc.address,
        nominee_name: acc.nominee_name,
        nominee_relation: acc.nominee_relation,
        agent_name: acc.agent_name,
        term: acc.term,
        collection_amount: acc.collection_amount,
        opened_by_employee_id: acc.opened_by_employee_id,
        opening_date: acc.opening_date,
        branch_id: acc.branch_id,
        status: acc.status,
        is_counted: acc.is_counted,
        counted_month: acc.counted_month,
        salary_sheet_id: acc.salary_sheet_id
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editForm) {
        onEdit(editingId, editForm);
        setEditingId(null);
        setEditForm({});
        setSuccessMessage("Account details updated successfully.");
    }
  };

  const getStatusBadge = (acc: AccountOpening) => {
    if (acc.is_counted) {
        return (
            <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <BadgeCheck size={12} />
                Counted ({acc.counted_month})
            </span>
        );
    }

    const today = new Date();
    const currentY = today.getFullYear();
    const currentM = today.getMonth() + 1;
    const [openY, openM] = acc.opening_date.split('-').map(Number);
    const diff = (currentY - openY) * 12 + (currentM - openM);

    if (diff > 1) {
        return (
             <span className="flex items-center gap-1 text-slate-500 font-bold text-[11px] bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <Clock size={12} />
                Expired
            </span>
        );
    }

    if (acc.collection_amount < 600) {
        return (
            <span className="flex items-center gap-1 text-amber-700 font-bold text-[11px] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                <AlertCircle size={12} />
                Low Amt
            </span>
        );
    }

    return (
        <span className="flex items-center gap-1 text-blue-700 font-bold text-[11px] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            <Timer size={12} />
            Eligible
        </span>
    );
  };

  const isEditingCounted = editingId ? accounts.find(a => a.id === editingId)?.is_counted : false;

  const handleManualRefresh = async () => {
      if (onRefresh) {
          try {
              await onRefresh();
              setSuccessMessage("Data refreshed successfully!");
          } catch (e) {
              console.error("Refresh failed:", e);
          }
      }
  };

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      {/* Success Notification Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle size={20} className="text-white shrink-0" />
          <span className="font-medium text-sm">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:bg-emerald-800 p-1 rounded-full transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        
        <div className="flex flex-col md:flex-row flex-1 gap-4 w-full">
          {/* Month Filter */}
          <div className="flex flex-col space-y-1 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Clock size={12} /> Opening Month
            </label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex flex-col space-y-1 w-full md:w-auto">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Wallet size={12} /> Branch
             </label>
             <select 
               value={selectedBranchId}
               onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedEmployeeId('all'); }}
               className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[150px] bg-white"
             >
               <option value="all">All Branches</option>
               {branches.map(b => (
                 <option key={b.id} value={b.id}>{b.name}</option>
               ))}
             </select>
          </div>

          {/* Employee Filter */}
          <div className="flex flex-col space-y-1 w-full md:w-auto">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User size={12} /> Employee
             </label>
             <select 
               value={selectedEmployeeId}
               onChange={(e) => setSelectedEmployeeId(e.target.value)}
               className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px] bg-white"
             >
               <option value="all">All Employees</option>
               {employeeOptions.map(e => (
                 <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
               ))}
             </select>
          </div>

          {/* Search */}
           <div className="flex flex-col space-y-1 flex-1">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Search size={12} /> Search
             </label>
             <div className="relative flex gap-2">
               <input 
                 type="text" 
                 placeholder="Search by Code, Name or ID..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-3 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
               {(selectedMonth || selectedBranchId !== 'all' || selectedEmployeeId !== 'all' || searchTerm) && (
                   <button 
                       onClick={() => {
                           setSelectedMonth('');
                           setSelectedBranchId('all');
                           setSelectedEmployeeId('all');
                           setSearchTerm('');
                       }}
                       className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold whitespace-nowrap"
                       title="Clear All Filters"
                   >
                       Clear
                   </button>
               )}
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:mb-0.5">
            {onRefresh && (
                <button 
                    onClick={handleManualRefresh}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                    title="Refresh Data from Database"
                >
                    <RefreshCw size={18} />
                </button>
            )}
            <button 
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm h-10"
            >
              <Download size={16} /> <span className="hidden md:inline">Export CSV</span>
            </button>
        </div>
      </div>

      {/* Employee Context Summary */}
      {selectedEmployeeDetails && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                      <UserCheck size={24} />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-indigo-900">{selectedEmployeeDetails.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-indigo-700">
                          <span className="font-mono bg-indigo-200/50 px-1.5 py-0.5 rounded">{selectedEmployeeDetails.id}</span>
                          <span>•</span>
                          <span>{selectedEmployeeDetails.designation}</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex gap-4 w-full md:w-auto">
                  <div className="bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm flex-1 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total Books</p>
                      <p className="text-xl font-bold text-slate-800">{summary.total}</p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-lg border border-emerald-100 shadow-sm flex-1 text-center">
                      <p className="text-[10px] text-emerald-600 uppercase font-bold">Bonusable</p>
                      <p className="text-xl font-bold text-emerald-600">{summary.bonusable}</p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex-1 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Expired</p>
                      <p className="text-xl font-bold text-slate-500">{summary.expired}</p>
                  </div>
              </div>
          </div>
      )}

      {/* Global Summary Strip (Hidden if specific employee is selected to avoid redundancy, or simplified) */}
      {!selectedEmployeeDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                    <Users size={18} />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Accounts</p>
                    <p className="text-lg font-bold text-slate-800">{summary.total}</p>
                </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex items-center gap-3 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                    <Coins size={18} />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Bonusable (≥600)</p>
                    <p className="text-lg font-bold text-emerald-800">{summary.bonusable}</p>
                </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-500 rounded-md">
                    <AlertCircle size={18} />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Expired / Low</p>
                    <p className="text-lg font-bold text-slate-600">{summary.total - summary.bonusable}</p>
                </div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm flex items-center gap-3 text-white">
                <div className="p-2 bg-slate-700 text-slate-300 rounded-md">
                    <Wallet size={18} />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Collection</p>
                    <p className="text-lg font-bold">৳{summary.totalCollection.toLocaleString()}</p>
                </div>
            </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm text-xs uppercase tracking-wide">
              <tr>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Account Code</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Center</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Customer Name</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Father/Husband</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Mobile</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Term</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Collection</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Opened By</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Branch</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Date</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Status</th>
                <th className="p-4 border-b border-slate-200 whitespace-nowrap">Details</th>
                {(canEdit || canDelete) && <th className="p-4 border-b border-slate-200 text-right whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map(acc => {
                  const employee = employees.find(e => e.id === acc.opened_by_employee_id);
                  const branch = branches.find(b => b.id === acc.branch_id);
                  const isBonusable = acc.collection_amount >= 600;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-700 whitespace-nowrap">{acc.account_code}</td>
                      <td className="p-4 font-mono text-slate-600 whitespace-nowrap">{acc.center_code}</td>
                      <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{acc.customer_name}</td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{acc.father_husband_name}</td>
                      <td className="p-4 font-mono text-slate-600 whitespace-nowrap">{acc.mobile}</td>
                      <td className="p-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100 whitespace-nowrap">
                          {acc.term} Yrs
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-sm ${isBonusable ? 'text-emerald-700' : 'text-amber-600'}`}>
                                ৳{acc.collection_amount.toLocaleString()}
                            </span>
                            {!isBonusable && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Low Amount (< 600)"></span>
                            )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 whitespace-nowrap">
                        <div>
                            <div className="font-semibold text-sm leading-tight mb-0.5">{employee?.name || 'Unknown'}</div>
                            {employee && (
                                <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 font-mono">
                                    {employee.id}
                                </div>
                            )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-medium whitespace-nowrap">{branch?.name || 'Unknown'}</td>
                      <td className="p-4 text-slate-500 text-xs font-mono whitespace-nowrap">{acc.opening_date}</td>
                      <td className="p-4 whitespace-nowrap">
                        {getStatusBadge(acc)}
                      </td>
                      <td className="p-4 text-xs text-slate-500 min-w-[200px]">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <span className="text-slate-400">Gender:</span> <span className="font-medium">{acc.gender}</span>
                              <span className="text-slate-400">DOB:</span> <span className="font-medium">{acc.dob}</span>
                              <span className="text-slate-400">NID:</span> <span className="font-mono">{acc.nid}</span>
                              <span className="text-slate-400">Agent:</span> <span className="font-medium">{acc.agent_name || '-'}</span>
                              {acc.nominee_name && (
                                <>
                                  <span className="text-slate-400">Nominee:</span> <span className="font-medium truncate" title={acc.nominee_name}>{acc.nominee_name} ({acc.nominee_relation})</span>
                                </>
                              )}
                              <span className="text-slate-400 col-span-2 truncate" title={acc.address}>{acc.address}</span>
                          </div>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end space-x-1">
                               <button 
                                  onClick={() => handleDownloadSingle(acc)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Download Details"
                               >
                                  <FileDown size={16} />
                               </button>
                               {canEdit && (
                                 <button 
                                    onClick={() => startEdit(acc)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit Account"
                                 >
                                     <Edit2 size={16} />
                                 </button>
                               )}
                               {canDelete && (
                                 <button 
                                    onClick={() => handleDelete(acc.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Account"
                                 >
                                     <Trash2 size={16} />
                                 </button>
                               )}
                           </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                    <div className="mb-2 bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <Search size={24} />
                    </div>
                    {accounts.length === 0 
                        ? "No accounts found in the database. Add some accounts first." 
                        : "No account records found matching filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs text-slate-500 text-right font-medium">
          Showing {filteredData.length} records
        </div>
      </div>

       {/* Edit Modal */}
       {editingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">Edit Account</h3>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {isEditingCounted && (
                         <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex gap-2 items-start">
                             <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                             <p>
                                 Warning: This account has already been counted in a salary sheet. 
                                 Updating the collection amount here will NOT automatically update previously generated salary sheets.
                             </p>
                         </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Account Code</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50"
                                value={editForm.account_code || ''}
                                onChange={e => setEditForm({...editForm, account_code: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Center Code</label>
                            <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.center_code || ''}
                                onChange={e => setEditForm({...editForm, center_code: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Customer Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={editForm.customer_name || ''}
                            onChange={e => setEditForm({...editForm, customer_name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Father/Husband Name</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.father_husband_name || ''}
                                onChange={e => setEditForm({...editForm, father_husband_name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Mobile</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.mobile || ''}
                                onChange={e => setEditForm({...editForm, mobile: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Gender</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={editForm.gender || 'MALE'}
                                onChange={e => setEditForm({...editForm, gender: e.target.value as any})}
                            >
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.dob || ''}
                                onChange={e => setEditForm({...editForm, dob: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">NID / Birth Cert</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={editForm.nid || ''}
                            onChange={e => setEditForm({...editForm, nid: e.target.value})}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Address</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            rows={2}
                            value={editForm.address || ''}
                            onChange={e => setEditForm({...editForm, address: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Nominee Name</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.nominee_name || ''}
                                onChange={e => setEditForm({...editForm, nominee_name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Nominee Relation</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.nominee_relation || ''}
                                onChange={e => setEditForm({...editForm, nominee_relation: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Agent Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={editForm.agent_name || ''}
                            onChange={e => setEditForm({...editForm, agent_name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Term (Years)</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={editForm.term || 5}
                                onChange={e => setEditForm({...editForm, term: Number(e.target.value)})}
                            >
                                <option value={1.5}>1.5 Years</option>
                                <option value={3}>3 Years</option>
                                <option value={5}>5 Years</option>
                                <option value={8}>8 Years</option>
                                <option value={10}>10 Years</option>
                                <option value={12}>12 Years</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Collection Amount (৳)</label>
                            <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editForm.collection_amount || ''}
                                onChange={e => setEditForm({...editForm, collection_amount: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Opened By</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={editForm.opened_by_employee_id || ''}
                                onChange={e => {
                                    const newEmpId = e.target.value;
                                    const selectedEmp = employees.find(emp => emp.id === newEmpId);
                                    setEditForm({
                                        ...editForm, 
                                        opened_by_employee_id: newEmpId,
                                        branch_id: selectedEmp ? selectedEmp.branch_id : editForm.branch_id
                                    });
                                }}
                            >
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} ({e.id}) - {e.designation}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Branch</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={editForm.branch_id || ''}
                                onChange={e => setEditForm({...editForm, branch_id: e.target.value})}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Opening Date</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={editForm.opening_date || ''}
                            onChange={e => setEditForm({...editForm, opening_date: e.target.value})}
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 mt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500" />
                            System Status (Advanced)
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Account Status</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                    value={editForm.status || 'ACTIVE'}
                                    onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="ADJUSTED">Adjusted</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-3 pt-6">
                                <input 
                                    type="checkbox" 
                                    id="is_counted_check"
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    checked={editForm.is_counted || false}
                                    onChange={e => setEditForm({...editForm, is_counted: e.target.checked})}
                                />
                                <label htmlFor="is_counted_check" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                    Is Counted in Salary?
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                             <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Counted Month</label>
                                <input 
                                    type="month" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                    value={editForm.counted_month || ''}
                                    onChange={e => setEditForm({...editForm, counted_month: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Salary Sheet ID</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                    value={editForm.salary_sheet_id || ''}
                                    onChange={e => setEditForm({...editForm, salary_sheet_id: e.target.value})}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-500 italic">
                            Warning: Manually changing "Is Counted" may cause discrepancies in salary reports if not handled carefully. Only change if you know what you are doing.
                        </p>
                    </div>

                    <div className="pt-2 flex space-x-3">
                        <button 
                            type="button" 
                            onClick={() => setEditingId(null)}
                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AccountReport;
