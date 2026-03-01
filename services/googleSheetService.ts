
// ... existing imports ...
import { Branch, Employee, User, AccountOpening, Center, CenterCollectionRecord, CommissionStructure, Target, Advance, SalaryEntry } from '../types';
import { KJUR } from 'jsrsasign';

// ... existing configuration code ...
const getEnv = () => {
  try {
    return (import.meta as any).env || {};
  } catch {
    return {};
  }
};

const env = getEnv();

// Hardcoded for demo stability, but normally env vars
const SPREADSHEET_ID = env.VITE_GOOGLE_SHEET_ID || '1s12Xc2jaPYdfKY15Td9hR0Ri0LbswTKBguhiSMDgq80';
const CLIENT_EMAIL = env.VITE_GOOGLE_SERVICE_EMAIL || 'sheet-db-service@gen-lang-client-0882953008.iam.gserviceaccount.com';

const PRIVATE_KEY_STRING = `-----BEGIN PRIVATE KEY-----
MIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQCKOEjifs9dL8u+
x20Vn3ljTnXQN4/V6oUoMI+mGyBonT3JXfxDjiguUn15SfWnwLZjghJSgUR6HMYZ
bC8n/mrJr4Nw8L7UYtDAj1mrM0gJ68/ck/pYdDgjBbDZ/2cFzw2qieuObhtLVrOc
hyuJe4LGkDHCC2av/u+YVDpSF6E7PIUJH+gqrgPkSmjc2vrXE5bWe77GpfWGjJ6D
ZCqaOSPH/ok2TAk3yGFTqxz+1ph81Y0HPVYBzbsA/mNc2Va6rzhcjb+V6dO18Rtb
iwC7bH99B7wbIgH5ma1S98r5m5I0Y3H0NXNB47WfJ+0ga5EJe/3YK2YeFoR7B7z+
RA4z0kIZAgMBAAECgf8ojCc75Cq9q5SZr7QDvXf4XSWZCRoPWj0cQFXjsXfqBWoB
KKq+wEIJVMNHHlGll8mDNFhe28BUeLYK8mTjCdlJ6uZXiEhzBb03jNYOFknyOLtB
rVqp/qFGC0u8p+NEUPlkjhE/anP9v4skebX/Hu++UFt7qtyOkYfrQZcNfhROZYQ1
ZzlEbWwa2VwjQugLGstiCu7CxCgfIc/kfQXt9ZpemXPc2Ia+G6A1nJ9AXhGObrWB
C+wjLqsMaPT1l5qMpOhHdizZMGtvYya4rm6M3hDfsn1yIhzX6siLWPO8ODcJZVxy
cR3IVwhDCMBD1tzU9OCTbsvMkaad2FSeTM60JTkCgYEAwjPsxGQQnoSjjdGVSPDK
bto2Ot/qhpXu9u8rUBD0TS0xfd9leuYEUsqwgrolQVR310G1ZZw5bJegmDG1JRXJ
zFTMtKjsaZ0BZp1rvDP6zxHZIrkPVCLS1EWo7dDbty5SfxaMmE19nOakJzmDirSG
w817CF6HkMNjRnL9OxFuJ40CgYEAtjPlpm7VrTBeBw/42L5detxxb2/E6w+sidax
IWDDiMkm9f5HD+SRX5rq0JfnIY73kH3BzFFzkBinEHixyNpAPkXmWqhBBG7QZEP5
7i3LoEG4b/1vMtx4Wrekb8vJOp5m24oiVT8zQUd1EkL5/0WNkYl2K98J1sq+5BdG
Dhf8C70CgYBbRW4kiuboqWv4ziR8SHbLjJDqMKyXnkXWFmfj1GQNFY1qHCEklpA3
nP1CI1w5DQrZxw8K91ZhvA2FGe+Jw2i5OK2Qxsd9h4XOBXRJ2qAoy7miQRl8MHWn
wCl5w6xPtlydUCq5tcmwgRFrQfOZr+iag6ssLslF9x5kUMzFAxcjTQKBgEBhRBMz
9JKWlZLfROmpEjTYcciTcLwyNKAb2UjW/SB3GyouqANomylx/uin1AaaksVeejzs
xu2ymE2MqB01aR/X6RY9f4PGeCIFlulfCyVcM4R2w3TwTCKZ4yORmU/6KpQGUi1X
AJBfZHGIcveNJwG21aeYzswzpZHI23sdZHTtAoGAMpEIj+ZCChUUSWLnZrYx6Jm8
kcGY4UCCkm4qanbg5dm3rAp9+I7BJ3mq5lW3PE5fHsw+qY4ukveL9ksfiMlGjW0B
rfxQ7ipL/MSCjG8Y5Cmv1YedfLPa9vg7Ie004bCnrbRfCkxJ3DaKRoGmmmtlgl1z
2asM0CnGL2iIyjqhNNE=
-----END PRIVATE KEY-----`;

const PRIVATE_KEY = env.VITE_GOOGLE_PRIVATE_KEY 
  ? env.VITE_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : PRIVATE_KEY_STRING;

// ... (Existing Sheet Constants) ...
const SHEETS = {
  USERS: 'SystemUsers',
  BRANCHES: 'Branches',
  EMPLOYEES: 'Employees',
  COMMISSIONS: 'CommissionTypes',
  CENTERS: 'Centers',
  ACCOUNTS: 'Accounts',
  COLLECTIONS: 'Collections',
  TARGETS: 'Targets',
  ADVANCES: 'Advances',
  SALARY_HISTORY: 'SalaryHistory'
};

