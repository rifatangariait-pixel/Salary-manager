
import React, { useState, useMemo } from 'react';
import { Branch, Employee, Target } from '../types';
import { Target as TargetIcon, Save, Search, Filter, Calendar, TrendingUp, UserPlus, CheckCircle2 } from 'lucide-react';

interface ManageTargetsProps {
  branches: Branch[];
  employees: Employee[];
  targets: Target[];
  onSaveTarget: (target: Target) => void;
}

const ManageTargets: React.FC<ManageTargetsProps> = ({ branches, employees, targets, onSaveTarget }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for edits
  const [editedTargets, setEditedTargets] = useState<Record<string, { collection: number, account: number }>>({});
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const branchMatch = selectedBranchId === 'all' || emp.branch_id === selectedBranchId;
      const term = searchTerm.toLowerCase();
      const searchMatch = emp.name.toLowerCase().includes(term) || emp.id.toLowerCase().includes(term);
      return branchMatch && searchMatch;
    });
  }, [employees, selectedBranchId, searchTerm]);

  const getTarget = (empId: string) => {
    return targets.find(t => t.employeeId === empId && t.month === selectedMonth);
  };

  const handleInputChange = (empId: string, field: 'collection' | 'account', value: string) => {
    const numVal = parseFloat(value) || 0;
    setEditedTargets(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId] || { 
            collection: getTarget(empId)?.collectionTarget || 0, 
            account: getTarget(empId)?.accountTarget || 0 
        },
        [field]: numVal
      }
    }));
  };

  const handleSave = (emp: Employee) => {
    const edits = editedTargets[emp.id];
    if (!edits) return; // No changes

    const existingTarget = getTarget(emp.id);
    const newTarget: Target = {
      id: existingTarget?.id || `tgt_${emp.id}_${selectedMonth}`,
      rowIndex: existingTarget?.rowIndex,
      employeeId: emp.id,
      month: selectedMonth,
      collectionTarget: edits.collection,
      accountTarget: edits.account
    };

    onSaveTarget(newTarget);
    
    // Clear edit state for this row
    setEditedTargets(prev => {
        const newState = { ...prev };
        delete newState[emp.id];
        return newState;
    });

    // Show success feedback
    setJustSaved(emp.id);
    setTimeout(() => setJustSaved(null), 2000);
  };

  const monthName = new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col pb-6">
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-3">
                <div className="bg-rose-100 p-2.5 rounded-lg text-rose-600 shadow-sm border border-rose-200">
                    <TargetIcon size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Monthly Targets</h2>
                    <p className="text-sm text-slate-500">Set goals for <span className="font-semibold text-slate-700">{monthName}</span></p>
                </div>
            </div>

            {/* Global Month Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase mr-1">Period:</span>
                <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
                />
            </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Branch Filter */}
             <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Filter size={16} />
                </div>
                <select 
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none cursor-pointer text-slate-700 font-medium"
                >
                    <option value="all">All Branches</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-300 pl-2">
                    <span className="text-[10px] font-bold text-slate-400">BRANCH</span>
                </div>
            </div>

            {/* Search Input */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={16} />
                </div>
                <input 
                    type="text" 
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400"
                />
            </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    <tr>
                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider w-1/3">Field Officer</th>
                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">
                            <div className="flex items-center justify-end gap-1">
                                <TrendingUp size={14} /> Collection Target
                            </div>
                        </th>
                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">
                            <div className="flex items-center justify-end gap-1">
                                <UserPlus size={14} /> Account Target
                            </div>
                        </th>
                        <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center w-20">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                        const target = getTarget(emp.id);
                        const edits = editedTargets[emp.id];
                        
                        const collVal = edits ? edits.collection : (target?.collectionTarget || 0);
                        const accVal = edits ? edits.account : (target?.accountTarget || 0);
                        
                        const isDirty = !!edits;
                        const isSaved = justSaved === emp.id;

                        // Visual indicator if targets are set
                        const hasTargets = collVal > 0 || accVal > 0;

                        return (
                            <tr key={emp.id} className={`hover:bg-slate-50 transition-colors group ${isDirty ? 'bg-amber-50/30' : ''}`}>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${hasTargets ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {emp.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{emp.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <span className="font-mono bg-slate-100 px-1 rounded">{emp.id}</span>
                                                <span>•</span>
                                                {branches.find(b => b.id === emp.branch_id)?.name}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="relative inline-block w-36">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none transition-colors ${isDirty ? 'text-amber-500' : 'text-slate-400'}`}>৳</span>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={collVal === 0 ? '' : collVal}
                                            onChange={(e) => handleInputChange(emp.id, 'collection', e.target.value)}
                                            placeholder="0"
                                            className={`w-full text-right border rounded-lg pl-6 pr-3 py-2 text-sm font-mono outline-none transition-all focus:ring-2 ${
                                                isDirty 
                                                ? 'border-amber-300 bg-amber-50 focus:border-amber-500 focus:ring-amber-200' 
                                                : (collVal > 0 ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800 font-bold focus:border-emerald-500 focus:ring-emerald-200' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 focus:ring-rose-200')
                                            }`}
                                        />
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <input 
                                        type="number"
                                        min="0"
                                        value={accVal === 0 ? '' : accVal}
                                        onChange={(e) => handleInputChange(emp.id, 'account', e.target.value)}
                                        placeholder="0"
                                        className={`w-24 text-right border rounded-lg px-3 py-2 text-sm font-mono outline-none transition-all focus:ring-2 ${
                                                isDirty 
                                                ? 'border-amber-300 bg-amber-50 focus:border-amber-500 focus:ring-amber-200' 
                                                : (accVal > 0 ? 'border-blue-200 bg-blue-50/30 text-blue-800 font-bold focus:border-blue-500 focus:ring-blue-200' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 focus:ring-rose-200')
                                            }`}
                                    />
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleSave(emp)}
                                        disabled={!isDirty}
                                        title={isDirty ? "Save Changes" : isSaved ? "Saved" : "No Changes"}
                                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center w-10 h-10 mx-auto ${
                                            isSaved 
                                            ? 'bg-emerald-500 text-white scale-110 shadow-md' 
                                            : isDirty 
                                                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md hover:scale-105' 
                                                : 'bg-transparent text-slate-300 cursor-not-allowed'
                                        }`}
                                    >
                                        {isSaved ? <CheckCircle2 size={20} /> : <Save size={18} />}
                                    </button>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={4} className="p-12 text-center">
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <div className="bg-slate-50 p-4 rounded-full mb-3">
                                        <Filter size={32} className="opacity-50" />
                                    </div>
                                    <p className="font-medium text-slate-500">No employees found</p>
                                    <p className="text-xs">Try adjusting your branch or search filters</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center text-xs text-slate-500 font-medium">
            <span>Showing {filteredEmployees.length} employees</span>
            <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
                Targets Active for {monthName}
            </span>
        </div>

      </div>
    </div>
  );
};

export default ManageTargets;
