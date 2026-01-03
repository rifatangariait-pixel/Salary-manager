
import React, { useState, useRef } from 'react';
import { Branch } from '../types';
import { Plus, Edit2, Trash2, Save, X, Building, Upload, FileSpreadsheet, List, CheckCircle, AlertCircle, MapPin, Phone } from 'lucide-react';
import { parseBranchesCSV } from '../services/importService';

interface ManageBranchesProps {
  branches: Branch[];
  onAdd: (data: { name: string, address?: string, phone?: string }) => void;
  onEdit: (id: string, data: { name: string, address?: string, phone?: string }) => void;
  onDelete: (id: string) => void;
  onBulkAdd: (branches: { name: string, address?: string, phone?: string }[]) => void;
}

const ManageBranches: React.FC<ManageBranchesProps> = ({ branches, onAdd, onEdit, onDelete, onBulkAdd }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'BULK'>('LIST');
  const [isAdding, setIsAdding] = useState(false);
  
  // Add Form State
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Bulk State
  const [bulkData, setBulkData] = useState<{ name: string, address?: string, phone?: string }[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd({ name: newName, address: newAddress, phone: newPhone });
    setNewName('');
    setNewAddress('');
    setNewPhone('');
    setIsAdding(false);
  };

  const startEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setEditName(branch.name);
    setEditAddress(branch.address || '');
    setEditPhone(branch.phone || '');
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onEdit(editingId, { name: editName, address: editAddress, phone: editPhone });
      setEditingId(null);
      setEditName('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseBranchesCSV(content);
        setBulkData(result.valid);
        setBulkErrors(result.errors);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmBulk = () => {
    if (bulkData.length === 0) return;
    onBulkAdd(bulkData);
    setBulkData([]);
    setBulkErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setViewMode('LIST');
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Building size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manage Branches</h2>
              <p className="text-sm text-slate-500">Add, rename, or remove office branches</p>
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
              <button 
                    onClick={() => setViewMode('BULK')}
                    className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'BULK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                  <FileSpreadsheet size={16} />
                  <span>Bulk Import</span>
              </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {viewMode === 'LIST' && (
            <>
              <div className="flex justify-end mb-4">
                 <button 
                  onClick={() => setIsAdding(true)}
                  disabled={isAdding}
                  className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add Branch</span>
                </button>
              </div>

              {/* Add Form */}
              {isAdding && (
                <form onSubmit={handleAddSubmit} className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-emerald-700 uppercase mb-1">Branch Name *</label>
                      <input 
                        autoFocus
                        required
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full border border-emerald-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. Miami Branch"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-emerald-700 uppercase mb-1">Address</label>
                      <input 
                        type="text" 
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        className="w-full border border-emerald-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. 123 Main St"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-emerald-700 uppercase mb-1">Phone</label>
                      <input 
                        type="text" 
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full border border-emerald-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="e.g. +1 555-0000"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded hover:text-slate-800 hover:bg-slate-50 text-sm">
                      Cancel
                    </button>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm flex items-center gap-2">
                      <Save size={16} /> Save Branch
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 gap-3">
                {branches.map(branch => (
                  <div key={branch.id} className="group flex items-start justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all">
                    
                    {editingId === branch.id ? (
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input 
                          autoFocus
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-blue-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="Name"
                        />
                         <input 
                          type="text" 
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="border border-blue-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="Address"
                        />
                         <div className="flex gap-2">
                           <input 
                            type="text" 
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="flex-1 border border-blue-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Phone"
                          />
                          <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1.5 rounded"><Save size={16} /></button>
                          <button onClick={cancelEdit} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded"><X size={16} /></button>
                         </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                            {branch.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                             <h4 className="font-semibold text-slate-800">{branch.name}</h4>
                             <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                                {branch.address && (
                                    <div className="flex items-center text-xs text-slate-500">
                                        <MapPin size={12} className="mr-1" /> {branch.address}
                                    </div>
                                )}
                                {branch.phone && (
                                    <div className="flex items-center text-xs text-slate-500">
                                        <Phone size={12} className="mr-1" /> {branch.phone}
                                    </div>
                                )}
                             </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEdit(branch)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm(`Are you sure you want to delete "${branch.name}"? This might affect existing employee records.`)) {
                                onDelete(branch.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {branches.length === 0 && (
                  <div className="text-center py-10 text-slate-400 italic border-2 border-dashed border-slate-200 rounded-lg">
                    No branches found. Add one to get started.
                  </div>
                )}
              </div>
            </>
          )}

          {viewMode === 'BULK' && (
             <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-emerald-800 mb-2">Bulk Import Instructions</h4>
                    <p className="text-xs text-emerald-700 mb-2">
                        Upload a CSV file with columns: <strong>Name, Address, Phone</strong>.
                    </p>
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
                                    {bulkData.length} Valid Branches
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

                        {/* Preview List */}
                        {bulkData.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Preview</h4>
                                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                                  <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 sticky top-0">
                                      <tr>
                                        <th className="p-2 font-medium">Name</th>
                                        <th className="p-2 font-medium">Address</th>
                                        <th className="p-2 font-medium">Phone</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {bulkData.map((b, i) => (
                                        <tr key={i}>
                                          <td className="p-2">{b.name}</td>
                                          <td className="p-2 text-slate-500 text-xs">{b.address || '-'}</td>
                                          <td className="p-2 text-slate-500 text-xs">{b.phone || '-'}</td>
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
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm"
                            >
                                <Save size={18} />
                                <span>Import Branches</span>
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

export default ManageBranches;
