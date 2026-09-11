/**
 * Fix: Recalculate all payroll records so that
 * sandwich leave deduction is now correctly applied.
 * 
 * The bug was: sandwichedDays decremented weeklyOffs but never
 * added to unpaidLeaveDays, so no salary was actually deducted.
 * This is now fixed in payroll.ts — run this script to update all records.
 */
import { PrismaClient } from '@prisma/client';
import { calculateEmployeePayrollInternal } from '../src/actions/payroll';

const prisma = new PrismaClient();

async function main() {
  // Get all non-draft payroll records
  const payrolls = await prisma.monthlyPayroll.findMany({
    where: { status: { not: 'DRAFT' } },
    select: { id: true, month: true, year: true, employee: { select: { name: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  console.log(`Found ${payrolls.length} payroll records to recalculate\n`);
  
  let success = 0;
  let failed = 0;
  let withSandwich = 0;

  for (const p of payrolls) {
    try {
      const result = await calculateEmployeePayrollInternal(p.id);
      if (result.success) {
        // Check if this record has sandwich days
        const updated = await prisma.monthlyPayroll.findUnique({
          where: { id: p.id },
          select: { sandwichedDays: true, lopDeduction: true },
        });
        const hasSandwich = (updated?.sandwichedDays ?? 0) > 0;
        if (hasSandwich) {
          withSandwich++;
          console.log(`✅ [SANDWICH] ${p.employee.name} (${p.month}/${p.year}) — ${updated!.sandwichedDays} sandwich day(s), LOP: ₹${updated!.lopDeduction}`);
        } else {
          console.log(`✓  ${p.employee.name} (${p.month}/${p.year})`);
        }
        success++;
      } else {
        console.log(`✗  ${p.employee.name} (${p.month}/${p.year}): ${result.message}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗  ${p.employee.name} (${p.month}/${p.year}): ${err}`);
      failed++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total: ${payrolls.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Records with Sandwich LOP: ${withSandwich}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
