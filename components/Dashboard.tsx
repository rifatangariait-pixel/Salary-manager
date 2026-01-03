
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Branch, SalaryRow, AccountOpening, Employee, Target, CenterCollectionRecord } from '../types';
import { Users, Building, TrendingUp, FilePlus2, Trophy, Percent, Medal, Crown, Target as TargetIcon, AlertTriangle, Calendar, ChevronDown, ChevronUp, Filter, CheckCircle } from 'lucide-react';
import { translations, Language } from '../services/translations';

interface DashboardProps {
  branches: Branch[];
  employees: Employee[];
  activeRows: SalaryRow[];
  accounts: AccountOpening[];
  month: string;
  language: Language;
  centerRecords?: CenterCollectionRecord[];
  targets?: Target[];
  currentUser?: { role: string; employee_id?: string; branch_id?: string };
}

// --- HELPERS ---

const PIE_COLORS = ['#10b981', '#cbd5e1']; // Emerald and Slate

const getRankIcon = (index: number) => {
  if (index === 0) return <Crown size={16} className="text-yellow-500" fill="currentColor" />;
  if (index === 1) return <Medal size={16} className="text-slate-400" fill="currentColor" />;
  if (index === 2) return <Medal size={16} className="text-orange-400" fill="currentColor" />;
  return <span className="text-slate-400 font-bold text-xs">#{index + 1}</span>;
};

const getRankRowClass = (index: number) => {
  if (index === 0) return 'bg-yellow-50/50 hover:bg-yellow-50';
  if (index === 1) return 'bg-slate-50/50 hover:bg-slate-50';
  if (index === 2) return 'bg-orange-50/50 hover:bg-orange-50';
  return 'hover:bg-slate-50';
};

const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-rose-500';
};

