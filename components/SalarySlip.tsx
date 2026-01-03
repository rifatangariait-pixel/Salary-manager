
import React, { useMemo } from 'react';
import { SalaryRow, AccountOpening, CommissionStructure } from '../types';
import { bonusRates } from '../services/bonusRates';

interface SalarySlipProps {
  row: SalaryRow;
  month: string;
  accounts: AccountOpening[];
  commissionRates: Record<string, CommissionStructure>;
}

const SalarySlip: React.FC<SalarySlipProps> = ({ row, month, accounts, commissionRates }) => {
  // --- DYNAMIC COMMISSION RATES ---
  // Default to Type A if missing
  const commType = row.employee.commission_type || 'A';
  const rates = commissionRates[commType] || { own: 0, office: 0 };
  
  const OWN_RATE = rates.own;
  const OFFICE_RATE = rates.office;

  // Recalculate display amounts based on rates
  // Note: These should match row.commission, but we calculate breakdown for display
  const ownComm = row.own_somity_collection * (OWN_RATE / 100);
  const officeComm = row.office_somity_collection * (OFFICE_RATE / 100);
  
  // Book Commission Total for breakdown
  const bookCommission = 
    (row.book_1_5 * bonusRates[1.5]) +
    (row.book_3 * bonusRates[3]) +
    (row.book_5 * bonusRates[5]) +
    (row.book_8 * bonusRates[8]) +
    (row.book_10 * bonusRates[10]) +
    (row.book_12 * bonusRates[12]);

  // Total Earnings Calculation (Including new incentive)
  const totalEarnings = (row.basic_salary || 0) + row.commission + row.bonus + (row.manager_convenience || 0);

  // Filter accounts for this slip
  // Logic: Must be counted in this month AND bonusable (collection >= 600)
  const bonusableAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.opened_by_employee_id === row.employee.id && 
      acc.counted_month === month && 
      acc.collection_amount >= 600
    );
  }, [accounts, row.employee.id, month]);

  // Format Account List Display
  const accountListDisplay = useMemo(() => {
    if (bonusableAccounts.length === 0) return 'None';
    
    // Logic: Show compact string
    const displayLimit = 12;
    const itemsToShow = bonusableAccounts.slice(0, displayLimit);
    const remaining = bonusableAccounts.length - displayLimit;

    const listStr = itemsToShow.map(acc => `${acc.account_code} (${acc.term}y)`).join(', ');
    
    return remaining > 0 ? `${listStr} +${remaining} more` : listStr;
  }, [bonusableAccounts]);

  // Helper to format currency
  const fmt = (num: number) => num?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Number to Words (Simple implementation for BDT placeholder)
  const numberToWords = (num: number) => {
    return `BDT ${num.toLocaleString()} Only`; 
  };
  
  // Format Month
  const monthName = new Date(month).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div 
      className="bg-white text-slate-900 font-sans mx-auto relative flex flex-col" 
      style={{ 
        width: '210mm', 
        height: '297mm', 
        padding: '12mm',
        boxSizing: 'border-box'
      }}
    >
        {/* HEADER */}
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Angaria Development Foundation</h1>
            <p className="text-sm text-slate-600 mt-1">Head Office: Khan Villa (2nd Floor), Bagchi Bazar, Angaria, Shariatpur</p>
            <div className="w-full h-px bg-slate-800 my-3"></div>
            <div className="flex justify-between items-center">
                 <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Salary Slip</span>
                 <span className="px-4 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-bold uppercase">{monthName}</span>
            </div>
        </div>

        {/* EMPLOYEE INFO CARD */}
        <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Employee Name</span>
                    <span className="font-bold text-slate-800">{row.employee.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Employee ID</span>
                    <span className="font-mono font-bold text-slate-800">{row.employee.id}</span>
                </div>
                 <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Designation</span>
                    <span className="font-semibold text-slate-800">{row.employee.designation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Branch</span>
                    <span className="font-semibold text-slate-800">{row.branch.name}</span>
                </div>
                 <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Commission Type</span>
                    <span className="font-bold text-slate-800">Type {commType} (Own {OWN_RATE}% / Office {OFFICE_RATE}%)</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-medium">Bonusable Books</span>
                    <span className="font-semibold text-slate-800">{bonusableAccounts.length} (Current Month)</span>
                </div>
            </div>
        </div>

        {/* EARNINGS SECTION */}
        <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 pl-1">Earnings</h3>
            <table className="w-full text-sm border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                        <th className="border border-slate-200 px-3 py-2 text-left">Description</th>
                        <th className="border border-slate-200 px-3 py-2 text-right w-32">Amount (BDT)</th>
                    </tr>
                </thead>
                <tbody>
                     <tr>
                        <td className="border border-slate-200 px-3 py-2">Basic Salary</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium">{fmt(row.basic_salary)}</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-200 px-3 py-2">Own Somity Collection Commission <span className="text-xs text-slate-400 ml-1">({OWN_RATE}%)</span></td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium">{fmt(ownComm)}</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-200 px-3 py-2">Office Somity Collection Commission <span className="text-xs text-slate-400 ml-1">({OFFICE_RATE}%)</span></td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium">{fmt(officeComm)}</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-200 px-3 py-2">Book Sales Commission</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium">{fmt(bookCommission)}</td>
                    </tr>
                    {row.bonus > 0 && (
                        <tr>
                            <td className="border border-slate-200 px-3 py-2 text-emerald-700">Performance Bonus</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-medium text-emerald-700">{fmt(row.bonus)}</td>
                        </tr>
                    )}
                    {(row.manager_convenience || 0) > 0 && (
                        <tr>
                            <td className="border border-slate-200 px-3 py-2 text-indigo-700 font-semibold">Manager Convenience (Branch Incentive)</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-bold text-indigo-700">{fmt(row.manager_convenience || 0)}</td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold">
                    <tr>
                        <td className="border border-slate-200 px-3 py-2 text-right uppercase text-xs">Total Earnings</td>
                        <td className="border border-slate-200 px-3 py-2 text-right">{fmt(totalEarnings)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* DEDUCTIONS SECTION */}
        <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 pl-1">Deductions</h3>
            <table className="w-full text-sm border-collapse border border-slate-200">
                 <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                        <th className="border border-slate-200 px-3 py-2 text-left">Description</th>
                        <th className="border border-slate-200 px-3 py-2 text-right w-32">Amount (BDT)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-slate-200 px-3 py-2">Cash Advance</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium text-rose-700">{fmt(row.deduction_cash_advance)}</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-200 px-3 py-2">Late Attendance Penalty <span className="text-xs text-slate-400">({row.input_late_hours} hrs)</span></td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium text-rose-700">{fmt(row.deduction_late)}</td>
                    </tr>
                     <tr>
                        <td className="border border-slate-200 px-3 py-2">Absenteeism Penalty <span className="text-xs text-slate-400">({row.input_absent_days} days)</span></td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium text-rose-700">{fmt(row.deduction_abs)}</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-200 px-3 py-2 text-rose-800 font-semibold">অপকর্ম</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-medium text-rose-800">{fmt(row.misconductDeduction || 0)}</td>
                    </tr>
                    {(row.deduction_unlawful > 0 || row.deduction_others > 0 || row.deduction_tours > 0) && (
                         <tr>
                            <td className="border border-slate-200 px-3 py-2">Other Deductions / Unlawful / Tours</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-medium text-rose-700">{fmt(row.deduction_unlawful + row.deduction_others + row.deduction_tours)}</td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="bg-rose-50 font-bold text-rose-900">
                    <tr>
                        <td className="border border-rose-100 px-3 py-2 text-right uppercase text-xs">Total Deductions</td>
                        <td className="border border-rose-100 px-3 py-2 text-right">{fmt(row.total_deductions)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* NET PAYABLE - PERFECT CENTERED ALIGNMENT */}
        <div className="mb-6 w-full flex justify-center">
             <div className="w-[65%] min-h-[96px] bg-slate-900 text-white rounded-lg shadow-sm print:bg-slate-900 print:text-white flex flex-col items-center justify-center gap-2">
                <h4 className="m-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center leading-none">
                    NET PAYABLE AMOUNT
                </h4>
                <div className="m-0 text-xl font-bold text-center leading-none">
                    {numberToWords(Math.round(row.final_salary))}
                </div>
            </div>
        </div>

        {/* BONUS ACCOUNTS SUMMARY */}
         {bonusableAccounts.length > 0 && (
            <div className="mb-6 px-1">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Bonusable Accounts ({bonusableAccounts.length})</p>
                <p className="text-xs font-mono text-slate-600 leading-relaxed bg-slate-50 p-2 border border-slate-200 rounded">
                    {accountListDisplay}
                </p>
            </div>
         )}

         {/* SPACER */}
         <div className="flex-grow"></div>

         {/* SIGNATURE SECTION */}
         <div className="grid grid-cols-4 gap-4 mt-8 mb-4">
            {['Prepared By', 'Checked By', 'Approved By', 'Receiver'].map((title) => (
                <div key={title} className="text-center">
                    <div className="h-16"></div>
                    <div className="border-t border-slate-800 mx-2"></div>
                    <p className="text-[10px] font-bold uppercase mt-1 text-slate-700">{title}</p>
                </div>
            ))}
         </div>

         {/* FOOTER */}
         <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[9px] text-slate-400">
            <span>This Sheet is generated By Team IT</span>
            <span>{new Date().toLocaleString()}</span>
            <span>Page 1 of 1</span>
         </div>

    </div>
  );
};

export default SalarySlip;
