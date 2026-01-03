
import { Branch, Employee, User, AccountOpening, Center, CenterCollectionRecord, CommissionStructure, Target } from '../types';
import { KJUR } from 'jsrsasign';

// --- CONFIGURATION ---
const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SHEET_ID || '1s12Xc2jaPYdfKY15Td9hR0Ri0LbswTKBguhiSMDgq80';
const CLIENT_EMAIL = process.env.REACT_APP_GOOGLE_SERVICE_EMAIL || 'sheet-db-service@gen-lang-client-0882953008.iam.gserviceaccount.com';

// Handle potential newline escaping in env vars or use the hardcoded key
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

const PRIVATE_KEY = process.env.REACT_APP_GOOGLE_PRIVATE_KEY 
  ? process.env.REACT_APP_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : PRIVATE_KEY_STRING;

// --- SHEET MAPPING ---
const SHEETS = {
  USERS: 'SystemUsers',
  BRANCHES: 'Branches',
  EMPLOYEES: 'Employees',
  COMMISSIONS: 'CommissionTypes',
  CENTERS: 'Centers',
  ACCOUNTS: 'Accounts',
  COLLECTIONS: 'Collections',
  TARGETS: 'Targets'
};

const SHEET_HEADERS = {
  [SHEETS.USERS]: ['ID', 'Name', 'Username', 'Password', 'Role', 'BranchID', 'Status', 'EmployeeID', 'CreatedAt'],
  [SHEETS.BRANCHES]: ['ID', 'Name', 'Status', 'Address', 'Phone'],
  [SHEETS.EMPLOYEES]: ['ID', 'Name', 'Code', 'BranchID', 'CommissionType', 'Status', 'Designation', 'BaseSalary'],
  [SHEETS.COMMISSIONS]: ['TypeCode', 'OwnRate', 'OfficeRate', 'Status'],
  [SHEETS.CENTERS]: ['ID', 'CenterCode', 'Type', 'BranchID', 'AssignedEmployeeID', 'CenterName'], 
  [SHEETS.ACCOUNTS]: ['ID', 'AccountCode', 'HolderName', 'CenterID', 'BranchID', 'OpenedBy', 'Status', 'OpeningDate', 'Term', 'CollectionAmount'],
  [SHEETS.COLLECTIONS]: ['ID', 'Date', 'Month', 'BranchID', 'CenterCode', 'AccountID', 'EmployeeID', 'Amount', 'LoanAmount', 'Type', 'CreatedBy'],
  [SHEETS.TARGETS]: ['ID', 'EmployeeID', 'Month', 'CollectionTarget', 'AccountTarget', 'Status']
};

class GoogleSheetService {
  private baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private initializationPromise: Promise<void> | null = null;

  // --- AUTHENTICATION ---

