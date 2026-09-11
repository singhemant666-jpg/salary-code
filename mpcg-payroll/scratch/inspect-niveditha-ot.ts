import { prisma } from '../src/lib/prisma';
import { timeHHMMToMinutes, minutesToDecimalHours } from '../src/lib/currency-utils';

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'NIVEDITHA' } },
  });

  if (!emp) {
    console.log('Employee NIVEDITHA not found');
    return;
  }

  console.log('Found employee:', emp.name, 'ID:', emp.id);

  const startDate = new Date(Date.UTC(2026, 7, 1, 0, 0, 0)); // August 2026
  const endDate = new Date(Date.UTC(2026, 8, 0, 23, 59, 59, 999));

  const records = await prisma.attendanceDaily.findMany({
    where: {
      employeeId: emp.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  console.log(`Total attendance records for Aug 2026: ${records.length}`);

  let sumRawOvertime = 0;
  let totalMinutes = 0;

  for (const r of records) {
    const ot = Number(r.overtimeHours || 0);
    if (ot > 0) {
      const mins = timeHHMMToMinutes(ot);
      sumRawOvertime += ot;
      totalMinutes += mins;
      console.log(`Date: ${r.date.toISOString().split('T')[0]}, status: ${r.status}, overtimeHours: ${ot}, mins: ${mins}`);
    }
  }

  console.log('Sum of raw overtimeHours (what attendance page does):', sumRawOvertime);
  console.log('Total minutes converted via timeHHMMToMinutes:', totalMinutes);
  console.log('Decimal hours via minutesToDecimalHours(totalMinutes):', minutesToDecimalHours(totalMinutes));

  // Check payroll record
  const payroll = await prisma.monthlyPayroll.findFirst({
    where: { employeeId: emp.id, month: 8, year: 2026 },
  });
  if (payroll) {
    console.log('Payroll record overtimeHours:', Number(payroll.overtimeHours), 'overtimeAmount:', Number(payroll.overtimeAmount));
  }
}

main().finally(() => prisma.$disconnect());
