import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve('c:/Users/DELL/Documents/salary slip code/MnPerformance-1.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['MnPerformance'];

// Let's inspect rows 8 to 26 (Pooja and Hardi) in detail
const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('=== POOJA (Rows 6-15) ===');
for (let r = 5; r <= 15; r++) {
  console.log(`R${r + 1}:`, JSON.stringify(rows[r]));
}

console.log('\n=== HARDI (Rows 17-25) ===');
for (let r = 16; r <= 25; r++) {
  console.log(`R${r + 1}:`, JSON.stringify(rows[r]));
}
