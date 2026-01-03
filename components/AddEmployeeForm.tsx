
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Branch, Employee, UserRole, CommissionType, CommissionStructure } from '../types';
import { Save, UserPlus, FileSpreadsheet, Upload, CheckCircle, AlertCircle, List, Search, Edit2, Trash2, X, Hash, Download } from 'lucide-react';
import { parseEmployeesCSV } from '../services/importService';

interface AddEmployeeFormProps {
  branches: Branch[];
  existingEmployees: Employee[];
  commissionRates: Record<string, CommissionStructure>;
  onSave: (employee: Omit<Employee, 'id'> & { id?: string }) => void;
  onBulkSave: (employees: Employee[]) => void;
  onEdit: (id: string, data: Partial<Employee>) => void;
  onDelete: (id: string) => void;
  userRole: UserRole;
}

const PREDEFINED_DESIGNATIONS = [
  "Field Officer",
  "Branch Manager",
  "IT Executive",
  "IT Head",
  "Director",
  "Finance"
];

const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({ branches, existingEmployees, commissionRates, onSave, onBulkSave, onEdit, onDelete, userRole }) => {
  const [mode, setMode] = useState<'SINGLE' | 'BULK' | 'LIST'>('SINGLE');

  // Single Mode State
  const [customId, setCustomId] = useState('');
  const [name, setName] = useState('');
  // Replaced simple designation state with Type/Custom pair
  const [designationType, setDesignationType] = useState('Field Officer');
  const [customDesignation, setCustomDesignation] = useState('');
  
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [baseSalary, setBaseSalary] = useState<number | ''>('');
  const [commissionType, setCommissionType] = useState<string>('A');

  // Bulk Mode State
  const [bulkData, setBulkData] = useState<Employee[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // List Mode State
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form specific states
  const [editDesignationType, setEditDesignationType] = useState('Field Officer');
  const [editCustomDesignation, setEditCustomDesignation] = useState('');
  
  const [editFormData, setEditFormData] = useState<{
    name: string;
    branch_id: string;
    base_salary: number;
    commission_type: string;
  }>({ name: '', branch_id: '', base_salary: 0, commission_type: 'A' });

  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'].includes(userRole);
  const canDelete = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'].includes(userRole);

  // Ensure commission type defaults to a valid one if 'A' doesn't exist
  useEffect(() => {
      const types = Object.keys(commissionRates);
      if (types.length > 0 && !commissionRates[commissionType]) {
          setCommissionType(types[0]);
      }
  }, [commissionRates]);

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Derive final designation
    const finalDesignation = designationType === 'Other' ? customDesignation.trim() : designationType;

    if (!name || !finalDesignation || !branchId || !baseSalary) {
        alert("Please fill all required fields.");
        return;
    }

    // Validate ID if provided
    if (customId && existingEmployees.some(e => e.id.toLowerCase() === customId.toLowerCase())) {
        alert(`Error: Employee ID '${customId}' already exists.`);
        return;
    }

    onSave({
      id: customId || undefined,
      name,
      designation: finalDesignation,
      branch_id: branchId,
      base_salary: Number(baseSalary),
      commission_type: commissionType
    });

    // Reset form
    setCustomId('');
    setName('');
    setDesignationType('Field Officer');
    setCustomDesignation('');
    setBaseSalary('');
    // setCommissionType('A'); // Keep last selected type
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const existingIds = existingEmployees.map(e => e.id);
        const result = parseEmployeesCSV(content, branches, existingIds);
        setBulkData(result.valid);
        setBulkErrors(result.errors);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const headers = ['ID', 'Name', 'Designation', 'Branch', 'Salary', 'Commission Type'];
    // Use branch names from props or default
    const bName1 = branches[0]?.name || 'Branch 1';
    const bName2 = branches[1]?.name || 'Branch 2';
    
    const sampleRows = [
      ['E-101', 'John Doe', 'Branch Manager', bName1, '5000', 'A'],
      ['E-102', 'Jane Smith', 'Field Officer', bName2, '3000', 'B']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmBulk = () => {
    if (bulkData.length === 0) return;
    onBulkSave(bulkData);
    setBulkData([]);
    setBulkErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMode('SINGLE');
  };

  const openEditModal = (emp: Employee) => {
    if(!canEdit) return;
    setEditingId(emp.id);
    
    // Parse designation for edit form
    const isPredefined = PREDEFINED_DESIGNATIONS.includes(emp.designation);
    setEditDesignationType(isPredefined ? emp.designation : 'Other');
    setEditCustomDesignation(isPredefined ? '' : emp.designation);

    setEditFormData({
        name: emp.name,
        branch_id: emp.branch_id,
        base_salary: emp.base_salary,
        commission_type: emp.commission_type || 'A'
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
      setIsEditModalOpen(false);
      setEditingId(null);
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
      e.preventDefault();
      
      const finalDesignation = editDesignationType === 'Other' ? editCustomDesignation.trim() : editDesignationType;
      
      if (!finalDesignation) {
          alert("Designation is required.");
          return;
      }

      if(editingId) {
        onEdit(editingId, {
            ...editFormData,
            designation: finalDesignation
        });
        closeEditModal();
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if(!canDelete) return;
      
      if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
        onDelete(id);
      }
  };

  const filteredEmployees = useMemo(() => {
    return existingEmployees.filter(emp => {
      const term = searchTerm.toLowerCase();
      const branchName = branches.find(b => b.id === emp.branch_id)?.name.toLowerCase() || '';
      return (
        emp.name.toLowerCase().includes(term) ||
        emp.designation.toLowerCase().includes(term) ||
        branchName.includes(term) ||
        emp.id.toLowerCase().includes(term)
      );
    });
  }, [existingEmployees, searchTerm, branches]);

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header with Tabs */}
        <div className="bg-slate-50 border-b border-slate-200">
            <div className="p-6 pb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        {mode === 'SINGLE' && <UserPlus size={24} />}
                        {mode === 'BULK' && <FileSpreadsheet size={24} />}
                        {mode === 'LIST' && <List size={24} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {mode === 'SINGLE' && 'Add New Employee'}
                            {mode === 'BULK' && 'Import Employees'}
                            {mode === 'LIST' && 'Employee List'}
                        </h2>
                        <p className="text-sm text-slate-500">
                           {mode === 'SINGLE' && 'Create a new employee profile'}
                           {mode === 'BULK' && 'Import employees via CSV with ID'}
                           {mode === 'LIST' && 'View and manage all registered employees'}
                        </p>
                    </div>
                </div>
                
                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button 
                        type="button"
                        onClick={() => setMode('SINGLE')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'SINGLE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Manual Entry
                    </button>
                    <button 
                        type="button"
                         onClick={() => setMode('BULK')}
                         className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'BULK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Bulk Import
                    </button>
                    <button 
                        type="button"
                         onClick={() => setMode('LIST')}
                         className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'LIST' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        View List
                    </button>
                </div>
            </div>
        </div>
        
        {/* MANUAL FORM */}
        {mode === 'SINGLE' && (
           <form onSubmit={handleSubmitSingle} className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee ID Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                        <span>Employee ID</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Optional</span>
                    </label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="Auto-generate if blank"
                            value={customId}
                            onChange={e => setCustomId(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <input 
                        type="text" 
                        required
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. John Doe"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Designation</label>
                    <div className="flex flex-col space-y-2">
                        <select 
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={designationType}
                            onChange={e => setDesignationType(e.target.value)}
                        >
                            {PREDEFINED_DESIGNATIONS.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                            <option value="Other">Other (Custom)</option>
                        </select>
                        
                        {designationType === 'Other' && (
                            <input 
                                type="text" 
                                required
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none animate-in fade-in slide-in-from-top-1"
                                placeholder="Enter custom designation title"
                                value={customDesignation}
                                onChange={e => setCustomDesignation(e.target.value)}
                            />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Branch</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={branchId}
                        onChange={e => setBranchId(e.target.value)}
                    >
                        {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Base Salary (Contract)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                        <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                        value={baseSalary}
                        onChange={e => setBaseSalary(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Commission Type</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={commissionType}
                        onChange={e => setCommissionType(e.target.value)}
                    >
                        {Object.entries(commissionRates).map(([type, ratesVal]) => {
                            const rates = ratesVal as CommissionStructure;
                            return (
                                <option key={type} value={type}>Type {type} (Own: {rates.own}%, Off: {rates.office}%)</option>
                            );
                        })}
                    </select>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm"
                >
                <Save size={18} />
                <span>Save Employee</span>
                </button>
            </div>
            </form>
        )}

        {/* BULK FORM */}
        {mode === 'BULK' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">Instructions</h4>
                            <p className="text-xs text-blue-700 mb-2">
                                Upload a CSV file containing Employee data. The <strong>Branch</strong> must match an existing branch name exactly.
                                The <strong>Employee ID</strong> must be unique.
                            </p>
                            <p className="text-xs text-slate-500 font-mono bg-white p-2 rounded border border-blue-200">
                                Required Headers: ID, Name, Designation, Branch, Salary, Commission Type
                            </p>
                        </div>
                        <button 
                            onClick={handleDownloadSample}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap ml-4"
                        >
                            <Download size={14} />
                            <span>Download Template</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-slate-400" />
                            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload CSV</span></p>
                        </div>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                    </label>
                </div>

                 {/* Import Summary */}
                {(bulkData.length > 0 || bulkErrors.length > 0) && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 bg-green-50 p-4 rounded-lg border border-green-100">
                                <div className="flex items-center text-green-700 mb-1 font-semibold">
                                    <CheckCircle size={16} className="mr-2" />
                                    {bulkData.length} Valid Records
                                </div>
                            </div>
                            <div className="flex-1 bg-red-50 p-4 rounded-lg border border-red-100">
                                <div className="flex items-center text-red-700 mb-1 font-semibold">
                                    <AlertCircle size={16} className="mr-2" />
                                    {bulkErrors.length} Errors
                                </div>
                            </div>
                        </div>

                        {/* Error Log */}
                        {bulkErrors.length > 0 && (
                            <div className="bg-white border border-red-100 rounded-lg p-3 max-h-32 overflow-y-auto text-xs text-red-600 font-mono">
                                {bulkErrors.map((err, i) => (
                                    <div key={i} className="mb-1">{err}</div>
                                ))}
                            </div>
                        )}

                        {/* Valid Preview */}
                        {bulkData.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Preview (First 5)</h4>
                                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-600 font-medium">
                                            <tr>
                                                <th className="p-2 border-b">ID</th>
                                                <th className="p-2 border-b">Name</th>
                                                <th className="p-2 border-b">Designation</th>
                                                <th className="p-2 border-b">Salary</th>
                                                <th className="p-2 border-b">Comm. Type</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bulkData.slice(0, 5).map((row, i) => (
                                                <tr key={i}>
                                                    <td className="p-2 font-mono text-slate-500">{row.id}</td>
                                                    <td className="p-2 font-medium">{row.name}</td>
                                                    <td className="p-2">{row.designation}</td>
                                                    <td className="p-2">${row.base_salary}</td>
                                                    <td className="p-2">{row.commission_type}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                             <button 
                                type="button" 
                                onClick={() => { setBulkData([]); setBulkErrors([]); }}
                                className="mr-3 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                             >
                                Clear
                             </button>
                             <button 
                                type="button"
                                onClick={handleConfirmBulk}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm"
                            >
                                <Save size={18} />
                                <span>Import Employees</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* LIST VIEW */}
        {mode === 'LIST' && (
            <div className="p-6 space-y-4 animate-in fade-in duration-300">
                 {/* Search Bar */}
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by name, designation, branch or ID..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>

                 <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="p-3 border-b w-24">ID</th>
                                <th className="p-3 border-b">Name</th>
                                <th className="p-3 border-b">Designation</th>
                                <th className="p-3 border-b">Branch</th>
                                <th className="p-3 border-b text-right">Base Salary</th>
                                <th className="p-3 border-b text-center">Type</th>
                                {(canEdit || canDelete) && <th className="p-3 border-b text-right w-24">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map(emp => {
                                    const branch = branches.find(b => b.id === emp.branch_id);
                                    return (
                                        <tr key={emp.id} id={`employee-row-${emp.id}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-mono text-xs text-slate-500">{emp.id}</td>
                                            <td className="p-3 font-medium text-slate-800">{emp.name}</td>
                                            <td className="p-3 text-slate-500">{emp.designation}</td>
                                            <td className="p-3 text-slate-500">{branch?.name || 'Unknown'}</td>
                                            <td className="p-3 text-right font-mono text-slate-700">${emp.base_salary.toLocaleString()}</td>
                                            <td className="p-3 text-center">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
                                                    {emp.commission_type || 'A'}
                                                </span>
                                            </td>
                                            {(canEdit || canDelete) && (
                                              <td className="p-3 text-right">
                                                  <div className="flex items-center justify-end space-x-2">
                                                      {canEdit && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => openEditModal(emp)}
                                                            className="p-1.5 rounded-md text-[#4CAF50] hover:bg-green-50 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                      )}
                                                      {canDelete && (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleDeleteClick(e, emp.id)}
                                                            className="p-1.5 rounded-md text-[#E53935] hover:bg-red-50 transition-colors"
                                                            title="Delete"
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
                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                        No employees found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
                 <div className="text-right text-xs text-slate-500">
                    Total: {filteredEmployees.length} employees
                 </div>
            </div>
        )}

      </div>
      
      {/* EDIT MODAL */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 transform">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800">Edit Employee</h3>
                      <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
                      {/* Note: ID is not editable in update mode usually */}
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Full Name</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={editFormData.name}
                            onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Designation</label>
                        <div className="flex flex-col space-y-2">
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                value={editDesignationType}
                                onChange={e => setEditDesignationType(e.target.value)}
                            >
                                {PREDEFINED_DESIGNATIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                                <option value="Other">Other (Custom)</option>
                            </select>
                            
                            {editDesignationType === 'Other' && (
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm animate-in fade-in slide-in-from-top-1"
                                    placeholder="Enter custom designation"
                                    value={editCustomDesignation}
                                    onChange={e => setEditCustomDesignation(e.target.value)}
                                />
                            )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Branch</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            value={editFormData.branch_id}
                            onChange={e => setEditFormData({...editFormData, branch_id: e.target.value})}
                        >
                            {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Base Salary</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={editFormData.base_salary}
                                onChange={e => setEditFormData({...editFormData, base_salary: Number(e.target.value)})}
                            />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Commission Type</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={editFormData.commission_type}
                            onChange={e => setEditFormData({...editFormData, commission_type: e.target.value})}
                        >
                            {Object.entries(commissionRates).map(([type, ratesVal]) => {
                                const rates = ratesVal as CommissionStructure;
                                return (
                                    <option key={type} value={type}>Type {type} ({rates.own}% / {rates.office}%)</option>
                                );
                            })}
                        </select>
                      </div>

                      <div className="pt-2 flex space-x-3">
                          <button 
                              type="button" 
                              onClick={closeEditModal}
                              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
                          >
                              Save Changes
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AddEmployeeForm;
