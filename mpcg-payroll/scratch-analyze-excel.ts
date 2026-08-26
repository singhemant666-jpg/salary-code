import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve('c:/Users/DELL/Documents/salary slip code/MnPerformance-1.xlsx');
console.log('Loading Excel from:', filePath);

const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n================== SHEET: ${sheetName} ==================`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Total Rows: ${jsonData.length}`);
  
  // Print first 25 rows
  console.log('--- Top 25 rows ---');
  for (let i = 0; i < Math.min(jsonData.length, 25); i++) {
    console.log(`Row ${i + 1}:`, JSON.stringify(jsonData[i]));
  }
}
