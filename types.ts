
export interface SheetRow {
  rowIndex?: number; // Google Sheet Row Index for updates
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ADJUSTED';
}

export interface Branch extends SheetRow {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export type CommissionType = string;

export interface CommissionStructure extends SheetRow {
  typeCode: string; // Added to match Sheet Column
  own: number;
  office: number;
}

export const DEFAULT_COMMISSION_RATES: Record<string, CommissionStructure> = {
  'A': { typeCode: 'A', own: 8, office: 4 },
  'B': { typeCode: 'B', own: 10, office: 6 },
  'C': { typeCode: 'C', own: 8, office: 6 }
};

export interface Employee extends SheetRow {
  id: string;
  name: string;
  branch_id: string;
  designation: string;
  base_salary: number;
  commission_type: CommissionType;
}

export interface SalarySheet extends SheetRow {
  id: string;
  month: string; // Format: "YYYY-MM"
  branch_ids: string[];
  created_at: string;
}

export interface SalaryEntry extends SheetRow {
  id: string;
  salary_sheet_id: string;
  month?: string; // Added for history tracking
  employee_id: string;
  basic_salary: number;
  commission_type?: CommissionType;
  own_somity_count: number;
  own_somity_collection: number;
  own_somity_member_count?: number; // New: Track members involved
  office_somity_count: number;
  office_somity_collection: number;
  office_somity_member_count?: number; // New: Track members involved
  center_count: number;
  center_collection: number;
  total_loan_collection: number;
  book_1_5: number;
  book_3: number;
  book_5: number;
  book_8: number;
  book_10: number;
  book_12: number;
  book_no_bonus: number;
  input_late_hours: number;
  input_absent_days: number;
  deduction_cash_advance: number;
  deduction_late: number;
  deduction_abs: number;
  misconductDeduction: number;
  deduction_unlawful: number;
  deduction_tours: number;
  deduction_others: number;
  manager_convenience: number; // MANDATORY: New Incentive Component
  total_books: number;
  total_collection: number;
  total_deductions: number;
  commission: number;
  bonus: number;
  final_salary: number;
}

export interface SalaryRow extends SalaryEntry {
  employee: Employee;
  branch: Branch;
}

export interface Book extends SheetRow {
  id: number;
  code: string;
  term: number;
  owner_employee_id: string;
  branch_id: string;
  is_used: boolean;
  used_in_salary_sheet_id: string | null;
  used_month: string | null;
  created_at: string;
}

export interface AccountOpening extends SheetRow {
  id: number;
  account_code: string;
  center_code: number; // MANDATORY NEW FIELD
  branch_id: string;
  opening_date: string;
  term: number;
  collection_amount: number;
  opened_by_employee_id: string;
  
  // Customer Details
  customer_name: string;
  father_husband_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  nid: string;
  mobile: string;
  address: string;
  
  // Nominee Details
  nominee_name?: string;
  nominee_relation?: string;
  agent_name?: string;

  // System Status
  is_counted: boolean;
  counted_month: string | null;
  salary_sheet_id: string | null;
}

export interface CenterCollectionRecord extends SheetRow {
  id: string;
  branchId: string;
  employeeId: string;
  centerCode: number;
  amount: number;
  loanAmount?: number;
  type: 'OWN' | 'OFFICE';
  collectionDate: string; // RENAMED: Business Date (YYYY-MM-DD)
  submittedAt?: string;   // NEW: System Entry Timestamp
}

export interface Center extends SheetRow {
  id: string;
  centerCode: number;
  centerName: string;
  branchId: string;
  assignedEmployeeId: string;
  type?: 'OWN' | 'OFFICE';
  memberCount?: number;
}

export interface Target extends SheetRow {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  collectionTarget: number;
  accountTarget: number;
}

export interface Advance extends SheetRow {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  targetMonth: string; // YYYY-MM
  status: 'ACTIVE' | 'ADJUSTED' | 'INACTIVE';
  notes?: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | 'MANAGER' | 'USER' | 'AUDITOR';

export interface User extends SheetRow {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  branch_id?: string;
  employee_id?: string;
  avatar?: string;
  password?: string;
}
