import { prisma } from '@/lib/prisma';

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'AMAN' } },
    include: {
      leaves: true,
      monthlyPayrolls: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
    }
  });

  if (!emp) {
    console.log('Employee Aman not found!');
    return;
  }

  console.log('=== EMPLOYEE PROFILE ===');
  console.log('Name:', emp.name);
  console.log('ID:', emp.employeeId);
  console.log('suddenLeavePenalty setting:', emp.suddenLeavePenalty);

  console.log('\n=== PAYROLL RECORDS ===');
  for (const p of emp.monthlyPayrolls) {
    console.log(`Month: ${p.month}/${p.year} | LOP Days: ${p.lopDays} | LOP Deduction: ₹${p.lopDeduction} | SuddenPenaltyDays: ${p.suddenLeavePenaltyDays} | SuddenPenaltyDeduction: ₹${p.suddenLeavePenaltyDeduction} | Status: ${p.status}`);
  }

  console.log('\n=== LEAVE RECORDS ===');
  console.log(JSON.stringify(emp.leaves, null, 2));

  console.log('\n=== DAILY ATTENDANCE (SEPT 2026) ===');
  const septDaily = await prisma.attendanceDaily.findMany({
    where: {
      employeeId: emp.id,
      date: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T23:59:59.999Z'),
      }
    },
    orderBy: { date: 'asc' }
  });
  for (const d of septDaily) {
    console.log(`Date: ${d.date.toISOString().split('T')[0]} | Status: ${d.status} | Remarks: ${d.remarks || ''}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
