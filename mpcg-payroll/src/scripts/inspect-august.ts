import { prisma } from '@/lib/prisma';

async function main() {
  const list = await prisma.monthlyPayroll.findMany({
    where: { month: 8, year: 2026 },
    include: { employee: { select: { employeeId: true, name: true, suddenLeavePenalty: true } } },
    orderBy: { employee: { name: 'asc' } }
  });

  console.log(`AUGUST 2026 PAYROLL RECORDS (${list.length}):\n`);
  for (const p of list) {
    console.log(`[${p.employee.employeeId}] ${p.employee.name}`);
    console.log(`   suddenLeavePenalty setting on employee: ${p.employee.suddenLeavePenalty}`);
    console.log(`   Present: ${p.presentDays} | Unpaid: ${p.unpaidLeaveDays} | LOP Days: ${p.lopDays} | LOP Ded: ₹${p.lopDeduction}`);
    console.log(`   SuddenPenaltyDays: ${p.suddenLeavePenaltyDays} | SuddenPenaltyDeduction: ₹${p.suddenLeavePenaltyDeduction}\n`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
