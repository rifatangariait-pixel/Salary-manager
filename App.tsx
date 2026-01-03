
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LayoutDashboard, Table, Settings, Save, Download, FileSpreadsheet, Printer, LogOut, ChevronDown, FileText, UserPlus, FilePlus, Building, Users, Calculator, PieChart, MapPin, Trophy, Languages, Percent, RefreshCw, Check, Target as TargetIcon, ShieldAlert } from 'lucide-react';
import { SalaryEntry, SalarySheet, SalaryRow, User, Employee, AccountOpening, Branch, CenterCollectionRecord, Center, CommissionStructure, DEFAULT_COMMISSION_RATES, Target } from './types';
import { createEmptyEntry, recalculateEntry } from './services/logic';
import { exportToCSV } from './services/exportService';
import { translations, Language } from './services/translations';
import { googleSheetService } from './services/googleSheetService';
import Dashboard from './components/Dashboard';
import SalaryTable from './components/SalaryTable';
import AccountReport from './components/AccountReport';
import AddEmployeeForm from './components/AddEmployeeForm';
import AddAccountForm from './components/AddAccountForm';
import ManageBranches from './components/ManageBranches';
import ManageUsers from './components/ManageUsers';
import CenterCalculation from './components/CenterCalculation';
import CenterReport from './components/CenterReport';
import ManageCenters from './components/ManageCenters';
import Leaderboard from './components/Leaderboard';
import ManageCommissions from './components/ManageCommissions';
import ManageTargets from './components/ManageTargets';
import Login from './components/Login';

