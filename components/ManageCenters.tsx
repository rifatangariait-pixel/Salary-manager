
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Center, Branch, Employee, CenterCollectionRecord } from '../types';
import { Building, MapPin, Plus, Edit2, Trash2, Save, X, Search, User, FileSpreadsheet, Upload, CheckCircle, AlertCircle, List, Download, Filter, FileText, Loader2 } from 'lucide-react';
import { parseCentersCSV } from '../services/importService';
import { exportCentersToCSV } from '../services/exportService';
import { downloadSinglePDF } from '../services/pdfGenerator';
import CenterListPrint from './CenterListPrint';

interface ManageCentersProps {
  centers: Center[];
  branches: Branch[];
  employees: Employee[];
  records: CenterCollectionRecord[];
  onAdd: (center: Omit<Center, 'id'>) => void;
  onEdit: (id: string, center: Partial<Center>) => void;
  onDelete: (id: string) => void;
  onBulkAdd?: (centers: Omit<Center, 'id'>[]) => void;
}

const ManageCenters: React.FC<ManageCentersProps> = ({ centers, branches, employees, records, onAdd, onEdit, onDelete, onBulkAdd }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'BULK'>('LIST');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // PDF Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Filters
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState<{
    centerCode: string;
    centerName: string;
    branchId: string;
    assignedEmployeeId: string;
    type: 'OWN' | 'OFFICE';
  }>({
    centerCode: '',
    centerName: '',
    branchId: '',
    assignedEmployeeId: '',
    type: 'OWN'
  });

  // Auto-set Type based on Code (Odd=Own, Even=Office) if not manually changed
  useEffect(() => {
    if (!editingId && formData.centerCode) {
        const code = parseInt(formData.centerCode);
        if (!isNaN(code)) {
            setFormData(prev => ({ ...prev, type: code % 2 !== 0 ? 'OWN' : 'OFFICE' }));
        }
    }
  }, [formData.centerCode, editingId]);

  // Bulk State
  const [bulkData, setBulkData] = useState<Omit<Center, 'id'>[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered Employees: ALLOW ALL EMPLOYEES TO BE ASSIGNED (Cross-branch support)
  const formEmployees = employees;

  // Available Employees for Filter (based on selected branch filter)
  const filterEmployees = useMemo(() => {
      if (filterBranchId === 'all') return employees;
      return employees.filter(e => e.branch_id === filterBranchId);
  }, [employees, filterBranchId]);

  // Validation
  const validateForm = () => {
    if (!formData.centerCode || !formData.centerName || !formData.branchId || !formData.assignedEmployeeId) {
      alert("All fields are required.");
      return false;
    }
    
    const code = parseInt(formData.centerCode);
    if (isNaN(code)) {
        alert("Center Code must be a number.");
        return false;
    }

    // Unique Code Check (within same branch)
    const exists = centers.some(c => 
        c.branchId === formData.branchId && 
        c.centerCode === code && 
        c.id !== editingId
    );

    if (exists) {
        alert("A center with this code already exists in the selected branch.");
        return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const centerData = {
        centerCode: parseInt(formData.centerCode),
        centerName: formData.centerName,
        branchId: formData.branchId,
        assignedEmployeeId: formData.assignedEmployeeId,
        type: formData.type
    };

    if (editingId) {
        onEdit(editingId, centerData);
        setEditingId(null);
    } else {
        onAdd(centerData);
        setIsAdding(false);
    }
    
    // Reset Form
    setFormData({ centerCode: '', centerName: '', branchId: '', assignedEmployeeId: '', type: 'OWN' });
  };

  const startEdit = (center: Center) => {
    setEditingId(center.id);
    setFormData({
        centerCode: center.centerCode.toString(),
        centerName: center.centerName,
        branchId: center.branchId,
        assignedEmployeeId: center.assignedEmployeeId,
        type: center.type || (center.centerCode % 2 !== 0 ? 'OWN' : 'OFFICE')
    });
    setIsAdding(true);
    setViewMode('LIST'); // Force switch to list if in bulk mode
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ centerCode: '', centerName: '', branchId: '', assignedEmployeeId: '', type: 'OWN' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseCentersCSV(content, branches, employees, centers);
        setBulkData(result.valid);
        setBulkErrors(result.errors);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const headers = ['center_code', 'center_name', 'branch', 'employee_code', 'type'];
    const branchName = branches[0]?.name || 'Branch Name';
    const empId = employees[0]?.id || 'E-001';
    
    const sampleRows = [
      ['101', 'North Market Center', branchName, empId, 'OWN'],
      ['102', 'South Bazar Point', branchName, empId, 'OFFICE']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'centers_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmBulk = () => {
    if (bulkData.length === 0 || !onBulkAdd) return;
    onBulkAdd(bulkData);
    setBulkData([]);
    setBulkErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setViewMode('LIST');
  };

  const filteredCenters = useMemo(() => {
    return centers.filter(c => {
        const term = searchTerm.toLowerCase();
        const branchName = branches.find(b => b.id === c.branchId)?.name.toLowerCase() || '';
        const empName = employees.find(e => e.id === c.assignedEmployeeId)?.name.toLowerCase() || '';
        
        // 1. Text Search
        const matchesSearch = (
            c.centerName.toLowerCase().includes(term) ||
            c.centerCode.toString().includes(term) ||
            branchName.includes(term) ||
            empName.includes(term)
        );

        // 2. Branch Filter
        const matchesBranch = filterBranchId === 'all' || c.branchId === filterBranchId;

        // 3. Employee Filter
        const matchesEmployee = filterEmployeeId === 'all' || c.assignedEmployeeId === filterEmployeeId;

        return matchesSearch && matchesBranch && matchesEmployee;
    });
  }, [centers, searchTerm, filterBranchId, filterEmployeeId, branches, employees]);

  const handleExportList = () => {
      exportCentersToCSV(filteredCenters, branches, employees, `Centers_Export_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
      setIsGeneratingPDF(true);
      // Wait for the hidden component to render (Increased time for safety)
      setTimeout(async () => {
          await downloadSinglePDF('center-list-pdf-render', `Center_List_Report_${new Date().toISOString().slice(0, 10)}`);
          setIsGeneratingPDF(false);
      }, 2500);
  };

  // Prepare filter info text for PDF header
  const pdfFilterInfo = useMemo(() => {
      const bName = filterBranchId === 'all' ? 'All Branches' : branches.find(b => b.id === filterBranchId)?.name || 'Unknown';
      const eName = filterEmployeeId === 'all' ? 'All Officers' : employees.find(e => e.id === filterEmployeeId)?.name || 'Unknown';
      return {
          branchName: bName,
          employeeName: eName,
          date: new Date().toLocaleDateString()
      };
  }, [filterBranchId, filterEmployeeId, branches, employees]);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-4 relative">
       
       {/* Hidden Print Container - Positioned off-screen to allow rendering by html2canvas but hidden from user */}
       <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
           {isGeneratingPDF && (
               <div id="center-list-pdf-render">
                   <CenterListPrint 
                       centers={filteredCenters} 
                       branches={branches} 
                       employees={employees} 
                       filterInfo={pdfFilterInfo}
                       records={records}
                   />
               </div>
           )}
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                <MapPin size={24} />
                </div>
                <div>
                <h2 className="text-lg font-bold text-slate-800">Center Management</h2>
                <p className="text-sm text-slate-500">Define and assign collection centers</p>
                </div>
            </div>
            
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <List size={16} />
                    <span>List</span>
                </button>
                {onBulkAdd && (
                    <button 
                        onClick={() => setViewMode('BULK')}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'BULK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <FileSpreadsheet size={16} />
                        <span>Bulk Import</span>
                    </button>
                )}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col overflow-hidden">
             
             {/* MODE: LIST VIEW */}
             {viewMode === 'LIST' && (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-col xl:flex-row gap-4 mb-4 justify-between xl:items-end">
                        <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                            {/* Search Bar */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search centers..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                />
                            </div>
                            
                            {/* Filters */}
                            <div className="flex gap-2">
                                <select
                                    value={filterBranchId}
                                    onChange={e => { setFilterBranchId(e.target.value); setFilterEmployeeId('all'); }}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white min-w-[140px]"
                                >
                                    <option value="all">All Branches</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterEmployeeId}
                                    onChange={e => setFilterEmployeeId(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white min-w-[140px]"
                                >
                                    <option value="all">All Employees</option>
                                    {filterEmployees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!isAdding && (
                            <div className="flex gap-2 self-end xl:self-auto">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isGeneratingPDF}
                                    className="flex items-center space-x-2 bg-slate-800 text-white border border-slate-800 px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium shadow-sm disabled:opacity-70"
                                    title="Download PDF"
                                >
                                    {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                    <span className="hidden md:inline">Export PDF</span>
                                </button>
                                <button
                                    onClick={handleExportList}
                                    className="flex items-center space-x-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                                    title="Download Filtered List"
                                >
                                    <Download size={16} />
                                    <span className="hidden md:inline">Export CSV</span>
                                </button>
                                <button 
                                    onClick={() => setIsAdding(true)}
                                    className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm"
                                >
                                    <Plus size={16} />
                                    <span>Add Center</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ADD / EDIT FORM */}
                    {isAdding && (
                        <div className="mb-6 bg-orange-50 border border-orange-100 p-6 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wide mb-4">
                                {editingId ? 'Edit Center' : 'Create New Center'}
                            </h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Center Code *</label>
                                    <input 
                                        required 
                                        type="number"
                                        placeholder="e.g. 105"
                                        value={formData.centerCode}
                                        onChange={e => setFormData({...formData, centerCode: e.target.value})}
                                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Must be unique within the branch.</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Center Name *</label>
                                    <input 
                                        required 
                                        type="text"
                                        placeholder="e.g. North Bazar Point"
                                        value={formData.centerName}
                                        onChange={e => setFormData({...formData, centerName: e.target.value})}
                                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Center Type *</label>
                                    <select 
                                        required 
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value as 'OWN' | 'OFFICE'})}
                                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                    >
                                        <option value="OWN">OWN</option>
                                        <option value="OFFICE">OFFICE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Branch *</label>
                                    <select 
                                        required 
                                        value={formData.branchId}
                                        onChange={e => setFormData({...formData, branchId: e.target.value, assignedEmployeeId: ''})} // Reset emp on branch change
                                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                    >
                                        <option value="">Select Branch...</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Assigned Field Officer *</label>
                                    <select 
                                        required 
                                        value={formData.assignedEmployeeId}
                                        onChange={e => setFormData({...formData, assignedEmployeeId: e.target.value})}
                                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                        disabled={!formData.branchId}
                                    >
                                        <option value="">{formData.branchId ? 'Select Officer...' : 'Select Branch First'}</option>
                                        {formEmployees.map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                                    <button type="button" onClick={cancelForm} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium shadow-sm flex items-center gap-2">
                                        <Save size={16} /> Save Center
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-b">Code</th>
                                    <th className="p-3 border-b">Center Name</th>
                                    <th className="p-3 border-b">Branch</th>
                                    <th className="p-3 border-b">Field Officer</th>
                                    <th className="p-3 border-b text-center">Type</th>
                                    <th className="p-3 border-b text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCenters.length > 0 ? (
                                    filteredCenters.map(center => {
                                        const branch = branches.find(b => b.id === center.branchId);
                                        const employee = employees.find(e => e.id === center.assignedEmployeeId);
                                        // Default to calculated type if explicit type is missing
                                        const type = center.type || (center.centerCode % 2 !== 0 ? 'OWN' : 'OFFICE');

                                        return (
                                            <tr key={center.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-mono font-bold text-slate-700">{center.centerCode}</td>
                                                <td className="p-3 font-medium text-slate-800">{center.centerName}</td>
                                                <td className="p-3 text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Building size={12} /> {branch?.name || 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <User size={12} /> {employee?.name || 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${type === 'OWN' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                        {type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button 
                                                            onClick={() => startEdit(center)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if(confirm(`Delete center "${center.centerName}"?`)) onDelete(center.id);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            No centers found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2 text-right text-xs text-slate-400">
                        Total Centers: {filteredCenters.length}
                    </div>
                </>
             )}

             {/* MODE: BULK IMPORT */}
             {viewMode === 'BULK' && (
                 // ... existing bulk content ...
                 <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-sm font-semibold text-orange-800 mb-2">Bulk Import Instructions</h4>
                                <p className="text-xs text-orange-700 mb-2">
                                    Upload a CSV file. Each row represents a center. 
                                    <strong> Branch</strong> and <strong>Employee ID</strong> must already exist in the system.
                                </p>
                                <p className="text-xs text-slate-500 font-mono bg-white p-2 rounded border border-orange-200">
                                    Required Headers: center_code, center_name, branch, employee_code, type (optional)
                                </p>
                            </div>
                            <button 
                                onClick={handleDownloadSample}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-md text-xs font-medium hover:bg-orange-50 transition-colors shadow-sm whitespace-nowrap ml-4"
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
                                    <p className="text-xs text-green-600">Ready to import</p>
                                </div>
                                <div className="flex-1 bg-red-50 p-4 rounded-lg border border-red-100">
                                    <div className="flex items-center text-red-700 mb-1 font-semibold">
                                        <AlertCircle size={16} className="mr-2" />
                                        {bulkErrors.length} Errors
                                    </div>
                                    <p className="text-xs text-red-600">Skipped rows (see details)</p>
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

                            {/* Preview List */}
                            {bulkData.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Preview (First 5)</h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                                <tr>
                                                    <th className="p-2 border-b">Code</th>
                                                    <th className="p-2 border-b">Center Name</th>
                                                    <th className="p-2 border-b">Branch</th>
                                                    <th className="p-2 border-b">Officer ID</th>
                                                    <th className="p-2 border-b">Type</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {bulkData.slice(0, 5).map((c, i) => {
                                                    const branchName = branches.find(b => b.id === c.branchId)?.name;
                                                    return (
                                                        <tr key={i}>
                                                            <td className="p-2 font-mono">{c.centerCode}</td>
                                                            <td className="p-2">{c.centerName}</td>
                                                            <td className="p-2">{branchName}</td>
                                                            <td className="p-2 font-mono text-slate-500">{c.assignedEmployeeId}</td>
                                                            <td className="p-2">{c.type || 'Auto'}</td>
                                                        </tr>
                                                    );
                                                })}
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
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                    <span>Import {bulkData.length} Centers</span>
                                </button>
                            </div>
                        </div>
                    )}
                 </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default ManageCenters;
