import { prisma } from '../src/lib/prisma';

async function diagnoseAnjali() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'Anjali' } },
  });

  if (!emp) return;

  const startDate = new Date(Date.UTC(2026, 7, 1, 0, 0, 0)); // August 2026
  const endDate = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999));

  const records = await prisma.attendanceDaily.findMany({
    where: {
      employeeId: emp.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  console.log(`=== Anjali P Dalwadi Attendance Logs for August 2026 (${records.length} records) ===`);

  let fullPresentCount = 0;
  let halfDayCount = 0;
  let totalHours = 0;

  for (const r of records) {
    const hours = Number(r.workingHours || 0);
    totalHours += hours;

    if (r.status === 'PRESENT' || r.status === 'WORK_FROM_HOME' || r.status === 'ON_DUTY') {
      fullPresentCount++;
    } else if (r.status === 'HALF_DAY') {
      halfDayCount++;
    }

    console.log(`${r.date.toISOString().split('T')[0]} | Status: ${r.status.padEnd(12)} | In: ${r.firstIn || '—'} | Out: ${r.lastOut || '—'} | Hours: ${hours.toFixed(2)}h | Late: ${r.lateMinutes}m`);
  }

  const stdHours = Number(emp.standardWorkingHours || 9);
  const expectedPresentHours = fullPresentCount * stdHours;
  const avgHours = fullPresentCount > 0 ? totalHours / fullPresentCount : 0;

  console.log('\n--- Summary ---');
  console.log(`Full Present Days: ${fullPresentCount}`);
  console.log(`Half Days: ${halfDayCount}`);
  console.log(`Standard Shift Hours: ${stdHours}h`);
  console.log(`Expected Hours: ${fullPresentCount} days × ${stdHours}h = ${expectedPresentHours}h`);
  console.log(`Total Hours Worked: ${totalHours.toFixed(2)}h`);
  console.log(`Average Working Hours per Present Day: ${avgHours.toFixed(2)}h / day`);
  console.log(`Shortfall (Expected - Worked): ${(expectedPresentHours - totalHours).toFixed(2)}h`);
  console.log(`Average Hours >= 8.90h Check: ${avgHours >= 8.90 ? 'PASSED (Waived)' : 'FAILED (Deducted)'}`);
}

diagnoseAnjali()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