const getStatusBadge = (percentage: number, target: number) => {
    if (target === 0) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">No Target</span>;
    
    if (percentage >= 100) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Completed</span>;
    if (percentage >= 80) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">On Track</span>;
    if (percentage >= 50) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Needs Focus</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertTriangle size={10} /> At Risk</span>;
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ branches, employees, activeRows, accounts, month, language, centerRecords = [], targets = [], currentUser }) => {
  const t = translations[language];
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  // --- DATA PREPARATION ---

  // 1. Calculate Stats per Employee
  const employeeStats = useMemo(() => {
      return employees.map(emp => {
          const target = targets.find(t => t.employeeId === emp.id && t.month === month);
          // If no target set, use defaults to avoid crashes, but mark as no target
          const collectionTarget = target?.collectionTarget || 0;
          const accountTarget = target?.accountTarget || 0;

          const collected = centerRecords
            .filter(r => r.employeeId === emp.id && r.createdAt.startsWith(month))
            .reduce((sum, r) => sum + r.amount, 0);

          const accountsOpened = accounts
            .filter(a => a.opened_by_employee_id === emp.id && a.opening_date.startsWith(month))
            .length;

          const collPercent = collectionTarget > 0 ? (collected / collectionTarget) * 100 : 0;
          const accPercent = accountTarget > 0 ? (accountsOpened / accountTarget) * 100 : 0;

          return {
              ...emp,
              targets: {
                  collection: collectionTarget,
                  account: accountTarget
              },
              achieved: {
                  collection: collected,
                  account: accountsOpened
              },
              progress: {
                  collection: collPercent,
                  account: accPercent
              },
              remaining: {
                  collection: Math.max(0, collectionTarget - collected),
                  account: Math.max(0, accountTarget - accountsOpened)
              }
          };
      });
  }, [employees, targets, centerRecords, accounts, month]);

  // 2. Branch Aggregation (For Admin/Manager)
  const branchStats = useMemo(() => {
      return branches.map(b => {
          const branchEmps = employeeStats.filter(e => e.branch_id === b.id);
          const totalTarget = branchEmps.reduce((sum, e) => sum + e.targets.collection, 0);
          const totalCollected = branchEmps.reduce((sum, e) => sum + e.achieved.collection, 0);
          const totalAccTarget = branchEmps.reduce((sum, e) => sum + e.targets.account, 0);
          const totalAccOpened = branchEmps.reduce((sum, e) => sum + e.achieved.account, 0);
          
          const atRiskCount = branchEmps.filter(e => e.targets.collection > 0 && e.progress.collection < 50).length;

          return {
              branch: b,
              employees: branchEmps,
              totalTarget,
              totalCollected,
              progress: totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0,
              totalAccTarget,
              totalAccOpened,
              atRiskCount
          };
      });
  }, [branches, employeeStats]);

  // 3. User Specific Stats
  const myStats = useMemo(() => {
      if (currentUser?.role !== 'USER') return null;
      return employeeStats.find(e => e.id === currentUser.employee_id);
  }, [employeeStats, currentUser]);

  // 4. Daily Insight Calculation
  const dailyInsight = useMemo(() => {
      if (!myStats || myStats.remaining.collection <= 0) return null;
      
      const today = new Date();
      const targetDate = new Date(month + "-01");
      const year = targetDate.getFullYear();
      const m = targetDate.getMonth();
      
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      
      let daysRemaining = 0;
      
      // If viewing past month
      if (today.getMonth() > m && today.getFullYear() >= year) daysRemaining = 0;
      // If viewing future month
      else if (today.getMonth() < m || today.getFullYear() < year) daysRemaining = daysInMonth;
      // If current month
      else daysRemaining = Math.max(1, daysInMonth - today.getDate() + 1); // Include today

      if (daysRemaining === 0) return null; // Month over

      return Math.ceil(myStats.remaining.collection / daysRemaining);
  }, [myStats, month]);

  // 5. Global Stats (New)
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const totalBranches = branches.length;
    
    // Accounts opened in current month (For Dashboard Cards)
    const monthlyAccounts = accounts.filter(a => a.opening_date.startsWith(month));
    const newAccountsCount = monthlyAccounts.length;
    
    // activeRows contains the calculated salary data for the current month if generated
    const totalSalary = activeRows.reduce((sum, row) => sum + row.final_salary, 0);
    const totalCollection = activeRows.reduce((sum, row) => sum + row.total_collection, 0);

    // Chart Data: Salary by Branch
    const salaryByBranch: Record<string, number> = {};
    activeRows.forEach(row => {
        const bName = row.branch.name;
        salaryByBranch[bName] = (salaryByBranch[bName] || 0) + row.final_salary;
    });
    const chartData = Object.entries(salaryByBranch).map(([name, salary]) => ({ name, salary }));

    // Top Account Openers (All Time)
    const openerCounts: Record<string, number> = {};
    accounts.forEach(acc => {
        const empName = employees.find(e => e.id === acc.opened_by_employee_id)?.name || 'Unknown';
        openerCounts[empName] = (openerCounts[empName] || 0) + 1;
    });
    const topAccountOpeners = Object.entries(openerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Bonus Stats (Based on Account Opening Data directly for immediate feedback)
    // Counts books opened in the selected month that are eligible
    const totalBooksInMonth = newAccountsCount;
    const eligibleBooksInMonth = monthlyAccounts.filter(a => a.collection_amount >= 600).length;

    const percentage = totalBooksInMonth > 0 ? Math.round((eligibleBooksInMonth / totalBooksInMonth) * 100) : 0;
    
    const bonusStats = {
        data: [
            { name: 'Eligible', value: eligibleBooksInMonth },
            { name: 'Non-Eligible', value: totalBooksInMonth - eligibleBooksInMonth }
        ],
        percentage,
        total: totalBooksInMonth,
        eligible: eligibleBooksInMonth
    };

    return {
        totalEmployees,
        totalBranches,
        newAccountsCount,
        totalSalary,
        totalCollection,
        chartData,
        topAccountOpeners,
        bonusStats
    };
  }, [employees, branches, accounts, activeRows, month]);

  // 6. Ranked Employees
  const rankedEmployees = useMemo(() => {
    return [...activeRows]
        .sort((a, b) => b.total_collection - a.total_collection)
        .slice(0, 10)
        .map(row => ({
            id: row.employee.id,
            name: row.employee.name,
            code: row.employee.id,
            branchName: row.branch.name,
            totalCollection: row.total_collection,
            bonusableBooks: row.total_books - row.book_no_bonus,
            totalBooks: row.total_books
        }));
  }, [activeRows]);


  // --- ROLE BASED VIEWS ---

  // 1. FIELD OFFICER VIEW
  const renderFieldOfficerView = () => {
      if (!myStats) return <div className="p-4 text-center text-slate-400">No target data assigned for {month}.</div>;

      return (
          <div className="space-y-6">
              {/* Alert Banner */}
              {myStats.targets.collection > 0 && myStats.progress.collection < 60 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                      <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                      <div>
                          <h4 className="font-bold text-rose-800 text-sm">Action Required: Behind Target</h4>
                          <p className="text-xs text-rose-600 mt-1">
                              You have achieved only <span className="font-bold">{myStats.progress.collection.toFixed(1)}%</span> of your collection target. 
                              Please focus on recovering dues to meet the monthly goal.
                          </p>
                      </div>
                  </div>
              )}

              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-lg border border-slate-700 relative overflow-hidden">
                  {/* Decorative BG */}
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                      <TargetIcon size={150} />
                  </div>

                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-3">
                              <div className="bg-white/10 p-2.5 rounded-lg text-white backdrop-blur-sm">
                                  <TargetIcon size={24} />
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold text-white">My Monthly Target</h3>
                                  <p className="text-xs text-slate-400">Goal for <span className="font-mono text-emerald-400 font-bold">{month}</span></p>
                              </div>
                          </div>
                          {myStats.progress.collection >= 100 && (
                              <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                  <Crown size={12} /> Target Achieved!
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Collection Section */}
                          <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                              <div className="flex justify-between items-end mb-4">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collection Progress</span>
                                  <div className="text-right">
                                      <span className="block text-2xl font-bold font-mono">৳{myStats.achieved.collection.toLocaleString()}</span>
                                      <span className="text-[10px] text-slate-400">Target: ৳{myStats.targets.collection.toLocaleString()}</span>
                                  </div>
                              </div>
                              
                              <div className="h-4 w-full bg-slate-700/50 rounded-full overflow-hidden mb-2">
                                  <div 
                                      className={`h-full rounded-full transition-all duration-1000 shadow-lg ${myStats.targets.collection > 0 ? getProgressColor(myStats.progress.collection) : 'bg-slate-600'}`}
                                      style={{ width: `${myStats.targets.collection > 0 ? Math.min(100, myStats.progress.collection) : 0}%` }}
                                  ></div>
                              </div>
                              
                              <div className="flex justify-between items-center text-xs">
                                  <span className={`${myStats.progress.collection >= 100 ? 'text-emerald-400' : 'text-white'} font-bold`}>
                                      {myStats.targets.collection > 0 ? myStats.progress.collection.toFixed(1) + '%' : 'N/A'} Achieved
                                  </span>
                                  <span className="text-slate-400">
                                      Remaining: <span className="text-rose-300 font-mono">৳{myStats.remaining.collection.toLocaleString()}</span>
                                  </span>
                              </div>

                              {/* Daily Insight */}
                              {dailyInsight && (
                                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-blue-200">
                                      <Calendar size={14} />
                                      <span>
                                          You need approx <span className="font-bold text-white bg-blue-600/50 px-1.5 py-0.5 rounded">৳{dailyInsight.toLocaleString()}</span> per day to reach target.
                                      </span>
                                  </div>
                              )}
                          </div>

                          {/* Account Section */}
                          <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                              <div className="flex justify-between items-end mb-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Opening</span>
                                  <div className="text-right">
                                      <span className="block text-xl font-bold font-mono">{myStats.achieved.account} <span className="text-sm text-slate-400 font-normal">/ {myStats.targets.account}</span></span>
                                  </div>
                              </div>
                              <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden mb-2">
                                  <div 
                                      className={`h-full rounded-full transition-all duration-1000 ${myStats.targets.account > 0 ? 'bg-blue-500' : 'bg-slate-600'}`}
                                      style={{ width: `${myStats.targets.account > 0 ? Math.min(100, myStats.progress.account) : 0}%` }}
                                  ></div>
                              </div>
                              <div className="text-right text-xs text-blue-300 font-bold">
                                  {myStats.targets.account > 0 ? myStats.progress.account.toFixed(0) + '%' : 'N/A'} Achieved
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // 2. MANAGER VIEW
  const renderManagerView = () => {
      // Filter for current manager's branch
      const myBranchStats = branchStats.find(b => b.branch.id === currentUser?.branch_id);
      
      if (!myBranchStats) return <div className="text-center p-8 text-slate-400">Branch data not found.</div>;

      const displayEmployees = showAtRiskOnly 
          ? myBranchStats.employees.filter(e => e.progress.collection < 50 && e.targets.collection > 0)
          : myBranchStats.employees;

      return (
          <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Branch Target</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">৳{myBranchStats.totalTarget.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Total Collection</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">৳{myBranchStats.totalCollected.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Avg Achievement</p>
                      <p className={`text-xl font-bold mt-1 ${myBranchStats.totalTarget > 0 ? (myBranchStats.progress >= 80 ? 'text-emerald-600' : 'text-amber-600') : 'text-slate-400'}`}>
                          {myBranchStats.totalTarget > 0 ? myBranchStats.progress.toFixed(1) + '%' : 'N/A'}
                      </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
                      <p className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1">
                          <AlertTriangle size={12} /> At Risk Staff
                      </p>
                      <p className="text-xl font-bold text-rose-700 mt-1">{myBranchStats.atRiskCount}</p>
                  </div>
              </div>

              {/* Employee Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                          <Users size={18} className="text-slate-400" /> Employee Performance
                      </h3>
                      <button 
                          onClick={() => setShowAtRiskOnly(!showAtRiskOnly)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showAtRiskOnly ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                      >
                          <Filter size={12} />
                          {showAtRiskOnly ? 'Show All' : 'Show At Risk Only'}
                      </button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase">
                              <tr>
                                  <th className="p-4">Employee</th>
                                  <th className="p-4 text-right">Target</th>
                                  <th className="p-4 text-right">Collected</th>
                                  <th className="p-4 w-1/3">Progress</th>
                                  <th className="p-4 text-center">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {displayEmployees.map(emp => (
                                  <tr key={emp.id} className="hover:bg-slate-50">
                                      <td className="p-4 font-medium text-slate-700">
                                          {emp.name}
                                          <div className="text-[10px] text-slate-400">{emp.designation}</div>
                                      </td>
                                      <td className="p-4 text-right font-mono">৳{emp.targets.collection.toLocaleString()}</td>
                                      <td className="p-4 text-right font-bold text-slate-800 font-mono">৳{emp.achieved.collection.toLocaleString()}</td>
                                      <td className="p-4">
                                          <div className="flex items-center gap-3">
                                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                  <div 
                                                      className={`h-full rounded-full ${emp.targets.collection > 0 ? getProgressColor(emp.progress.collection) : 'bg-slate-300'}`}
                                                      style={{ width: `${emp.targets.collection > 0 ? Math.min(100, emp.progress.collection) : 0}%` }}
                                                  ></div>
                                              </div>
                                              <span className="text-xs font-bold w-12 text-right">{emp.targets.collection > 0 ? emp.progress.collection.toFixed(0) + '%' : 'N/A'}</span>
                                          </div>
                                      </td>
                                      <td className="p-4 text-center">
                                          {getStatusBadge(emp.progress.collection, emp.targets.collection)}
                                      </td>
                                  </tr>
                              ))}
                              {displayEmployees.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">No employees found.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  // 3. ADMIN / SUPER ADMIN / OWNER VIEW
  const renderAdminView = () => (
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {branchStats.map(stat => (
                  <div key={stat.branch.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                      <Building size={18} className="text-slate-400" />
                                      {stat.branch.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-1">{stat.branch.address || 'Main Branch'}</p>
                              </div>
                              <div className={`text-xs font-bold px-2 py-1 rounded border ${stat.totalTarget > 0 ? (stat.progress >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200') : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                  {stat.totalTarget > 0 ? `${stat.progress.toFixed(1)}% Done` : 'No Target'}
                              </div>
                          </div>
                      </div>
                      
                      <div className="p-5 space-y-4">
                          <div className="flex justify-between items-end">
                              <div>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Collection</p>
                                  <p className="text-lg font-bold text-slate-800">৳{stat.totalCollected.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Target</p>
                                  <p className="text-sm font-medium text-slate-600">৳{stat.totalTarget.toLocaleString()}</p>
                              </div>
                          </div>

                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                  className={`h-full rounded-full transition-all ${stat.totalTarget > 0 ? getProgressColor(stat.progress) : 'bg-slate-300'}`}
                                  style={{ width: `${stat.totalTarget > 0 ? Math.min(100, stat.progress) : 0}%` }}
                              ></div>
                          </div>

                          {stat.atRiskCount > 0 && (
                              <div className="bg-rose-50 p-2 rounded border border-rose-100 flex items-center gap-2 text-xs text-rose-700 font-bold">
                                  <AlertTriangle size={14} />
                                  {stat.atRiskCount} Staff At Risk
                              </div>
                          )}

                          <button 
                              onClick={() => setExpandedBranch(expandedBranch === stat.branch.id ? null : stat.branch.id)}
                              className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded border border-slate-200 flex justify-center items-center gap-1 transition-colors"
                          >
                              {expandedBranch === stat.branch.id ? 'Hide Details' : 'View Staff Details'}
                              {expandedBranch === stat.branch.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                      </div>

                      {/* Expanded Staff List */}
                      {expandedBranch === stat.branch.id && (
                          <div className="border-t border-slate-100 bg-slate-50 p-4 animate-in slide-in-from-top-2">
                              <table className="w-full text-xs">
                                  <thead>
                                      <tr className="text-slate-400 uppercase">
                                          <th className="text-left pb-2">Staff</th>
                                          <th className="text-right pb-2">Progress</th>
                                          <th className="text-right pb-2">Status</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                      {stat.employees.map(emp => (
                                          <tr key={emp.id}>
                                              <td className="py-2 font-medium text-slate-700">{emp.name}</td>
                                              <td className="py-2 text-right">
                                                  {emp.targets.collection > 0 ? (
                                                      <>
                                                        <span className={emp.progress.collection < 50 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                            {emp.progress.collection.toFixed(0)}%
                                                        </span>
                                                        <span className="text-slate-400 mx-1">/</span>
                                                        <span className="text-slate-500">৳{emp.achieved.collection.toLocaleString()}</span>
                                                      </>
                                                  ) : (
                                                      <span className="text-slate-400">-</span>
                                                  )}
                                              </td>
                                              <td className="py-2 text-right">
                                                  {getStatusBadge(emp.progress.collection, emp.targets.collection)}
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* --- TARGET DASHBOARD SECTION (NEW) --- */}
      <div className="mb-8">
          {currentUser?.role === 'USER' && renderFieldOfficerView()}
          {currentUser?.role === 'MANAGER' && renderManagerView()}
          {['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(currentUser?.role || '') && renderAdminView()}
      </div>

      {/* Month Label for context */}
      <div className="text-sm text-slate-500 font-medium border-t border-slate-200 pt-6">
        {t.showingStatsFor} <span className="text-slate-900 font-bold">{month}</span> (General Stats)
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          title={t.totalEmployees} 
          value={stats.totalEmployees} 
          icon={<Users size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title={t.totalBranches} 
          value={stats.totalBranches} 
          icon={<Building size={24} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title={t.newAccounts} 
          value={stats.newAccountsCount} 
          icon={<FilePlus2 size={24} />} 
          color="bg-purple-500" 
        />
        <StatCard 
          title={t.totalPayout} 
          value={`৳${stats.totalSalary.toLocaleString()}`} 
          icon={<span className="font-bold text-2xl leading-none">৳</span>} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title={t.totalCollection} 
          value={`৳${stats.totalCollection.toLocaleString()}`} 
          icon={<TrendingUp size={24} />} 
          color="bg-amber-500" 
        />
      </div>

      {/* Charts Row 1: Salary Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{t.salaryDistribution}</h3>
        <div className="h-64 w-full">
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `৳${value}`} />
                <Tooltip 
                  formatter={(value: number) => [`৳${value.toLocaleString()}`, t.totalPayout]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="salary" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              {t.noSalaryData}
            </div>
          )}
        </div>
      </div>

      {/* Employee Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                  <Crown size={20} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-slate-800">{t.topEmployees}</h3>
                  <p className="text-xs text-slate-500">{t.rankedBy} ({month})</p>
              </div>
           </div>
           <div className="text-xs text-slate-400 font-medium">
              {t.totalRanked} {rankedEmployees.length}
           </div>
        </div>
        
        <div className="overflow-x-auto">
           {rankedEmployees.length > 0 ? (
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                   <tr>
                      <th className="px-6 py-4 w-16 text-center">{t.rank}</th>
                      <th className="px-6 py-4">{t.employee}</th>
                      <th className="px-6 py-4 text-right">{t.totalCollection}</th>
                      <th className="px-6 py-4 text-center">{t.bonusableBooks}</th>
                      <th className="px-6 py-4 text-center">{t.totalBooks}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {rankedEmployees.map((emp, index) => (
                      <tr key={emp.id} className={`transition-colors ${getRankRowClass(index)}`}>
                         <td className="px-6 py-4 text-center flex justify-center items-center">
                            {getRankIcon(index)}
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <span className="font-bold text-slate-700">{emp.name}</span>
                               <span className="text-xs text-slate-400 flex items-center gap-1">
                                  ID: {emp.code} • {emp.branchName}
                               </span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono text-base">
                            ৳{emp.totalCollection.toLocaleString()}
                         </td>
                         <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${emp.bonusableBooks > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                {emp.bonusableBooks}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-center font-medium text-slate-600">
                            {emp.totalBooks}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           ) : (
             <div className="p-12 text-center text-slate-400 italic">
                {t.noPerformanceData} {month}
             </div>
           )}
        </div>
      </div>

      {/* Charts Row 2: Account Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Account Openers (Historical) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Trophy size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">{t.accountOpenings}</h3>
                    <p className="text-xs text-slate-500">{t.historicalPerformers}</p>
                </div>
             </div>
             
             <div className="h-64 w-full">
                {stats.topAccountOpeners.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topAccountOpeners} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={100} 
                                tick={{fontSize: 11, fill: '#64748b'}} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill="#6366f1" 
                                radius={[0, 4, 4, 0]} 
                                barSize={24}
                                label={{ position: 'right', fill: '#6366f1', fontSize: 12, fontWeight: 'bold' }} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        {t.noAccountData}
                    </div>
                )}
             </div>
          </div>

          {/* Bonus Eligibility Ratio */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
             <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Percent size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">{t.bonusEligibility}</h3>
                    <p className="text-xs text-slate-500">{t.eligibilitySub}</p>
                </div>
             </div>

             <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="relative w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.bonusStats.data}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {stats.bonusStats.data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-slate-800">{stats.bonusStats.percentage}%</span>
                    </div>
                </div>

                <div className="space-y-4 w-full md:w-auto">
                    <div className="flex items-center justify-between md:justify-start md:gap-8 p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">{t.totalBooks}</p>
                            <p className="text-lg font-bold text-slate-800">{stats.bonusStats.total}</p>
                         </div>
                         <div className="h-8 w-1 bg-slate-200 rounded-full"></div>
                         <div>
                            <p className="text-xs text-emerald-600 uppercase font-semibold">{t.bonusEligible}</p>
                            <p className="text-lg font-bold text-emerald-600">{stats.bonusStats.eligible}</p>
                         </div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                        {t.eligibilityNote}
                    </div>
                </div>
             </div>
          </div>

      </div>

    </div>
  );
};

export default Dashboard;
