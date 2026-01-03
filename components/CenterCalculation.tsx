
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CenterCollectionRecord, Branch, Employee, User, Center } from '../types';
import { Calculator, Plus, Save, DollarSign, RefreshCw, Archive, ArrowRight, Lock, Building, User as UserIcon, Edit2, Trash2, X, AlertTriangle, ShieldCheck, Calendar, MapPin, CreditCard, CloudUpload, Clock } from 'lucide-react';

interface CenterCalculationProps {
  records: CenterCollectionRecord[];
  onAddRecord: (record: Omit<CenterCollectionRecord, 'id' | 'createdAt'>) => void;
  onEditRecord: (id: string, record: Partial<CenterCollectionRecord>) => void;
  onDeleteRecord: (id: string) => void;
  branches: Branch[];
  employees: Employee[];
  currentUser: User;
  centers: Center[];
  onBulkAddRecords?: (records: CenterCollectionRecord[]) => Promise<void>;
  onCreateCenter?: (center: Omit<Center, 'id'>) => void;
  readOnly?: boolean;
}

const CenterCalculation: React.FC<CenterCalculationProps> = ({ records, onAddRecord, onEditRecord, onDeleteRecord, branches, employees, currentUser, centers, onBulkAddRecords, onCreateCenter, readOnly = false }) => {
  const isAdmin = !readOnly && ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'].includes(currentUser.role);
  const isNormalUser = currentUser.role === 'USER';

  // --- STATE ---
  
  // Filter State
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // SELECTION STATE (Source of Truth for Dropdowns)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // ACTIVE CONTEXT (Source of Truth for Submission)
  // Once locked, this object MUST NOT CHANGE until explicitly unlocked.
  const [activeContext, setActiveContext] = useState<{ branchId: string; employeeId: string } | null>(null);
  
  // Level 2: Entry Inputs
  const [centerCodeInput, setCenterCodeInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [loanInput, setLoanInput] = useState('');
  const [newCenterType, setNewCenterType] = useState<'OWN' | 'OFFICE'>('OWN');
  const [newCenterName, setNewCenterName] = useState('');
  
  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<CenterCollectionRecord | null>(null);
  const [editAdminOverride, setEditAdminOverride] = useState(false);
  
  // Staging State (Pending Sync)
  const [stagedRecords, setStagedRecords] = useState<CenterCollectionRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refs for Focus Management
  const amountInputRef = useRef<HTMLInputElement>(null);
  const centerCodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-Select Context for Normal Users (Field Officers)
  // Only runs once on mount if conditions met to save them clicks.
  useEffect(() => {
    if (isNormalUser && !activeContext) {
        if (branches.length === 1 && employees.length === 1) {
            const autoBranch = branches[0].id;
            const autoEmp = employees[0].id;
            
            setSelectedBranchId(autoBranch);
            setSelectedEmployeeId(autoEmp);
            setActiveContext({ branchId: autoBranch, employeeId: autoEmp });
        }
    }
  }, [isNormalUser, branches, employees, activeContext]);

  // --- LOGIC ---

  // Merge Staged Records with Synced Records for Display
  const allRecords = useMemo(() => {
      return [...stagedRecords, ...records];
  }, [records, stagedRecords]);

  // Filter Records by Month
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => r.createdAt.startsWith(filterMonth));
  }, [allRecords, filterMonth]);

  // Available Employees: GLOBAL LIST 
  // STRICT REQUIREMENT: Do NOT filter by branch. Any employee can work in any branch.
  const availableEmployees = employees;

  // Filter Available Centers based on ACTIVE Context
  // Only show centers belonging to the locked branch ID for the suggestion list
  const availableCenters = useMemo(() => {
      if (!activeContext) return [];
      return centers.filter(c => c.branchId === activeContext.branchId);
  }, [centers, activeContext]);

  // Check if current input corresponds to a new center
  const isNewCenter = useMemo(() => {
      const code = parseInt(centerCodeInput);
      if (isNaN(code) || !centerCodeInput) return false;
      return !availableCenters.some(c => c.centerCode === code);
  }, [centerCodeInput, availableCenters]);

  // Update default new center type when code changes
  useEffect(() => {
      if (isNewCenter) {
          const code = parseInt(centerCodeInput);
          if (!isNaN(code)) {
              setNewCenterType(code % 2 !== 0 ? 'OWN' : 'OFFICE');
          }
          setNewCenterName(''); 
      }
  }, [centerCodeInput, isNewCenter]);

  // Determine Center Type DYNAMICALLY
  const getCenterType = (code: number, branchId: string, collectingEmpId: string): 'OWN' | 'OFFICE' => {
    // 1. Try to find configured center in master list
    const configuredCenter = centers.find(c => c.centerCode === code && c.branchId === branchId);
    
    if (configuredCenter) {
        // Explicitly set to OFFICE in master list? Force OFFICE.
        if (configuredCenter.type === 'OFFICE') return 'OFFICE';

        // Otherwise check ownership:
        // If the center is assigned to the person collecting -> OWN
        // Else -> OFFICE (Covering for someone else)
        if (configuredCenter.assignedEmployeeId === collectingEmpId) return 'OWN';
        return 'OFFICE';
    }

    // 2. Use local state if creating new (assume creator owns it initially)
    if (isNewCenter) return newCenterType;

    // 3. Fallback to code rule (Legacy)
    return code % 2 !== 0 ? 'OWN' : 'OFFICE';
  };

  // Current Display Type
  const currentCenterType = useMemo(() => {
      const code = parseInt(centerCodeInput);
      if (isNaN(code) || !activeContext) return null;
      return getCenterType(code, activeContext.branchId, activeContext.employeeId);
  }, [centerCodeInput, activeContext, centers, isNewCenter, newCenterType]);

  // Match current input to a center name
  const matchedCenterName = useMemo(() => {
      const code = parseInt(centerCodeInput);
      if (isNaN(code)) return null;
      const match = availableCenters.find(c => c.centerCode === code);
      return match ? match.centerName : null;
  }, [centerCodeInput, availableCenters]);

  // Action: Lock Context
  const handleLockContext = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    
    // STRICT VALIDATION
    if (!selectedBranchId || !selectedEmployeeId) {
        alert("Please select both a Branch and an Employee.");
        return;
    }

    // LOCK: Create immutable context for this session
    setActiveContext({ 
        branchId: selectedBranchId, 
        employeeId: selectedEmployeeId 
    });
    
    // Auto focus center code input
    setTimeout(() => {
        if (centerCodeInputRef.current) centerCodeInputRef.current.focus();
    }, 50);
  };

  // Action: Unlock Context
  const handleUnlockContext = () => {
    if (readOnly) return;
    setActiveContext(null);
    // We do NOT reset selectedBranchId/selectedEmployeeId to allow easy correction
    setCenterCodeInput('');
    setAmountInput('');
    setLoanInput('');
    setNewCenterName('');
  };

  // Action: Add Deposit (Staging)
  const handleSubmitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!activeContext || !centerCodeInput) return;

    // ABSOLUTE SOURCE OF TRUTH: activeContext
    // DO NOT infer branch from employee or any other source.
    const targetBranchId = activeContext.branchId;
    const targetEmployeeId = activeContext.employeeId;

    if (!targetBranchId) {
        alert("Critical Error: No branch in active context.");
        return;
    }

    const amount = parseFloat(amountInput) || 0;
    const loanAmount = parseFloat(loanInput) || 0;
    const code = parseInt(centerCodeInput);

    if ((isNaN(amount) || amount < 0) && (isNaN(loanAmount) || loanAmount < 0)) {
        alert("Invalid Amounts");
        return;
    }
    if (amount === 0 && loanAmount === 0) {
        alert("Please enter at least a Savings or Loan amount.");
        return;
    }

    if (isNaN(code) || code <= 0) {
        alert("Invalid Center Code");
        return;
    }

    // ON-THE-FLY CENTER CREATION
    if (isNewCenter && onCreateCenter) {
        onCreateCenter({
            centerCode: code,
            centerName: newCenterName.trim() || `Center ${code}`,
            branchId: targetBranchId, // Explicit use of locked branch
            assignedEmployeeId: targetEmployeeId, // Explicit use of locked employee
            type: newCenterType
        });
    }

    // Determine Type dynamically
    const type = getCenterType(code, targetBranchId, targetEmployeeId);
    
    const timestamp = new Date().toISOString();
    const tempIdPrefix = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRecords: CenterCollectionRecord[] = [];

    // Savings Record
    if (amount > 0) {
        newRecords.push({
            id: `${tempIdPrefix}_S`,
            createdAt: timestamp,
            branchId: targetBranchId, // STRICT USE
            employeeId: targetEmployeeId, // STRICT USE
            centerCode: code,
            amount: amount,
            loanAmount: 0,
            type: type,
            status: 'PENDING'
        });
    }

    // Loan Record
    if (loanAmount > 0) {
        newRecords.push({
            id: `${tempIdPrefix}_L`,
            createdAt: timestamp,
            branchId: targetBranchId, // STRICT USE
            employeeId: targetEmployeeId, // STRICT USE
            centerCode: code,
            amount: 0, 
            loanAmount: loanAmount, 
            type: type,
            status: 'PENDING'
        });
    }

    // Update Local State
    setStagedRecords(prev => [...newRecords, ...prev]);

    // Reset Entry Fields
    setAmountInput('');
    setLoanInput('');
    setNewCenterName('');
    
    if (amountInputRef.current) amountInputRef.current.focus();
  };

  const handleFinalSubmit = async () => {
      if (readOnly) return;
      if (!onBulkAddRecords || stagedRecords.length === 0) return;
      setIsSyncing(true);
      try {
        await onBulkAddRecords(stagedRecords);
        setStagedRecords([]);
      } catch (error) {
        console.error("Sync failed", error);
        alert("Failed to sync records. Please try again.");
      } finally {
        setIsSyncing(false);
      }
  };

  // --- EDIT ACTIONS ---
  const handleEditClick = (record: CenterCollectionRecord) => {
    if (!isAdmin || readOnly) return;
    setEditingRecord(record);
    setEditAdminOverride(false);
  };

  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || readOnly) return;
    
    // Re-calculate type based on potentially changed branch/code/employee
    const type = getCenterType(editingRecord.centerCode, editingRecord.branchId, editingRecord.employeeId);
    
    if (editingRecord.status === 'PENDING') {
        setStagedRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...editingRecord, type } : r));
    } else {
        onEditRecord(editingRecord.id, { ...editingRecord, type });
    }
    setEditingRecord(null);
  };

  const handleDeleteClick = (id: string, isPending: boolean) => {
    if (readOnly) return;
    if (isPending) {
        setStagedRecords(prev => prev.filter(r => r.id !== id));
        return;
    }
    
    if (!isAdmin) return;
    if (confirm("Are you sure you want to delete this deposit entry?")) {
        onDeleteRecord(id);
    }
  };


  // --- SUMMARIES ---

  const activeGroupStats = useMemo(() => {
    if (!activeContext || !centerCodeInput) return null;
    const code = parseInt(centerCodeInput);
    if (isNaN(code)) return null;

    const relevantRecords = filteredRecords.filter(r => 
        r.branchId === activeContext.branchId &&
        r.employeeId === activeContext.employeeId &&
        r.centerCode === code
    );

    return {
        count: relevantRecords.length,
        savingsTotal: relevantRecords.reduce((sum, r) => sum + r.amount, 0),
        loanTotal: relevantRecords.reduce((sum, r) => sum + (r.loanAmount || 0), 0)
    };
  }, [filteredRecords, activeContext, centerCodeInput]);

  const globalSummary = useMemo(() => {
    let ownSavings = 0;
    let ownLoan = 0;
    let officeSavings = 0;
    let officeLoan = 0;
    const ownMap = new Set<string>();
    const officeMap = new Set<string>();

    filteredRecords.forEach(r => {
      // Re-evaluate type for global summary based on current center assignments
      // This ensures the summary cards match the App.tsx table logic
      // Fallback to record type if needed
      const center = centers.find(c => c.centerCode === r.centerCode && c.branchId === r.branchId);
      let calculatedType = r.type;
      
      if (center) {
          if (center.type === 'OFFICE') calculatedType = 'OFFICE';
          else calculatedType = center.assignedEmployeeId === r.employeeId ? 'OWN' : 'OFFICE';
      }

      const uniqueKey = `${r.branchId}-${r.centerCode}`;
      if (calculatedType === 'OWN') {
        ownMap.add(uniqueKey);
        ownSavings += r.amount;
        ownLoan += (r.loanAmount || 0);
      } else {
        officeMap.add(uniqueKey);
        officeSavings += r.amount;
        officeLoan += (r.loanAmount || 0);
      }
    });

    return {
      ownCount: ownMap.size,
      ownSavings,
      ownLoan,
      officeCount: officeMap.size,
      officeSavings,
      officeLoan
    };
  }, [filteredRecords, centers]); // Added centers dependency

  const recentRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
  }, [filteredRecords]);

  // Helpers
  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || id;
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || id;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Fast Deposit Entry</h2>
            <p className="text-sm text-slate-500">Center-wise Collection & Loan Calculator</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <Calendar size={14} className="text-slate-400 ml-1" />
                <input 
                    type="month" 
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-700 font-medium focus:ring-0 outline-none py-1"
                />
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1.5 rounded border border-slate-100 hidden lg:block">
                Logic: Assigned=OWN else OFFICE
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Entry Form */}
        {/* Hide entry form if Read Only (Auditor) */}
        {!readOnly ? (
            <div className="lg:col-span-1 flex flex-col gap-2">
            
            {/* STEP 1: CONTEXT SETUP */}
            {!activeContext ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-left-2">
                    <div className="mb-4 pb-4 border-b border-slate-100 flex items-center gap-2 text-slate-700">
                            <Lock size={18} className="text-slate-400" />
                            <h3 className="font-bold text-sm uppercase">Step 1: Select Context</h3>
                    </div>
                    
                    <form onSubmit={handleLockContext} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Select Branch</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                    value={selectedBranchId}
                                    onChange={e => setSelectedBranchId(e.target.value)}
                                >
                                    <option value="">-- Select Branch --</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Select Employee</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                >
                                    <option value="">-- Select Employee --</option>
                                    {availableEmployees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg font-bold shadow-sm flex justify-center items-center gap-2 transition-all"
                        >
                            Start Collection <ArrowRight size={16} />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-md border border-slate-700 animate-in fade-in">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Context</span>
                        {!isNormalUser && (
                            <button type="button" onClick={handleUnlockContext} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                <RefreshCw size={10} /> Change
                            </button>
                        )}
                    </div>
                    <div className="font-bold text-lg leading-tight mb-1">{getBranchName(activeContext.branchId)}</div>
                    <div className="text-sm text-slate-300 flex items-center gap-2">
                        <UserIcon size={14} /> {getEmployeeName(activeContext.employeeId)}
                    </div>
                    {isNormalUser && (
                        <div className="mt-2 text-[10px] bg-slate-900/50 text-slate-400 px-2 py-1 rounded inline-block">
                            <Lock size={8} className="inline mr-1" /> Locked to your profile
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: FAST ENTRY */}
            {activeContext && (
                <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden flex-1 flex flex-col animate-in slide-in-from-bottom-2">
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                        <h3 className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
                            <Plus size={16} /> Add Deposit
                        </h3>
                    </div>
                    
                    <form onSubmit={handleSubmitDeposit} className="p-6 space-y-5 flex-1 flex flex-col justify-center">
                        
                        {/* Center Code - Persistent */}
                        <div>
                            <label className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-1">
                                <span>Somity / Center Code</span>
                                {currentCenterType && (
                                    <span className={`px-1.5 rounded ${currentCenterType === 'OWN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {currentCenterType}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                    <input 
                                        ref={centerCodeInputRef}
                                        type="number"
                                        value={centerCodeInput}
                                        onChange={e => setCenterCodeInput(e.target.value)}
                                        className="w-full text-center py-2.5 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-0 outline-none font-mono text-xl font-bold tracking-widest text-slate-700 bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="Code"
                                        autoFocus
                                        list="available-centers"
                                    />
                                    {matchedCenterName && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-3 w-40 text-xs text-slate-500 font-medium truncate hidden xl:block">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={12} /> {matchedCenterName}
                                            </div>
                                        </div>
                                    )}
                            </div>
                            
                            {/* NEW CENTER TYPE SELECTION UI */}
                            {isNewCenter && centerCodeInput && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col gap-2 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-yellow-700 flex items-center gap-1">
                                            <Plus size={10} /> New Center
                                        </span>
                                        <div className="flex gap-2">
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                                                <input 
                                                    type="radio" 
                                                    checked={newCenterType === 'OWN'} 
                                                    onChange={() => setNewCenterType('OWN')} 
                                                    className="text-blue-600 focus:ring-blue-500 w-3 h-3" 
                                                />
                                                OWN
                                            </label>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                                                <input 
                                                    type="radio" 
                                                    checked={newCenterType === 'OFFICE'} 
                                                    onChange={() => setNewCenterType('OFFICE')} 
                                                    className="text-emerald-600 focus:ring-emerald-500 w-3 h-3" 
                                                />
                                                OFFICE
                                            </label>
                                        </div>
                                    </div>
                                    <input 
                                        type="text"
                                        value={newCenterName}
                                        onChange={(e) => setNewCenterName(e.target.value)}
                                        placeholder="Enter Center Name (Optional)"
                                        className="w-full text-xs border border-yellow-300 rounded px-2 py-1 focus:ring-1 focus:ring-yellow-500 outline-none bg-white placeholder:text-slate-400 text-slate-700 font-medium"
                                        autoComplete="off"
                                    />
                                </div>
                            )}

                            <datalist id="available-centers">
                                {availableCenters.map(c => (
                                    <option key={c.id} value={c.centerCode}>{c.centerName}</option>
                                ))}
                            </datalist>
                            
                            {/* Mobile Name Display */}
                            {matchedCenterName && (
                                <div className="xl:hidden mt-1 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
                                    <MapPin size={10} /> {matchedCenterName}
                                </div>
                            )}
                        </div>

                        {/* Savings Amount */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Savings Collection</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    ref={amountInputRef}
                                    type="number"
                                    min="0"
                                    value={amountInput}
                                    onChange={e => setAmountInput(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-2xl text-slate-800 transition-all placeholder:text-slate-300"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Loan Amount */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Collection (Due)</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="number"
                                    min="0"
                                    value={loanInput}
                                    onChange={e => setLoanInput(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-purple-100 bg-purple-50/30 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-bold text-2xl text-slate-800 transition-all placeholder:text-slate-300"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Live Summary */}
                        {activeGroupStats && activeGroupStats.count > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm space-y-1">
                                <div className="flex justify-between items-center">
                                    <div className="text-slate-500">
                                        <span className="font-bold text-slate-700">{activeGroupStats.count}</span> deposits <span className="text-xs text-slate-400">({filterMonth})</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs font-mono">
                                    <span className="text-slate-500">Savings: <span className="font-bold text-indigo-700">৳{activeGroupStats.savingsTotal.toLocaleString()}</span></span>
                                    <span className="text-slate-500">Loan: <span className="font-bold text-purple-700">৳{activeGroupStats.loanTotal.toLocaleString()}</span></span>
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold shadow-md shadow-indigo-200 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                        >
                            <Save size={18} /> Add Entry
                        </button>

                        {/* SYNC BUTTON */}
                        {stagedRecords.length > 0 && (
                            <button 
                                    type="button"
                                    onClick={handleFinalSubmit}
                                    disabled={isSyncing}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold shadow-md shadow-amber-200 active:scale-[0.98] transition-all flex justify-center items-center gap-2 animate-in fade-in slide-in-from-top-2"
                            >
                                {isSyncing ? (
                                    <RefreshCw size={18} className="animate-spin" />
                                ) : (
                                    <CloudUpload size={18} />
                                )}
                                <span>Final Submit ({stagedRecords.length} Pending)</span>
                            </button>
                        )}

                    </form>
                </div>
            )}

            </div>
        ) : (
            // READ ONLY PLACEHOLDER
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-slate-400">
                <Lock size={48} className="mb-4 opacity-20" />
                <h3 className="font-bold text-slate-500">Read Only Access</h3>
                <p className="text-sm mt-2">Data entry is disabled for Auditors.</p>
            </div>
        )}

        {/* RIGHT COLUMN */}
        <div className={`flex flex-col gap-6 ${readOnly ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
           
           {/* Global Cards */}
           <div className="grid grid-cols-2 gap-4">
              {/* Savings Cards */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors"></div>
                 <div className="relative z-10">
                    <h4 className="text-blue-800 font-bold text-sm uppercase mb-1">Own Savings <span className="text-[10px] text-blue-400 font-normal">({filterMonth})</span></h4>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">৳{globalSummary.ownSavings.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        From <span className="font-bold text-slate-700">{globalSummary.ownCount}</span> unique centers
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:bg-emerald-100 transition-colors"></div>
                 <div className="relative z-10">
                    <h4 className="text-emerald-800 font-bold text-sm uppercase mb-1">Office Savings <span className="text-[10px] text-emerald-500 font-normal">({filterMonth})</span></h4>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">৳{globalSummary.officeSavings.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        From <span className="font-bold text-slate-700">{globalSummary.officeCount}</span> unique centers
                    </div>
                 </div>
              </div>

              {/* Loan Cards */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-colors">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-full -mr-10 -mt-10 group-hover:bg-purple-100 transition-colors"></div>
                 <div className="relative z-10">
                    <h4 className="text-purple-800 font-bold text-sm uppercase mb-1">Own Loan Coll. <span className="text-[10px] text-purple-400 font-normal">({filterMonth})</span></h4>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">৳{globalSummary.ownLoan.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-colors">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-orange-50 rounded-full -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                 <div className="relative z-10">
                    <h4 className="text-orange-800 font-bold text-sm uppercase mb-1">Office Loan Coll. <span className="text-[10px] text-orange-400 font-normal">({filterMonth})</span></h4>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">৳{globalSummary.officeLoan.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* List */}
           <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                 <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Archive size={14} /> Entries
                 </h4>
                 <div className="flex items-center gap-3">
                    {stagedRecords.length > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 font-bold animate-pulse">
                            <Clock size={10} /> {stagedRecords.length} Pending Sync
                        </span>
                    )}
                    {isAdmin && !readOnly && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck size={10} /> Admin Access
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400">Viewing {filterMonth}</span>
                 </div>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1">
                 {recentRecords.length > 0 ? (
                    <table className="w-full text-left text-sm">
                       <thead className="bg-white sticky top-0 shadow-sm z-10 text-xs text-slate-500 uppercase">
                          <tr>
                             <th className="p-3 font-semibold">Details</th>
                             <th className="p-3 font-semibold text-center">Center</th>
                             <th className="p-3 font-semibold text-right">Savings</th>
                             <th className="p-3 font-semibold text-right">Loan</th>
                             <th className="p-3 font-semibold text-center">Status</th>
                             <th className="p-3 font-semibold text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {recentRecords.map(r => {
                             const isPending = r.status === 'PENDING';
                             return (
                                 <tr key={r.id} className={`hover:bg-slate-50 transition-colors group ${isPending ? 'bg-amber-50/50' : ''}`}>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{getEmployeeName(r.employeeId)}</span>
                                            <span className="text-[10px] text-slate-400">{getBranchName(r.branchId)}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="font-mono font-bold text-slate-700">{r.centerCode}</div>
                                        <div className={`text-[9px] font-bold px-1 rounded inline-block ${r.type === 'OWN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {r.type}
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-700">
                                        {r.amount > 0 ? `৳${r.amount.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-700">
                                        {r.loanAmount && r.loanAmount > 0 ? `৳${r.loanAmount.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        {isPending ? (
                                            <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-bold">Draft</span>
                                        ) : (
                                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Synced</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isAdmin && !readOnly && !isPending && (
                                                <button onClick={() => handleEditClick(r)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded border border-slate-200 transition-colors shadow-sm" title="Edit">
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                            {!readOnly && (isAdmin || isPending) && (
                                                <button onClick={() => handleDeleteClick(r.id, isPending)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded border border-slate-200 transition-colors shadow-sm" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                 </tr>
                             );
                          })}
                          {recentRecords.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">No entries for this month yet.</td>
                              </tr>
                          )}
                       </tbody>
                    </table>
                 ) : (
                    <div className="p-8 text-center text-slate-400 italic flex flex-col items-center">
                        <Archive size={32} className="mb-2 opacity-20" />
                        <p>No records found for {filterMonth}</p>
                    </div>
                 )}
              </div>
           </div>

        </div>
        </div> {/* CLOSE GRID */}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm uppercase">Edit Entry</h3>
                    <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleUpdateRecord} className="p-5 space-y-4">
                    {/* Admin Override Warning */}
                    {!editingRecord.status && !editAdminOverride && (
                       <div className="text-xs bg-amber-50 border border-amber-100 p-3 rounded text-amber-800 flex gap-2">
                           <AlertTriangle size={16} className="shrink-0" />
                           <div>
                               <p className="font-bold mb-1">Editing Synced Record</p>
                               <p>Changing amounts directly affects financial reports. Proceed with caution.</p>
                               <button type="button" onClick={() => setEditAdminOverride(true)} className="mt-2 text-[10px] bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded font-bold text-amber-900 transition-colors">
                                   I Understand, Enable Editing
                               </button>
                           </div>
                       </div>
                    )}

                    <div className={`space-y-4 transition-opacity ${(!editingRecord.status && !editAdminOverride) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Savings Amount</label>
                            <input 
                                type="number" 
                                value={editingRecord.amount} 
                                onChange={e => setEditingRecord({...editingRecord, amount: parseFloat(e.target.value) || 0})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Loan Amount</label>
                            <input 
                                type="number" 
                                value={editingRecord.loanAmount || 0} 
                                onChange={e => setEditingRecord({...editingRecord, loanAmount: parseFloat(e.target.value) || 0})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Center Code</label>
                            <input 
                                type="number" 
                                value={editingRecord.centerCode} 
                                onChange={e => setEditingRecord({...editingRecord, centerCode: parseInt(e.target.value) || 0})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setEditingRecord(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">Cancel</button>
                        <button type="submit" disabled={!editingRecord.status && !editAdminOverride} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm disabled:opacity-50">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default CenterCalculation;