const SHEET_HEADERS = {
  [SHEETS.USERS]: ['ID', 'Name', 'Username', 'Password', 'Role', 'BranchID', 'Status', 'EmployeeID', 'CreatedAt', 'Avatar'],
  [SHEETS.BRANCHES]: ['ID', 'Name', 'Status', 'Address', 'Phone'],
  [SHEETS.EMPLOYEES]: ['ID', 'Name', 'Code', 'BranchID', 'CommissionType', 'Status', 'Designation', 'BaseSalary'],
  [SHEETS.COMMISSIONS]: ['TypeCode', 'OwnRate', 'OfficeRate', 'Status'],
  [SHEETS.CENTERS]: ['ID', 'CenterCode', 'Type', 'BranchID', 'AssignedEmployeeID', 'CenterName', 'Status', 'MemberCount'], 
  [SHEETS.ACCOUNTS]: ['ID', 'AccountCode', 'Term', 'CollectionAmount', 'OpenedBy', 'BranchID', 'OpeningDate', 'IsCounted', 'CountedMonth', 'SalarySheetID', 'Status', 'CenterCode', 'CustomerName', 'FatherName', 'Gender', 'DOB', 'NID', 'Mobile', 'Address', 'Nominee', 'Relation', 'Agent'],
  [SHEETS.COLLECTIONS]: ['ID', 'Date', 'Month', 'BranchID', 'CenterCode', 'AccountID', 'EmployeeID', 'Amount', 'LoanAmount', 'CreatedBy', 'SubmittedAt', 'Type'], 
  [SHEETS.TARGETS]: ['ID', 'EmployeeID', 'Month', 'CollectionTarget', 'AccountTarget', 'Status'],
  [SHEETS.ADVANCES]: ['ID', 'EmployeeID', 'Amount', 'Date', 'TargetMonth', 'Status', 'Notes'],
  [SHEETS.SALARY_HISTORY]: ['ID', 'SalarySheetID', 'Month', 'EmployeeID', 'BasicSalary', 'CommType', 'OwnCount', 'OwnColl', 'OffCount', 'OffColl', 'CenCount', 'CenColl', 'LoanColl', 'B1.5', 'B3', 'B5', 'B8', 'B10', 'B12', 'BNo', 'Late', 'Abs', 'DedAdv', 'DedLate', 'DedAbs', 'DedMisc', 'DedUnlaw', 'DedTours', 'DedOth', 'IncConv', 'TotalBk', 'TotalColl', 'TotalDed', 'Comm', 'Bonus', 'Final', 'Status', 'OwnMembers', 'OffMembers']
};

// HELPER: Sanitize value for Google Sheets (Prevent Undefined/NaN)
const sanitizeValue = (val: any, fallback: any = '') => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === 'number' && Number.isNaN(val)) return fallback;
    return val;
};

// ... (Existing Helpers safeStr, safeNum, etc) ...
const safeStr = (val: any) => (val === undefined || val === null) ? '' : String(val).trim();
const safeNum = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};
const normalizeStatus = (val: any) => {
    const s = safeStr(val).toUpperCase();
    return s === '' ? 'ACTIVE' : s;
};
const safeId = (val: any) => {
    const s = safeStr(val);
    return (s === 'NULL' || s === '') ? undefined : s;
};

const normalizeDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000) + 43200000);
        return date.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const n1 = parseInt(parts[0]);
        const n2 = parseInt(parts[1]);
        const n3 = parseInt(parts[2]);
        let y, m, d;
        if (n3 > 1000) { y = n3; if (n2 > 12) { m = n1; d = n2; } else if (n1 > 12) { m = n2; d = n1; } else { d = n1; m = n2; } } 
        else if (n1 > 1000) { y = n1; m = n2; d = n3; }
        if (y && m && d) { const pad = (num: number) => num.toString().padStart(2, '0'); return `${y}-${pad(m)}-${pad(d)}`; }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        try {
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const pad = (num: number) => num.toString().padStart(2, '0');
            return `${y}-${pad(m)}-${pad(day)}`;
        } catch (e) { return ''; }
    }
    return '';
};

const findHeaderIndex = (headers: any[], possibilities: string[], defaultIdx: number) => {
    if (!headers || !Array.isArray(headers) || headers.length === 0) return defaultIdx;
    const lowerHeaders = headers.map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const p of possibilities) {
        const normP = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        const idx = lowerHeaders.findIndex(h => h.includes(normP));
        if (idx !== -1) return idx;
    }
    return defaultIdx;
};

// ... (Class Definition) ...
class GoogleSheetService {
  private baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private initializationPromise: Promise<void> | null = null;

