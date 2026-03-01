
import React, { useState, useEffect, useMemo } from 'react';
import { Advance, Employee, Branch } from '../types';
import { googleSheetService } from '../services/googleSheetService';
import { CreditCard, Save, Plus, Search, Filter, CheckCircle2, X, Calendar, User, FileText, TrendingUp, AlertCircle, RefreshCw, Edit2, Trash2 } from 'lucide-react';

interface ManageAdvancesProps {
  employees: Employee[];
  branches: Branch[];
}

const ManageAdvances: React.FC<ManageAdvancesProps> = ({ employees, branches }) => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [empId, setEmpId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState('');

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadAdvances = async () => {
    setLoading(true);
    try {
      const data = await googleSheetService.getAdvances();
      setAdvances(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvances();
  }, []);

  const resetForm = () => {
      setEmpId('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setTargetMonth(new Date().toISOString().slice(0, 7));
      setNotes('');
      setEditingId(null);
      setIsAdding(false);
  };

  const handleEdit = (adv: Advance) => {
      setEditingId(adv.id);
      setEmpId(adv.employeeId);
      setAmount(adv.amount.toString());
      setDate(adv.date);
      setTargetMonth(adv.targetMonth);
      setNotes(adv.notes || '');
      setIsAdding(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this advance record? This action cannot be undone.")) return;
      
      setLoading(true);
      try {
          await googleSheetService.deleteAdvance(id);
          // Optimistic remove
          setAdvances(prev => prev.filter(a => a.id !== id));
      } catch (e) {
          alert("Failed to delete record.");
      } finally {
          setLoading(false);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !amount || !targetMonth) return;

    setLoading(true);
    try {
      if (editingId) {
          // UPDATE
          const original = advances.find(a => a.id === editingId);
          if (original) {
              const updatedAdvance: Advance = {
                  ...original,
                  employeeId: empId,
                  amount: parseFloat(amount),
                  date,
                  targetMonth,
                  notes
              };
              await googleSheetService.updateAdvance(updatedAdvance);
          }
      } else {
          // CREATE
          const newAdvance = {
            id: `adv_${Date.now()}`,
            employeeId: empId,
            amount: parseFloat(amount),
            date,
            targetMonth,
            status: 'ACTIVE' as const,
            notes
          };
          await googleSheetService.addAdvance(newAdvance);
      }
      
      await loadAdvances();
      resetForm();
    } catch (error) {
      alert("Failed to save advance.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => {
      const emp = employees.find(e => e.id === adv.employeeId);
      const branchId = emp?.branch_id;
      
      const matchMonth = filterMonth ? adv.targetMonth === filterMonth : true;
      const matchBranch = filterBranch === 'all' ? true : branchId === filterBranch;
      const matchSearch = searchTerm ? (
          (emp?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          adv.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;

      return matchMonth && matchBranch && matchSearch;
    });
  }, [advances, filterMonth, filterBranch, searchTerm, employees]);

  // Statistics
  const stats = useMemo(() => {
      const totalAmount = filteredAdvances.reduce((sum, a) => sum + a.amount, 0);
      const activeCount = filteredAdvances.filter(a => a.status === 'ACTIVE').length;
      return { totalAmount, activeCount };
  }, [filteredAdvances]);

  const getBranchName = (bId?: string) => branches.find(b => b.id === bId)?.name || 'Unknown Branch';

  const formatMonth = (ym: string) => {
      if (!ym) return '-';
      const [y, m] = ym.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1);
      return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-6">
       
       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3.5 rounded-xl text-white shadow-lg shadow-cyan-200/50">
                   <CreditCard size={28} strokeWidth={1.5} />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-800 tracking-tight">Advance Manager</h2>
                   <p className="text-sm text-slate-500 font-medium">Track employee salary advances & deductions</p>
                </div>
             </div>
             <button 
                onClick={() => isAdding ? resetForm() : setIsAdding(true)}
                className={`group flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${isAdding ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-200'}`}
             >
                {isAdding ? <X size={18} /> : <Plus size={18} />}
                <span>{isAdding ? 'Cancel Entry' : 'New Advance'}</span>
             </button>
          </div>

          <div className="p-6 flex-1 flex flex-col overflow-hidden bg-slate-50/50">
             
             {/* New/Edit Entry Form */}
             {isAdding && (
                <div className="mb-8 bg-gradient-to-br from-white to-cyan-50 border border-cyan-100 p-6 rounded-2xl animate-in slide-in-from-top-4 fade-in duration-300 shadow-sm relative overflow-hidden ring-1 ring-cyan-200/50">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                   
                   <div className="flex items-center gap-2 mb-6 relative z-10">
                       <span className="bg-cyan-100 text-cyan-700 p-1.5 rounded-lg">
                           {editingId ? <Edit2 size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                       </span>
                       <h3 className="text-sm font-bold text-cyan-900 uppercase tracking-wider">
                           {editingId ? 'Update Advance Record' : 'Create New Request'}
                       </h3>
                   </div>
                   
                   <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 relative z-10">
                      
                      {/* Employee Selection */}
                      <div className="lg:col-span-4 space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase ml-1">Employee</label>
                         <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" size={16} />
                            <select 
                                required 
                                value={empId} 
                                onChange={e => setEmpId(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none bg-white transition-all shadow-sm appearance-none"
                            >
                                <option value="">Select Employee...</option>
                                {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <span className="border-l border-slate-300 pl-2 text-xs text-slate-400">▼</span>
                            </div>
                         </div>
                      </div>

                      {/* Amount */}
                      <div className="lg:col-span-3 space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase ml-1">Amount</label>
                         <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-cyan-600 transition-colors">৳</span>
                            <input 
                                required type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none font-bold text-slate-700 bg-white transition-all shadow-sm"
                                placeholder="0.00"
                            />
                         </div>
                      </div>

                      {/* Deduction Month */}
                      <div className="lg:col-span-3 space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase ml-1">Deduction Month</label>
                         <div className="relative group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" size={16} />
                            <input 
                                required type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none bg-white transition-all shadow-sm"
                            />
                         </div>
                      </div>

                      {/* Date */}
                      <div className="lg:col-span-2 space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase ml-1">Issue Date</label>
                         <input 
                            required type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none bg-white transition-all shadow-sm"
                         />
                      </div>

                      {/* Notes */}
                      <div className="lg:col-span-9 space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase ml-1">Notes (Optional)</label>
                         <div className="relative group">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors" size={16} />
                            <input 
                                type="text" value={notes} onChange={e => setNotes(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none bg-white transition-all shadow-sm"
                                placeholder="Reason for advance..."
                            />
                         </div>
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-3 flex items-end">
                         <button type="submit" disabled={loading} className="w-full py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-bold shadow-md shadow-slate-300 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : (editingId ? <Save size={18} /> : <Plus size={18} />)}
                            {editingId ? 'Update Record' : 'Save Record'}
                         </button>
                      </div>
                   </form>
                </div>
             )}

             {/* Stats Strip */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                     <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                         <TrendingUp size={20} />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Advances</p>
                         <p className="text-lg font-bold text-slate-800">৳{stats.totalAmount.toLocaleString()}</p>
                     </div>
                 </div>
                 <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                     <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                         <AlertCircle size={20} />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Active Entries</p>
                         <p className="text-lg font-bold text-slate-800">{stats.activeCount}</p>
                     </div>
                 </div>
             </div>

             {/* Toolbar / Filters */}
             <div className="flex flex-col lg:flex-row gap-4 mb-4 items-center">
                
                {/* Search */}
                <div className="relative flex-1 w-full lg:w-auto group">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                   <input 
                      type="text" placeholder="Search employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-300 outline-none transition-all shadow-sm"
                   />
                </div>

                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                    {/* Month Filter */}
                    <div className="relative group min-w-[160px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Calendar size={16} />
                        </div>
                        <input 
                            type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 shadow-sm transition-all text-slate-600 font-medium"
                        />
                    </div>

                    {/* Branch Filter */}
                    <div className="relative group min-w-[180px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Filter size={16} />
                        </div>
                        <select 
                            value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 shadow-sm transition-all appearance-none cursor-pointer text-slate-600 font-medium"
                        >
                            <option value="all">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                            ▼
                        </div>
                    </div>
                </div>
             </div>

             {/* Table */}
             <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 rounded-xl bg-white shadow-sm relative">
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50/90 backdrop-blur-sm text-slate-500 font-bold uppercase text-xs sticky top-0 shadow-sm z-10">
                      <tr>
                         <th className="p-4 pl-6">Employee</th>
                         <th className="p-4 text-right">Amount</th>
                         <th className="p-4 text-center">Deduction Month</th>
                         <th className="p-4 text-center">Issued Date</th>
                         <th className="p-4 w-1/3">Notes</th>
                         <th className="p-4 text-center">Status</th>
                         <th className="p-4 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredAdvances.length > 0 ? (
                         filteredAdvances.map(adv => {
                            const emp = employees.find(e => e.id === adv.employeeId);
                            const branchName = getBranchName(emp?.branch_id);
                            
                            return (
                               <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors group">
                                  <td className="p-4 pl-6">
                                     <div className="flex items-center gap-3">
                                         <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-white group-hover:border-cyan-200 group-hover:text-cyan-600 transition-colors">
                                             {emp?.name.substring(0, 2).toUpperCase() || 'NA'}
                                         </div>
                                         <div>
                                            <div className="font-bold text-slate-800">{emp?.name || adv.employeeId}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{emp?.id || 'Unknown'}</span>
                                                <span>•</span>
                                                <span>{branchName}</span>
                                            </div>
                                         </div>
                                     </div>
                                  </td>
                                  <td className="p-4 text-right">
                                      <span className="font-mono font-bold text-slate-700 text-base">৳{adv.amount.toLocaleString()}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                                          <Calendar size={12} className="text-slate-400" />
                                          {formatMonth(adv.targetMonth)}
                                      </div>
                                  </td>
                                  <td className="p-4 text-center text-xs text-slate-500 font-mono">{adv.date}</td>
                                  <td className="p-4 text-xs text-slate-500 max-w-xs truncate" title={adv.notes}>
                                      {adv.notes || <span className="text-slate-300 italic">No notes</span>}
                                  </td>
                                  <td className="p-4 text-center">
                                     {adv.status === 'ACTIVE' ? (
                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100 shadow-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                            ACTIVE
                                        </span>
                                     ) : (
                                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100 shadow-sm">
                                           <CheckCircle2 size={12} /> ADJUSTED
                                        </span>
                                     )}
                                  </td>
                                  <td className="p-4 text-right">
                                      {adv.status === 'ACTIVE' && (
                                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                  onClick={() => handleEdit(adv)}
                                                  className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded shadow-sm transition-colors"
                                                  title="Edit"
                                              >
                                                  <Edit2 size={14} />
                                              </button>
                                              <button 
                                                  onClick={() => handleDelete(adv.id)}
                                                  className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded shadow-sm transition-colors"
                                                  title="Delete"
                                              >
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                               </tr>
                            );
                         })
                      ) : (
                         <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">
                             <div className="flex flex-col items-center justify-center gap-2">
                                 <div className="bg-slate-50 p-3 rounded-full"><Search size={24} className="opacity-20" /></div>
                                 <p>No advances found matching criteria.</p>
                             </div>
                         </td></tr>
                      )}
                   </tbody>
                </table>
             </div>

          </div>
       </div>
    </div>
  );
};

export default ManageAdvances;
