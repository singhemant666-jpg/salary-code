import { prisma } from '@/lib/prisma';

async function main() {
  const payrolls = await prisma.monthlyPayroll.findMany({
    include: {
      employee: { select: { employeeId: true, name: true } }
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { employee: { name: 'asc' } }]
  });

  console.log(`TOTAL PAYROLL RECORDS: ${payrolls.length}\n`);

  for (const p of payrolls) {
    console.log(`Month: ${p.month}/${p.year} | [${p.employee.employeeId}] ${p.employee.name}`);
    console.log(`  Present: ${p.presentDays} | Leave: ${p.paidLeaveDays} | Unpaid: ${p.unpaidLeaveDays} | LOP Days: ${p.lopDays} | LOP Ded: ₹${p.lopDeduction}`);
    console.log(`  Late Penalty Days: ${p.latePenaltyDays} | Late Penalty Ded: ₹${p.latePenaltyDeduction}`);
    console.log(`  Sudden Penalty Days: ${p.suddenLeavePenaltyDays} | Sudden Penalty Ded: ₹${p.suddenLeavePenaltyDeduction}`);
    console.log(`  Status: ${p.status}\n`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
