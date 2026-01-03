
import { SalaryRow, AccountOpening, Employee, Branch, Center } from "../types";

export const exportToCSV = (rows: SalaryRow[], filename: string) => {
  const headers = [
    "Branch",
    "Employee",
    "Designation",
    "Base Salary (Paid)", 
    "Base Salary (Contract)",
    "Own Somity Count", "Own Collection",
    "Office Somity Count", "Office Collection",
    "Center Count", "Center Collection", // Added Fields
    "Book (1.5)", "Book (3)", "Book (5)", 
    "Book (8)", "Book (10)", "Book (12)", 
    "Book (No Bonus)",
    "Late (Hrs)", "Absent (Days)",
    "Cash Advance", "Late Cost", "Abs Cost", "Misdeed (Opokormo)", "Unlawful", "Tours", "Other Deductions",
    "Total Books",
    "Total Collection",
    "Total Deductions",
    "Commission",
    "Bonus",
    "Manager Convenience", // New Column
    "Final Salary"
  ];

  const csvRows = rows.map(row => [
    row.branch.name,
    row.employee.name,
    row.employee.designation,
    row.basic_salary, 
    row.employee.base_salary, 
    row.own_somity_count, row.own_somity_collection,
    row.office_somity_count, row.office_somity_collection,
    row.center_count || 0, row.center_collection || 0, // Added Data
    row.book_1_5, row.book_3, row.book_5,
    row.book_8, row.book_10, row.book_12,
    row.book_no_bonus,
    row.input_late_hours, row.input_absent_days,
    row.deduction_cash_advance, 
    row.deduction_late.toFixed(2), 
    row.deduction_abs.toFixed(2),
    row.misconductDeduction || 0,
    row.deduction_unlawful, row.deduction_tours, row.deduction_others,
    row.total_books,
    row.total_collection,
    row.total_deductions.toFixed(2),
    row.commission.toFixed(2),
    row.bonus.toFixed(2),
    (row.manager_convenience || 0).toFixed(2),
    row.final_salary.toFixed(2)
  ]);

  downloadCSV(headers, csvRows, filename);
};

export const exportAccountsToCSV = (
  accounts: AccountOpening[], 
  employees: Employee[], 
  branches: Branch[], 
  filename: string
) => {
  const headers = [
    "Account Code",
    "Term",
    "Collection",
    "Opened By (Employee)",
    "Branch",
    "Opening Date",
    "Status",
    "Counted Month",
    "Salary Sheet ID"
  ];

  const today = new Date();
  const currentY = today.getFullYear();
  const currentM = today.getMonth() + 1;

  const csvRows = accounts.map(acc => {
    const emp = employees.find(e => e.id === acc.opened_by_employee_id);
    const branch = branches.find(b => b.id === acc.branch_id);

    // Dynamic Status Logic for Export
    let statusString = "Eligible";
    
    if (acc.is_counted) {
        statusString = `Counted (${acc.counted_month})`;
    } else {
        const [openY, openM] = acc.opening_date.split('-').map(Number);
        const diff = (currentY - openY) * 12 + (currentM - openM);

        if (diff > 2) {
            statusString = "Not Counted (Expired)";
        } else if (acc.collection_amount < 600) {
            statusString = "Pending (Low Amount)";
        }
    }
    
    // Updated to include ID
    const empString = emp ? `${emp.name} (${emp.id})` : 'Unknown';

    return [
      acc.account_code,
      acc.term,
      acc.collection_amount,
      empString,
      branch ? branch.name : 'Unknown',
      acc.opening_date,
      statusString,
      acc.counted_month || 'N/A',
      acc.salary_sheet_id || 'N/A'
    ];
  });

  downloadCSV(headers, csvRows, filename);
};

export const exportAccountDetails = (
  account: AccountOpening, 
  employeeName: string, 
  branchName: string
) => {
  const headers = [
    "Account Code",
    "Term (Years)",
    "Collection Amount",
    "Opened By",
    "Branch",
    "Opening Date",
    "Current Status",
    "Bonus Eligibility",
    "Counted In Month",
    "Salary Sheet Ref"
  ];

  // Logic duplication for consistency with Report UI
  const today = new Date();
  const currentY = today.getFullYear();
  const currentM = today.getMonth() + 1;
  const [openY, openM] = account.opening_date.split('-').map(Number);
  const diff = (currentY - openY) * 12 + (currentM - openM);

  let status = "Eligible";
  let bonusStatus = "Eligible";

  if (account.is_counted) {
      status = "Processed";
      bonusStatus = "Bonus Paid";
  } else if (diff > 2) {
      status = "Not Counted";
      bonusStatus = "Expired (Window Passed)";
  } else if (account.collection_amount < 600) {
      status = "Pending";
      bonusStatus = "Not Eligible (< 600)";
  }

  const row = [
    account.account_code,
    account.term,
    account.collection_amount,
    employeeName,
    branchName,
    account.opening_date,
    status,
    bonusStatus,
    account.counted_month || "N/A",
    account.salary_sheet_id || "N/A"
  ];

  downloadCSV(headers, [row], `Book_Details_${account.account_code}`);
};

export const exportCentersToCSV = (
  centers: Center[],
  branches: Branch[],
  employees: Employee[],
  filename: string
) => {
  const headers = ["Center Code", "Center Name", "Branch", "Field Officer", "Type"];
  const rows = centers.map(c => [
    c.centerCode,
    c.centerName,
    branches.find(b => b.id === c.branchId)?.name || 'Unknown',
    employees.find(e => e.id === c.assignedEmployeeId)?.name || 'Unknown',
    c.type || (c.centerCode % 2 !== 0 ? 'OWN' : 'OFFICE')
  ]);
  downloadCSV(headers, rows, filename);
};

// Helper function to handle DOM manipulation for download
const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
