import { prisma } from '../src/lib/prisma';
import { calculateEmployeePayrollInternal } from '../src/actions/payroll';

async function recalculateAll() {
  console.log('=== Recalculating All Payroll Records across System ===');

  const payrolls = await prisma.monthlyPayroll.findMany({
    select: { id: true, month: true, year: true, employee: { select: { name: true, employeeId: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  console.log(`Found ${payrolls.length} total payroll records to process.`);

  let successCount = 0;
  let failCount = 0;

  for (const p of payrolls) {
    try {
      const res = await calculateEmployeePayrollInternal(p.id);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        console.warn(`Failed for ${p.employee.name} (${p.employee.employeeId}) ${p.month}/${p.year}: ${res.message}`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`Error for ${p.employee.name} (${p.employee.employeeId}) ${p.month}/${p.year}:`, err.message || err);
    }
  }

  console.log('\n--- Batch Recalculation Summary ---');
  console.log(`✓ Successfully Recalculated: ${successCount} records`);
  console.log(`❌ Failed: ${failCount} records`);
}

recalculateAll()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
