import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve('c:/Users/DELL/Documents/salary slip code/MnPerformance-1.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true, cellHTML: false });

for (const sheetName of workbook.SheetNames) {
  console.log(`\n======================================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`======================================================`);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  // Print all non-empty rows with formulas or values
  rows.forEach((row, idx) => {
    // Check if row has any data
    const hasData = row.some(cell => cell !== '');
    if (hasData) {
      // Find row cells with formulas in sheet
      const rowNum = idx + 1;
      const formulas: string[] = [];
      for (let col = 0; col < 50; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: idx, c: col });
        const cell = sheet[cellRef];
        if (cell && cell.f) {
          formulas.push(`${cellRef}: =${cell.f} (${cell.v})`);
        }
      }
      const formulaStr = formulas.length > 0 ? ` [FORMULAS: ${formulas.join(', ')}]` : '';
      console.log(`Row ${String(rowNum).padStart(3, ' ')}: ${JSON.stringify(row.filter(c => c !== ''))}${formulaStr}`);
    }
  });
}
