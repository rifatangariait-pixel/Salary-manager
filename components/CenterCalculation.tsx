
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CenterCollectionRecord, Branch, Employee, User, Center } from '../types';
import { Calculator, Plus, Save, DollarSign, RefreshCw, Archive, ArrowRight, Lock, Building, User as UserIcon, Edit2, Trash2, X, AlertTriangle, ShieldCheck, Calendar, MapPin, CreditCard, UploadCloud, Clock, Zap, RotateCcw, LockKeyhole, Wallet, CheckCircle2, Users } from 'lucide-react';

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

type TabType = 'SAVINGS' | 'LOAN';

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
  const [activeContext, setActiveContext] = useState<{ branchId: string; employeeId: string } | null>(null);
  
  // Level 2: Entry Inputs
  const [collectionDateInput, setCollectionDateInput] = useState(new Date().toISOString().slice(0, 10));
  
  // CENTER CODE STATE & LOCKING
  const [centerCodeInput, setCenterCodeInput] = useState(() => sessionStorage.getItem('centerCalc_lockedCode') || '');
  const [lockedCenterCode, setLockedCenterCode] = useState<string | null>(() => sessionStorage.getItem('centerCalc_lockedCode'));

  // TAB STATE (Persisted)
  const [activeTab, setActiveTab] = useState<TabType>(() => (sessionStorage.getItem('centerCalc_activeTab') as TabType) || 'SAVINGS');

  const [amountInput, setAmountInput] = useState('');
  const [loanInput, setLoanInput] = useState('');
  const [newCenterType, setNewCenterType] = useState<'OWN' | 'OFFICE'>('OWN');
  const [newCenterName, setNewCenterName] = useState('');
  const [newMemberCount, setNewMemberCount] = useState<string>('');
  
  // Auto-Save Toggle (Default FALSE: Pending -> Final Submit)
  const [autoSave, setAutoSave] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<CenterCollectionRecord | null>(null);
  const [editAdminOverride, setEditAdminOverride] = useState(false);
  
  // Staging State (Pending Sync) - PERSISTED IN SESSION STORAGE
  const [stagedRecords, setStagedRecords] = useState<CenterCollectionRecord[]>(() => {
      try {
          const saved = sessionStorage.getItem('centerCalc_stagedData');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  
  // Optimistic State (Transient, for instant UI update during save)
  const [optimisticRecords, setOptimisticRecords] = useState<CenterCollectionRecord[]>([]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refs for Focus Management
  const savingsInputRef = useRef<HTMLInputElement>(null);
  const loanInputRef = useRef<HTMLInputElement>(null);
  const centerCodeInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECT: PERSISTENCE ---
  useEffect(() => {
      sessionStorage.setItem('centerCalc_stagedData', JSON.stringify(stagedRecords));
  }, [stagedRecords]);

  useEffect(() => {
      if (lockedCenterCode) {
          sessionStorage.setItem('centerCalc_lockedCode', lockedCenterCode);
          setCenterCodeInput(lockedCenterCode); // Ensure input matches lock
      } else {
          sessionStorage.removeItem('centerCalc_lockedCode');
      }
  }, [lockedCenterCode]);

  useEffect(() => {
      sessionStorage.setItem('centerCalc_activeTab', activeTab);
      // Auto-focus the active tab input when tab changes or context is locked
      if (activeContext) {
          setTimeout(() => {
              if (activeTab === 'SAVINGS') savingsInputRef.current?.focus();
              else loanInputRef.current?.focus();
          }, 50);
      }
  }, [activeTab, activeContext]);

  // Auto-Select Context for Normal Users
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

  const allRecords = useMemo(() => {
      // Prioritize: Staged > Optimistic > Database Records
      // Use Map to deduplicate by ID. IDs are unique across the system (generated on creation)
      const combined = [...stagedRecords, ...optimisticRecords, ...records];
      const uniqueMap = new Map<string, CenterCollectionRecord>();
      
      combined.forEach(r => {
          if (!uniqueMap.has(r.id)) {
              uniqueMap.set(r.id, r);
          }
      });
      
      return Array.from(uniqueMap.values());
  }, [records, stagedRecords, optimisticRecords]);

  // Filter Records by Month using COLLECTION DATE
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => r.collectionDate.startsWith(filterMonth));
  }, [allRecords, filterMonth]);

  const availableEmployees = employees;

  const availableCenters = useMemo(() => {
      if (!activeContext) return [];
      return centers.filter(c => c.branchId === activeContext.branchId);
  }, [centers, activeContext]);

  const isNewCenter = useMemo(() => {
      const code = parseInt(centerCodeInput);
      if (isNaN(code) || !centerCodeInput) return false;
      return !availableCenters.some(c => c.centerCode === code);
  }, [centerCodeInput, availableCenters]);

  useEffect(() => {
      if (isNewCenter && !lockedCenterCode) {
          const code = parseInt(centerCodeInput);
          if (!isNaN(code)) {
              setNewCenterType(code % 2 !== 0 ? 'OWN' : 'OFFICE');
          }
          setNewCenterName('');
          setNewMemberCount('');
      }
  }, [centerCodeInput, isNewCenter, lockedCenterCode]);

  const getCenterType = (code: number, branchId: string, collectingEmpId: string): 'OWN' | 'OFFICE' => {
    const configuredCenter = centers.find(c => c.centerCode === code && c.branchId === branchId);
    if (configuredCenter) {
        if (configuredCenter.type === 'OFFICE') return 'OFFICE';
        if (configuredCenter.assignedEmployeeId === collectingEmpId) return 'OWN';
        return 'OFFICE';
    }
    if (isNewCenter) return newCenterType;
    return code % 2 !== 0 ? 'OWN' : 'OFFICE';
  };

  const currentCenterType = useMemo(() => {
      const code = parseInt(centerCodeInput);
      if (isNaN(code) || !activeContext) return null;
      return getCenterType(code, activeContext.branchId, activeContext.employeeId);
  }, [centerCodeInput, activeContext, centers, isNewCenter, newCenterType]);

  const matchedCenter = useMemo(() => {
      const code = parseInt(centerCodeInput);
      if (isNaN(code)) return null;
      return availableCenters.find(c => c.centerCode === code) || null;
  }, [centerCodeInput, availableCenters]);

  const handleLockContext = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!selectedBranchId || !selectedEmployeeId) {
        alert("Please select both a Branch and an Employee.");
        return;
    }
    setActiveContext({ 
        branchId: selectedBranchId, 
        employeeId: selectedEmployeeId 
    });
    // Focus logic handled by useEffect on activeContext change
  };

  const handleUnlockContext = () => {
    if (readOnly) return;
    if (lockedCenterCode) {
        alert("Cannot change context while Center Code is locked. Please Reset/Finish the current center first.");
        return;
    }
    setActiveContext(null);
    setCenterCodeInput('');
    setAmountInput('');
    setLoanInput('');
    setNewCenterName('');
    setNewMemberCount('');
  };

  const handleResetCenter = () => {
      if (stagedRecords.length > 0) {
          if(!confirm("You have pending unsaved records. Resetting will allow you to change the Center Code, but you should submit the pending records first if they belong to the current center. \n\nContinue to reset center code?")) {
              return;
          }
      }
      setLockedCenterCode(null);
      setCenterCodeInput('');
      setAmountInput('');
      setLoanInput('');
      setNewCenterName('');
      setNewMemberCount('');
      setTimeout(() => {
          if (centerCodeInputRef.current) centerCodeInputRef.current.focus();
      }, 50);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!activeContext || !centerCodeInput) return;

    const targetBranchId = activeContext.branchId;
    const targetEmployeeId = activeContext.employeeId;

    if (!targetBranchId) { alert("Critical Error: No branch in active context."); return; }

    // --- LOGIC: INDEPENDENT TABS ---
    // Only capture the value of the CURRENT ACTIVE TAB
    const amount = activeTab === 'SAVINGS' ? (parseFloat(amountInput) || 0) : 0;
    const loanAmount = activeTab === 'LOAN' ? (parseFloat(loanInput) || 0) : 0;
    const code = parseInt(centerCodeInput);

    // Strict Validation for Active Tab
    if (activeTab === 'SAVINGS') {
        if (isNaN(amount) || amount <= 0) { alert("Please enter a valid Savings amount."); return; }
    } else {
        if (isNaN(loanAmount) || loanAmount <= 0) { alert("Please enter a valid Loan amount."); return; }
    }

    if (isNaN(code) || code <= 0) { alert("Invalid Center Code"); return; }

    // --- LOCKING LOGIC ---
    if (!lockedCenterCode) {
        setLockedCenterCode(centerCodeInput);
    } else if (code !== parseInt(lockedCenterCode)) {
        alert("Center Code Mismatch! You cannot change the center code in this session without resetting.");
        setCenterCodeInput(lockedCenterCode);
        return;
    }

    if (isNewCenter && onCreateCenter) {
        // Validate new center member count if creating on the fly
        const mCount = parseInt(newMemberCount);
        if (isNaN(mCount) || mCount < 1) {
            alert("Please enter valid Member Count (Min 1) for the new center.");
            return;
        }
        
        onCreateCenter({
            centerCode: code,
            centerName: newCenterName.trim() || `Center ${code}`,
            branchId: targetBranchId,
            assignedEmployeeId: targetEmployeeId,
            type: newCenterType,
            memberCount: mCount
        });
    }

    const type = getCenterType(code, targetBranchId, targetEmployeeId);
    
    // Generate IDs locally for immediate optimistic update
    const tempIdPrefix = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRecords: CenterCollectionRecord[] = [];

    // Push record based on active tab
    if (activeTab === 'SAVINGS' && amount > 0) {
        newRecords.push({
            id: `${tempIdPrefix}_S`,
            collectionDate: collectionDateInput,
            submittedAt: new Date().toISOString(),
            branchId: targetBranchId, 
            employeeId: targetEmployeeId, 
            centerCode: code,
            amount: amount,
            loanAmount: 0,
            type: type,
            status: 'PENDING'
        });
    }

    if (activeTab === 'LOAN' && loanAmount > 0) {
        newRecords.push({
            id: `${tempIdPrefix}_L`,
            collectionDate: collectionDateInput,
            submittedAt: new Date().toISOString(),
            branchId: targetBranchId, 
            employeeId: targetEmployeeId, 
            centerCode: code,
            amount: 0, 
            loanAmount: loanAmount, 
            type: type,
            status: 'PENDING'
        });
    }

    // AUTO-SAVE LOGIC
    if (autoSave && onBulkAddRecords) {
        // 1. Optimistic Update: Add to transient list immediately so table updates
        setOptimisticRecords(prev => [...newRecords, ...prev]);
        setIsSyncing(true);
        
        try {
            // 2. Call API
            await onBulkAddRecords(newRecords);
            // 3. Success: Remove from optimistic (they should now be in props.records)
            const idsToRemove = new Set(newRecords.map(r => r.id));
            setOptimisticRecords(prev => prev.filter(r => !idsToRemove.has(r.id)));
        } catch (err) {
            console.error(err);
            alert("Auto-save failed. Adding to pending list instead.");
            // 4. Failure: Move from optimistic to staged
            const idsToRemove = new Set(newRecords.map(r => r.id));
            setOptimisticRecords(prev => prev.filter(r => !idsToRemove.has(r.id)));
            setStagedRecords(prev => [...newRecords, ...prev]);
        } finally {
            setIsSyncing(false);
        }
    } else {
        // Manual Mode: Just add to staged
        setStagedRecords(prev => [...newRecords, ...prev]);
    }

    // CLEANUP - ONLY CLEAR ACTIVE FIELD
    if (activeTab === 'SAVINGS') {
        setAmountInput('');
        // Maintain focus on savings input
        if (savingsInputRef.current) savingsInputRef.current.focus();
    } else {
        setLoanInput('');
        // Maintain focus on loan input
        if (loanInputRef.current) loanInputRef.current.focus();
    }
    
    // Do NOT clear Center Code (handled by lock)
    // Do NOT switch tabs (Independent behavior rule)
  };

  const handleFinalSubmit = async () => {
      if (readOnly) return;
      if (!onBulkAddRecords || stagedRecords.length === 0) return;
      
      // 1. Optimistic Update: Move from Staged to Optimistic
      // This keeps them visible in 'allRecords' during the API call
      setOptimisticRecords(prev => [...stagedRecords, ...prev]);
      setStagedRecords([]); 
      setIsSyncing(true);
      
      try {
        await onBulkAddRecords(stagedRecords);
        // Success: Clear optimistic (they are now in props)
        setOptimisticRecords([]);
      } catch (error) {
        console.error("Sync failed", error);
        alert("Failed to sync records. Please try again.");
        // Revert: Move back to staged
        setStagedRecords(prev => [...prev, ...optimisticRecords]); // Restore
        setOptimisticRecords([]);
      } finally {
        setIsSyncing(false);
      }
  };

  const handleEditClick = (record: CenterCollectionRecord) => {
    if (!isAdmin || readOnly) return;
    setEditingRecord(record);
    setEditAdminOverride(false);
  };

  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || readOnly) return;
    
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
    let ownSavings = 0; let ownLoan = 0; let officeSavings = 0; let officeLoan = 0;
    const ownMap = new Set<string>(); const officeMap = new Set<string>();

    filteredRecords.forEach(r => {
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

    return { ownCount: ownMap.size, ownSavings, ownLoan, officeCount: officeMap.size, officeSavings, officeLoan };
  }, [filteredRecords, centers]);

  const recentRecords = useMemo(() => {
    // Sort by submittedAt if available, else collectionDate
    return [...filteredRecords].sort((a, b) => {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.collectionDate).getTime();
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : new Date(b.collectionDate).getTime();
        return timeB - timeA;
    }).slice(0, 50);
  }, [filteredRecords]);

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
                <span className="text-xs font-bold text-slate-500">View Month:</span>
                <input 
                    type="month" 
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-700 font-medium focus:ring-0 outline-none py-1"
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                                    {availableEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg font-bold shadow-sm flex justify-center items-center gap-2 transition-all">Start Collection <ArrowRight size={16} /></button>
                    </form>
                </div>
            ) : (
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-md border border-slate-700 animate-in fade-in">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Context</span>
                        {!isNormalUser && !lockedCenterCode && (
                            <button type="button" onClick={handleUnlockContext} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1"><RefreshCw size={10} /> Change</button>
                        )}
                    </div>
                    <div className="font-bold text-lg leading-tight mb-1">{getBranchName(activeContext.branchId)}</div>
                    <div className="text-sm text-slate-300 flex items-center gap-2"><UserIcon size={14} /> {getEmployeeName(activeContext.employeeId)}</div>
                </div>
            )}

            {/* STEP 2: FAST ENTRY */}
            {activeContext && (
                <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden flex-1 flex flex-col animate-in slide-in-from-bottom-2">
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                        <h3 className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2"><Plus size={16} /> Add Deposit</h3>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-indigo-700 cursor-pointer select-none flex items-center gap-1">
                                <input 
                                    type="checkbox" 
                                    checked={autoSave} 
                                    onChange={(e) => setAutoSave(e.target.checked)} 
                                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500" 
                                />
                                Auto-Save
                            </label>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSubmitDeposit} className="p-6 space-y-5 flex-1 flex flex-col justify-center">
                        
                        {/* COLLECTION DATE INPUT */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase">Collection Date:</span>
                            <input 
                                type="date" 
                                required
                                value={collectionDateInput}
                                onChange={e => setCollectionDateInput(e.target.value)}
                                className="bg-transparent font-bold text-slate-800 text-sm outline-none flex-1"
                            />
                        </div>

                        {/* CENTER CODE */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Somity / Center Code</label>
                                {currentCenterType && <span className={`px-1.5 rounded text-[10px] font-bold ${currentCenterType === 'OWN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{currentCenterType}</span>}
                            </div>
                            <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {lockedCenterCode ? <LockKeyhole size={18} className="text-rose-500" /> : null}
                                    </div>
                                    <input 
                                        ref={centerCodeInputRef}
                                        type="number"
                                        value={centerCodeInput}
                                        onChange={e => setCenterCodeInput(e.target.value)}
                                        className={`w-full text-center py-2.5 border-2 rounded-lg outline-none font-mono text-xl font-bold tracking-widest transition-colors
                                            ${lockedCenterCode 
                                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed pl-8' 
                                                : 'bg-slate-50 text-slate-700 border-slate-200 focus:border-indigo-500 focus:bg-white'
                                            }`}
                                        placeholder="Code"
                                        autoFocus={!lockedCenterCode}
                                        readOnly={!!lockedCenterCode}
                                        list={!lockedCenterCode ? "available-centers" : undefined}
                                    />
                                    {lockedCenterCode && (
                                        <button 
                                            type="button" 
                                            onClick={handleResetCenter}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 border border-rose-200 transition-colors"
                                            title="Reset / New Sheet"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    )}
                                    {matchedCenter && !lockedCenterCode && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-3 w-40 text-xs text-slate-500 font-medium truncate hidden xl:block">
                                            <div className="flex items-center gap-1 font-bold text-slate-700 mb-0.5"><MapPin size={12} /> {matchedCenter.centerName}</div>
                                            {matchedCenter.memberCount ? <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded w-fit flex items-center gap-1"><Users size={8}/> {matchedCenter.memberCount} Members</div> : null}
                                        </div>
                                    )}
                            </div>
                            
                            {isNewCenter && centerCodeInput && !lockedCenterCode && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col gap-2 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-yellow-700 flex items-center gap-1"><Plus size={10} /> New Center Setup</span>
                                        <div className="flex gap-2">
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer select-none"><input type="radio" checked={newCenterType === 'OWN'} onChange={() => setNewCenterType('OWN')} className="text-blue-600 focus:ring-blue-500 w-3 h-3" /> OWN</label>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer select-none"><input type="radio" checked={newCenterType === 'OFFICE'} onChange={() => setNewCenterType('OFFICE')} className="text-emerald-600 focus:ring-emerald-500 w-3 h-3" /> OFFICE</label>
                                        </div>
                                    </div>
                                    <input type="text" value={newCenterName} onChange={(e) => setNewCenterName(e.target.value)} placeholder="Enter Center Name" className="w-full text-xs border border-yellow-300 rounded px-2 py-1 focus:ring-1 focus:ring-yellow-500 outline-none bg-white placeholder:text-slate-400 text-slate-700 font-medium" autoComplete="off" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Members:</span>
                                        <input type="number" min="1" max="100" value={newMemberCount} onChange={(e) => setNewMemberCount(e.target.value)} placeholder="Count" className="w-20 text-xs border border-yellow-300 rounded px-2 py-1 focus:ring-1 focus:ring-yellow-500 outline-none bg-white font-bold" />
                                    </div>
                                </div>
                            )}
                            <datalist id="available-centers">
                                {availableCenters.map(c => <option key={c.id} value={c.centerCode}>{c.centerName}</option>)}
                            </datalist>
                        </div>

                        {/* --- TABS --- */}
                        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setActiveTab('SAVINGS')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'SAVINGS' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Wallet size={14} /> Savings
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('LOAN')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'LOAN' ? 'bg-white text-purple-700 shadow-sm border border-purple-100' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <CreditCard size={14} /> Loan / Due
                            </button>
                        </div>

                        {/* INPUTS (CONDITIONAL) */}
                        {activeTab === 'SAVINGS' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Savings Collection</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input ref={savingsInputRef} type="number" min="0" value={amountInput} onChange={e => setAmountInput(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-2xl text-slate-800 transition-all placeholder:text-slate-300" placeholder="0.00" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'LOAN' && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Collection (Due)</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input ref={loanInputRef} type="number" min="0" value={loanInput} onChange={e => setLoanInput(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-purple-100 bg-purple-50/30 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-bold text-2xl text-slate-800 transition-all placeholder:text-slate-300" placeholder="0.00" />
                                </div>
                            </div>
                        )}

                        {activeGroupStats && activeGroupStats.count > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm space-y-1">
                                <div className="flex justify-between items-center text-slate-500">
                                    <span className="font-bold text-slate-700">{activeGroupStats.count}</span> deposits <span className="text-xs text-slate-400">({filterMonth})</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-mono">
                                    <span className="text-slate-500">Savings: <span className="font-bold text-indigo-700">৳{activeGroupStats.savingsTotal.toLocaleString()}</span></span>
                                    <span className="text-slate-500">Loan: <span className="font-bold text-purple-700">৳{activeGroupStats.loanTotal.toLocaleString()}</span></span>
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isSyncing}
                            className={`w-full py-3 rounded-lg font-bold shadow-md active:scale-[0.98] transition-all flex justify-center items-center gap-2 text-white ${
                                isSyncing 
                                ? 'bg-slate-400 cursor-not-allowed' 
                                : (autoSave ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200')
                            }`}
                        >
                            {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : (autoSave ? <Zap size={18} /> : <Plus size={18} />)}
                            <span>{isSyncing ? 'Saving...' : (autoSave ? 'Save Deposit' : `Add ${activeTab === 'SAVINGS' ? 'Savings' : 'Loan'} to Pending`)}</span>
                        </button>

                        {stagedRecords.length > 0 && (
                            <button type="button" onClick={handleFinalSubmit} disabled={isSyncing} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold shadow-md shadow-amber-200 active:scale-[0.98] transition-all flex justify-center items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                <span>Final Submit ({stagedRecords.length} Pending)</span>
                            </button>
                        )}
                        {stagedRecords.length > 0 && (
                            <p className="text-[10px] text-center text-amber-600 font-medium">⚠️ {stagedRecords.length} records pending. Do not close tab.</p>
                        )}
                    </form>
                </div>
            )}
            </div>
        ) : (
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
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors"></div>
                 <div className="relative z-10">
                    <h4 className="text-blue-800 font-bold text-sm uppercase mb-1">Own Savings <span className="text-[10px] text-blue-400 font-normal">({filterMonth})</span></h4>
                    <div className="flex items-end gap-2"><span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">৳{globalSummary.ownSavings.toLocaleString()}</span></div>
                    <div className="text-xs text-slate-500 mt-2">From <span className="font-bold text-slate-700">{globalSummary.ownCount}</span> unique centers</div>
                 </div>
              </div>
              {/* ... other cards (Loan, Office etc) ... */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:bg-emerald-100 transition-colors"></div>
                 <div className="relative z-10">
                    <h4 className="text-emerald-800 font-bold text-sm uppercase mb-1">Office Savings</h4>
                    <div className="flex items-end gap-2"><span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">৳{globalSummary.officeSavings.toLocaleString()}</span></div>
                 </div>
              </div>
           </div>

           {/* List */}
           <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                 <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Archive size={14} /> Entries</h4>
                 <div className="flex items-center gap-3">
                    {(stagedRecords.length > 0 || optimisticRecords.length > 0) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 font-bold animate-pulse">
                            <Clock size={10} /> 
                            {isSyncing ? 'Syncing...' : `${stagedRecords.length} Pending`}
                        </span>
                    )}
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Viewing:</span>
                        <input 
                            type="month" 
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-transparent border-none text-[10px] text-slate-600 font-bold focus:ring-0 outline-none p-0 w-20 cursor-pointer hover:text-indigo-600 transition-colors"
                        />
                    </div>
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
                             <th className="p-3 font-semibold text-center">Date</th>
                             <th className="p-3 font-semibold text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {recentRecords.map(r => {
                             const isPending = r.status === 'PENDING';
                             // Identify if it's optimistic (in optimistic list but NOT in staged list, though logic might overlap)
                             // Simple check: if in optimistic list
                             const isOptimistic = optimisticRecords.some(o => o.id === r.id);
                             
                             return (
                                 <tr key={r.id} className={`hover:bg-slate-50 transition-colors group ${isOptimistic ? 'bg-indigo-50/40' : (isPending ? 'bg-amber-50/50' : '')}`}>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{getEmployeeName(r.employeeId)}</span>
                                            <span className="text-[10px] text-slate-400">{getBranchName(r.branchId)}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="font-mono font-bold text-slate-700">{r.centerCode}</div>
                                        <div className={`text-[9px] font-bold px-1 rounded inline-block ${r.type === 'OWN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{r.type}</div>
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-700">{r.amount > 0 ? `৳${r.amount.toLocaleString()}` : '-'}</td>
                                    <td className="p-3 text-right font-medium text-slate-700">{r.loanAmount && r.loanAmount > 0 ? `৳${r.loanAmount.toLocaleString()}` : '-'}</td>
                                    <td className="p-3 text-center text-xs">
                                        <div className="font-bold text-slate-700">{r.collectionDate}</div>
                                        {r.submittedAt && <div className="text-[9px] text-slate-400">Ent: {r.submittedAt.slice(0,10)}</div>}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isOptimistic ? (
                                                <RefreshCw size={14} className="text-indigo-400 animate-spin" />
                                            ) : (
                                                <>
                                                    {isAdmin && !readOnly && !isPending && (
                                                        <button onClick={() => handleEditClick(r)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded border border-slate-200 transition-colors shadow-sm"><Edit2 size={14} /></button>
                                                    )}
                                                    {!readOnly && (isAdmin || isPending) && (
                                                        <button onClick={() => handleDeleteClick(r.id, isPending)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded border border-slate-200 transition-colors shadow-sm"><Trash2 size={14} /></button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                 </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 ) : (
                    <div className="p-8 text-center text-slate-400 italic">No entries for this month yet.</div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm uppercase">Edit Entry</h3>
                    <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleUpdateRecord} className="p-5 space-y-4">
                    {/* Admin Override Warning */}
                    {!editingRecord.status && !editAdminOverride && (
                       <div className="text-xs bg-amber-50 border border-amber-100 p-3 rounded text-amber-800 flex gap-2">
                           <AlertTriangle size={16} className="shrink-0" />
                           <div>
                               <p className="font-bold mb-1">Editing Synced Record</p>
                               <p>Changing amounts directly affects financial reports. Proceed with caution.</p>
                               <button type="button" onClick={() => setEditAdminOverride(true)} className="mt-2 text-[10px] bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded font-bold text-amber-900 transition-colors">I Understand, Enable Editing</button>
                           </div>
                       </div>
                    )}

                    <div className={`space-y-4 transition-opacity ${(!editingRecord.status && !editAdminOverride) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Collection Date</label>
                            <input 
                                type="date" 
                                value={editingRecord.collectionDate} 
                                onChange={e => setEditingRecord({...editingRecord, collectionDate: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
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