  // ... (Auth methods: getAccessToken, ensureInitialized, performInitialization) ...
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    try {
      const now = Math.floor(Date.now() / 1000);
      const claim = {
        iss: CLIENT_EMAIL,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };
      const header = { alg: "RS256", typ: "JWT" };
      const signature = KJUR.jws.JWS.sign("RS256", JSON.stringify(header), JSON.stringify(claim), PRIVATE_KEY);
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signature }),
      });
      if (!response.ok) throw new Error(`Auth Failed: ${response.statusText}`);
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return this.accessToken!;
    } catch (error) {
      console.error("Token Generation Error:", error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization() {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(this.baseUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch spreadsheet metadata");
      const data = await response.json();
      const existingTitles = (data.sheets || []).map((s: any) => s.properties.title);
      const requests: any[] = [];
      Object.entries(SHEET_HEADERS).forEach(([title]) => {
        if (!existingTitles.includes(title)) { requests.push({ addSheet: { properties: { title } } }); }
      });
      if (requests.length > 0) {
        await fetch(`${this.baseUrl}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests })
        });
      }
      for (const [title, headers] of Object.entries(SHEET_HEADERS)) {
        if (!existingTitles.includes(title)) {
           await this.writeRow(title, headers);
           if (title === SHEETS.USERS) {
             await this.writeRow(title, ['u1', 'Super Admin', 'admin', 'admin', 'SUPER_ADMIN', 'NULL', 'ACTIVE', 'NULL', new Date().toISOString()]);
           }
        }
      }
    } catch (error) { console.error("Initialization Failed:", error); }
  }

  // ... (fetchSheet, writeRow, writeRows, updateRow) ...
  async batchFetchSheets(ranges: string[]): Promise<Record<string, any[][]>> {
    await this.ensureInitialized();
    try {
      const token = await this.getAccessToken();
      // Construct batchGet URL
      const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
      const url = `${this.baseUrl}/values:batchGet?${rangesParam}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Batch Fetch Failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result: Record<string, any[][]> = {};
      
      if (data.valueRanges) {
          data.valueRanges.forEach((vr: any) => {
              // Extract sheet name from range (e.g. "SystemUsers!A1:Z100" -> "SystemUsers")
              const rangeName = vr.range.split('!')[0].replace(/'/g, '');
              result[rangeName] = vr.values || [];
          });
      }
      
      return result;
    } catch (error) {
        console.error("Batch fetch failed:", error);
        throw error; // Rethrow to let caller handle it
    }
  }

  async fetchAllData() {
    const ranges = [
      SHEETS.BRANCHES,
      SHEETS.EMPLOYEES,
      SHEETS.ACCOUNTS,
      SHEETS.CENTERS,
      SHEETS.COLLECTIONS,
      SHEETS.COMMISSIONS,
      SHEETS.TARGETS,
      SHEETS.ADVANCES,
      SHEETS.USERS
    ];

    const rawData = await this.batchFetchSheets(ranges);

    return {
      branches: await this.getBranches(rawData[SHEETS.BRANCHES]),
      employees: await this.getEmployees(rawData[SHEETS.EMPLOYEES]),
      accounts: await this.getAccounts(rawData[SHEETS.ACCOUNTS]),
      centers: await this.getCenters(rawData[SHEETS.CENTERS]),
      collections: await this.getCollections(rawData[SHEETS.COLLECTIONS]),
      commissions: await this.getCommissions(rawData[SHEETS.COMMISSIONS]),
      targets: await this.getTargets(rawData[SHEETS.TARGETS]),
      advances: await this.getAdvances(rawData[SHEETS.ADVANCES]),
      users: await this.getUsers(rawData[SHEETS.USERS])
    };
  }

  private async fetchSheet(range: string, retries = 3): Promise<any[][]> {
    await this.ensureInitialized();
    // No outer try-catch to swallow errors
    const token = await this.getAccessToken();
    // Add timestamp to prevent caching
    const url = `${this.baseUrl}/values/${range}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
    
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
              headers: { 
                  Authorization: `Bearer ${token}`
              },
              cache: "no-store"
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                console.warn(`[GoogleSheetService] Attempt ${i+1} failed for ${range}: ${response.status} - ${errorBody}`);
                if (response.status === 429 || response.status >= 500) {
                    // Retryable errors
                    await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Increased backoff
                    continue;
                }
                throw new Error(`API Error (${response.status}): ${errorBody}`);
            }
            
            const data = await response.json();
            return data.values || [];
        } catch (e: any) {
            console.warn(`[GoogleSheetService] Network attempt ${i+1} failed for ${range}:`, e.message);
            lastError = e;
            if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
                await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Increased backoff
                continue;
            }
            throw e;
        }
    }
    throw lastError;
  }

  private async writeRow(range: string, values: any[]): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [values] })
      });
      if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error appending to ${range}: ${response.status} - ${errorText}`);
          throw new Error(`Google Sheets API Error: ${response.statusText} - ${errorText}`);
      }
      return true;
    } catch (error) { 
        console.error(`Error appending to ${range}:`, error); 
        throw error; 
    }
  }

  private async writeRows(range: string, values: any[][]): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: values })
      });
      
      if (!response.ok) {
          const errorText = await response.text();
          console.error(`Google Sheets API Error (${range}):`, errorText);
          throw new Error(`Write failed: ${response.status} - ${errorText}`);
      }
      return true;
    } catch (error) { 
        console.error(`Error appending batch to ${range}:`, error); 
        throw error; 
    }
  }

  private async updateRow(range: string, values: any[]): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [values] })
      });
      return response.ok;
    } catch (error) { console.error(`Error updating ${range}:`, error); return false; }
  }

  // ... (getUsers, addUser, getBranches, addBranch, addBranches, getEmployees, addEmployee, addEmployees, updateEmployee) ...
  async getUsers(preFetchedRows?: any[][]): Promise<User[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.USERS);
    if (!rows || rows.length < 2) {
        return [{
            id: 'u1',
            name: 'System Admin',
            username: 'admin',
            password: '123',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        }];
    }
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: safeStr(row[0]),
      name: safeStr(row[1]),
      username: safeStr(row[2]),
      password: safeStr(row[3]),
      role: safeStr(row[4]) as any,
      branch_id: safeId(row[5]),
      status: normalizeStatus(row[6]) as any,
      employee_id: safeId(row[7]),
      avatar: safeStr(row[9]) || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeStr(row[1]))}&background=random&color=fff`
    })).filter(u => u.status === 'ACTIVE');
  }

  async addUser(user: Omit<User, 'rowIndex'>) {
    const row = [user.id, user.name, user.username, user.password || '', user.role, user.branch_id || 'NULL', 'ACTIVE', user.employee_id || 'NULL', new Date().toISOString(), user.avatar || ''];
    return this.writeRow(SHEETS.USERS, row);
  }

  async updateUser(user: User) {
    if (!user.rowIndex) throw new Error("Cannot update user without rowIndex");
    const range = `${SHEETS.USERS}!A${user.rowIndex}:J${user.rowIndex}`;
    const row = [user.id, user.name, user.username, user.password || '', user.role, user.branch_id || 'NULL', user.status || 'ACTIVE', user.employee_id || 'NULL', new Date().toISOString(), user.avatar || ''];
    
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [row] }),
        cache: "no-store"
      });
      return response.ok;
    } catch (error) { console.error(`Error updating user ${user.id}:`, error); return false; }
  }

  async getBranches(preFetchedRows?: any[][]): Promise<Branch[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.BRANCHES);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: safeStr(row[0]),
      name: safeStr(row[1]),
      status: normalizeStatus(row[2]) as any,
      address: safeStr(row[3]),
      phone: safeStr(row[4])
    })).filter(b => b.status === 'ACTIVE');
  }

  async addBranch(branch: Omit<Branch, 'rowIndex'>) {
    const row = [branch.id, branch.name, 'ACTIVE', branch.address || '', branch.phone || ''];
    return this.writeRow(SHEETS.BRANCHES, row);
  }

  async addBranches(branches: Omit<Branch, 'rowIndex'>[]) {
    const rows = branches.map(b => [b.id, b.name, 'ACTIVE', b.address || '', b.phone || '']);
    return this.writeRows(SHEETS.BRANCHES, rows);
  }

  async getEmployees(preFetchedRows?: any[][]): Promise<Employee[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.EMPLOYEES);
    if (rows.length === 0) return [];
    const headers = rows[0];
    const idIdx = findHeaderIndex(headers, ['id'], 0);
    const nameIdx = findHeaderIndex(headers, ['name'], 1);
    const branchIdx = findHeaderIndex(headers, ['branch'], 3);
    const commIdx = findHeaderIndex(headers, ['commission', 'type'], 4);
    const statusIdx = findHeaderIndex(headers, ['status'], 5);
    const desigIdx = findHeaderIndex(headers, ['designation'], 6);
    const salaryIdx = findHeaderIndex(headers, ['base', 'salary'], 7);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: safeStr(row[idIdx]),
      name: safeStr(row[nameIdx]),
      branch_id: safeStr(row[branchIdx]),
      commission_type: safeStr(row[commIdx]),
      status: normalizeStatus(row[statusIdx]) as any,
      designation: safeStr(row[desigIdx]) || 'Staff',
      base_salary: safeNum(row[salaryIdx])
    })).filter(e => e.status === 'ACTIVE');
  }
  
  async addEmployee(emp: Omit<Employee, 'rowIndex'>) {
    const row = [emp.id, emp.name, emp.id, emp.branch_id, emp.commission_type, 'ACTIVE', emp.designation || 'Staff', emp.base_salary || 0];
    return this.writeRow(SHEETS.EMPLOYEES, row);
  }

  async addEmployees(employees: Omit<Employee, 'rowIndex'>[]) {
    const rows = employees.map(emp => [emp.id, emp.name, emp.id, emp.branch_id, emp.commission_type, 'ACTIVE', emp.designation || 'Staff', emp.base_salary || 0]);
    return this.writeRows(SHEETS.EMPLOYEES, rows);
  }

  async updateEmployee(emp: Employee) {
    // Always look up by ID to ensure correctness
    const rows = await this.fetchSheet(SHEETS.EMPLOYEES);
    const idx = rows.findIndex(row => String(row[0]) === String(emp.id));
    
    if (idx !== -1) {
        emp.rowIndex = idx + 1; // Fix: idx is 0-based from fetchSheet, so Row 1 (Header) is index 0. Row 2 is index 1.
    } else {
        console.error("Employee not found for update:", emp.id);
        return;
    }

    if(!emp.rowIndex) return;
    const range = `${SHEETS.EMPLOYEES}!A${emp.rowIndex}:H${emp.rowIndex}`;
    const row = [emp.id, emp.name, emp.id, emp.branch_id, emp.commission_type, emp.status || 'ACTIVE', emp.designation || 'Staff', emp.base_salary || 0];
    return this.updateRow(range, row);
  }

  async getAccounts(preFetchedRows?: any[][]): Promise<AccountOpening[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.ACCOUNTS);
    console.log(`[GoogleSheetService] Fetched ${rows.length} rows from ${SHEETS.ACCOUNTS}`);
    if (rows.length === 0) return [];
    
    // Use fixed indices to match addAccount/updateAccount logic
    const idIdx = 0;
    const codeIdx = 1;
    const termIdx = 2;
    const amountIdx = 3;
    const empIdx = 4;
    const branchIdx = 5;
    const dateIdx = 6;
    const countedIdx = 7;
    const monthIdx = 8;
    const sheetIdx = 9;
    const statusIdx = 10;
    const centerIdx = 11;
    const custNameIdx = 12;
    const fatherIdx = 13;
    const genderIdx = 14;
    const dobIdx = 15;
    const nidIdx = 16;
    const mobileIdx = 17;
    const addrIdx = 18;
    const nomNameIdx = 19;
    const nomRelIdx = 20;
    const agentIdx = 21;

    return rows.slice(1).map((row, index) => {
      const getVal = (idx: number) => row[idx];
      
      return {
        rowIndex: index + 2,
        id: safeNum(getVal(idIdx)),
        account_code: safeStr(getVal(codeIdx)),
        term: safeNum(getVal(termIdx)),
        collection_amount: safeNum(getVal(amountIdx)),
        opened_by_employee_id: safeStr(getVal(empIdx)),
        branch_id: safeStr(getVal(branchIdx)),
        opening_date: normalizeDate(getVal(dateIdx)),
        is_counted: String(getVal(countedIdx)).toUpperCase() === 'TRUE',
        counted_month: safeId(getVal(monthIdx)) || null,
        salary_sheet_id: safeId(getVal(sheetIdx)) || null,
        status: normalizeStatus(getVal(statusIdx)) as any,
        center_code: safeNum(getVal(centerIdx)),
        customer_name: safeStr(getVal(custNameIdx)) || 'Unknown',
        father_husband_name: safeStr(getVal(fatherIdx)),
        gender: (safeStr(getVal(genderIdx)) || 'MALE') as 'MALE' | 'FEMALE' | 'OTHER',
        dob: normalizeDate(getVal(dobIdx)),
        nid: safeStr(getVal(nidIdx)),
        mobile: safeStr(getVal(mobileIdx)),
        address: safeStr(getVal(addrIdx)),
        nominee_name: safeStr(getVal(nomNameIdx)),
        nominee_relation: safeStr(getVal(nomRelIdx)),
        agent_name: safeStr(getVal(agentIdx))
      };
    }).filter(a => a.status === 'ACTIVE');
  }

  async addAccount(acc: Omit<AccountOpening, 'rowIndex'>) {
    // Explicitly mapping and sanitizing
    // Ensure center_code is a number or 0 if missing/null
    const centerCode = (acc.center_code !== undefined && acc.center_code !== null) ? Number(acc.center_code) : 0;

    const row = [
        sanitizeValue(acc.id), 
        sanitizeValue(acc.account_code), 
        sanitizeValue(acc.term, 0), 
        sanitizeValue(acc.collection_amount, 0), 
        sanitizeValue(acc.opened_by_employee_id), 
        sanitizeValue(acc.branch_id), 
        sanitizeValue(acc.opening_date, new Date().toISOString().slice(0, 10)), 
        acc.is_counted ? true : false, 
        'NULL', // counted_month
        'NULL', // salary_sheet_id
        'ACTIVE',
        // Extended Fields
        centerCode,
        sanitizeValue(acc.customer_name),
        sanitizeValue(acc.father_husband_name),
        sanitizeValue(acc.gender, 'MALE'),
        sanitizeValue(acc.dob),
        sanitizeValue(acc.nid),
        sanitizeValue(acc.mobile),
        sanitizeValue(acc.address),
        sanitizeValue(acc.nominee_name),
        sanitizeValue(acc.nominee_relation),
        sanitizeValue(acc.agent_name)
    ];
    return this.writeRow(SHEETS.ACCOUNTS, row);
  }

  private headerMaps: Record<string, Record<string, number>> = {};

  private async getHeaderMap(sheetName: string): Promise<Record<string, number>> {
    if (this.headerMaps[sheetName]) return this.headerMaps[sheetName];

    const rows = await this.fetchSheet(`${sheetName}!A1:Z1`); // Fetch header row
    if (!rows || rows.length === 0) return {};

    const map = rows[0].reduce((acc: any, col: string, idx: number) => {
      const normalizedCol = String(col).toLowerCase().replace(/[^a-z0-9]/g, '');
      acc[normalizedCol] = idx;
      return acc;
    }, {});

    this.headerMaps[sheetName] = map;
    return map;
  }

  async updateAccount(acc: AccountOpening) {
    // Always fetch fresh rows to find the correct index by ID. 
    // Trusting client-side rowIndex is risky if the sheet changed.
    const rows = await this.fetchSheet(SHEETS.ACCOUNTS);
    const idx = rows.findIndex(row => String(row[0]) === String(acc.id));
    
    if (idx !== -1) {
        acc.rowIndex = idx + 1; // Fix: idx is 0-based. Row 1 is Header (idx 0). Row 2 is Data (idx 1).
    } else {
        console.error("Account not found for update:", acc.id);
        throw new Error(`Account with ID ${acc.id} not found for update.`);
    }

    const range = `${SHEETS.ACCOUNTS}!A${acc.rowIndex}:V${acc.rowIndex}`; // A to V covers indices 0 to 21
    
    // Fetch existing row to preserve data
    const existingRows = await this.fetchSheet(range);
    let row = existingRows && existingRows.length > 0 ? existingRows[0] : [];

    // Ensure row has enough length (up to index 21)
    if (row.length < 22) {
        const diff = 22 - row.length;
        for(let i=0; i<diff; i++) row.push('');
    }

    // Update fields using FIXED INDICES to match addAccount/getAccounts
    // This ensures consistency and avoids header name mismatch issues
    row[0] = sanitizeValue(acc.id);
    row[1] = sanitizeValue(acc.account_code);
    row[2] = sanitizeValue(acc.term, 0);
    row[3] = sanitizeValue(acc.collection_amount, 0);
    row[4] = sanitizeValue(acc.opened_by_employee_id);
    row[5] = sanitizeValue(acc.branch_id);
    row[6] = sanitizeValue(acc.opening_date);
    row[7] = acc.is_counted ? true : false;
    row[8] = sanitizeValue(acc.counted_month, 'NULL');
    row[9] = sanitizeValue(acc.salary_sheet_id, 'NULL');
    row[10] = sanitizeValue(acc.status, 'ACTIVE');
    row[11] = (acc.center_code !== undefined && acc.center_code !== null) ? Number(acc.center_code) : 0;
    row[12] = sanitizeValue(acc.customer_name);
    row[13] = sanitizeValue(acc.father_husband_name);
    row[14] = sanitizeValue(acc.gender, 'MALE');
    row[15] = sanitizeValue(acc.dob);
    row[16] = sanitizeValue(acc.nid);
    row[17] = sanitizeValue(acc.mobile);
    row[18] = sanitizeValue(acc.address);
    row[19] = sanitizeValue(acc.nominee_name);
    row[20] = sanitizeValue(acc.nominee_relation);
    row[21] = sanitizeValue(acc.agent_name);

    const success = await this.updateRow(range, row);
    if (!success) {
        throw new Error(`Failed to update row ${acc.rowIndex} in Google Sheets.`);
    }
  }

  async addAccounts(accounts: Omit<AccountOpening, 'rowIndex'>[]) {
    // Loop through accounts and submit one by one to ensure reliability
    // and avoid sending large arrays that might be rejected.
    console.log(`[GoogleSheetService] Starting sequential save of ${accounts.length} accounts.`);
    
    for (const [index, acc] of accounts.entries()) {
        try {
            console.log(`[GoogleSheetService] Saving account ${index + 1}/${accounts.length}: ${acc.account_code}`);
            await this.addAccount(acc);
        } catch (error: any) {
            console.error(`[GoogleSheetService] Failed to save account ${acc.account_code} at index ${index}:`, error);
            // Re-throw to alert the UI that the batch failed partially
            throw new Error(`Failed to save account ${acc.account_code}: ${error.message || 'Unknown Error'}`);
        }
    }
    return true;
  }

  // ... (getCollections, addCollections, getCenters, addCenter, updateCenter, etc.) ...
  async getCollections(preFetchedRows?: any[][]): Promise<CenterCollectionRecord[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.COLLECTIONS);
    console.log(`[GoogleSheetService] Fetched ${rows.length} rows from ${SHEETS.COLLECTIONS}`);
    if (rows.length === 0) return [];

    const headers = rows[0];
    const idIdx = findHeaderIndex(headers, ['id'], 0);
    const dateIdx = findHeaderIndex(headers, ['date'], 1);
    const branchIdx = findHeaderIndex(headers, ['branch'], 3);
    const centerIdx = findHeaderIndex(headers, ['centercode', 'center'], 4);
    const empIdx = findHeaderIndex(headers, ['employee'], 6);
    const amountIdx = findHeaderIndex(headers, ['amount'], 7);
    
    const loanIdx = 8; 
    const typeIdx = 11; 

    return rows.slice(1).map((row, index) => {
      const centerCode = safeNum(row[centerIdx]);
      const parsedDate = normalizeDate(row[dateIdx]);
      
      let loanAmount = 0;
      const rawCol8 = row[loanIdx];
      if (typeof rawCol8 === 'number') {
          loanAmount = rawCol8;
      } else if (typeof rawCol8 === 'string' && !isNaN(parseFloat(rawCol8))) {
          loanAmount = parseFloat(rawCol8);
      }

      let typeVal = row[typeIdx] ? safeStr(row[typeIdx]) : '';
      
      if (!typeVal && typeof rawCol8 === 'string' && (rawCol8 === 'OWN' || rawCol8 === 'OFFICE')) {
          typeVal = rawCol8;
          loanAmount = 0; 
      }

      if (typeVal !== 'OWN' && typeVal !== 'OFFICE') {
          typeVal = centerCode % 2 !== 0 ? 'OWN' : 'OFFICE';
      }

      return {
        rowIndex: index + 2,
        id: safeStr(row[idIdx]),
        collectionDate: parsedDate, 
        submittedAt: row[10] ? safeStr(row[10]) : undefined,
        branchId: safeStr(row[branchIdx]),
        centerCode: centerCode,
        employeeId: safeStr(row[empIdx]),
        amount: safeNum(row[amountIdx]),
        loanAmount: loanAmount,
        type: typeVal as any, 
        status: 'ACTIVE'
      };
    });
  }

  async addCollections(records: CenterCollectionRecord[]) {
    const rows = records.map(rec => {
        const date = new Date(rec.collectionDate);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        return [
          rec.id, 
          rec.collectionDate, 
          monthStr, 
          rec.branchId, 
          rec.centerCode, 
          'NULL', 
          rec.employeeId, 
          rec.amount, 
          rec.loanAmount || 0, // Index 8: Loan Amount
          'User',
          rec.submittedAt || new Date().toISOString(),
          rec.type // Index 11: Explicit Type
        ];
    });
    return this.writeRows(SHEETS.COLLECTIONS, rows);
  }

  async getCenters(preFetchedRows?: any[][]): Promise<Center[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.CENTERS);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: safeStr(row[0]),
      centerCode: safeNum(row[1]),
      type: safeStr(row[2]) as any,
      branchId: safeStr(row[3]),
      assignedEmployeeId: safeStr(row[4]),
      centerName: safeStr(row[5]) || `Center ${row[1]}`, 
      status: normalizeStatus(row[6]) as any,
      memberCount: safeNum(row[7])
    })).filter(c => c.status === 'ACTIVE');
  }

  async addCenter(center: Omit<Center, 'rowIndex'>) {
    const row = [center.id, center.centerCode, center.type, center.branchId, center.assignedEmployeeId, center.centerName, 'ACTIVE', center.memberCount || 0];
    return this.writeRow(SHEETS.CENTERS, row);
  }

  async updateCenter(center: Center) {
    if (!center.rowIndex) return;
    const range = `${SHEETS.CENTERS}!A${center.rowIndex}:H${center.rowIndex}`;
    const row = [center.id, center.centerCode, center.type, center.branchId, center.assignedEmployeeId, center.centerName, center.status || 'ACTIVE', center.memberCount || 0];
    return this.updateRow(range, row);
  }

  async getCommissions(preFetchedRows?: any[][]): Promise<Record<string, CommissionStructure>> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.COMMISSIONS);
    const map: Record<string, CommissionStructure> = {};
    rows.slice(1).forEach((row, index) => {
        const status = normalizeStatus(row[3]);
        if(status === 'ACTIVE') {
            map[safeStr(row[0])] = {
                rowIndex: index + 2,
                typeCode: safeStr(row[0]),
                own: safeNum(row[1]),
                office: safeNum(row[2])
            };
        }
    });
    return map;
  }

  async getTargets(preFetchedRows?: any[][]): Promise<Target[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.TARGETS);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: safeStr(row[0]),
      employeeId: safeStr(row[1]),
      month: safeStr(row[2]),
      collectionTarget: safeNum(row[3]),
      accountTarget: safeNum(row[4]),
      status: normalizeStatus(row[5]) as any
    })).filter(t => t.status === 'ACTIVE');
  }

  async saveTarget(target: Target) {
    if (target.rowIndex) {
        const range = `${SHEETS.TARGETS}!A${target.rowIndex}:F${target.rowIndex}`;
        const row = [target.id, target.employeeId, target.month, target.collectionTarget, target.accountTarget, 'ACTIVE'];
        return this.updateRow(range, row);
    } else {
        const row = [target.id, target.employeeId, target.month, target.collectionTarget, target.accountTarget, 'ACTIVE'];
        return this.writeRow(SHEETS.TARGETS, row);
    }
  }

  async getAdvances(preFetchedRows?: any[][]): Promise<Advance[]> {
    const rows = preFetchedRows || await this.fetchSheet(SHEETS.ADVANCES);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: safeStr(row[0]),
      employeeId: safeStr(row[1]),
      amount: safeNum(row[2]),
      date: normalizeDate(row[3]),
      targetMonth: safeStr(row[4]),
      status: normalizeStatus(row[5]) as any,
      notes: safeStr(row[6])
    })).filter(a => a.status !== 'INACTIVE');
  }

  async addAdvance(advance: Omit<Advance, 'rowIndex'>) {
    const row = [advance.id, advance.employeeId, advance.amount, advance.date, advance.targetMonth, 'ACTIVE', advance.notes || ''];
    return this.writeRow(SHEETS.ADVANCES, row);
  }

  async updateAdvance(advance: Advance) {
    if (!advance.rowIndex) {
       const rows = await this.fetchSheet(SHEETS.ADVANCES);
       const idx = rows.findIndex(row => row[0] === advance.id);
       if (idx !== -1) advance.rowIndex = idx + 2;
    }
    if (!advance.rowIndex) throw new Error("Advance not found for update");
    const range = `${SHEETS.ADVANCES}!A${advance.rowIndex}:G${advance.rowIndex}`;
    const row = [advance.id, advance.employeeId, advance.amount, advance.date, advance.targetMonth, advance.status, advance.notes || ''];
    return this.updateRow(range, row);
  }

  async deleteAdvance(id: string) {
    const rows = await this.fetchSheet(SHEETS.ADVANCES);
    const idx = rows.findIndex(row => row[0] === id);
    if (idx === -1) throw new Error("Advance not found for deletion");
    const rowIndex = idx + 2;
    const existingRow = rows[idx];
    existingRow[5] = 'INACTIVE';
    const range = `${SHEETS.ADVANCES}!A${rowIndex}:G${rowIndex}`;
    return this.updateRow(range, existingRow);
  }

  async updateAdvanceStatus(advanceId: string, status: 'ACTIVE' | 'ADJUSTED') {
    const rows = await this.fetchSheet(SHEETS.ADVANCES);
    const idx = rows.findIndex(row => row[0] === advanceId);
    if (idx === -1) throw new Error("Advance not found");
    const rowIndex = idx + 2;
    const existingRow = rows[idx];
    existingRow[5] = status;
    const range = `${SHEETS.ADVANCES}!A${rowIndex}:G${rowIndex}`;
    return this.updateRow(range, existingRow);
  }

  async getSalaryHistory(month: string, branchIds: string[]): Promise<SalaryEntry[]> {
    const rows = await this.fetchSheet(SHEETS.SALARY_HISTORY);
    return rows.slice(1).map((row, index) => {
        return {
          rowIndex: index + 2,
          id: safeStr(row[0]),
          salary_sheet_id: safeStr(row[1]),
          month: safeStr(row[2]), 
          employee_id: safeStr(row[3]),
          basic_salary: safeNum(row[4]),
          commission_type: safeStr(row[5]),
          own_somity_count: safeNum(row[6]),
          own_somity_collection: safeNum(row[7]),
          office_somity_count: safeNum(row[8]),
          office_somity_collection: safeNum(row[9]),
          center_count: safeNum(row[10]),
          center_collection: safeNum(row[11]),
          total_loan_collection: safeNum(row[12]),
          book_1_5: safeNum(row[13]),
          book_3: safeNum(row[14]),
          book_5: safeNum(row[15]),
          book_8: safeNum(row[16]),
          book_10: safeNum(row[17]),
          book_12: safeNum(row[18]),
          book_no_bonus: safeNum(row[19]),
          input_late_hours: safeNum(row[20]),
          input_absent_days: safeNum(row[21]),
          deduction_cash_advance: safeNum(row[22]),
          deduction_late: safeNum(row[23]),
          deduction_abs: safeNum(row[24]),
          misconductDeduction: safeNum(row[25]),
          deduction_unlawful: safeNum(row[26]),
          deduction_tours: safeNum(row[27]),
          deduction_others: safeNum(row[28]),
          manager_convenience: safeNum(row[29]),
          total_books: safeNum(row[30]),
          total_collection: safeNum(row[31]),
          total_deductions: safeNum(row[32]),
          commission: safeNum(row[33]),
          bonus: safeNum(row[34]),
          final_salary: safeNum(row[35]),
          status: normalizeStatus(row[36]) as any,
          own_somity_member_count: safeNum(row[37]),
          office_somity_member_count: safeNum(row[38])
        };
      }).filter(r => r.month === month);
  }

  async saveSalaryHistory(entries: SalaryEntry[], month: string, sheetId: string) {
    const rows = entries.map(e => [
      e.id, sheetId, month, e.employee_id, e.basic_salary, e.commission_type, 
      e.own_somity_count, e.own_somity_collection, e.office_somity_count, e.office_somity_collection,
      e.center_count, e.center_collection, e.total_loan_collection,
      e.book_1_5, e.book_3, e.book_5, e.book_8, e.book_10, e.book_12, e.book_no_bonus,
      e.input_late_hours, e.input_absent_days, e.deduction_cash_advance, 
      e.deduction_late, e.deduction_abs, e.misconductDeduction, e.deduction_unlawful, e.deduction_tours, e.deduction_others,
      e.manager_convenience, e.total_books, e.total_collection, e.total_deductions, 
      e.commission, e.bonus, e.final_salary, 'GENERATED',
      e.own_somity_member_count || 0, e.office_somity_member_count || 0
    ]);
    return this.writeRows(SHEETS.SALARY_HISTORY, rows);
  }

  async updateSalaryEntry(entry: SalaryEntry) {
    if (!entry.rowIndex) return false;
    const range = `${SHEETS.SALARY_HISTORY}!A${entry.rowIndex}:AM${entry.rowIndex}`; // Extended to AM
    const currentRows = await this.fetchSheet(`${SHEETS.SALARY_HISTORY}!A${entry.rowIndex}:AM${entry.rowIndex}`);
    if (!currentRows || currentRows.length === 0) return false;
    
    const currentRow = currentRows[0];
    currentRow[4] = entry.basic_salary;
    currentRow[5] = entry.commission_type;
    currentRow[10] = entry.center_count;
    currentRow[11] = entry.center_collection;
    currentRow[13] = entry.book_1_5;
    currentRow[14] = entry.book_3;
    currentRow[15] = entry.book_5;
    currentRow[16] = entry.book_8;
    currentRow[17] = entry.book_10;
    currentRow[18] = entry.book_12;
    currentRow[19] = entry.book_no_bonus;
    currentRow[20] = entry.input_late_hours;
    currentRow[21] = entry.input_absent_days;
    currentRow[22] = entry.deduction_cash_advance;
    currentRow[23] = entry.deduction_late;
    currentRow[24] = entry.deduction_abs;
    currentRow[25] = entry.misconductDeduction;
    currentRow[26] = entry.deduction_unlawful;
    currentRow[27] = entry.deduction_tours;
    currentRow[28] = entry.deduction_others;
    currentRow[29] = entry.manager_convenience;
    currentRow[30] = entry.total_books;
    currentRow[31] = entry.total_collection;
    currentRow[32] = entry.total_deductions;
    currentRow[33] = entry.commission;
    currentRow[34] = entry.bonus;
    currentRow[35] = entry.final_salary;

    return this.updateRow(range, currentRow);
  }

  async upsertSalaryEntry(entry: SalaryEntry, month: string) {
    const history = await this.getSalaryHistory(month, []);
    const existing = history.find(e => e.employee_id === entry.employee_id);
    
    if (existing && existing.rowIndex) {
      const updated = { ...entry, rowIndex: existing.rowIndex, month };
      return this.updateSalaryEntry(updated);
    } else {
      return this.saveSalaryHistory([entry], month, entry.salary_sheet_id || 'SHEET_' + month);
    }
  }

  async upsertSalaryEntries(entries: SalaryEntry[], month: string) {
      if (entries.length === 0) return;
      const history = await this.getSalaryHistory(month, []);
      
      const toUpdate: SalaryEntry[] = [];
      const toInsert: SalaryEntry[] = [];

      for (const entry of entries) {
          const existing = history.find(e => e.employee_id === entry.employee_id);
          if (existing && existing.rowIndex) {
              toUpdate.push({ ...entry, rowIndex: existing.rowIndex, month });
          } else {
              toInsert.push(entry);
          }
      }

      // Sequential updates
      for (const entry of toUpdate) {
          await this.updateSalaryEntry(entry);
      }

      // Bulk insert
      if (toInsert.length > 0) {
          await this.saveSalaryHistory(toInsert, month, toInsert[0].salary_sheet_id || 'SHEET_' + month);
      }
  }
}

export const googleSheetService = new GoogleSheetService();