  public setAccessToken(token: string) {
    // Legacy support or manual override
    this.accessToken = token;
    this.tokenExpiry = Date.now() + 3500 * 1000;
  }

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
      const signature = KJUR.jws.JWS.sign(
        "RS256",
        JSON.stringify(header),
        JSON.stringify(claim),
        PRIVATE_KEY
      );

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: signature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Auth Failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Buffer 60s
      return this.accessToken!;
    } catch (error) {
      console.error("Token Generation Error:", error);
      throw error;
    }
  }

  // --- INITIALIZATION ---

  private async ensureInitialized() {
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization() {
    try {
      const token = await this.getAccessToken();
      
      // 1. Get existing sheets
      const response = await fetch(this.baseUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to fetch spreadsheet metadata");
      const data = await response.json();
      
      const existingTitles = (data.sheets || []).map((s: any) => s.properties.title);
      const requests: any[] = [];

      // 2. Create missing sheets and add headers
      Object.entries(SHEET_HEADERS).forEach(([title, headers]) => {
        if (!existingTitles.includes(title)) {
          // Add Sheet Request
          requests.push({ addSheet: { properties: { title } } });
        }
      });

      if (requests.length > 0) {
        await fetch(`${this.baseUrl}:batchUpdate`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests })
        });
      }

      // 3. Populate headers for newly created sheets (or verify)
      // We do this sequentially to be safe
      for (const [title, headers] of Object.entries(SHEET_HEADERS)) {
        if (!existingTitles.includes(title)) {
           // It was just created, write headers
           await this.writeRow(title, headers);
           // If it's SystemUsers, create default admin
           if (title === SHEETS.USERS) {
             await this.writeRow(title, ['u1', 'Super Admin', 'admin', 'admin', 'SUPER_ADMIN', 'NULL', 'ACTIVE', 'NULL', new Date().toISOString()]);
           }
        }
      }
    } catch (error) {
      console.error("Initialization Failed:", error);
      // Don't block app, but subsequent calls might fail
    }
  }

  // --- API METHODS ---

  private async fetchSheet(range: string): Promise<any[][]> {
    await this.ensureInitialized();
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}?majorDimension=ROWS`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Sheets API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error(`Error fetching ${range}:`, error);
      return [];
    }
  }

  private async writeRow(range: string, values: any[]): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [values] })
      });
      return response.ok;
    } catch (error) {
      console.error(`Error appending to ${range}:`, error);
      return false;
    }
  }

  private async writeRows(range: string, values: any[][]): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: values })
      });
      return response.ok;
    } catch (error) {
      console.error(`Error appending batch to ${range}:`, error);
      return false;
    }
  }

  private async updateRow(range: string, values: any[]): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [values] })
      });
      return response.ok;
    } catch (error) {
      console.error(`Error updating ${range}:`, error);
      return false;
    }
  }

  // --- ENTITY MAPPERS ---

  // 1. SYSTEM USERS
  async getUsers(): Promise<User[]> {
    const rows = await this.fetchSheet(SHEETS.USERS);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: row[0],
      name: row[1],
      username: row[2],
      password: row[3],
      role: row[4] as any,
      branch_id: row[5] === 'NULL' ? undefined : row[5],
      status: row[6] as any,
      employee_id: row[7] === 'NULL' ? undefined : row[7],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row[1])}&background=random&color=fff`
    })).filter(u => u.status === 'ACTIVE');
  }

  async addUser(user: User) {
    const row = [
      user.id,
      user.name,
      user.username,
      user.password || '',
      user.role,
      user.branch_id || 'NULL',
      'ACTIVE',
      user.employee_id || 'NULL',
      new Date().toISOString()
    ];
    return this.writeRow(SHEETS.USERS, row);
  }

  // 2. BRANCHES
  async getBranches(): Promise<Branch[]> {
    const rows = await this.fetchSheet(SHEETS.BRANCHES);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: row[0],
      name: row[1],
      status: row[2] as any,
      address: row[3] || '',
      phone: row[4] || ''
    })).filter(b => b.status === 'ACTIVE');
  }

  async addBranch(branch: Branch) {
    const row = [branch.id, branch.name, 'ACTIVE', branch.address || '', branch.phone || ''];
    return this.writeRow(SHEETS.BRANCHES, row);
  }

  async addBranches(branches: Branch[]) {
    const rows = branches.map(branch => [branch.id, branch.name, 'ACTIVE', branch.address || '', branch.phone || '']);
    return this.writeRows(SHEETS.BRANCHES, rows);
  }

  // 3. EMPLOYEES
  async getEmployees(): Promise<Employee[]> {
    const rows = await this.fetchSheet(SHEETS.EMPLOYEES);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: row[0],
      name: row[1],
      branch_id: row[3],
      commission_type: row[4],
      status: row[5] as any,
      designation: row[6] || 'Staff',
      base_salary: Number(row[7]) || 0
    })).filter(e => e.status === 'ACTIVE');
  }
  
  async addEmployee(emp: Employee) {
    const row = [
      emp.id, 
      emp.name, 
      emp.id, 
      emp.branch_id, 
      emp.commission_type, 
      'ACTIVE', 
      emp.designation || 'Staff', 
      emp.base_salary || 0
    ];
    return this.writeRow(SHEETS.EMPLOYEES, row);
  }

  async addEmployees(employees: Employee[]) {
    const rows = employees.map(emp => [
      emp.id, 
      emp.name, 
      emp.id, 
      emp.branch_id, 
      emp.commission_type, 
      'ACTIVE', 
      emp.designation || 'Staff', 
      emp.base_salary || 0
    ]);
    return this.writeRows(SHEETS.EMPLOYEES, rows);
  }

  async updateEmployee(emp: Employee) {
    if (!emp.rowIndex) {
         const rows = await this.fetchSheet(SHEETS.EMPLOYEES);
         const idx = rows.findIndex(row => row[0] === emp.id);
         if (idx !== -1) {
             emp.rowIndex = idx + 1; 
         } else {
             throw new Error(`Employee ${emp.id} not found in sheet`);
         }
    }

    const range = `${SHEETS.EMPLOYEES}!A${emp.rowIndex}:H${emp.rowIndex}`;
    const row = [
      emp.id, 
      emp.name, 
      emp.id, 
      emp.branch_id, 
      emp.commission_type, 
      'ACTIVE', 
      emp.designation || 'Staff', 
      emp.base_salary || 0
    ];
    return this.updateRow(range, row);
  }

  // 4. ACCOUNTS
  async getAccounts(): Promise<AccountOpening[]> {
    const rows = await this.fetchSheet(SHEETS.ACCOUNTS);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: Number(row[0]),
      account_code: row[1],
      term: Number(row[8] || 0), 
      collection_amount: Number(row[9] || 0),
      branch_id: row[4],
      opened_by_employee_id: row[5],
      status: row[6] as any,
      opening_date: row[7] ? row[7].split('T')[0] : '',
      is_counted: false,
      counted_month: null,
      salary_sheet_id: null
    })).filter(a => a.status === 'ACTIVE');
  }

  async addAccount(acc: AccountOpening) {
    const row = [
      acc.id, acc.account_code, 'HolderName', 'CenterID', acc.branch_id, acc.opened_by_employee_id, 'ACTIVE', acc.opening_date,
      acc.term, acc.collection_amount
    ];
    return this.writeRow(SHEETS.ACCOUNTS, row);
  }

  async addAccounts(accounts: AccountOpening[]) {
    const rows = accounts.map(acc => [
      acc.id, acc.account_code, 'HolderName', 'CenterID', acc.branch_id, acc.opened_by_employee_id, 'ACTIVE', acc.opening_date,
      acc.term, acc.collection_amount
    ]);
    return this.writeRows(SHEETS.ACCOUNTS, rows);
  }

  // 5. COLLECTIONS
  async getCollections(): Promise<CenterCollectionRecord[]> {
    const rows = await this.fetchSheet(SHEETS.COLLECTIONS);
    return rows.slice(1).map((row, index) => {
        const typeStr = row[9] || '';
        const amountVal = Number(row[7]);
        const loanVal = Number(row[8]);
        const centerCode = Number(row[4]);
        
        // Robust Center Type Logic
        const centerType = centerCode % 2 !== 0 ? 'OWN' : 'OFFICE';

        return {
            rowIndex: index + 2,
            id: row[0],
            createdAt: row[1],
            branchId: row[3],
            centerCode: centerCode,
            employeeId: row[6],
            amount: amountVal,
            loanAmount: loanVal, 
            type: centerType,
            status: 'ACTIVE'
        };
    });
  }

  async addCollections(records: CenterCollectionRecord[]) {
    const rows: any[][] = [];
    records.forEach(rec => {
        if (rec.amount > 0) {
            rows.push([
                rec.id, rec.createdAt, rec.createdAt.slice(0, 7), rec.branchId, rec.centerCode, 'NULL', rec.employeeId, rec.amount, 0, 'Savings', 'User'
            ]);
        }
        if (rec.loanAmount && rec.loanAmount > 0) {
            rows.push([
                rec.id, rec.createdAt, rec.createdAt.slice(0, 7), rec.branchId, rec.centerCode, 'NULL', rec.employeeId, 0, rec.loanAmount, 'Loan', 'User'
            ]);
        }
    });
    if (rows.length === 0) return true;
    return this.writeRows(SHEETS.COLLECTIONS, rows);
  }

  // 6. CENTERS
  async getCenters(): Promise<Center[]> {
    const rows = await this.fetchSheet(SHEETS.CENTERS);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: row[0],
      centerCode: Number(row[1]),
      type: row[2] as any,
      branchId: row[3],
      assignedEmployeeId: row[4],
      centerName: row[5] || `Center ${row[1]}`, 
      status: 'ACTIVE'
    }));
  }

  async addCenter(center: Center) {
    const row = [center.id, center.centerCode, center.type, center.branchId, center.assignedEmployeeId, center.centerName];
    return this.writeRow(SHEETS.CENTERS, row);
  }

  async updateCenter(center: Center) {
    if (!center.rowIndex) {
         const rows = await this.fetchSheet(SHEETS.CENTERS);
         const idx = rows.findIndex(row => row[0] === center.id);
         if (idx !== -1) {
             center.rowIndex = idx + 1; 
         } else {
             throw new Error(`Center ${center.id} not found in sheet`);
         }
    }
    const range = `${SHEETS.CENTERS}!A${center.rowIndex}:F${center.rowIndex}`;
    const row = [
      center.id, center.centerCode, center.type, center.branchId, center.assignedEmployeeId, center.centerName
    ];
    return this.updateRow(range, row);
  }

  // 7. COMMISSIONS
  async getCommissions(): Promise<Record<string, CommissionStructure>> {
    const rows = await this.fetchSheet(SHEETS.COMMISSIONS);
    const map: Record<string, CommissionStructure> = {};
    rows.slice(1).forEach((row, index) => {
        if(row[3] === 'TRUE' || row[3] === 'ACTIVE') {
            map[row[0]] = {
                rowIndex: index + 2,
                typeCode: row[0],
                own: Number(row[1]),
                office: Number(row[2])
            };
        }
    });
    return map;
  }

  // 8. TARGETS
  async getTargets(): Promise<Target[]> {
    const rows = await this.fetchSheet(SHEETS.TARGETS);
    return rows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      id: row[0],
      employeeId: row[1],
      month: row[2],
      collectionTarget: Number(row[3]),
      accountTarget: Number(row[4]),
      status: row[5] as any || 'ACTIVE'
    }));
  }

  async saveTarget(target: Target) {
    // Check if target exists for this employee and month
    if (!target.rowIndex) {
        // Try to fetch to find rowIndex
        const rows = await this.fetchSheet(SHEETS.TARGETS);
        const idx = rows.findIndex(r => r[1] === target.employeeId && r[2] === target.month);
        if (idx !== -1) {
            target.rowIndex = idx + 2; // +1 for header, +1 for 0-index
        }
    }

    if (target.rowIndex) {
        // Update existing
        const range = `${SHEETS.TARGETS}!A${target.rowIndex}:F${target.rowIndex}`;
        const row = [target.id, target.employeeId, target.month, target.collectionTarget, target.accountTarget, 'ACTIVE'];
        return this.updateRow(range, row);
    } else {
        // Create new
        const row = [target.id, target.employeeId, target.month, target.collectionTarget, target.accountTarget, 'ACTIVE'];
        return this.writeRow(SHEETS.TARGETS, row);
    }
  }
}

export const googleSheetService = new GoogleSheetService();
