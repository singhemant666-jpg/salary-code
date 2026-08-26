import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve('c:/Users/DELL/Documents/salary slip code/MnPerformance-1.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['MnPerformance'];
const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

interface EmployeeBlock {
  rowNum: number;
  dept: string;
  desig: string;
  month: string;
  empCode: string;
  name: string;
  present: number;
  hl: number;
  wo: number;
  absent: number;
  leave: number;
  paidDays: number;
  earlyGoing: string;
  lateHrs: string;
  workHrs: string;
  ovTim: string;
  remark1: string; // Arrived time row remark (e.g. 190.52/22)
  remark2: string; // Dept time row remark (e.g. 8.66)
  remark3: string; // Working hrs row remark (e.g. MP-1)
  remark4: string; // OT row remark (e.g. OT-7HRS LESS)
  remark5: string; // Status row remark (e.g. Leave-4)
  remark6: string; // Shift row remark (e.g. Half Day-)
}

const employees: EmployeeBlock[] = [];

for (let r = 0; r < rows.length; r++) {
  const row = rows[r];
  const rowStr = row.join(' ');
  if (rowStr.includes('EmpCode') && rowStr.includes('Name')) {
    // Header is row r, employee summary is row r+1
    const deptRow = rows[r - 1] || [];
    const sumRow = rows[r + 1] || [];
    
    // Find remark values in rows r+3 to r+8
    const rArrive = rows[r + 3] || [];
    const rDept = rows[r + 4] || [];
    const rWork = rows[r + 5] || [];
    const rOT = rows[r + 6] || [];
    const rStatus = rows[r + 7] || [];
    const rShift = rows[r + 8] || [];

    // Filter non-empty items
    const sumItems = sumRow.filter(x => x !== '');
    const deptItems = deptRow.filter(x => x !== '');

    employees.push({
      rowNum: r + 1,
      dept: deptItems.find(x => String(x).includes('Dept:')) || '',
      desig: deptItems.find(x => String(x).includes('Desig')) || '',
      month: deptItems.find(x => String(x).includes('Month Of')) || '',
      empCode: String(sumItems[0] || ''),
      name: String(sumItems[1] || ''),
      present: Number(sumItems[2] || 0),
      hl: Number(sumItems[3] || 0),
      wo: Number(sumItems[4] || 0),
      absent: Number(sumItems[5] || 0),
      leave: Number(sumItems[6] || 0),
      paidDays: Number(sumItems[7] || 0),
      earlyGoing: String(sumItems[8] || ''),
      lateHrs: String(sumItems[9] || ''),
      workHrs: String(sumItems[10] || ''),
      ovTim: String(sumItems[11] || ''),
      remark1: String(rArrive[rArrive.length - 1] || ''),
      remark2: String(rDept[rDept.length - 1] || ''),
      remark3: String(rWork[rWork.length - 1] || ''),
      remark4: String(rOT[rOT.length - 1] || ''),
      remark5: String(rStatus[rStatus.length - 1] || ''),
      remark6: String(rShift[rShift.length - 1] || ''),
    });
  }
}

console.log(`Found ${employees.length} employees in MnPerformance sheet:`);
console.table(employees.map(e => ({
  Code: e.empCode,
  Name: e.name,
  Pres: e.present,
  HL: e.hl,
  WO: e.wo,
  Abs: e.absent,
  PaidDays: e.paidDays,
  WorkHrs: e.workHrs,
  OvTim: e.ovTim,
  Remark1_Total_Days: e.remark1,
  Remark2_Avg: e.remark2,
  Remark3_MP: e.remark3,
  Remark4_OT_or_Short: e.remark4,
  Remark5_Leave: e.remark5,
  Remark6_HD: e.remark6,
})));
