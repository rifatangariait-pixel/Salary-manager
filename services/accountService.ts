
import { AccountOpening } from '../types';

export function getAccountsByEmployee(id: string, allAccounts: AccountOpening[]): AccountOpening[] {
  return allAccounts.filter(a => a.opened_by_employee_id === id);
}

export function validateAccount(
  code: string, 
  employeeId: string, 
  branchId: string, 
  sheetMonth: string, // YYYY-MM
  allAccounts: AccountOpening[]
): { ok: boolean; error?: string; account?: AccountOpening } {
  // Normalize input
  const normalizedCode = code.trim().toLowerCase();
  
  // Case-insensitive search in the provided list (live data)
  const ac = allAccounts.find(a => a.account_code.toLowerCase() === normalizedCode);

  if (!ac) return { ok: false, error: "Account not found" };
  
  // Verify ownership
  if (ac.opened_by_employee_id !== employeeId)
    return { ok: false, error: "Belongs to another employee" };
    
  // Verify branch
  if (ac.branch_id !== branchId)
    return { ok: false, error: "Branch mismatch" };
    
  // Verify if already used
  if (ac.is_counted) {
      if (ac.counted_month === sheetMonth) {
           return { ok: false, error: "Already scanned in this sheet" };
      }
      return { ok: false, error: `Used in ${ac.counted_month || 'past'}` };
  }

  // --- UPDATED BONUS LOGIC ---

  // 1. Collection Amount Check (Must be >= 600)
  if (ac.collection_amount < 600) {
      return { ok: false, error: "Not Eligible: Collection < 600" };
  }

  // 2. Time Window Check (Opening Month + 2 Months)
  // Parse Dates
  const [openY, openM] = ac.opening_date.split('-').map(Number);
  const [sheetY, sheetM] = sheetMonth.split('-').map(Number);
  
  // Calculate difference in months: (SheetYear - OpenYear)*12 + (SheetMonth - OpenMonth)
  const monthDiff = (sheetY - openY) * 12 + (sheetM - openM);

  // Valid values are 0 (Same Month) to 2 (2 Months later)
  if (monthDiff < 0) {
      return { ok: false, error: "Error: Account opened after sheet month" };
  }
  
  if (monthDiff > 2) {
      return { ok: false, error: "Expired: 2-month bonus window passed" };
  }

  return { ok: true, account: ac };
}

// Deprecated in favor of state management in App.tsx, but kept for compatibility if needed elsewhere
export function markAccountAsCounted(code: string, salarySheetId: string, month: string): void {
  // Implementation moved to App.tsx state handler
}
