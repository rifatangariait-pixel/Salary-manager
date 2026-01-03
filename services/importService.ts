
import { AccountOpening, Employee, Branch, Center } from '../types';

interface ImportResult {
  valid: Omit<AccountOpening, 'id'>[];
  errors: string[];
}

interface BranchImportResult {
  valid: { name: string, address?: string, phone?: string }[];
  errors: string[];
}

interface EmployeeImportResult {
  valid: Employee[];
  errors: string[];
}

export interface CenterImportResult {
  valid: Omit<Center, 'id'>[];
  errors: string[];
}

// Validation Helper for Inline Editing
export const validateAccountRow = (
  row: { accountCode: string, amount: string | number, term: string | number, date: string, employeeId: string },
  existingAccounts: AccountOpening[],
  employees: Employee[],
  currentBatchCodes: Set<string> // codes currently in the table to check duplicates within batch
): { isValid: boolean, errors: Record<string, string>, warning?: string } => {
  
  const errors: Record<string, string> = {};
  let warning = '';

  // 1. Account Code
  const code = String(row.accountCode).trim();
  if (!code) {
    errors.accountCode = "Required";
  } else {
    // Check system duplicates
    if (existingAccounts.some(a => a.account_code.toLowerCase() === code.toLowerCase())) {
        errors.accountCode = "Exists in system";
    }
    // Check batch duplicates (The caller handles excluding 'self' if checking the whole set, or we assume batch check is external)
    // Here we assume the caller handles batch duplicate marking or passes relevant info.
  }

  // 2. Amount
  const amount = parseFloat(String(row.amount));
  if (isNaN(amount) || amount < 0) {
      errors.amount = "Invalid number";
  } else if (amount < 600) {
      warning = "Low Amount (< 600)";
  }

  // 3. Term
  const term = parseFloat(String(row.term));
  const validTerms = [1.5, 3, 5, 8, 10, 12];
  if (isNaN(term)) {
      errors.term = "Invalid";
  } else if (!validTerms.includes(term)) {
      errors.term = "Allowed: 1.5, 3, 5, 8, 10, 12";
  }

  // 4. Date
  const dateStr = String(row.date).trim();
  if (!dateStr) {
      errors.date = "Required";
  } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
          errors.date = "Invalid Format";
      }
  }

  // 5. Employee ID
  const empId = String(row.employeeId).trim();
  if (!empId) {
      errors.employeeId = "Required";
  } else {
      const emp = employees.find(e => e.id.toLowerCase() === empId.toLowerCase());
      if (!emp) {
          errors.employeeId = "Not Found";
      } else if (emp.status !== 'ACTIVE') {
          errors.employeeId = "Inactive Employee";
      }
  }

  return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warning
  };
};

export const parseBranchesCSV = (csvContent: string): BranchImportResult => {
  const lines = csvContent.split(/\r?\n/);
  const valid: { name: string, address?: string, phone?: string }[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    return { valid: [], errors: ['File is empty or missing headers'] };
  }

  const normalize = (str: string) => str.toLowerCase().trim();
  const headers = lines[0].split(',').map(h => normalize(h));

  // Look for columns
  const idxName = headers.findIndex(h => h.includes('name') && !h.includes('user'));
  const idxAddress = headers.findIndex(h => h.includes('address'));
  const idxPhone = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));

  if (idxName === -1) {
    return { valid: [], errors: ['Missing "Branch Name" or "Name" column'] };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());
    
    if (cols.length <= idxName) {
         errors.push(`Row ${i + 1}: Incomplete data`);
         continue;
    }
    
    const name = cols[idxName];
    const address = idxAddress !== -1 ? cols[idxAddress] : undefined;
    const phone = idxPhone !== -1 ? cols[idxPhone] : undefined;

    if (!name) {
         errors.push(`Row ${i + 1}: Empty name`);
         continue;
    }
    
    valid.push({ name, address, phone });
  }
  
  return { valid, errors };
};

