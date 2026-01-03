
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { SalaryRow, SalaryEntry, AccountOpening, CommissionStructure } from '../types';
import { recalculateEntry } from '../services/logic';
import { validateAccount } from '../services/accountService';
import { calculateBonus } from '../services/salaryCalculation';
import { Lock, ScanBarcode, CheckCircle2, FileText, Download, Loader2, Coins, Search, Plus, X, User } from 'lucide-react';
import SalarySlip from './SalarySlip';
import { downloadSinglePDF, createPDFBlob, saveZip } from '../services/pdfGenerator';

interface SalaryTableProps {
  rows: SalaryRow[];
  accounts: AccountOpening[];
  commissionRates: Record<string, CommissionStructure>;
  onUpdateRow: (updatedEntry: SalaryEntry) => void;
  onAccountScanned: (code: string) => void;
  readOnly?: boolean;
  month: string;
}

const SalaryTableRow: React.FC<{
  row: SalaryRow;
  accounts: AccountOpening[];
  commissionRates: Record<string, CommissionStructure>;
  onUpdateRow: (updatedEntry: SalaryEntry) => void;
  onAccountScanned: (code: string) => void;
  readOnly: boolean;
  month: string;
  onGenerateSlip: (row: SalaryRow) => void;
}> = ({ row, accounts, commissionRates, onUpdateRow, onAccountScanned, readOnly, month, onGenerateSlip }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successField, setSuccessField] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, 
    field: keyof SalaryEntry
  ) => {
    if (readOnly) return;
    
    // Check if it's a number field or the string-based commission_type
    let value: string | number = e.target.value;
    if (field !== 'commission_type') {
       value = parseFloat(value as string) || 0;
    }
    
    const updatedEntry: SalaryEntry = {
      ...row,
      [field]: value
    };

    // Calculate with employee's commission type (prefer updated entry type, else fallback)
    const commTypeForCalc = (field === 'commission_type' ? (value as string) : row.commission_type) as string;

    const recalculate = recalculateEntry(
        updatedEntry, 
        row.employee.base_salary, 
        commissionRates,
        commTypeForCalc || row.employee.commission_type || 'A'
    );
    onUpdateRow(recalculate);
  }, [row, onUpdateRow, readOnly, commissionRates]);

  const handleCodeBlur = () => {
    if (!code.trim() || readOnly) return;

    const validation = validateAccount(code, row.employee.id, row.branch.id, month, accounts);

    if (!validation.ok) {
      setError(validation.error || 'Invalid account');
      setCode('');
      return;
    }

    if (validation.account) {
      onAccountScanned(validation.account.account_code);
      const bonusAmount = calculateBonus(validation.account.term, validation.account.collection_amount);
      let field: keyof SalaryEntry | null = null;

      if (bonusAmount > 0) {
        switch (validation.account.term) {
          case 1.5: field = 'book_1_5'; break;
          case 3: field = 'book_3'; break;
          case 5: field = 'book_5'; break;
          case 8: field = 'book_8'; break;
          case 10: field = 'book_10'; break;
          case 12: field = 'book_12'; break;
          default: field = 'book_no_bonus'; break;
        }
      } else {
        field = 'book_no_bonus';
      }

      if (field) {
        const newVal = (row[field] as number) + 1;
        const updatedEntry = { ...row, [field]: newVal };
        // Recalculate with existing commission type
        const recalculated = recalculateEntry(
            updatedEntry, 
            row.employee.base_salary, 
            commissionRates,
            row.commission_type || row.employee.commission_type || 'A'
        );
        onUpdateRow(recalculated);
        
        setSuccessField(field);
        setTimeout(() => setSuccessField(null), 2000);
        setError(null);
      }
    }
    
    setCode('');
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // UI STYLES
  const baseInputClass = "w-full py-2 px-2 text-sm text-center font-medium outline-none transition-all rounded-md";
  const editableInputClass = `${baseInputClass} bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm text-slate-800`;
  const readOnlyInputClass = `${baseInputClass} bg-[#E5E7EB] border border-[#E5E7EB] text-slate-500 cursor-not-allowed select-none`;
  const opokormoInputClass = `${editableInputClass} border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-100 font-bold`;

  const countBox = (field: string) => `
    flex items-center justify-center h-9 text-xs font-bold rounded-md border
    ${successField === field 
      ? 'bg-green-100 text-green-700 border-green-300 scale-110 transition-transform shadow-md' 
      : 'bg-white text-slate-600 border-slate-200'}
  `;

  const rowClass = "border-b border-[#E5E7EB] hover:bg-blue-50 transition-colors group";

  // Commission Rates for Display
  const commType = row.commission_type || row.employee.commission_type || 'A';
  const rates = commissionRates[commType] || { own: 0, office: 0 };

  return (
    <tr className={rowClass}>
      {/* Employee Info - Sticky Left */}
      <td className="p-4 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] min-w-[220px]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
               <span className="font-bold text-slate-800 text-base">{row.employee.name}</span>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">{row.employee.id}</span>
                 <span className="text-xs text-slate-500">{row.employee.designation}</span>
               </div>
               
               {/* EDITABLE COMMISSION TYPE */}
               <div className="mt-1.5 flex items-center gap-1.5">
                   {readOnly ? (
                       <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold bg-blue-50 text-blue-700 border-blue-200`}>
                          Type {commType}
                       </span>
                   ) : (
                       <select 
                          className="text-[10px] font-bold border border-slate-300 rounded py-0.5 px-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                          value={commType}
                          onChange={(e) => handleInputChange(e, 'commission_type')}
                       >
                          {Object.keys(commissionRates).map(type => (
                              <option key={type} value={type}>Type {type}</option>
                          ))}
                       </select>
                   )}
                   <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                      (Own:{rates.own}%/Off:{rates.office}%)
                   </span>
               </div>
            </div>
            <button 
              onClick={() => onGenerateSlip(row)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Generate Slip"
            >
              <FileText size={18} />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Basic Pay</span>
            <input 
              disabled={readOnly}
              type="number" 
              className="w-24 py-1 px-2 text-sm font-bold text-right border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
              value={row.basic_salary || 0} 
              onChange={(e) => handleInputChange(e, 'basic_salary')} 
            />
          </div>
        </div>
      </td>

      {/* --- GROUP: SOMITY & CENTER --- */}
      <td className="p-3 bg-[#F1F5F9] border-r border-slate-200/50">
        <input readOnly type="number" className={readOnlyInputClass} value={row.own_somity_count || 0} placeholder="-" />
      </td>
      <td className="p-3 bg-[#F1F5F9] border-r border-slate-200/50">
        <input readOnly type="number" className={readOnlyInputClass} value={row.own_somity_collection || 0} placeholder="-" />
      </td>
      
      <td className="p-3 bg-[#F1F5F9] border-r border-slate-200/50">
        <input readOnly type="number" className={readOnlyInputClass} value={row.office_somity_count || 0} placeholder="-" />
      </td>
      <td className="p-3 bg-[#F1F5F9] border-r border-slate-200/50">
        <input readOnly type="number" className={readOnlyInputClass} value={row.office_somity_collection || 0} placeholder="-" />
      </td>

      <td className="p-3 bg-[#fffbeb] border-r border-yellow-100">
        <input disabled={readOnly} type="number" className={editableInputClass} value={row.center_count || ''} onChange={(e) => handleInputChange(e, 'center_count')} placeholder="-" />
      </td>
      <td className="p-3 bg-[#fffbeb] border-r border-slate-200">
        <input disabled={readOnly} type="number" className={editableInputClass} value={row.center_collection || ''} onChange={(e) => handleInputChange(e, 'center_collection')} placeholder="-" />
      </td>

      {/* --- SCANNER --- */}
      <td className="p-3 bg-white border-r border-slate-200 min-w-[160px]">
        <div className="relative group/scan">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
             <ScanBarcode size={18} />
          </div>
          <input 
            disabled={readOnly}
            type="text" 
            autoComplete="off"
            className={`w-full pl-10 pr-3 py-2 text-sm border rounded-md outline-none transition-all font-mono shadow-sm
              ${error 
                ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-200' 
                : 'border-slate-300 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            value={code} 
            onChange={(e) => { setCode(e.target.value); setError(null); }}
            onBlur={handleCodeBlur}
            onKeyDown={handleCodeKeyDown}
            placeholder="Scan Code" 
          />
        </div>
        {error && (
          <div className="absolute mt-1 bg-red-600 text-white text-[10px] py-1 px-2 rounded shadow z-20">
             {error}
          </div>
        )}
      </td>

      {/* --- GROUP: COMMISSIONABLE ITEMS --- */}
      <td className="p-3 bg-[#F8FAFC]"><div className={countBox('book_1_5')}>{row.book_1_5 || '-'}</div></td>
      <td className="p-3 bg-[#F8FAFC]"><div className={countBox('book_3')}>{row.book_3 || '-'}</div></td>
      <td className="p-3 bg-[#F8FAFC]"><div className={countBox('book_5')}>{row.book_5 || '-'}</div></td>
      <td className="p-3 bg-[#F8FAFC]"><div className={countBox('book_8')}>{row.book_8 || '-'}</div></td>
      <td className="p-3 bg-[#F8FAFC]"><div className={countBox('book_10')}>{row.book_10 || '-'}</div></td>
      <td className="p-3 bg-[#F8FAFC]"><div className={countBox('book_12')}>{row.book_12 || '-'}</div></td>
      
      <td className="p-3 bg-[#F8FAFC] border-r border-slate-200">
        <input disabled={readOnly} type="number" className={editableInputClass} value={row.book_no_bonus || ''} onChange={(e) => handleInputChange(e, 'book_no_bonus')} placeholder="-" />
      </td>

      {/* --- DEDUCTIONS --- */}
      <td className="p-3"><input disabled={readOnly} type="number" className={editableInputClass} value={row.deduction_cash_advance || ''} onChange={(e) => handleInputChange(e, 'deduction_cash_advance')} placeholder="-" /></td>
      
      <td className="p-3">
        <div className="relative">
          <input disabled={readOnly} type="number" className={editableInputClass} value={row.input_late_hours || ''} onChange={(e) => handleInputChange(e, 'input_late_hours')} placeholder="Hrs" />
          {row.deduction_late > 0 && <span className="absolute -bottom-4 left-0 w-full text-center text-[9px] text-red-500 font-bold">-${row.deduction_late.toFixed(0)}</span>}
        </div>
      </td>
      
      <td className="p-3">
         <div className="relative">
          <input disabled={readOnly} type="number" className={editableInputClass} value={row.input_absent_days || ''} onChange={(e) => handleInputChange(e, 'input_absent_days')} placeholder="Day" />
          {row.deduction_abs > 0 && <span className="absolute -bottom-4 left-0 w-full text-center text-[9px] text-red-500 font-bold">-${row.deduction_abs.toFixed(0)}</span>}
         </div>
      </td>
      
      <td className="p-3"><input disabled={readOnly} type="number" className={opokormoInputClass} value={row.misconductDeduction || ''} onChange={(e) => handleInputChange(e, 'misconductDeduction')} placeholder="0" /></td>
      
      <td className="p-3"><input disabled={readOnly} type="number" className={editableInputClass} value={row.deduction_unlawful || ''} onChange={(e) => handleInputChange(e, 'deduction_unlawful')} placeholder="-" /></td>
      <td className="p-3"><input disabled={readOnly} type="number" className={editableInputClass} value={row.deduction_tours || ''} onChange={(e) => handleInputChange(e, 'deduction_tours')} placeholder="-" /></td>
      <td className="p-3 border-r border-slate-200"><input disabled={readOnly} type="number" className={editableInputClass} value={row.deduction_others || ''} onChange={(e) => handleInputChange(e, 'deduction_others')} placeholder="-" /></td>

      {/* --- SUMMARY --- */}
      <td className="p-4 bg-amber-50 border-r border-amber-100">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Books:</span>
            <span className="font-bold text-slate-900">{row.total_books}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Coll:</span>
            <span className="font-bold text-slate-900">${row.total_collection}</span>
          </div>
        </div>
      </td>

      {/* --- PAYOUT --- */}
      <td className="p-4 bg-emerald-50 min-w-[140px]">
        <div className="space-y-1 text-right">
           <div className="text-[10px] text-emerald-600 font-medium">
             +${(row.commission + row.bonus).toFixed(0)} Comm
           </div>
           {/* INCENTIVE DISPLAY */}
           {(row.manager_convenience || 0) > 0 && (
               <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded inline-block">
                 +${row.manager_convenience.toFixed(0)} Inc
               </div>
           )}
           <div className="text-[10px] text-red-500 font-medium">
             -${row.total_deductions.toFixed(0)} Ded
           </div>
           <div className="pt-2 border-t border-emerald-200 mt-1">
             <span className="text-lg font-bold text-emerald-700 block">${row.final_salary.toFixed(0)}</span>
           </div>
        </div>
      </td>
    </tr>
  );
};

const SalaryTable: React.FC<SalaryTableProps> = ({ rows, accounts, commissionRates, onUpdateRow, onAccountScanned, readOnly = false, month }) => {
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [hiddenSlipData, setHiddenSlipData] = useState<SalaryRow | null>(null);

  // Center Entry Modal State
  const [isCenterModalOpen, setIsCenterModalOpen] = useState(false);
  const [centerSearchTerm, setCenterSearchTerm] = useState('');
  const [centerAmount, setCenterAmount] = useState('');
  const [centerEntrySuccess, setCenterEntrySuccess] = useState<string | null>(null);
  const centerInputRef = useRef<HTMLInputElement>(null);
  const centerAmountRef = useRef<HTMLInputElement>(null);

  const handleGenerateSlip = async (row: SalaryRow) => {
    setHiddenSlipData(row);
    setTimeout(async () => {
       await downloadSinglePDF('hidden-salary-slip', `Salary_Slip_${row.employee.name.replace(/\s+/g, '_')}_${month}`);
       setHiddenSlipData(null);
    }, 150);
  };

  const handleGenerateAllSlips = async () => {
    if (rows.length === 0) return;
    setIsBulkGenerating(true);
    const blobs: { name: string; blob: Blob }[] = [];
    for (const row of rows) {
      setHiddenSlipData(row);
      await new Promise(resolve => setTimeout(resolve, 100));
      const blob = await createPDFBlob('hidden-salary-slip');
      if (blob) {
        const safeName = `${row.employee.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_slip.pdf`;
        blobs.push({ name: safeName, blob });
      }
    }
    if (blobs.length > 0) {
      await saveZip(blobs, `Salary_Slips_${month}`);
    } else {
      alert("Failed to generate slips. Please try again.");
    }
    setHiddenSlipData(null);
    setIsBulkGenerating(false);
  };

  const foundEmployeeRow = React.useMemo(() => {
    if (!centerSearchTerm.trim()) return null;
    const term = centerSearchTerm.trim().toLowerCase();
    return rows.find(r => r.employee.id.toLowerCase() === term);
  }, [centerSearchTerm, rows]);

  const handleCenterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundEmployeeRow || !centerAmount) return;
    const amount = parseFloat(centerAmount);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }
    const updatedEntry: SalaryEntry = {
        ...foundEmployeeRow,
        center_count: (foundEmployeeRow.center_count || 0) + 1,
        center_collection: (foundEmployeeRow.center_collection || 0) + amount
    };
    
    // Recalculate logic including commission
    const recalculated = recalculateEntry(
        updatedEntry, 
        foundEmployeeRow.employee.base_salary,
        commissionRates,
        foundEmployeeRow.commission_type || foundEmployeeRow.employee.commission_type || 'A'
    );
    
    onUpdateRow(recalculated);
    setCenterEntrySuccess(`Added ${amount} to ${foundEmployeeRow.employee.name}`);
    setCenterAmount('');
    setCenterSearchTerm('');
    if (centerInputRef.current) centerInputRef.current.focus();
    setTimeout(() => setCenterEntrySuccess(null), 3000);
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">No employees found for this sheet.</p>
        <p className="text-sm text-slate-400 mt-1">Add employees to the selected branch to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC] rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full relative p-4">
      
      {/* Hidden Slip Render Container */}
      <div className="fixed top-0 left-0" style={{ zIndex: -1000, visibility: 'hidden' }}>
         {hiddenSlipData && (
            <div id="hidden-salary-slip" style={{ visibility: 'visible' }}>
               <SalarySlip row={hiddenSlipData} month={month} accounts={accounts} commissionRates={commissionRates} />
            </div>
         )}
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-3 flex justify-between items-center rounded-t-lg mb-4 shadow-sm">
         <div className="px-2 flex items-center space-x-3">
            {readOnly && (
                <div className="text-xs font-medium text-amber-700 flex items-center bg-amber-50 px-2 py-1 rounded">
                <Lock size={12} className="mr-1.5" />
                <span>Read-Only</span>
                </div>
            )}
            <button 
                onClick={() => { setIsCenterModalOpen(true); setTimeout(() => centerInputRef.current?.focus(), 100); }}
                className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-yellow-200 transition-colors border border-yellow-200"
            >
                <Coins size={14} />
                <span>Center Entry</span>
            </button>
         </div>

         <button 
            onClick={handleGenerateAllSlips}
            disabled={isBulkGenerating}
            className="flex items-center space-x-2 bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-slate-900 transition-colors disabled:opacity-70"
         >
            {isBulkGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Download ZIP</span>
         </button>
      </div>
      
      {/* Modal ... */}
      {isCenterModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 animate-in fade-in duration-200">
            <div className="bg-white w-96 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-slate-900/5">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center space-x-2">
                        <Coins size={20} className="text-yellow-100" />
                        <h3 className="font-bold">Center Collection Entry</h3>
                    </div>
                    <button onClick={() => setIsCenterModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleCenterSubmit} className="p-6 space-y-4">
                    {centerEntrySuccess && (
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-1">
                            <CheckCircle2 size={16} className="mr-2" />
                            {centerEntrySuccess}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee ID Code</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                ref={centerInputRef}
                                type="text"
                                value={centerSearchTerm}
                                onChange={(e) => setCenterSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-yellow-500 focus:ring-0 outline-none font-mono text-sm uppercase"
                                placeholder="Enter ID (e.g. E-101)"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className={`p-4 rounded-lg border transition-all ${foundEmployeeRow ? 'bg-indigo-50 border-indigo-100 opacity-100' : 'bg-slate-50 border-slate-100 opacity-50 grayscale'}`}>
                        {foundEmployeeRow ? (
                            <div className="flex items-start space-x-3">
                                <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{foundEmployeeRow.employee.name}</p>
                                    <p className="text-xs text-slate-500">{foundEmployeeRow.employee.designation}</p>
                                    <div className="mt-2 flex gap-3 text-xs">
                                        <div className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                                            Count: <span className="font-bold text-indigo-600">{foundEmployeeRow.center_count || 0}</span>
                                        </div>
                                        <div className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                                            Total: <span className="font-bold text-indigo-600">${foundEmployeeRow.center_collection || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-xs text-slate-400 py-2">
                                Employee not found
                            </div>
                        )}
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Collection Amount</label>
                         <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                             <input 
                                ref={centerAmountRef}
                                type="number"
                                min="0"
                                disabled={!foundEmployeeRow}
                                value={centerAmount}
                                onChange={(e) => setCenterAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-yellow-500 focus:ring-0 outline-none font-bold text-slate-800 disabled:bg-slate-100"
                                placeholder="0.00"
                             />
                         </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={!foundEmployeeRow || !centerAmount}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2.5 rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center space-x-2"
                    >
                        <Plus size={18} />
                        <span>Add Collection</span>
                    </button>
                </form>
            </div>
        </div>
      )}
      
      {/* MAIN TABLE AREA */}
      <div className="overflow-x-auto custom-scrollbar flex-1 bg-white rounded-lg shadow-inner border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            {/* Top Level Headers with Group Backgrounds */}
            <tr className="text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="p-4 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-4px_rgba(0,0,0,0.1)] min-w-[200px]">Employee</th>
              
              {/* Somity & Center Group - #F1F5F9 */}
              <th className="p-3 text-center border-r border-slate-200 bg-[#F1F5F9]" colSpan={6}>Somity & Center Collection</th>
              
              {/* Scan - White */}
              <th className="p-3 bg-white border-r border-slate-200"></th>

              {/* Books Group - #F8FAFC */}
              <th className="p-3 text-center border-r border-slate-200 bg-[#F8FAFC]" colSpan={8}>Commissionable Items (Books)</th>
              
              {/* Deductions Group - White/Light Red */}
              <th className="p-3 text-center border-r border-slate-200 bg-red-50/20" colSpan={7}>Deductions</th>
              
              <th className="p-3 text-center border-r border-slate-200 bg-amber-50 min-w-[100px]">Summary</th>
              <th className="p-3 text-center bg-emerald-50 min-w-[140px]">Payout</th>
            </tr>
            
            {/* Sub Headers with Group Backgrounds */}
            <tr className="text-[11px] font-semibold text-slate-500 border-b border-slate-200">
              <th className="p-3 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-4px_rgba(0,0,0,0.1)]">Details & Contract</th>
              
              {/* Somity - #F1F5F9 */}
              <th className="p-3 text-center min-w-[70px] bg-[#F1F5F9]">Own #</th>
              <th className="p-3 text-center min-w-[90px] border-r border-slate-200 bg-[#F1F5F9]">Own $</th>
              <th className="p-3 text-center min-w-[70px] bg-[#F1F5F9]">Off #</th>
              <th className="p-3 text-center min-w-[90px] border-r border-slate-200 bg-[#F1F5F9]">Off $</th>

              {/* Center - Highlighted */}
              <th className="p-3 text-center min-w-[70px] bg-[#fffbeb] text-yellow-800">Center #</th>
              <th className="p-3 text-center min-w-[90px] border-r border-slate-200 bg-[#fffbeb] text-yellow-800">Center $</th>

              {/* Scanner */}
              <th className="p-3 text-left min-w-[160px] bg-white border-r border-slate-200 pl-4">
                 Scan Account Code
              </th>

              {/* Books - #F8FAFC */}
              <th className="p-3 text-center min-w-[50px] bg-[#F8FAFC]">1.5</th>
              <th className="p-3 text-center min-w-[50px] bg-[#F8FAFC]">3</th>
              <th className="p-3 text-center min-w-[50px] bg-[#F8FAFC]">5</th>
              <th className="p-3 text-center min-w-[50px] bg-[#F8FAFC]">8</th>
              <th className="p-3 text-center min-w-[50px] bg-[#F8FAFC]">10</th>
              <th className="p-3 text-center min-w-[50px] bg-[#F8FAFC]">12</th>
              
              <th className="p-3 text-center min-w-[60px] border-r border-slate-200 bg-[#F8FAFC]">No Bns</th>

              {/* Deductions */}
              <th className="p-3 text-center min-w-[70px] bg-white">Adv.</th>
              <th className="p-3 text-center min-w-[70px] bg-white">Late</th>
              <th className="p-3 text-center min-w-[70px] bg-white">Abs</th>
              <th className="p-3 text-center min-w-[70px] bg-red-50 text-red-700">Opk.</th>
              <th className="p-3 text-center min-w-[70px] bg-white">Unlaw</th>
              <th className="p-3 text-center min-w-[70px] bg-white">Tour</th>
              <th className="p-3 text-center min-w-[70px] border-r border-slate-200 bg-white">Other</th>

              <th className="p-3 text-center bg-amber-50">Totals</th>
              <th className="p-3 text-center bg-emerald-50">Calculated</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row) => (
              <SalaryTableRow 
                key={row.employee_id} 
                row={row} 
                accounts={accounts}
                commissionRates={commissionRates}
                onUpdateRow={onUpdateRow} 
                onAccountScanned={onAccountScanned}
                readOnly={readOnly}
                month={month}
                onGenerateSlip={handleGenerateSlip}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalaryTable;
