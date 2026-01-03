
import { SalaryEntry, CommissionType, CommissionStructure } from '../types';
import { bonusRates } from './bonusRates';

// Constants for calculation logic
const BONUS_TARGET_BOOKS = 50; // Bonus if total books > 50
const TARGET_BONUS_AMOUNT = 500;

// Simple random ID generator compatible with all environments
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const createEmptyEntry = (
  sheetId: string, 
  employeeId: string, 
  baseSalary: number, 
  commissionType: CommissionType = 'A'
): SalaryEntry => {
  return {
    id: generateId(),
    salary_sheet_id: sheetId,
    employee_id: employeeId,
    
    basic_salary: baseSalary, // Initialize with employee's contractual base salary
    commission_type: commissionType,

    own_somity_count: 0,
    own_somity_collection: 0,
    office_somity_count: 0,
    office_somity_collection: 0,
    
    // Initialize Center fields
    center_count: 0,
    center_collection: 0,
    total_loan_collection: 0,
    
    book_1_5: 0,
    book_3: 0,
    book_5: 0,
    book_8: 0,
    book_10: 0,
    book_12: 0,
    book_no_bonus: 0,

    // Deduction Inputs
    input_late_hours: 0,
    input_absent_days: 0,

    // Deductions
    deduction_cash_advance: 0,
    deduction_late: 0,
    deduction_abs: 0,
    misconductDeduction: 0, // "অপকর্ম"
    deduction_unlawful: 0,
    deduction_tours: 0,
    deduction_others: 0,

    // New Incentive
    manager_convenience: 0,

    total_books: 0,
    total_collection: 0,
    total_deductions: 0,
    commission: 0,
    bonus: 0,
    final_salary: baseSalary,
  };
};

export const recalculateEntry = (
  entry: SalaryEntry, 
  contractualBaseSalary: number,
  ratesMap: Record<string, CommissionStructure>,
  commissionTypeOverride?: CommissionType,
  // INJECTED MANAGER CONTEXT
  managerContext?: {
    isManager: boolean;
    branchTotalCollection: number;
  }
): SalaryEntry => {
  // Determine effective commission type
  const commissionType = commissionTypeOverride || entry.commission_type || 'A';

  // 1. Calculate Totals
  const total_books = 
    entry.book_1_5 + 
    entry.book_3 + 
    entry.book_5 + 
    entry.book_8 + 
    entry.book_10 + 
    entry.book_12 + 
    entry.book_no_bonus;

  // Update Total Collection to include Center Collection
  const total_collection = 
    (entry.own_somity_collection || 0) + 
    (entry.office_somity_collection || 0) +
    (entry.center_collection || 0);

  // 2. Calculate Commission
  // Dynamic Rates based on Employee Commission Type
  const rateStruct = ratesMap[commissionType] || { own: 0, office: 0 };
  const ownRate = rateStruct.own / 100;
  const officeRate = rateStruct.office / 100;

  const collectionCommission = 
    ((entry.own_somity_collection || 0) * ownRate) + 
    ((entry.office_somity_collection || 0) * officeRate);
    // Note: Center collection is currently not generating commission based on instructions, only added to totals.

  const bookCommission = 
    (entry.book_1_5 * bonusRates[1.5]) +
    (entry.book_3 * bonusRates[3]) +
    (entry.book_5 * bonusRates[5]) +
    (entry.book_8 * bonusRates[8]) +
    (entry.book_10 * bonusRates[10]) +
    (entry.book_12 * bonusRates[12]);
    // book_no_bonus does not generate commission

  const commission = collectionCommission + bookCommission;
  
  // 3. Calculate Bonus
  // Target Bonus: If they sold more than target
  const bonus = total_books >= BONUS_TARGET_BOOKS ? TARGET_BONUS_AMOUNT : 0;

  // 4. Calculate Deductions
  // Formula for Late: ((ContractualBasic/26)/8) * Late Hours
  // NOTE: We use contractualBaseSalary for deduction rates so penalties don't shrink if Basic is manually lowered.
  const dailyRate = contractualBaseSalary / 26;
  const hourlyRate = dailyRate / 8;

  const deduction_late = (entry.input_late_hours || 0) * hourlyRate;
  
  // Formula for Absent: (ContractualBasic/26) * Absent Days
  const deduction_abs = (entry.input_absent_days || 0) * dailyRate;

  const total_deductions = 
    entry.deduction_cash_advance +
    deduction_late +
    deduction_abs +
    (entry.misconductDeduction || 0) +
    entry.deduction_unlawful +
    entry.deduction_tours +
    entry.deduction_others;

  // 5. Manager Convenience Logic (Engine Injection)
  let manager_convenience = entry.manager_convenience || 0;

  if (managerContext) {
      if (managerContext.isManager) {
          // ManagerOwnCollection = sum of collections done ONLY by this manager
          // Includes: Own Somity, Office Somity, Loan Collections, and Manual Center Collections
          const managerOwnCollection = 
              (entry.own_somity_collection || 0) + 
              (entry.office_somity_collection || 0) + 
              (entry.total_loan_collection || 0) +
              (entry.center_collection || 0);
          
          // Formula: MAX(0, (BranchTotal - Own) * 0.02)
          const diff = managerContext.branchTotalCollection - managerOwnCollection;
          manager_convenience = Math.max(0, diff * 0.02);
      } else {
          // Explicitly zero out for non-managers to ensure data integrity
          manager_convenience = 0;
      }
  }

  // 6. Final Salary
  // Use the Manual Entry Basic Salary (entry.basic_salary) for the final sum
  const final_salary = (entry.basic_salary || 0) + commission + bonus + manager_convenience - total_deductions;

  return {
    ...entry,
    commission_type: commissionType, // Ensure it is persisted on the entry
    deduction_late,
    deduction_abs,
    total_books,
    total_collection,
    total_deductions,
    manager_convenience, // Persist calculated value
    commission,
    bonus,
    final_salary
  };
};
