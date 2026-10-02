const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSahil() {
  // Find Sahil
  // SQLite doesn't support mode: insensitive, fetch all and filter
  const allEmployees = await prisma.employee.findMany();
  const employees = allEmployees.filter(e => e.name.toLowerCase().includes('sahil'));
  
  if (employees.length === 0) {
    console.log('No employee found with name containing sahil');
    await prisma.$disconnect();
    return;
  }
  
  for (const emp of employees) {
    console.log('Employee:', emp.name, '| ID:', emp.id, '| Code:', emp.employeeCode);
    
    const records = await prisma.attendanceDaily.findMany({
      where: {
        employeeId: emp.id,
        date: {
          gte: new Date('2026-09-01'),
          lte: new Date('2026-09-30')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('\nDate          | Status           | In      | Out     | Working Hrs | Remarks');
    console.log(''.padEnd(95, '-'));
    
    let totalMinutes = 0;
    let presentDays = 0;
    let halfDays = 0;
    
    for (const r of records) {
      const d = new Date(r.date);
      const dateStr = d.toISOString().split('T')[0];
      const inTime = r.checkIn ? new Date(r.checkIn).toTimeString().slice(0,5) : '--:--';
      const outTime = r.checkOut ? new Date(r.checkOut).toTimeString().slice(0,5) : '--:--';
      
      // Convert workingHours (HH.MM decimal) to real minutes
      let mins = 0;
      if (r.workingHours) {
        const wh = parseFloat(r.workingHours.toString());
        const h = Math.floor(wh);
        const m = Math.round((wh - h) * 100);
        mins = h * 60 + m;
        totalMinutes += mins;
      }
      
      if (r.status === 'PRESENT') presentDays++;
      if (r.status === 'HALF_DAY') halfDays++;
      
      console.log(
        dateStr.padEnd(14) + '| ' +
        (r.status || '').padEnd(17) + '| ' +
        inTime.padEnd(8) + '| ' +
        outTime.padEnd(8) + '| ' +
        (r.workingHours ? r.workingHours.toString() : '0').padEnd(12) + '| ' +
        (r.remarks || '')
      );
    }
    
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    
    // Required: Full days = 9h, Half days = 4.5h = 270 mins
    const requiredMins = (presentDays * 540) + (halfDays * 270);
    const shortMins = Math.max(0, requiredMins - totalMinutes);
    const shortH = Math.floor(shortMins / 60);
    const shortM = shortMins % 60;
    
    // What system shows (decimal addition - wrong)
    let systemTotal = 0;
    for (const r of records) {
      if (r.workingHours) {
        systemTotal += parseFloat(r.workingHours.toString());
      }
    }
    
    console.log('\n--- SUMMARY ---');
    console.log('Present Days:', presentDays, '| Half Days:', halfDays);
    console.log('Total Work (correct minutes):', totalMinutes, 'mins =', totalH + 'h ' + totalM + 'm');
    console.log('System decimal sum (WRONG):', systemTotal.toFixed(2));
    console.log('Required mins:', requiredMins, '(' + presentDays + ' x 540 + ' + halfDays + ' x 270)');
    console.log('Short Working (CORRECT):', shortMins, 'mins =', shortH + 'h ' + shortM + 'm  =>  ' + shortH + '.' + String(shortM).padStart(2,'0'));
  }
  
  await prisma.$disconnect();
}

checkSahil().catch(e => { console.error(e); process.exit(1); });