enum View {
  DASHBOARD = 'DASHBOARD',
  SHEET = 'SHEET',
  REPORT = 'REPORT',
  CENTER_REPORT = 'CENTER_REPORT',
  ADD_EMPLOYEE = 'ADD_EMPLOYEE',
  ADD_ACCOUNT = 'ADD_ACCOUNT',
  MANAGE_BRANCHES = 'MANAGE_BRANCHES',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_CENTERS = 'MANAGE_CENTERS',
  MANAGE_COMMISSIONS = 'MANAGE_COMMISSIONS',
  MANAGE_TARGETS = 'MANAGE_TARGETS',
  CENTER_CALC = 'CENTER_CALC',
  LEADERBOARD = 'LEADERBOARD',
}

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('salary_app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  
  // App Data (Loaded from Sheets)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<AccountOpening[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [centerRecords, setCenterRecords] = useState<CenterCollectionRecord[]>([]);
  const [commissionRates, setCommissionRates] = useState<Record<string, CommissionStructure>>(DEFAULT_COMMISSION_RATES);
  const [targets, setTargets] = useState<Target[]>([]);

  // Salary Sheet State
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<SalarySheet | null>(null);
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- PERMISSION LOGIC ---
  // System Admin: Only Super Admin can manage users and targets
  const isSystemAdmin = user?.role === 'SUPER_ADMIN';
  
  // Global Ops: Super Admin, Admin, Owner can see all data and perform operations
  // Auditor is also Global View but Read Only (handled in component logic usually)
  const isGlobalOps = ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(user?.role || '');
  
  const isManager = user?.role === 'MANAGER';
  const isNormalUser = user?.role === 'USER';
  
  // Logic for ReadOnly status on Sheet View (default to false for generated sheets)
  const isSheetReadOnly = false;

  // --- USER DISPLAY TITLE LOGIC ---
  const userRoleDisplay = useMemo(() => {
    if (!user) return '';
    const r = user.role;
    
    if (r === 'SUPER_ADMIN') return 'SUPER ADMIN';
    
    // High privilege / Global roles
    if (r === 'ADMIN' || r === 'OWNER' || r === 'AUDITOR') {
        return `${r} - ALL BRANCHES`;
    }

    // Branch bound roles
    // We attempt to find branch name even if branches aren't fully loaded yet (fallback)
    const branchName = branches.find(b => b.id === user.branch_id)?.name.toUpperCase() || 'UNASSIGNED';
    
    if (r === 'MANAGER') return `BRANCH MANAGER - ${branchName}`;
    if (r === 'USER') return `FIELD OFFICER - ${branchName}`;
    
    return `${(r as string).replace('_', ' ')} - ${branchName}`;
  }, [user, branches]);

  // --- DATA LOADING ---
  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const [b, e, a, u, c, cr, comms, t] = await Promise.all([
            googleSheetService.getBranches(),
            googleSheetService.getEmployees(),
            googleSheetService.getAccounts(),
            googleSheetService.getUsers(),
            googleSheetService.getCenters(),
            googleSheetService.getCollections(),
            googleSheetService.getCommissions(),
            googleSheetService.getTargets()
        ]);

        setBranches(b);
        setEmployees(e);
        setAccounts(a);
        setUsers(u);
        setCenters(c);
        setCenterRecords(cr);
        if (Object.keys(comms).length > 0) setCommissionRates(comms);
        setTargets(t);
    } catch (err) {
        console.error("Failed to load data", err);
        // Fallback or Toast here
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
        sessionStorage.setItem('salary_app_user', JSON.stringify(user));
        loadAllData();
    } else {
        sessionStorage.removeItem('salary_app_user');
    }
  }, [user]);

  // Initial Access Token Check
  useEffect(() => {
      const token = localStorage.getItem('google_access_token');
      if (token) googleSheetService.setAccessToken(token);
  }, []);

  // --- CRUD HANDLERS (Wrappers around Service) ---
  
  const handleAddBranch = async (data: any) => {
      setLoading(true);
      await googleSheetService.addBranch({ id: generateId(), ...data, status: 'ACTIVE' });
      await loadAllData();
  };

  const handleBulkAddBranches = async (newBranches: { name: string, address?: string, phone?: string }[]) => {
      setLoading(true);
      try {
          const branchesToAdd = newBranches.map(b => ({
              ...b,
              id: generateId(),
              status: 'ACTIVE' as const
          }));
          await googleSheetService.addBranches(branchesToAdd);
          await loadAllData(); // Force refresh to update UI
      } catch (err) {
          console.error("Bulk add branches failed", err);
          alert("Failed to save branches.");
      } finally {
          setLoading(false);
      }
  };

  const handleAddEmployee = async (data: any) => {
      setLoading(true);
      await googleSheetService.addEmployee({ ...data, id: data.id || generateId(), status: 'ACTIVE' });
      await loadAllData();
  };

  const handleEditEmployee = async (id: string, data: Partial<Employee>) => {
      setLoading(true);
      try {
          // Find original to get rowIndex
          const original = employees.find(e => e.id === id);
          if (!original) {
              alert("Employee record not found in local state.");
              return;
          }
          
          const updatedEmployee: Employee = {
              ...original,
              ...data
          };
          
          await googleSheetService.updateEmployee(updatedEmployee);
          await loadAllData(); // Refresh to see changes
      } catch (err) {
          console.error("Update failed", err);
          alert("Failed to update employee.");
      } finally {
          setLoading(false);
      }
  };

  const handleBulkAddEmployees = async (newEmployees: Employee[]) => {
      setLoading(true);
      try {
          const employeesToAdd = newEmployees.map(e => ({
              ...e,
              id: e.id || generateId(),
              status: 'ACTIVE' as const
          }));
          await googleSheetService.addEmployees(employeesToAdd);
          await loadAllData();
      } catch (err) {
          console.error("Bulk add failed", err);
          alert("Failed to save employees.");
      } finally {
          setLoading(false);
      }
  };

  const handleAddAccount = async (data: any) => {
      // Legacy single add - mostly replaced by bulk flow now
      setLoading(true);
      await googleSheetService.addAccount({ ...data, id: Date.now(), status: 'ACTIVE' });
      await loadAllData();
  };

  const handleBulkAddAccounts = async (newAccounts: Omit<AccountOpening, 'id'>[]) => {
      setLoading(true);
      try {
          // Generate IDs sequentially for stability
          const now = Date.now();
          const accountsToAdd = newAccounts.map((acc, index) => ({
              ...acc,
              id: now + index,
              status: 'ACTIVE' as const
          }));
          await googleSheetService.addAccounts(accountsToAdd);
          await loadAllData();
      } catch (err) {
          console.error("Bulk account add failed", err);
          alert("Failed to save accounts transaction. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  const handleAddUser = async (data: any) => {
      setLoading(true);
      await googleSheetService.addUser({ ...data, id: generateId(), status: 'ACTIVE' });
      await loadAllData();
  };

  const handleAddCenter = async (data: any, silent = false) => {
      if (!silent) setLoading(true);
      
      const newCenter = { ...data, id: data.id || generateId(), status: 'ACTIVE' };
      
      // Optimistic update for responsiveness
      setCenters(prev => [...prev, newCenter]);

      try {
          await googleSheetService.addCenter(newCenter);
          if (!silent) await loadAllData();
      } catch (err) {
          console.error("Failed to add center", err);
          if (!silent) alert("Failed to add center to database. Please retry.");
      } finally {
          if (!silent) setLoading(false);
      }
  };

  const handleEditCenter = async (id: string, data: Partial<Center>) => {
      setLoading(true);
      try {
          const original = centers.find(c => c.id === id);
          if (!original) {
              alert("Center not found locally.");
              return;
          }
          const updated: Center = { ...original, ...data };
          await googleSheetService.updateCenter(updated);
          await loadAllData();
      } catch (err) {
          console.error("Failed to update center", err);
          alert("Failed to update center. Check console/logs.");
      } finally {
          setLoading(false);
      }
  };

  // Singular add - kept for compatibility
  const handleAddCenterRecord = async (data: any) => {
      setLoading(true);
      await googleSheetService.addCollections([{ id: generateId(), createdAt: new Date().toISOString(), ...data }]);
      await loadAllData();
  };

  // Bulk add handler for sync
  const handleBulkAddCenterRecords = async (records: CenterCollectionRecord[]) => {
      setLoading(true);
      try {
          await googleSheetService.addCollections(records);
          await loadAllData();
      } catch (err) {
          console.error("Bulk sync failed", err);
          alert("Failed to sync records to Google Sheets. Please check connection.");
      } finally {
          setLoading(false);
      }
  };

  const handleSaveTarget = async (target: Target) => {
      setLoading(true);
      try {
          await googleSheetService.saveTarget(target);
          await loadAllData();
      } catch (err) {
          console.error("Failed to save target", err);
          alert("Failed to save target.");
      } finally {
          setLoading(false);
      }
  };

  // UI Filtering
  const visibleBranches = useMemo(() => {
    if (isGlobalOps) {
        // If branches are selected, filter for dashboard, otherwise show all
        return selectedBranchIds.length > 0 
            ? branches.filter(b => selectedBranchIds.includes(b.id)) 
            : branches;
    }
    if ((isManager || isNormalUser) && user?.branch_id) return branches.filter(b => b.id === user.branch_id);
    return [];
  }, [branches, user, isGlobalOps, isManager, isNormalUser, selectedBranchIds]);

  const visibleEmployees = useMemo(() => {
    if (isNormalUser && user?.employee_id) return employees.filter(e => e.id === user.employee_id);
    if (isGlobalOps) return employees;
    if (isManager && user?.branch_id) return employees.filter(e => e.branch_id === user.branch_id);
    return [];
  }, [employees, user, isGlobalOps, isManager, isNormalUser]);

  const visibleAccounts = useMemo(() => {
    if (isGlobalOps) return accounts;
    if (isManager && user?.branch_id) return accounts.filter(a => a.branch_id === user.branch_id);
    if (isNormalUser && user?.employee_id) return accounts.filter(a => a.opened_by_employee_id === user.employee_id);
    return [];
  }, [accounts, user, isGlobalOps, isManager, isNormalUser]);
  
  const visibleCenters = useMemo(() => {
      if (isGlobalOps) return centers;
      if ((isManager || isNormalUser) && user?.branch_id) return centers.filter(c => c.branchId === user.branch_id);
      return [];
  }, [centers, user, isGlobalOps, isManager, isNormalUser]);

  // Generation Logic
  const handleGenerate = () => {
    if (isNormalUser) { alert("Access Denied."); return; }

    let targetBranches = selectedBranchIds;
    if (isManager && user?.branch_id) {
       targetBranches = [user.branch_id];
       setSelectedBranchIds(targetBranches);
    }

    if (targetBranches.length === 0) { alert("Please select at least one branch."); return; }

    const newSheet: SalarySheet = {
      id: generateId(),
      month: selectedMonth,
      branch_ids: targetBranches,
      created_at: new Date().toISOString()
    };

    const targetEmployees = employees.filter(e => targetBranches.includes(e.branch_id));
    
    const newEntries = targetEmployees.map(emp => {
        return recalculateEntry(
          createEmptyEntry(newSheet.id, emp.id, emp.base_salary, emp.commission_type), 
          emp.base_salary,
          commissionRates
        );
    });

    setCurrentSheet(newSheet);
    setEntries(newEntries);
    setIsGenerated(true);
    setCurrentView(View.SHEET);
  };

  const handleUpdateRow = (updatedEntry: SalaryEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  };

  const handleAccountScanned = (code: string) => {
    const normalizedCode = code.trim().toLowerCase();
    setAccounts(prev => prev.map(acc => {
      if (acc.account_code.toLowerCase() === normalizedCode) {
        return {
          ...acc,
          is_counted: true,
          counted_month: selectedMonth,
          salary_sheet_id: currentSheet ? currentSheet.id : null
        };
      }
      return acc;
    }));
  };

  // Grid Calculation
  const gridRows: SalaryRow[] = useMemo(() => {
    if (isNormalUser) return [];

    // --- CALCULATE BRANCH TOTALS ---
    const branchTotals: Record<string, number> = {};
    
    // 1. Sum System Records (centerRecords)
    centerRecords.forEach(r => {
        if (r.createdAt.startsWith(selectedMonth)) {
            const total = r.amount + (r.loanAmount || 0);
            branchTotals[r.branchId] = (branchTotals[r.branchId] || 0) + total;
        }
    });

    // 2. Sum Manual Entries in current sheet
    entries.forEach(e => {
        const emp = employees.find(emp => emp.id === e.employee_id);
        if (emp && emp.branch_id) {
            branchTotals[emp.branch_id] = (branchTotals[emp.branch_id] || 0) + (e.center_collection || 0);
        }
    });

    // Map System Records to Employees
    const recordsByEmp: Record<string, CenterCollectionRecord[]> = {};
    centerRecords.forEach(r => {
      if (!recordsByEmp[r.employeeId]) recordsByEmp[r.employeeId] = [];
      recordsByEmp[r.employeeId].push(r);
    });

    // Pre-compute Center Map for fast lookup (Full Object)
    const centerMap = new Map<string, Center>();
    centers.forEach(c => {
        centerMap.set(`${c.branchId}-${c.centerCode}`, c);
    });

    return entries.map(entry => {
      const employee = employees.find(e => e.id === entry.employee_id);
      if (!employee) return null;
      if (isManager && user?.branch_id && employee.branch_id !== user.branch_id) return null;

      const branch = branches.find(b => b.id === employee.branch_id) || { id: 'unknown', name: 'Unknown' } as Branch;

      const empRecords = recordsByEmp[entry.employee_id] || [];
      const currentMonthRecords = empRecords.filter(r => r.createdAt.startsWith(selectedMonth));

      // DYNAMIC OWNERSHIP LOGIC
      const ownRecords: CenterCollectionRecord[] = [];
      const offRecords: CenterCollectionRecord[] = [];

      currentMonthRecords.forEach(r => {
          const centerKey = `${r.branchId}-${r.centerCode}`;
          const center = centerMap.get(centerKey);
          
          let isOwn = false;

          if (center) {
              // 1. Force OFFICE if type explicitly set in master
              if (center.type === 'OFFICE') {
                  isOwn = false; 
              } 
              // 2. Otherwise apply ownership rule
              else {
                  isOwn = center.assignedEmployeeId === entry.employee_id;
              }
          } else {
              // Center not found in config: Fallback to static type from record
              isOwn = r.type === 'OWN';
          }

          if (isOwn) ownRecords.push(r);
          else offRecords.push(r);
      });

      const own_somity_collection = ownRecords.reduce((sum, r) => sum + r.amount, 0);
      const own_somity_count = new Set(ownRecords.map(r => r.centerCode)).size;

      const office_somity_collection = offRecords.reduce((sum, r) => sum + r.amount, 0);
      const office_somity_count = new Set(offRecords.map(r => r.centerCode)).size;
      const total_loan_collection = currentMonthRecords.reduce((sum, r) => sum + (r.loanAmount || 0), 0);

      // --- MANAGER ROLE DETECTION ---
      const isBranchManager = 
          employee.designation.trim().toLowerCase() === 'branch manager' || 
          employee.designation.trim().toLowerCase() === 'branch_manager';
      
      const branchTotal = branchTotals[branch.id] || 0;

      const calculatedEntry = recalculateEntry({
        ...entry,
        own_somity_collection,
        own_somity_count,
        office_somity_collection,
        office_somity_count,
        total_loan_collection,
      }, 
      employee.base_salary,
      commissionRates,
      entry.commission_type || employee.commission_type || 'A',
      {
          isManager: isBranchManager,
          branchTotalCollection: branchTotal
      }
      );

      return { ...calculatedEntry, employee, branch };
    }).filter((row): row is SalaryRow => row !== null);
  }, [entries, employees, branches, isManager, isNormalUser, user, centerRecords, commissionRates, selectedMonth, centers]); 

  const toggleBranch = (id: string) => {
    setSelectedBranchIds(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  // Close dropdown logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return <Login onLogin={setUser} users={users} />; 
  }

  // --- ACCESS CONTROLLED VIEWS ---
  // Block access to System Users if not SUPER_ADMIN
  if (currentView === View.MANAGE_USERS && !isSystemAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
              <ShieldAlert size={48} className="text-red-500" />
              <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
                  <p className="text-slate-500">You do not have permission to manage system users.</p>
              </div>
              <button onClick={() => setCurrentView(View.DASHBOARD)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Return to Dashboard</button>
          </div>
      );
  }

  // Block access to Targets if not SUPER_ADMIN
  if (currentView === View.MANAGE_TARGETS && !isSystemAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
              <ShieldAlert size={48} className="text-red-500" />
              <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
                  <p className="text-slate-500">You do not have permission to manage targets.</p>
              </div>
              <button onClick={() => setCurrentView(View.DASHBOARD)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Return to Dashboard</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 no-print flex flex-col shadow-xl z-30">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-blue-400">Salary<span className="text-white">Manager</span></h1>
          <p className="text-xs text-slate-500 mt-1">Multi-Branch System <span className="text-slate-600 font-medium">by diviX</span></p>
        </div>
        
        <div className="px-6 py-4 flex items-center space-x-3 bg-slate-800/50 border-b border-slate-800">
          <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-600" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
              {userRoleDisplay}
            </p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {/* MENU ITEMS */}
          <button onClick={() => setCurrentView(View.DASHBOARD)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.DASHBOARD ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          
          {!isNormalUser && (
            <button onClick={() => setCurrentView(View.SHEET)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.SHEET ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Table size={20} /> <span>Salary Sheets</span>
            </button>
          )}

           <button onClick={() => setCurrentView(View.LEADERBOARD)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.LEADERBOARD ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Trophy size={20} /> <span>Top Performers</span>
           </button>

          <button onClick={() => setCurrentView(View.REPORT)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.REPORT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <FileText size={20} /> <span>Account Report</span>
          </button>

          <button onClick={() => setCurrentView(View.CENTER_CALC)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.CENTER_CALC ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Calculator size={20} /> <span>Center Calculator</span>
          </button>
          
          <button onClick={() => setCurrentView(View.CENTER_REPORT)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.CENTER_REPORT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <PieChart size={20} /> <span>Center Report</span>
          </button>

          <div className="pt-4 mt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase px-4 py-2">Management</div>
            
            {!isNormalUser && (
                <button onClick={() => setCurrentView(View.ADD_EMPLOYEE)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.ADD_EMPLOYEE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <UserPlus size={20} /> <span>Add Employee</span>
                </button>
            )}

            <button onClick={() => setCurrentView(View.ADD_ACCOUNT)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.ADD_ACCOUNT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <FilePlus size={20} /> <span>Add Account</span>
            </button>

            {isGlobalOps && (
              <>
                <button onClick={() => setCurrentView(View.MANAGE_BRANCHES)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.MANAGE_BRANCHES ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Building size={20} /> <span>Branches</span>
                </button>
                {/* Only SUPER ADMIN sees User Management */}
                {isSystemAdmin && (
                    <button onClick={() => setCurrentView(View.MANAGE_USERS)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.MANAGE_USERS ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Users size={20} /> <span>System Users</span>
                    </button>
                )}
                <button onClick={() => setCurrentView(View.MANAGE_CENTERS)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.MANAGE_CENTERS ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <MapPin size={20} /> <span>Center Mgmt</span>
                </button>
                {/* Only SUPER ADMIN sees Targets Management */}
                {isSystemAdmin && (
                    <button onClick={() => setCurrentView(View.MANAGE_TARGETS)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.MANAGE_TARGETS ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                      <TargetIcon size={20} /> <span>Manage Targets</span>
                    </button>
                )}
                <button onClick={() => setCurrentView(View.MANAGE_COMMISSIONS)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === View.MANAGE_COMMISSIONS ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Percent size={20} /> <span>Commission Setup</span>
                </button>
              </>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4 mt-auto">
            <button onClick={() => { setUser(null); sessionStorage.removeItem('salary_app_user'); }} className="w-full flex items-center space-x-2 px-4 py-2 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors text-sm font-medium">
              <LogOut size={16} /> <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {loading && (
            <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-blue-600" size={32} />
                    <span className="text-sm font-bold text-slate-600">Syncing with Google Sheets...</span>
                </div>
            </div>
        )}

        <header className="bg-white border-b border-slate-200 p-4 px-6 flex justify-between items-center shadow-sm no-print z-20">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {currentView === View.DASHBOARD && t.dashboardTitle}
            {currentView === View.SHEET && 'Salary Sheet Generator'}
            {currentView === View.REPORT && 'Account Report'}
            {currentView === View.CENTER_REPORT && 'Monthly Center Report'}
            {currentView === View.ADD_EMPLOYEE && 'Add New Employee'}
            {currentView === View.ADD_ACCOUNT && 'Add Account Opening'}
            {currentView === View.MANAGE_BRANCHES && 'Branch Management'}
            {currentView === View.MANAGE_USERS && 'User Management'}
            {currentView === View.MANAGE_CENTERS && 'Center Master List'}
            {currentView === View.MANAGE_TARGETS && 'Monthly Targets'}
            {currentView === View.CENTER_CALC && 'Center Quick Calculation'}
            {currentView === View.LEADERBOARD && 'Performance Leaderboard'}
            {currentView === View.MANAGE_COMMISSIONS && 'Commission Rates Setup'}
          </h2>
          
          <div className="flex items-center space-x-4">
             <button onClick={loadAllData} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors" title="Sync Data">
                 <RefreshCw size={18} />
             </button>
             
             {/* Branch Picker for Global Admins */}
             {(currentView === View.SHEET || currentView === View.DASHBOARD || currentView === View.LEADERBOARD) && isGlobalOps && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Building size={14} className="text-slate-500" />
                    <span>
                      {selectedBranchIds.length === 0 
                        ? 'Select Branches' 
                        : selectedBranchIds.length === branches.length 
                          ? 'All Branches' 
                          : `${selectedBranchIds.length} Selected`}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isBranchDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Filter Branches</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedBranchIds(branches.map(b => b.id))}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                          >
                            All
                          </button>
                          <button 
                            onClick={() => setSelectedBranchIds([])}
                            className="text-[10px] text-slate-400 font-bold hover:underline"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2">
                        {branches.length > 0 ? branches.map(branch => (
                          <div 
                             key={branch.id} 
                             onClick={() => toggleBranch(branch.id)}
                             className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBranchIds.includes(branch.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                              {selectedBranchIds.includes(branch.id) && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-sm text-slate-700 font-medium truncate">{branch.name}</span>
                          </div>
                        )) : (
                          <div className="p-4 text-center text-xs text-slate-400 italic">No branches found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
             )}
             
             {/* Show month selector for Manage Centers as well to filter the print report data */}
             {(currentView === View.SHEET || currentView === View.DASHBOARD || currentView === View.LEADERBOARD || currentView === View.MANAGE_CENTERS) && !isNormalUser && (
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-md border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase px-2">Month</span>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
             )}
             
             {currentView === View.SHEET && (
                 <button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm active:scale-95 flex items-center space-x-2">
                   <span>Generate</span>
                </button>
             )}
          </div>
        </header>

        {/* Content Area - Only Render if Data Loaded or Loading */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 relative">
          
          {currentView === View.DASHBOARD && (
            <Dashboard 
                branches={visibleBranches} 
                employees={visibleEmployees} 
                activeRows={gridRows} 
                accounts={visibleAccounts} 
                month={selectedMonth} 
                language={language}
                centerRecords={centerRecords}
                targets={targets}
                currentUser={{ role: user.role, employee_id: user.employee_id, branch_id: user.branch_id }}
            />
          )}

          {currentView === View.LEADERBOARD && (
            <Leaderboard rows={gridRows} branches={visibleBranches} month={selectedMonth} accounts={visibleAccounts} />
          )}

          {currentView === View.REPORT && (
            <AccountReport accounts={visibleAccounts} employees={visibleEmployees} branches={visibleBranches} onEdit={() => {}} onDelete={() => {}} userRole={user.role} />
          )}

          {currentView === View.CENTER_REPORT && (
            <CenterReport records={centerRecords} branches={visibleBranches} employees={visibleEmployees} centers={visibleCenters} />
          )}

          {currentView === View.ADD_EMPLOYEE && !isNormalUser && (
            <AddEmployeeForm 
                branches={visibleBranches} 
                existingEmployees={visibleEmployees} 
                commissionRates={commissionRates} 
                onSave={handleAddEmployee} 
                onBulkSave={handleBulkAddEmployees} 
                onEdit={handleEditEmployee}
                onDelete={() => {}} 
                userRole={user.role} 
            />
          )}
          
          {currentView === View.ADD_ACCOUNT && (
            <AddAccountForm 
              employees={visibleEmployees} 
              existingAccounts={accounts} 
              onSave={handleAddAccount} 
              onBulkSave={handleBulkAddAccounts} 
              currentUser={user} 
            />
          )}

          {currentView === View.CENTER_CALC && (
             <CenterCalculation 
                records={centerRecords} 
                onAddRecord={handleAddCenterRecord} 
                onEditRecord={() => {}} 
                onDeleteRecord={() => {}} 
                branches={branches} // Pass ALL branches to allow floating staff to select where they are collecting
                employees={isNormalUser ? visibleEmployees : employees} // Admins/Managers see all employees, Users see self
                currentUser={user} 
                centers={centers} // Pass ALL centers to allow global lookup in CenterCalculation
                // @ts-ignore
                onBulkAddRecords={handleBulkAddCenterRecords}
                onCreateCenter={(c) => handleAddCenter(c, true)}
             />
          )}

          {currentView === View.MANAGE_BRANCHES && isGlobalOps && (
            <ManageBranches branches={branches} onAdd={handleAddBranch} onEdit={() => {}} onDelete={() => {}} onBulkAdd={handleBulkAddBranches} />
          )}

          {currentView === View.MANAGE_USERS && isSystemAdmin && (
            <ManageUsers users={users} branches={branches} employees={employees} onAddUser={handleAddUser} onEditUser={() => {}} onDeleteUser={() => {}} />
          )}

          {currentView === View.MANAGE_CENTERS && isGlobalOps && (
            <ManageCenters 
                centers={centers} 
                branches={branches} 
                employees={employees} 
                records={centerRecords.filter(r => r.createdAt.startsWith(selectedMonth))} // Filter records by global month for the report
                onAdd={handleAddCenter} 
                onEdit={handleEditCenter} 
                onDelete={() => {}} 
                onBulkAdd={() => {}} 
            />
          )}

          {currentView === View.MANAGE_TARGETS && isSystemAdmin && (
            <ManageTargets 
                branches={branches} 
                employees={employees} 
                targets={targets} 
                onSaveTarget={handleSaveTarget}
            />
          )}

          {currentView === View.MANAGE_COMMISSIONS && isGlobalOps && (
            <ManageCommissions rates={commissionRates} onUpdateRates={() => {}} />
          )}

          {currentView === View.SHEET && !isNormalUser && (
            <div className="h-full flex flex-col space-y-4">
              {isGenerated ? (
                 <SalaryTable rows={gridRows} accounts={visibleAccounts} commissionRates={commissionRates} onUpdateRow={handleUpdateRow} onAccountScanned={handleAccountScanned} readOnly={isSheetReadOnly} month={selectedMonth} />
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                     <p>Select month and click Generate</p>
                 </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
