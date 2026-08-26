import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve('c:/Users/DELL/Documents/salary slip code/MnPerformance-1.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['MnPerformance'];
const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

function hhmmToMinutes(hhmm: string): number {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

for (let r = 0; r < rows.length; r++) {
  const rowStr = rows[r].join(' ');
  if (rowStr.includes('EmpCode') && rowStr.includes('Name')) {
    const sumRow = rows[r + 1] || [];
    const sumItems = sumRow.filter(x => x !== '');
    const empCode = String(sumItems[0] || '');
    const name = String(sumItems[1] || '');

    const rArrive = rows[r + 3] || [];
    const rDept = rows[r + 4] || [];
    const rWork = rows[r + 5] || [];
    const rOT = rows[r + 6] || [];
    const rStatus = rows[r + 7] || [];

    // Let's compute daily stats across days 1 to 31
    // Days start around column 3
    let validPunchDays = 0;
    let totalWorkMinutes = 0;
    let missingPunchCount = 0;
    let absentCount = 0;
    let weeklyOffCount = 0;
    let halfDayCount = 0;

    // Daily columns in rWork (index 3 to 33 approx)
    for (let c = 3; c < rWork.length - 1; c++) {
      const arr = String(rArrive[c] || '').trim();
      const dep = String(rDept[c] || '').trim();
      const work = String(rWork[c] || '').trim();
      const stat = String(rStatus[c] || '').trim();

      const workMin = hhmmToMinutes(work);

      if (arr && dep && workMin > 0) {
        validPunchDays++;
        totalWorkMinutes += workMin;
      } else if ((arr && !dep) || (!arr && dep)) {
        missingPunchCount++;
      }

      if (stat === 'A') absentCount++;
      if (stat === 'WO') weeklyOffCount++;
      if (workMin > 0 && workMin <= 300) halfDayCount++;
    }

    const totalHours = Math.round((totalWorkMinutes / 60) * 100) / 100;
    const avgHours = validPunchDays > 0 ? Math.round((totalHours / validPunchDays) * 100) / 100 : 0;
    const expectedHours = validPunchDays * 9;
    const diffHours = Math.round((totalHours - expectedHours) * 100) / 100;

    const excelRemark1 = String(rArrive[rArrive.length - 1] || '');
    const excelRemark2 = String(rDept[rDept.length - 1] || '');
    const excelRemark3 = String(rWork[rWork.length - 1] || '');
    const excelRemark4 = String(rOT[rOT.length - 1] || '');
    const excelRemark5 = String(rStatus[rStatus.length - 1] || '');

    console.log(`\n======================================================`);
    console.log(`Employee: ${name} (${empCode})`);
    console.log(`Calculated: ValidDays=${validPunchDays}, TotalHrs=${totalHours}h, Avg=${avgHours}h/day, Diff=${diffHours > 0 ? '+' + diffHours : diffHours}h, MP=${missingPunchCount}, Absent=${absentCount}`);
    console.log(`Excel Remarks: [${excelRemark1}] | Avg: [${excelRemark2}] | MP: [${excelRemark3}] | OT/Short: [${excelRemark4}] | Leave: [${excelRemark5}]`);
  }
}
