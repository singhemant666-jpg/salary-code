import { prisma } from '@/lib/prisma';
import { calculateEmployeePayrollInternal } from '@/actions/payroll';

async function main() {
  const payrolls = await prisma.monthlyPayroll.findMany({
    select: { id: true, employeeId: true, month: true, year: true },
  });

  console.log(`Recalculating ${payrolls.length} payroll records...`);
  let count = 0;

  for (const p of payrolls) {
    await calculateEmployeePayrollInternal(p.id);
    count++;
  }

  console.log(`Successfully recalculated ${count} payroll records!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
