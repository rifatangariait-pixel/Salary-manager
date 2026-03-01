
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Employee, AccountOpening, User, Center, Branch } from '../types';
import { Save, FilePlus, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download, Trash2, Edit2, ListChecks, User as UserIcon, Calendar, MapPin, Hash, Phone, Users, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { validateAccountRow } from '../services/importService';
import * as XLSX from 'xlsx';

interface AddAccountFormProps {
  employees: Employee[];
  existingAccounts: AccountOpening[];
  centers: Center[];
  branches: Branch[];
  onSave: (account: Omit<AccountOpening, 'id'>) => void;
  onBulkSave: (accounts: Omit<AccountOpening, 'id'>[]) => Promise<void>;
  onAddCenter: (center: Omit<Center, 'id'>) => Promise<void>;
  currentUser: User;
}

// Initial state for form fields
const INITIAL_FORM_STATE = {
    account_code: '',
    center_code: '' as unknown as number,
    branch_id: '',
    opening_date: new Date().toISOString().slice(0, 10),
    term: 5,
    collection_amount: '' as unknown as number,
    opened_by_employee_id: '',
    customer_name: '',
    father_husband_name: '',
    gender: 'MALE' as const,
    dob: '',
    nid: '',
    mobile: '',
    address: '',
    nominee_name: '',
    nominee_relation: '',
    agent_name: ''
};

const AddAccountForm: React.FC<AddAccountFormProps> = ({ employees, existingAccounts, centers, branches, onSave, onBulkSave, onAddCenter, currentUser }) => {
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const isNormalUser = currentUser.role === 'USER';
  const [branchFilter, setBranchFilter] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [drafts, setDrafts] = useState<Omit<AccountOpening, 'id'>[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter employees based on branch filter
  const filteredEmployees = useMemo(() => {
      if (!branchFilter) return employees;
      return employees.filter(e => e.branch_id === branchFilter);
  }, [employees, branchFilter]);

  // Initialize employee ID & Branch based on user role
  useEffect(() => {
    if (isNormalUser && currentUser.employee_id) {
        const emp = employees.find(e => e.id === currentUser.employee_id);
        setFormData(prev => ({
            ...prev,
            opened_by_employee_id: currentUser.employee_id || '',
            branch_id: emp?.branch_id || ''
        }));
    } else if (employees.length > 0 && !formData.opened_by_employee_id) {
        // Default to first employee and their branch
        setFormData(prev => ({
            ...prev,
            opened_by_employee_id: employees[0].id,
            branch_id: employees[0].branch_id
        }));
    }
  }, [employees, isNormalUser, currentUser]);

  // Update selected employee when filter changes
  useEffect(() => {
      if (!isNormalUser && branchFilter && filteredEmployees.length > 0) {
          const currentEmp = filteredEmployees.find(e => e.id === formData.opened_by_employee_id);
          if (!currentEmp) {
              const firstEmp = filteredEmployees[0];
              setFormData(prev => ({
                  ...prev,
                  opened_by_employee_id: firstEmp.id,
                  branch_id: firstEmp.branch_id,
                  center_code: '' as unknown as number
              }));
          }
      }
  }, [branchFilter, filteredEmployees, isNormalUser]);

  // Derived Data
  const availableCenters = useMemo(() => {
      if (!formData.branch_id) return [];
      return centers.filter(c => c.branchId === formData.branch_id);
  }, [formData.branch_id, centers]);

  const selectedCenterDetails = useMemo(() => {
      const code = Number(formData.center_code);
      return availableCenters.find(c => c.centerCode === code);
  }, [formData.center_code, availableCenters]);

  const selectedBranchName = useMemo(() => {
      const b = branches.find(b => b.id === formData.branch_id);
      return b ? b.name : 'Unknown Branch';
  }, [formData.branch_id, branches]);

  // Handlers
  const handleInputChange = (field: keyof typeof INITIAL_FORM_STATE, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      
      // Auto-update branch if employee changes (for admins)
      if (field === 'opened_by_employee_id') {
          const emp = employees.find(e => e.id === value);
          if (emp) {
              setFormData(prev => ({ ...prev, branch_id: emp.branch_id, center_code: '' as unknown as number }));
          }
      }
  };

  const validateAndPrepareAccount = () => {
      console.log("Validating form data:", formData);
      // Validation
      if (!formData.account_code) { alert("Account Code is required."); return null; }
      if (!formData.center_code) { alert("Center Code is mandatory."); return null; }
      if (!formData.customer_name) { alert("Customer Name is required."); return null; }
      
      // Allow 0 if it's a valid number, but check for empty string
      if (String(formData.collection_amount) === '' || Number(formData.collection_amount) < 0) { 
          alert("Invalid Collection Amount."); 
          return null; 
      }

      // Check Duplicates (Scoped to Branch)
      const isDuplicateInSystem = existingAccounts.some(a => 
          a.account_code.toLowerCase() === formData.account_code.toLowerCase() && 
          a.branch_id === formData.branch_id
      );
      
      if (isDuplicateInSystem) {
          alert(`Account Code '${formData.account_code}' already exists in this branch.`);
          return null;
      }

      const isDuplicateInDraft = drafts.some(d => 
          d.account_code.toLowerCase() === formData.account_code.toLowerCase() && 
          d.branch_id === formData.branch_id
      );

      if (isDuplicateInDraft) {
          alert(`Account Code '${formData.account_code}' is already in your draft list for this branch.`);
          return null;
      }

      const newEntry: Omit<AccountOpening, 'id'> = {
          ...formData,
          // Ensure numbers are numbers
          center_code: Number(formData.center_code),
          term: Number(formData.term),
          collection_amount: Number(formData.collection_amount),
          is_counted: false,
          counted_month: null,
          salary_sheet_id: null
      };
      
      console.log("Validation successful, new entry:", newEntry);
      return newEntry;
  };

  const resetFormPartial = () => {
      setFormData(prev => ({
          ...prev,
          account_code: '',
          collection_amount: '' as unknown as number,
          customer_name: '',
          father_husband_name: '',
          dob: '',
          nid: '',
          mobile: '',
          address: '',
          nominee_name: '',
          nominee_relation: ''
      }));
  };

  const handleAddToDraft = (e: React.FormEvent) => {
      e.preventDefault();
      console.log("Add to Draft clicked");
      const newEntry = validateAndPrepareAccount();
      if (!newEntry) {
          console.warn("Validation failed for draft");
          return;
      }

      setDrafts([...drafts, newEntry]);
      console.log("Added to draft. Total drafts:", drafts.length + 1);
      resetFormPartial();
  };

  const handleDirectSave = async (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("Direct Save clicked");
      const newEntry = validateAndPrepareAccount();
      if (!newEntry) {
          console.warn("Validation failed for direct save");
          return;
      }

      setIsSubmitting(true);
      try {
          console.log("Starting direct save process for:", newEntry);
          
          // Check if center exists, if not, try to create it.
          const code = newEntry.center_code;
          const branchId = newEntry.branch_id;
          const exists = centers.some(c => c.centerCode === code && c.branchId === branchId);
          
          if (!exists) {
              console.log(`Center ${code} not found in branch ${branchId}, creating...`);
              const newCenter: Omit<Center, 'id'> = {
                  centerCode: code,
                  centerName: `Center ${code}`,
                  branchId: branchId,
                  assignedEmployeeId: newEntry.opened_by_employee_id,
                  type: code % 2 !== 0 ? 'OWN' : 'OFFICE',
                  memberCount: 0,
                  status: 'ACTIVE'
              };
              await onAddCenter(newCenter);
              console.log("Center created successfully");
          }

          // Use onBulkSave with single item to ensure collection record is also created
          console.log("Calling onBulkSave with entry");
          await onBulkSave([newEntry]);
          console.log("onBulkSave completed");
          
          setSuccessMessage(`Account ${newEntry.account_code} saved successfully!`);
          setTimeout(() => setSuccessMessage(null), 3000);
          resetFormPartial();
      } catch (error: any) {
          console.error("Direct Save Error:", error);
          alert(`Failed to save: ${error.message}`);
      } finally {
          setIsSubmitting(false);
      }
  };

  const removeDraft = (idx: number) => {
      setDrafts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFinalSubmit = async () => {
      if (drafts.length === 0) {
          console.warn("[Submit All] No drafts to submit.");
          return;
      }
      
      // Remove native confirm to prevent blocking issues. 
      // We can assume the user clicking "Submit All" is confirmation enough, 
      // or we could implement a custom modal if needed. For now, direct submit is better for UX.
      
      setIsSubmitting(true);
      setSuccessMessage(null);
      console.log(`[Submit All] Process started for ${drafts.length} accounts.`);

      try {
          // --- SANITIZATION PHASE ---
          // Explicitly convert all fields to safe values to avoid 'undefined' in payload
          const safeDrafts = drafts.map(d => ({
              ...d,
              account_code: String(d.account_code || '').trim(),
              center_code: Number(d.center_code) || 0,
              branch_id: String(d.branch_id || ''),
              opened_by_employee_id: String(d.opened_by_employee_id || ''),
              customer_name: String(d.customer_name || '').trim(),
              father_husband_name: String(d.father_husband_name || '').trim(),
              mobile: String(d.mobile || '').trim(),
              nid: String(d.nid || '').trim(),
              address: String(d.address || '').trim(),
              collection_amount: Number(d.collection_amount) || 0,
              term: Number(d.term) || 0,
              // Ensure optional fields are strings
              gender: d.gender || 'MALE',
              dob: d.dob || '',
              nominee_name: d.nominee_name || '',
              nominee_relation: d.nominee_relation || '',
              agent_name: d.agent_name || '',
              opening_date: d.opening_date || new Date().toISOString().slice(0, 10),
              status: 'ACTIVE' as const,
              is_counted: false,
              counted_month: null,
              salary_sheet_id: null
          }));

          console.log("[Submit All] Payload prepared:", safeDrafts);

          // --- LOGIC FOR AUTO-CREATING CENTERS ---
          const centersToCreate = new Map<string, Omit<Center, 'id'>>();

          for (const draft of safeDrafts) {
              const code = draft.center_code;
              const branchId = draft.branch_id;
              
              // Check if center exists in the specific branch
              const exists = centers.some(c => c.centerCode === code && c.branchId === branchId);
              
              // Check if we already queued it for creation in this batch
              const key = `${branchId}-${code}`;
              const alreadyQueued = centersToCreate.has(key);
              
              if (!exists && !alreadyQueued) {
                  // Prepare new center record
                  const newCenter: Omit<Center, 'id'> = {
                      centerCode: code,
                      centerName: `Center ${code}`, // Default name for auto-created center
                      branchId: branchId,
                      assignedEmployeeId: draft.opened_by_employee_id, // Assign to the opener
                      type: code % 2 !== 0 ? 'OWN' : 'OFFICE', // Odd=OWN, Even=OFFICE convention
                      memberCount: 0,
                      status: 'ACTIVE'
                  };
                  centersToCreate.set(key, newCenter);
              }
          }

          // Create missing centers silently
          if (centersToCreate.size > 0) {
              console.log(`[Submit All] Auto-creating ${centersToCreate.size} missing centers...`);
              for (const center of centersToCreate.values()) {
                  try {
                      await onAddCenter(center);
                  } catch (centerErr) {
                      console.error("Failed to auto-create center, continuing with accounts...", centerErr);
                  }
              }
          }
          // ---------------------------------------

          console.log("[Submit All] Sending to backend API...");
          
          // The backend service is updated to loop and submit one by one.
          // We just await the bulk promise here.
          await onBulkSave(safeDrafts);
          
          console.log("[Submit All] API call successful.");
          setDrafts([]);
          setSuccessMessage("All accounts have been successfully saved to the database!");
          setTimeout(() => setSuccessMessage(null), 5000);
      } catch (error: any) {
          console.error("[Submit All] API Error:", error);
          const errMsg = error?.message || String(error);
          alert(`FAILED to save accounts.\n\nServer Response: ${errMsg}\n\nPlease check your connection and try again.`);
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                  <FilePlus size={24} />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">Add Account Opening</h2>
                  <p className="text-sm text-slate-500">New Member Registration & First Deposit</p>
              </div>
          </div>
          
          {/* Draft Indicator */}
          {drafts.length > 0 && (
              <div className="flex items-center gap-4">
                  <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{drafts.length} Accounts</p>
                      <p className="text-xs text-slate-500">Ready to submit</p>
                  </div>
                  <button 
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                      className={`px-6 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all ${
                          isSubmitting 
                          ? 'bg-emerald-400 text-white cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                      }`}
                  >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      <span>{isSubmitting ? 'Saving...' : 'Submit All'}</span>
                  </button>
              </div>
          )}
      </div>

      {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle size={20} /> {successMessage}
          </div>
      )}

      {/* Main Form Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Input Form */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                  <Edit2 size={16} /> Data Entry Form
              </div>
              
              <form onSubmit={handleAddToDraft} className="p-6 space-y-8">
                  
                  {/* Section 1: Office Info */}
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Office Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                              {!isNormalUser && (
                                  <div className="mb-2">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Filter Employee List</label>
                                      <select 
                                          className="w-full p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                                          value={branchFilter}
                                          onChange={e => setBranchFilter(e.target.value)}
                                      >
                                          <option value="">All Branches</option>
                                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                      </select>
                                  </div>
                              )}

                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Opened By (Employee)</label>
                              {isNormalUser ? (
                                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium">
                                      {employees.find(e => e.id === currentUser.employee_id)?.name} ({currentUser.employee_id})
                                  </div>
                              ) : (
                                  <select 
                                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={formData.opened_by_employee_id}
                                      onChange={e => handleInputChange('opened_by_employee_id', e.target.value)}
                                  >
                                      {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.designation}</option>)}
                                  </select>
                              )}
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Branch Name</label>
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium flex items-center gap-2">
                                  <MapPin size={14} className="text-slate-400" />
                                  {selectedBranchName}
                              </div>
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block text-indigo-700">Center Code <span className="text-red-500">*</span></label>
                              <div className="relative">
                                  <input 
                                      type="number"
                                      required
                                      list="centers-list"
                                      className="w-full p-2.5 border-2 border-indigo-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-indigo-900 placeholder:text-indigo-300"
                                      placeholder="Select Center"
                                      value={formData.center_code}
                                      onChange={e => handleInputChange('center_code', e.target.value)}
                                  />
                                  <datalist id="centers-list">
                                      {availableCenters.map(c => (
                                          <option key={c.id} value={c.centerCode}>{c.centerName} ({c.type})</option>
                                      ))}
                                  </datalist>
                                  {selectedCenterDetails && (
                                      <div className="absolute right-0 -bottom-5 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                          <CheckCircle size={10} /> {selectedCenterDetails.centerName}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Section 2: Account Details */}
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Account Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                          <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Account Code <span className="text-red-500">*</span></label>
                              <div className="relative">
                                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                      type="text"
                                      required
                                      className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold"
                                      placeholder="Unique ID"
                                      value={formData.account_code}
                                      onChange={e => handleInputChange('account_code', e.target.value)}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Opening Date</label>
                              <input 
                                  type="date"
                                  required
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={formData.opening_date}
                                  onChange={e => handleInputChange('opening_date', e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Term (Years)</label>
                              <select 
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                  value={formData.term}
                                  onChange={e => handleInputChange('term', Number(e.target.value))}
                              >
                                  {[1.5, 3, 5, 8, 10, 12].map(t => <option key={t} value={t}>{t} Years</option>)}
                              </select>
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Collection Amount (First Deposit)</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                                  <input 
                                      type="number"
                                      required
                                      min="0"
                                      className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                                      placeholder="0.00"
                                      value={formData.collection_amount}
                                      onChange={e => handleInputChange('collection_amount', e.target.value)}
                                  />
                              </div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Agent Name (Optional)</label>
                              <input 
                                  type="text"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="Reference Agent"
                                  value={formData.agent_name}
                                  onChange={e => handleInputChange('agent_name', e.target.value)}
                              />
                          </div>
                      </div>
                  </div>

                  {/* Section 3: Customer Info */}
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Customer Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Customer Name <span className="text-red-500">*</span></label>
                              <div className="relative">
                                  <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                      type="text"
                                      required
                                      className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                      placeholder="Full Name"
                                      value={formData.customer_name}
                                      onChange={e => handleInputChange('customer_name', e.target.value)}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Gender</label>
                              <select 
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                  value={formData.gender}
                                  onChange={e => handleInputChange('gender', e.target.value)}
                              >
                                  <option value="MALE">Male</option>
                                  <option value="FEMALE">Female</option>
                                  <option value="OTHER">Other</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Date of Birth</label>
                              <input 
                                  type="date"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={formData.dob}
                                  onChange={e => handleInputChange('dob', e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">NID / Birth Cert No.</label>
                              <input 
                                  type="text"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="National ID"
                                  value={formData.nid}
                                  onChange={e => handleInputChange('nid', e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Mobile Number</label>
                              <div className="relative">
                                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                      type="text"
                                      className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                      placeholder="017xxxxxxxx"
                                      value={formData.mobile}
                                      onChange={e => handleInputChange('mobile', e.target.value)}
                                  />
                              </div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Father / Husband Name</label>
                              <input 
                                  type="text"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={formData.father_husband_name}
                                  onChange={e => handleInputChange('father_husband_name', e.target.value)}
                              />
                          </div>
                          <div className="md:col-span-3">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Address</label>
                              <input 
                                  type="text"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="Village, Post Office, Thana..."
                                  value={formData.address}
                                  onChange={e => handleInputChange('address', e.target.value)}
                              />
                          </div>
                      </div>
                  </div>

                  {/* Section 4: Nominee */}
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Nominee Info</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Nominee Name</label>
                              <input 
                                  type="text"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={formData.nominee_name}
                                  onChange={e => handleInputChange('nominee_name', e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Relation</label>
                              <input 
                                  type="text"
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="e.g. Wife, Son"
                                  value={formData.nominee_relation}
                                  onChange={e => handleInputChange('nominee_relation', e.target.value)}
                              />
                          </div>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                      <button 
                          type="button"
                          onClick={handleDirectSave}
                          disabled={isSubmitting}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50"
                      >
                          <Save size={20} />
                          {isSubmitting ? 'Saving...' : 'Direct Save'}
                      </button>
                      <button 
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                      >
                          <ListChecks size={20} />
                          Add to Draft
                      </button>
                  </div>

              </form>
          </div>

          {/* Right: Draft List */}
          <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/10 rounded-lg"><Users size={20} /></div>
                      <div>
                          <h3 className="font-bold">Draft Summary</h3>
                          <p className="text-xs text-slate-400">{drafts.length} Pending Entries</p>
                      </div>
                  </div>
                  
                  {drafts.length > 0 && (
                      <button 
                          onClick={handleFinalSubmit}
                          disabled={isSubmitting}
                          className="w-full mt-3 bg-white text-slate-900 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 shadow-sm active:scale-[0.98]"
                      >
                          {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                          Submit All ({drafts.length})
                      </button>
                  )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-h-[600px] overflow-y-auto custom-scrollbar">
                  {drafts.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                          <FilePlus size={48} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium">No drafts yet</p>
                          <p className="text-xs mt-1">Fill the form to add entries</p>
                      </div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                          {drafts.map((draft, idx) => (
                              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors group relative">
                                  <button 
                                      onClick={() => removeDraft(idx)}
                                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-mono font-bold text-slate-700 text-sm">{draft.account_code}</span>
                                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">৳{draft.collection_amount}</span>
                                  </div>
                                  <div className="text-sm font-medium text-slate-800 mb-1">{draft.customer_name}</div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span className="bg-slate-100 px-1.5 rounded">Center {draft.center_code}</span>
                                      <span>•</span>
                                      <span>{draft.term} Yrs</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};

export default AddAccountForm;
