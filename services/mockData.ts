
import { Branch, Employee, User, AccountOpening, Center, CenterCollectionRecord, Target, CommissionStructure, Advance } from '../types';

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Dhaka Main', address: '123 Motijheel', phone: '01700000000', status: 'ACTIVE' },
  { id: 'b2', name: 'Chilarchar', address: 'Chilarchar Bazar', phone: '01700000001', status: 'ACTIVE' },
  { id: 'b3', name: 'Madaripur', address: 'Puran Bazar', phone: '01700000002', status: 'ACTIVE' }
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'E-101', name: 'Rahim Uddin', branch_id: 'b1', designation: 'Branch Manager', base_salary: 15000, commission_type: 'A', status: 'ACTIVE' },
  { id: 'E-102', name: 'Karim Hasan', branch_id: 'b1', designation: 'Field Officer', base_salary: 8000, commission_type: 'B', status: 'ACTIVE' },
  { id: 'E-103', name: 'Salma Begum', branch_id: 'b2', designation: 'Field Officer', base_salary: 8500, commission_type: 'A', status: 'ACTIVE' },
  { id: 'E-104', name: 'Jamal Hossain', branch_id: 'b2', designation: 'Branch Manager', base_salary: 14000, commission_type: 'A', status: 'ACTIVE' },
  { id: 'E-105', name: 'Nasrin Akter', branch_id: 'b3', designation: 'Field Officer', base_salary: 8000, commission_type: 'C', status: 'ACTIVE' }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'System Admin', username: 'admin', password: '123', role: 'SUPER_ADMIN', avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff', status: 'ACTIVE' },
  { id: 'u2', name: 'Dhaka Manager', username: 'manager', password: '123', role: 'MANAGER', branch_id: 'b1', avatar: 'https://ui-avatars.com/api/?name=Manager&background=random', status: 'ACTIVE' },
  { id: 'u3', name: 'Rahim User', username: 'user', password: '123', role: 'USER', branch_id: 'b1', employee_id: 'E-101', avatar: 'https://ui-avatars.com/api/?name=Rahim&background=random', status: 'ACTIVE' }
];

export const MOCK_ACCOUNT_OPENINGS: AccountOpening[] = [
  { 
    id: 1, 
    account_code: 'ACC-1001', 
    center_code: 101,
    term: 5, 
    collection_amount: 1200, 
    opened_by_employee_id: 'E-101', 
    branch_id: 'b1', 
    opening_date: '2023-10-15', 
    customer_name: 'John Doe',
    father_husband_name: 'Mr. Doe',
    gender: 'MALE',
    dob: '1990-01-01',
    nid: '1234567890',
    mobile: '01700000000',
    address: 'Dhaka',
    is_counted: false, 
    counted_month: null, 
    salary_sheet_id: null 
  },
  { 
    id: 2, 
    account_code: 'ACC-1002', 
    center_code: 102,
    term: 10, 
    collection_amount: 5000, 
    opened_by_employee_id: 'E-101', 
    branch_id: 'b1', 
    opening_date: '2023-10-18', 
    customer_name: 'Jane Smith',
    father_husband_name: 'Mr. Smith',
    gender: 'FEMALE',
    dob: '1995-05-05',
    nid: '9876543210',
    mobile: '01800000000',
    address: 'Motijheel',
    is_counted: false, 
    counted_month: null, 
    salary_sheet_id: null 
  },
  { 
    id: 3, 
    account_code: 'ACC-1003', 
    center_code: 101,
    term: 3, 
    collection_amount: 500, 
    opened_by_employee_id: 'E-102', 
    branch_id: 'b1', 
    opening_date: '2023-10-20', 
    customer_name: 'Alice Wonder',
    father_husband_name: 'Mr. Wonder',
    gender: 'FEMALE',
    dob: '1992-02-02',
    nid: '1122334455',
    mobile: '01900000000',
    address: 'Gulshan',
    is_counted: false, 
    counted_month: null, 
    salary_sheet_id: null 
  },
  { 
    id: 4, 
    account_code: 'ACC-2001', 
    center_code: 201,
    term: 5, 
    collection_amount: 2000, 
    opened_by_employee_id: 'E-103', 
    branch_id: 'b2', 
    opening_date: '2023-10-22', 
    customer_name: 'Bob Builder',
    father_husband_name: 'Mr. Builder',
    gender: 'MALE',
    dob: '1985-08-08',
    nid: '5544332211',
    mobile: '01600000000',
    address: 'Chilarchar',
    is_counted: false, 
    counted_month: null, 
    salary_sheet_id: null 
  }
];

export const MOCK_CENTERS: Center[] = [
  { id: 'c1', centerCode: 101, centerName: 'Dhaka North', branchId: 'b1', assignedEmployeeId: 'E-102', type: 'OWN', status: 'ACTIVE' },
  { id: 'c2', centerCode: 102, centerName: 'Dhaka South', branchId: 'b1', assignedEmployeeId: 'E-101', type: 'OFFICE', status: 'ACTIVE' },
  { id: 'c3', centerCode: 201, centerName: 'Chilar Bazar', branchId: 'b2', assignedEmployeeId: 'E-103', type: 'OWN', status: 'ACTIVE' }
];

export const MOCK_COLLECTIONS: CenterCollectionRecord[] = [
  { id: 'cr1', branchId: 'b1', employeeId: 'E-102', centerCode: 101, amount: 5000, loanAmount: 2000, type: 'OWN', collectionDate: new Date().toISOString().slice(0, 10), submittedAt: new Date().toISOString(), status: 'ACTIVE' },
  { id: 'cr2', branchId: 'b1', employeeId: 'E-101', centerCode: 102, amount: 12000, loanAmount: 0, type: 'OFFICE', collectionDate: new Date().toISOString().slice(0, 10), submittedAt: new Date().toISOString(), status: 'ACTIVE' }
];

export const MOCK_COMMISSIONS: Record<string, CommissionStructure> = {
  'A': { typeCode: 'A', own: 8, office: 4 },
  'B': { typeCode: 'B', own: 10, office: 6 },
  'C': { typeCode: 'C', own: 8, office: 6 }
};

export const MOCK_TARGETS: Target[] = [
  { id: 't1', employeeId: 'E-102', month: new Date().toISOString().slice(0, 7), collectionTarget: 50000, accountTarget: 10 }
];

export const MOCK_ADVANCES: Advance[] = [
  { id: 'adv1', employeeId: 'E-102', amount: 500, date: '2023-10-01', targetMonth: new Date().toISOString().slice(0, 7), status: 'ACTIVE', notes: 'Medical' }
];
