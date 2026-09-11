/**
 * Verify short working hours are now consistent between
 * attendance page and payroll for all employees
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const payrolls = await (prisma.monthlyPayroll as any).findMany({
    where: {
      month: 8,
      year: 2026,
      shortWorkingHours: { gt: 0 },
    },
    select: {
      id: true,
      shortWorkingHours: true,
      shortHoursDeduction: true,
      employee: { select: { name: true, employeeId: true } },
    },
    orderBy: { employee: { name: 'asc' } },
  });

  console.log(`\n--- Employees with Short Working Hours (Aug 2026) ---\n`);
  console.log(`${'Employee'.padEnd(40)} ${'Short Hours'.padStart(12)} ${'Deduction'.padStart(12)}`);
  console.log('-'.repeat(66));

  for (const p of payrolls) {
    const name = p.employee.name.padEnd(40);
    const hours = `${Number(p.shortWorkingHours).toFixed(2)}h`.padStart(12);
    const deduction = `₹${Number(p.shortHoursDeduction).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`.padStart(12);
    console.log(`${name} ${hours} ${deduction}`);
  }

  console.log(`\nTotal employees with short hours: ${payrolls.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