export const parseEmployeesCSV = (csvContent: string, branches: Branch[], existingIds: string[]): EmployeeImportResult => {
  const lines = csvContent.split(/\r?\n/);
  const valid: Employee[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    return { valid: [], errors: ['File is empty or missing headers'] };
  }

  const normalize = (str: string) => str.toLowerCase().trim();
  const headers = lines[0].split(',').map(h => normalize(h));

  const idxId = headers.findIndex(h => h === 'id' || h.includes('employee id') || h.includes('code'));
  const idxName = headers.findIndex(h => h.includes('name') && !h.includes('branch'));
  const idxDesig = headers.findIndex(h => h.includes('designation') || h.includes('role') || h.includes('position'));
  const idxBranch = headers.findIndex(h => h.includes('branch'));
  const idxSalary = headers.findIndex(h => h.includes('salary') || h.includes('basic') || h.includes('base'));
  const idxComm = headers.findIndex(h => h.includes('commission') || h.includes('type'));

  if (idxId === -1 || idxName === -1 || idxDesig === -1 || idxBranch === -1 || idxSalary === -1) {
    return { 
      valid: [], 
      errors: [`Missing required columns. Expected: Employee ID, Name, Designation, Branch, Basic Salary`] 
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());
    
    if (cols.length < 5) {
       errors.push(`Row ${i + 1}: Incomplete data`);
       continue;
    }

    const id = cols[idxId];
    const name = cols[idxName];
    const designation = cols[idxDesig];
    const branchName = cols[idxBranch];
    const salaryStr = cols[idxSalary];
    const base_salary = parseFloat(salaryStr);

    const commStr = idxComm !== -1 ? cols[idxComm] : 'A';
    let commission_type: any = commStr.toUpperCase().trim();
    if (!['A', 'B', 'C'].includes(commission_type)) {
        commission_type = 'A';
    }

    if (!id) {
       errors.push(`Row ${i + 1}: Missing Employee ID`);
       continue;
    }
    if (existingIds.includes(id) || valid.some(v => v.id === id)) {
       errors.push(`Row ${i + 1}: Duplicate Employee ID '${id}'`);
       continue;
    }
    if (!name) {
       errors.push(`Row ${i + 1}: Missing Name`);
       continue;
    }
    if (isNaN(base_salary)) {
       errors.push(`Row ${i + 1}: Invalid Salary '${salaryStr}'`);
       continue;
    }

    const branch = branches.find(b => normalize(b.name) === normalize(branchName));
    if (!branch) {
       errors.push(`Row ${i + 1}: Branch '${branchName}' not found. Create it first.`);
       continue;
    }

    valid.push({
      id,
      name,
      designation,
      branch_id: branch.id,
      base_salary,
      commission_type
    });
  }

  return { valid, errors };
};

export const parseCentersCSV = (
  csvContent: string, 
  branches: Branch[], 
  employees: Employee[], 
  existingCenters: Center[]
): CenterImportResult => {
  const lines = csvContent.split(/\r?\n/);
  const valid: Omit<Center, 'id'>[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    return { valid: [], errors: ['File is empty or missing headers'] };
  }

  const normalize = (str: string) => str.toLowerCase().trim();
  const headers = lines[0].split(',').map(h => normalize(h));

  const idxCode = headers.findIndex(h => h.includes('center_code') || h.includes('code'));
  const idxName = headers.findIndex(h => h.includes('center_name') || h.includes('name'));
  const idxBranch = headers.findIndex(h => h.includes('branch'));
  const idxEmp = headers.findIndex(h => h.includes('employee_code') || h.includes('field_officer') || h.includes('employee'));
  const idxType = headers.findIndex(h => h.includes('type'));

  if (idxCode === -1 || idxName === -1 || idxBranch === -1 || idxEmp === -1) {
    return {
      valid: [],
      errors: [`Missing required columns. Found: ${headers.join(', ')}. Expected: center_code, center_name, branch, employee_code, type(optional)`]
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());

    if (cols.length < 4) {
       errors.push(`Row ${i + 1}: Incomplete data`);
       continue;
    }

    const codeStr = cols[idxCode];
    const name = cols[idxName];
    const branchName = cols[idxBranch];
    const empCode = cols[idxEmp]; 
    
    let typeVal: 'OWN' | 'OFFICE' | undefined = undefined;
    if (idxType !== -1 && cols[idxType]) {
        const t = cols[idxType].toUpperCase().trim();
        if (t === 'OWN' || t === 'OFFICE') {
            typeVal = t;
        }
    }

    if (!codeStr || !name || !branchName || !empCode) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
    }

    const centerCode = parseInt(codeStr);
    if (isNaN(centerCode)) {
        errors.push(`Row ${i + 1}: Invalid Center Code '${codeStr}'`);
        continue;
    }

    const branch = branches.find(b => normalize(b.name) === normalize(branchName));
    if (!branch) {
        errors.push(`Row ${i + 1}: Branch '${branchName}' not found`);
        continue;
    }

    const employee = employees.find(e => e.id === empCode);
    if (!employee) {
        errors.push(`Row ${i + 1}: Employee with ID '${empCode}' not found`);
        continue;
    }
    
    if (employee.branch_id !== branch.id) {
        errors.push(`Row ${i + 1}: Employee '${employee.name}' does not belong to branch '${branch.name}'`);
        continue;
    }

    const existsInSystem = existingCenters.some(c => c.branchId === branch.id && c.centerCode === centerCode);
    if (existsInSystem) {
        errors.push(`Row ${i + 1}: Center Code ${centerCode} already exists in ${branch.name}`);
        continue;
    }
    
    const existsInBatch = valid.some(c => c.branchId === branch.id && c.centerCode === centerCode);
    if (existsInBatch) {
        errors.push(`Row ${i + 1}: Duplicate Center Code ${centerCode} for ${branch.name} in file`);
        continue;
    }

    if (!typeVal) {
        typeVal = centerCode % 2 !== 0 ? 'OWN' : 'OFFICE';
    }

    valid.push({
        centerCode,
        centerName: name,
        branchId: branch.id,
        assignedEmployeeId: employee.id,
        type: typeVal
    });
  }

  return { valid, errors };
};
