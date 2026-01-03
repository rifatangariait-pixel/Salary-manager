
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Employee, AccountOpening, User } from '../types';
import { Save, FilePlus, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download, AlertTriangle, Trash2, Edit2, ListChecks } from 'lucide-react';
import { validateAccountRow } from '../services/importService';
import * as XLSX from 'xlsx';

interface AddAccountFormProps {
  employees: Employee[];
  existingAccounts: AccountOpening[];
  onSave: (account: Omit<AccountOpening, 'id'>) => void;
  onBulkSave: (accounts: Omit<AccountOpening, 'id'>[]) => void;
  currentUser: User;
}

interface EditableRow {
  id: string;
  data: {
    accountCode: string;
    amount: string;
    term: string;
    date: string;
    employeeId: string;
  };
  errors: Record<string, string>;
  warning: string;
  isValid: boolean;
}

const AddAccountForm: React.FC<AddAccountFormProps> = ({ employees, existingAccounts, onSave, onBulkSave, currentUser }) => {
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const isNormalUser = currentUser.role === 'USER';

  // Single Form State
  const [accountCode, setAccountCode] = useState('');
  const [term, setTerm] = useState(5);
  const [collectionAmount, setCollectionAmount] = useState<number | ''>('');
  const [employeeId, setEmployeeId] = useState('');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().slice(0, 10));

  // Draft State for Manual Mode
  const [manualDrafts, setManualDrafts] = useState<EditableRow[]>([]);

  // Bulk Form State
  const [bulkRows, setBulkRows] = useState<EditableRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initialize employee ID based on user role
  useEffect(() => {
    if (isNormalUser && currentUser.employee_id) {
        setEmployeeId(currentUser.employee_id);
    } else if (employees.length > 0) {
        setEmployeeId(employees[0].id);
    }
  }, [employees, isNormalUser, currentUser]);

  // --- VALIDATION LOGIC ---
  const validateRows = (rows: EditableRow[], drafts: EditableRow[] = []) => {
      // Collect all codes to check duplicates
      // Combine current rows with existing accounts AND other drafts if checking against them
      // Here we validate the `rows` passed against the system + themselves.
      
      const batchCodes = rows.map(r => r.data.accountCode.toLowerCase().trim()).filter(Boolean);
      const duplicateBatchCodes = batchCodes.filter((item, index) => batchCodes.indexOf(item) !== index);

      return rows.map(row => {
          const result = validateAccountRow(
              {
                  accountCode: row.data.accountCode,
                  amount: row.data.amount,
                  term: row.data.term,
                  date: row.data.date,
                  employeeId: row.data.employeeId
              },
              existingAccounts,
              employees,
              new Set()
          );

          // Add batch duplicate error
          if (duplicateBatchCodes.includes(row.data.accountCode.toLowerCase().trim())) {
              result.isValid = false;
              result.errors.accountCode = "Duplicate in this batch";
          }
          
          // Check duplicates against OTHER drafts if applicable
          const isDuplicateInOther = drafts.some(d => d.id !== row.id && d.data.accountCode.toLowerCase() === row.data.accountCode.toLowerCase());
          if (isDuplicateInOther) {
              result.isValid = false;
              result.errors.accountCode = "Duplicate in draft list";
          }

          return {
              ...row,
              errors: result.errors,
              warning: result.warning || '',
              isValid: result.isValid
          };
      });
  };

  // --- MANUAL MODE HANDLERS ---

  const handleAddToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode || !collectionAmount || !employeeId) return;

    const newDraft: EditableRow = {
        id: Math.random().toString(36).substr(2, 9),
        data: {
            accountCode: accountCode.trim(),
            amount: String(collectionAmount),
            term: String(term),
            date: openingDate,
            employeeId: employeeId
        },
        errors: {},
        warning: '',
        isValid: true
    };

    // Validate strictly before adding, but allow adding with errors to fix later if needed?
    // User requested "Draft entry" - implying temporary state. We will add it and then validate.
    const updatedDrafts = [...manualDrafts, newDraft];
    const validated = validateRows(updatedDrafts, []); // Validate whole batch against itself
    setManualDrafts(validated);

    // Reset Form (keep date/emp for speed)
    setAccountCode('');
    setCollectionAmount('');
  };

  const handleManualCellChange = (id: string, field: keyof EditableRow['data'], value: string) => {
      setManualDrafts(prev => {
          const updated = prev.map(r => r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r);
          return validateRows(updated, []);
      });
  };

  const deleteManualDraft = (id: string) => {
      setManualDrafts(prev => validateRows(prev.filter(r => r.id !== id), []));
  };

  const submitManualDrafts = () => {
      const invalidCount = manualDrafts.filter(r => !r.isValid).length;
      if (invalidCount > 0) {
          alert(`Please fix ${invalidCount} errors in the draft list before submitting.`);
          return;
      }
      if (manualDrafts.length === 0) return;

      const payload = mapRowsToPayload(manualDrafts);
      if(window.confirm(`Are you sure you want to submit ${payload.length} accounts?`)) {
          onBulkSave(payload);
          setManualDrafts([]);
      }
  };

  // --- BULK MODE HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 2) {
            alert("File appears empty or missing headers");
            return;
        }

        const headers = (jsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
        const idxCode = headers.findIndex(h => h.includes('code') || h.includes('account'));
        const idxAmt = headers.findIndex(h => h.includes('amount') || h.includes('collection'));
        const idxTerm = headers.findIndex(h => h.includes('term'));
        const idxDate = headers.findIndex(h => h.includes('date'));
        const idxEmp = headers.findIndex(h => h.includes('employee'));

        if (idxCode === -1 || idxAmt === -1 || idxTerm === -1 || idxDate === -1 || idxEmp === -1) {
            alert("Missing required columns. Please use the template.");
            return;
        }

        const newRows: EditableRow[] = jsonData.slice(1).map((row: any) => {
            let dateVal = row[idxDate];
            if (typeof dateVal === 'number') {
                const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                dateVal = d.toISOString().slice(0, 10);
            }

            return {
                id: Math.random().toString(36).substr(2, 9),
                data: {
                    accountCode: row[idxCode] ? String(row[idxCode]) : '',
                    amount: row[idxAmt] ? String(row[idxAmt]) : '',
                    term: row[idxTerm] ? String(row[idxTerm]) : '',
                    date: dateVal ? String(dateVal) : '',
                    employeeId: row[idxEmp] ? String(row[idxEmp]) : ''
                },
                errors: {},
                warning: '',
                isValid: true
            };
        });

        const validatedRows = validateRows(newRows, []);
        setBulkRows(validatedRows);

    } catch (err) {
        console.error("Excel parse error", err);
        alert("Failed to parse file. Ensure it is a valid Excel or CSV.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBulkCellChange = (id: string, field: keyof EditableRow['data'], value: string) => {
      setBulkRows(prev => {
          const updated = prev.map(r => r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r);
          return validateRows(updated, []);
      });
  };

  const deleteBulkRow = (id: string) => {
      setBulkRows(prev => validateRows(prev.filter(r => r.id !== id), []));
  };

  const handleDownloadSample = () => {
    const headers = ['Account Code', 'Collection Amount', 'Term (Years)', 'Opening Date', 'Opened By (Employee ID)'];
    const empId = employees[0]?.id || 'E-101';
    
    const sampleRows = [
      ['ACC-9001', '1200', '5', new Date().toISOString().slice(0, 10), empId],
      ['ACC-9002', '5000', '10', new Date().toISOString().slice(0, 10), empId]
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "account_import_template.xlsx");
  };

  const mapRowsToPayload = (rows: EditableRow[]): Omit<AccountOpening, 'id'>[] => {
      return rows.map(r => {
          const emp = employees.find(e => e.id.toLowerCase() === r.data.employeeId.toLowerCase());
          return {
              account_code: r.data.accountCode,
              term: parseFloat(r.data.term),
              collection_amount: parseFloat(r.data.amount),
              opened_by_employee_id: emp?.id || r.data.employeeId,
              branch_id: emp?.branch_id || '',
              opening_date: r.data.date,
              is_counted: false,
              counted_month: null,
              salary_sheet_id: null
          };
      });
  };

  const handleFinalBulkSubmit = () => {
      const invalidCount = bulkRows.filter(r => !r.isValid).length;
      if (invalidCount > 0) {
          alert(`Please fix ${invalidCount} errors before submitting.`);
          return;
      }
      if (bulkRows.length === 0) return;

      const payload = mapRowsToPayload(bulkRows);
      onBulkSave(payload);
      setBulkRows([]);
      setMode('SINGLE');
      alert(`✔ ${payload.length} accounts successfully imported!`);
  };

  // --- RENDER HELPERS ---
  const renderTable = (rows: EditableRow[], onChange: any, onDelete: any) => (
    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar relative">
        <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="p-3 border-b">Account Code</th>
                    <th className="p-3 border-b">Amount</th>
                    <th className="p-3 border-b">Term</th>
                    <th className="p-3 border-b">Date</th>
                    <th className="p-3 border-b">Employee ID</th>
                    <th className="p-3 border-b w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => (
                    <tr key={row.id} className={`group transition-colors ${row.isValid ? 'hover:bg-slate-50' : 'bg-red-50 hover:bg-red-100'}`}>
                        <td className="p-2 border-r border-slate-100 relative">
                            <input 
                                type="text" 
                                value={row.data.accountCode}
                                onChange={e => onChange(row.id, 'accountCode', e.target.value)}
                                className={`w-full bg-transparent outline-none font-mono ${row.errors.accountCode ? 'text-red-600 font-bold' : 'text-slate-700'}`}
                            />
                            {row.errors.accountCode && <div className="text-[9px] text-red-500 absolute bottom-0 left-2">{row.errors.accountCode}</div>}
                        </td>
                        <td className="p-2 border-r border-slate-100 relative">
                            <input 
                                type="number" 
                                value={row.data.amount}
                                onChange={e => onChange(row.id, 'amount', e.target.value)}
                                className={`w-full bg-transparent outline-none ${row.errors.amount ? 'text-red-600 font-bold' : 'text-slate-700'}`}
                            />
                            {row.errors.amount && <div className="text-[9px] text-red-500 absolute bottom-0 left-2">{row.errors.amount}</div>}
                            {!row.errors.amount && row.warning && <div className="text-[9px] text-amber-500 absolute bottom-0 left-2 flex items-center gap-1"><AlertTriangle size={8}/> {row.warning}</div>}
                        </td>
                        <td className="p-2 border-r border-slate-100 relative">
                            <input 
                                type="number" 
                                value={row.data.term}
                                onChange={e => onChange(row.id, 'term', e.target.value)}
                                className={`w-full bg-transparent outline-none ${row.errors.term ? 'text-red-600 font-bold' : 'text-slate-700'}`}
                            />
                            {row.errors.term && <div className="text-[9px] text-red-500 absolute bottom-0 left-2">{row.errors.term}</div>}
                        </td>
                        <td className="p-2 border-r border-slate-100 relative">
                            <input 
                                type="text" 
                                value={row.data.date}
                                onChange={e => onChange(row.id, 'date', e.target.value)}
                                className={`w-full bg-transparent outline-none ${row.errors.date ? 'text-red-600 font-bold' : 'text-slate-700'}`}
                                placeholder="YYYY-MM-DD"
                            />
                            {row.errors.date && <div className="text-[9px] text-red-500 absolute bottom-0 left-2">{row.errors.date}</div>}
                        </td>
                        <td className="p-2 border-r border-slate-100 relative">
                            <input 
                                type="text" 
                                value={row.data.employeeId}
                                onChange={e => onChange(row.id, 'employeeId', e.target.value)}
                                className={`w-full bg-transparent outline-none ${row.errors.employeeId ? 'text-red-600 font-bold' : 'text-slate-700'}`}
                            />
                            {row.errors.employeeId && <div className="text-[9px] text-red-500 absolute bottom-0 left-2">{row.errors.employeeId}</div>}
                        </td>
                        <td className="p-2 text-center">
                            <button onClick={() => onDelete(row.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header with Tabs */}
        <div className="bg-slate-50 border-b border-slate-200">
            <div className="p-6 pb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        {mode === 'SINGLE' ? <FilePlus size={24} /> : <FileSpreadsheet size={24} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Add Account Opening</h2>
                        <p className="text-sm text-slate-500">
                            {mode === 'SINGLE' ? 'Draft & Submit manual entries' : 'Bulk import with validation'}
                        </p>
                    </div>
                </div>
                
                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button 
                        onClick={() => setMode('SINGLE')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'SINGLE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Manual Entry
                    </button>
                    {!isNormalUser && (
                        <button 
                            onClick={() => setMode('BULK')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'BULK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Bulk Import
                        </button>
                    )}
                </div>
            </div>
        </div>
        
        {/* MANUAL FORM */}
        {mode === 'SINGLE' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <form onSubmit={handleAddToDraft} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Account Code</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="e.g. ACC-2025"
                            value={accountCode}
                            onChange={e => setAccountCode(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Term (Years)</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={term}
                            onChange={e => setTerm(Number(e.target.value))}
                        >
                            <option value={1.5}>1.5 Years</option>
                            <option value={3}>3 Years</option>
                            <option value={5}>5 Years</option>
                            <option value={8}>8 Years</option>
                            <option value={10}>10 Years</option>
                            <option value={12}>12 Years</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Collection Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={collectionAmount}
                                onChange={e => setCollectionAmount(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Opening Date</label>
                        <input 
                            type="date" 
                            required
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={openingDate}
                            onChange={e => setOpeningDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Opened By (Employee)</label>
                        {isNormalUser ? (
                            <div className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-lg px-4 py-2 text-sm">
                                {currentUser.name} (Myself)
                            </div>
                        ) : (
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={employeeId}
                                onChange={e => setEmployeeId(e.target.value)}
                            >
                                {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.id}) - {e.designation}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                        <button 
                            type="submit"
                            className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm"
                        >
                            <ListChecks size={18} />
                            <span>Add to Draft List</span>
                        </button>
                    </div>
                </form>

                {/* Draft List Section */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Edit2 size={16} className="text-slate-400" />
                            Draft Accounts (Not Saved)
                        </h3>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                            {manualDrafts.length} Drafts Pending
                        </span>
                    </div>

                    {manualDrafts.length > 0 ? (
                        <>
                            {renderTable(manualDrafts, handleManualCellChange, deleteManualDraft)}
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="button"
                                    onClick={submitManualDrafts}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold flex items-center space-x-2 transition-colors shadow-lg active:scale-[0.98]"
                                >
                                    <Save size={18} />
                                    <span>Submit All {manualDrafts.length} Accounts</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
                            No drafts yet. Add accounts above to review them here.
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* BULK IMPORT FORM */}
        {mode === 'BULK' && !isNormalUser && (
             <div className="p-6 space-y-6 animate-in fade-in duration-300">
                {/* 1. Instructions */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Step 1: Prepare & Upload</h4>
                        <p className="text-xs text-blue-700 mb-2">
                            Download the template, fill in data, then upload.
                        </p>
                    </div>
                    <button onClick={handleDownloadSample} className="flex items-center space-x-2 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap">
                        <Download size={16} /> <span>Download Template</span>
                    </button>
                </div>

                {/* 2. Drop Zone */}
                {bulkRows.length === 0 ? (
                    <div 
                        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            if (fileInputRef.current) {
                                fileInputRef.current.files = e.dataTransfer.files;
                                handleFileUpload({ target: fileInputRef.current } as any);
                            }
                        }}
                    >
                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className={`w-10 h-10 mb-3 ${isDragOver ? 'text-indigo-500' : 'text-slate-400'}`} />
                                <p className="mb-1 text-sm text-slate-600"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-slate-400">Excel (.xlsx) or CSV</p>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* 3. Review & Edit */}
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Edit2 size={16} /> Step 2: Review Data
                            </h3>
                            <div className="flex gap-3 text-xs font-bold">
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{bulkRows.filter(r => r.isValid).length} Valid</span>
                                <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">{bulkRows.filter(r => !r.isValid).length} Errors</span>
                            </div>
                        </div>

                        {renderTable(bulkRows, handleBulkCellChange, deleteBulkRow)}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                             <button type="button" onClick={() => { setBulkRows([]); }} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
                                Cancel Import
                             </button>
                             <button type="button" onClick={handleFinalBulkSubmit} disabled={bulkRows.some(r => !r.isValid)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                <Save size={18} />
                                <span>Final Submit ({bulkRows.length} Rows)</span>
                            </button>
                        </div>
                    </div>
                )}
             </div>
        )}

      </div>
    </div>
  );
};

export default AddAccountForm;
