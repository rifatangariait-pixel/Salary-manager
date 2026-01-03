
import React, { useMemo } from 'react';
import { SalaryRow, Branch, AccountOpening } from '../types';
import { Trophy, Medal, Crown, TrendingUp, Award, Building2, MapPin, Star, CreditCard, UserPlus } from 'lucide-react';

interface LeaderboardProps {
  rows: SalaryRow[];
  branches: Branch[];
  month: string;
  accounts: AccountOpening[];
}

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) return <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 border border-yellow-200"><Crown size={20} fill="currentColor" /></div>;
  if (rank === 2) return <div className="p-2 rounded-full bg-slate-100 text-slate-500 border border-slate-200"><Medal size={20} fill="currentColor" /></div>;
  if (rank === 3) return <div className="p-2 rounded-full bg-orange-100 text-orange-600 border border-orange-200"><Medal size={20} fill="currentColor" /></div>;
  return <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 font-bold border border-slate-200">#{rank}</div>;
};

const EmployeeCard: React.FC<{ row: SalaryRow; rank: number; compact?: boolean }> = ({ row, rank, compact }) => {
  const isTop3 = rank <= 3;
  let borderColor = 'border-slate-200';
  let bgColor = 'bg-white';
  
  if (rank === 1) { borderColor = 'border-yellow-300'; bgColor = 'bg-gradient-to-b from-yellow-50 to-white'; }
  else if (rank === 2) { borderColor = 'border-slate-300'; bgColor = 'bg-gradient-to-b from-slate-50 to-white'; }
  else if (rank === 3) { borderColor = 'border-orange-200'; bgColor = 'bg-gradient-to-b from-orange-50 to-white'; }

  return (
    <div className={`relative rounded-xl border ${borderColor} ${bgColor} p-4 shadow-sm transition-transform hover:scale-[1.02]`}>
        {isTop3 && (
            <div className="absolute -top-3 -right-3">
                <RankBadge rank={rank} />
            </div>
        )}
        {!isTop3 && <div className="absolute top-2 right-2 text-xs font-bold text-slate-400">#{rank}</div>}

        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${rank === 1 ? 'border-yellow-200 bg-yellow-100 text-yellow-700' : 'border-slate-100 bg-slate-100 text-slate-600'}`}>
                {row.employee.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
                <h4 className="font-bold text-slate-800 truncate">{row.employee.name}</h4>
                <p className="text-xs text-slate-500 truncate">{row.employee.designation}</p>
            </div>
        </div>

        <div className={`grid ${compact ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'} text-sm`}>
            <div className={`bg-white/50 rounded p-2 border border-slate-100 ${compact ? 'flex justify-between' : ''}`}>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Collection</p>
                <p className="font-bold text-slate-700">৳{row.total_collection.toLocaleString()}</p>
            </div>
            <div className={`bg-white/50 rounded p-2 border border-slate-100 ${compact ? 'flex justify-between' : ''}`}>
                 <p className="text-[10px] text-slate-400 uppercase font-bold">Books</p>
                 <div className="flex items-center gap-1">
                     <span className="font-bold text-slate-700">{row.total_books}</span>
                     {row.total_books - row.book_no_bonus > 0 && (
                         <span className="text-[10px] text-emerald-600 font-medium">({row.total_books - row.book_no_bonus} Bonus)</span>
                     )}
                 </div>
            </div>
        </div>
        {!compact && (
            <div className="mt-3 pt-2 border-t border-slate-100/50 flex justify-between items-center">
                 <span className="text-xs text-slate-400">{row.branch.name}</span>
                 <span className="text-xs font-bold text-indigo-600">Earned: ৳{Math.round(row.final_salary).toLocaleString()}</span>
            </div>
        )}
    </div>
  );
};

const Leaderboard: React.FC<LeaderboardProps> = ({ rows, branches, month, accounts }) => {
  
  // Sort Logic
  const sortPerformance = (a: SalaryRow, b: SalaryRow) => {
      // 1. Total Collection
      if (b.total_collection !== a.total_collection) return b.total_collection - a.total_collection;
      // 2. Bonusable Books (Total - No Bonus)
      const bonusA = a.total_books - a.book_no_bonus;
      const bonusB = b.total_books - b.book_no_bonus;
      if (bonusB !== bonusA) return bonusB - bonusA;
      // 3. Total Books
      return b.total_books - a.total_books;
  };

  // 1. Company Wide Top Performers
  const companyTop3 = useMemo(() => {
      return [...rows].sort(sortPerformance).slice(0, 3);
  }, [rows]);

  // 2. Branch Wise Data
  const branchStats = useMemo(() => {
      return branches.map(branch => {
          const branchRows = rows.filter(r => r.branch.id === branch.id);
          const top3 = [...branchRows].sort(sortPerformance).slice(0, 3);
          const totalCollection = branchRows.reduce((sum, r) => sum + r.total_collection, 0);
          const avgCollection = branchRows.length ? totalCollection / branchRows.length : 0;
          
          return {
              branch,
              top3,
              totalCollection,
              avgCollection,
              employeeCount: branchRows.length
          };
      }).sort((a, b) => b.totalCollection - a.totalCollection); // Rank branches by total collection
  }, [rows, branches]);

  // 3. Category Leaders
  const categoryLeaders = useMemo(() => {
      // Highest Loan Collection
      let maxLoanRow: SalaryRow | null = null;
      let maxLoan = -1;

      rows.forEach(row => {
          if (row.total_loan_collection > maxLoan) {
              maxLoan = row.total_loan_collection;
              maxLoanRow = row;
          }
      });

      // Highest Account Openings
      // Count accounts opened in this month per employee
      const empAccountCounts: Record<string, number> = {};
      accounts.forEach(acc => {
          if (acc.opening_date.startsWith(month)) {
              empAccountCounts[acc.opened_by_employee_id] = (empAccountCounts[acc.opened_by_employee_id] || 0) + 1;
          }
      });

      let maxAccId = null;
      let maxAccCount = -1;
      Object.entries(empAccountCounts).forEach(([id, count]) => {
          if (count > maxAccCount) {
              maxAccCount = count;
              maxAccId = id;
          }
      });

      const maxAccRow = maxAccId ? rows.find(r => r.employee.id === maxAccId) : null;

      return {
          loanChampion: maxLoanRow && maxLoan > 0 ? { ...maxLoanRow, value: maxLoan } : null,
          accountChampion: maxAccRow && maxAccCount > 0 ? { ...maxAccRow, value: maxAccCount } : null
      };
  }, [rows, accounts, month]);

  const topBranch = branchStats[0];

  if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 bg-white rounded-xl border border-dashed border-slate-200">
            <Trophy size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No performance data available.</p>
            <p className="text-sm">Generate a salary sheet for {month} to view the leaderboard.</p>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
       
       {/* Header */}
       <div className="text-center space-y-2 mb-8">
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-3">
               <Trophy className="text-yellow-500" fill="currentColor" /> 
               Performance Leaderboard
           </h2>
           <p className="text-slate-500 font-medium">Celebrating top achievers for <span className="text-slate-800 font-bold">{month}</span></p>
       </div>

       {/* Top Branch Banner */}
       {topBranch && topBranch.totalCollection > 0 && (
           <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 -mr-8 -mt-8 bg-white/10 rounded-full blur-3xl"></div>
               
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                       <div className="p-4 bg-yellow-500 rounded-xl text-slate-900 shadow-lg shadow-yellow-500/20">
                           <Building2 size={32} />
                       </div>
                       <div>
                           <div className="flex items-center gap-2 mb-1">
                               <h3 className="text-2xl font-bold">{topBranch.branch.name}</h3>
                               <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                   <Crown size={10} fill="currentColor" /> Top Branch
                               </span>
                           </div>
                           <p className="text-slate-400 flex items-center gap-1">
                               <MapPin size={14} /> {topBranch.branch.address || 'Headquarters'}
                           </p>
                       </div>
                   </div>

                   <div className="flex items-center gap-8">
                       <div className="text-center">
                           <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Collection</p>
                           <p className="text-3xl font-bold text-yellow-400">৳{topBranch.totalCollection.toLocaleString()}</p>
                       </div>
                       <div className="w-px h-12 bg-white/10 hidden md:block"></div>
                       <div className="text-center">
                           <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Active Staff</p>
                           <p className="text-2xl font-bold">{topBranch.employeeCount}</p>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Section 1: Company Wide Top 3 */}
       <div className="space-y-4">
           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Star className="text-purple-500" fill="currentColor" /> Company-Wide Top Performers
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
               {/* Rank 2 */}
               {companyTop3[1] && <div className="order-2 md:order-1"><EmployeeCard row={companyTop3[1]} rank={2} /></div>}
               {/* Rank 1 */}
               {companyTop3[0] && <div className="order-1 md:order-2 transform md:-translate-y-4"><EmployeeCard row={companyTop3[0]} rank={1} /></div>}
               {/* Rank 3 */}
               {companyTop3[2] && <div className="order-3 md:order-3"><EmployeeCard row={companyTop3[2]} rank={3} /></div>}
           </div>
       </div>

       {/* Section 2: Branch Wise Breakdown */}
       <div className="space-y-6 pt-6 border-t border-slate-200">
           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Building2 className="text-blue-500" /> Branch Rankings
           </h3>
           
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               {branchStats.map((stats, idx) => (
                   <div key={stats.branch.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-200">
                           <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                   #{idx + 1}
                               </div>
                               <div>
                                   <h4 className="font-bold text-slate-800">{stats.branch.name}</h4>
                                   <p className="text-xs text-slate-500">Total Collection: <span className="font-bold text-slate-700">৳{stats.totalCollection.toLocaleString()}</span></p>
                               </div>
                           </div>
                           <div className="text-right">
                               <span className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
                                   {stats.employeeCount} Staff
                               </span>
                           </div>
                       </div>
                       
                       {stats.top3.length > 0 ? (
                           <div className="space-y-3">
                               <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Top 3 in Branch</p>
                               <div className="grid grid-cols-1 gap-3">
                                   {stats.top3.map((row, rIdx) => (
                                       <div key={row.employee.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                                           <div className="flex items-center gap-3">
                                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rIdx === 0 ? 'bg-yellow-100 text-yellow-700' : rIdx === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'}`}>
                                                   {rIdx + 1}
                                               </div>
                                               <div>
                                                   <p className="font-bold text-sm text-slate-800">{row.employee.name}</p>
                                                   <p className="text-[10px] text-slate-400">{row.employee.designation}</p>
                                               </div>
                                           </div>
                                           <div className="text-right">
                                               <p className="font-bold text-sm text-slate-700">৳{row.total_collection.toLocaleString()}</p>
                                               <p className="text-[10px] text-slate-400">{row.total_books} Books</p>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       ) : (
                           <div className="text-center py-6 text-slate-400 italic text-sm bg-white rounded-lg border border-dashed border-slate-200">
                               No active staff data
                           </div>
                       )}
                   </div>
               ))}
           </div>
       </div>

       {/* Section 3: Category Champions */}
       <div className="space-y-6 pt-6 border-t border-slate-200">
           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Award className="text-indigo-500" /> Category Leaders
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Highest Due Collection */}
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden flex items-center gap-6">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full shadow-inner flex-shrink-0">
                        <CreditCard size={32} className="text-white" />
                    </div>
                    
                    <div className="flex-1 z-10">
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">Highest Loan Collector</p>
                        {categoryLeaders.loanChampion ? (
                            <>
                                <h4 className="text-2xl font-bold">{categoryLeaders.loanChampion.employee.name}</h4>
                                <p className="text-sm text-indigo-100 mb-2">{categoryLeaders.loanChampion.branch.name}</p>
                                <div className="inline-block bg-white text-indigo-600 px-3 py-1 rounded-lg font-bold shadow-sm">
                                    ৳{categoryLeaders.loanChampion.value.toLocaleString()} <span className="text-xs font-normal">Collected</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-indigo-200 italic">No loan collection data available.</p>
                        )}
                    </div>
                </div>

                {/* Highest Account Opening */}
                <div className="bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden flex items-center gap-6">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    
                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full shadow-inner flex-shrink-0">
                        <UserPlus size={32} className="text-white" />
                    </div>
                    
                    <div className="flex-1 z-10">
                        <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-200 mb-1">Top Account Opener</p>
                        {categoryLeaders.accountChampion ? (
                            <>
                                <h4 className="text-2xl font-bold">{categoryLeaders.accountChampion.employee.name}</h4>
                                <p className="text-sm text-fuchsia-100 mb-2">{categoryLeaders.accountChampion.employee.designation}</p>
                                <div className="inline-block bg-white text-fuchsia-600 px-3 py-1 rounded-lg font-bold shadow-sm">
                                    {categoryLeaders.accountChampion.value} <span className="text-xs font-normal">New Accounts</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-fuchsia-200 italic">No new accounts opened this month.</p>
                        )}
                    </div>
                </div>

           </div>
       </div>

    </div>
  );
};

export default Leaderboard;
