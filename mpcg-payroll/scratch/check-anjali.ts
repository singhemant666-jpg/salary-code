import { prisma } from '../src/lib/prisma';
import { calculateEmployeePayrollInternal } from '../src/actions/payroll';

async function testRecalculate() {
  console.log('=== Recalculating Anjali P Dalwadi Payroll for 8/2026 ===');
  const res = await calculateEmployeePayrollInternal('cmtv4bptm05x5zyi1z4khaqv7');
  console.log('Recalculation Result:', res);

  const updated = await prisma.monthlyPayroll.findUnique({
    where: { id: 'cmtv4bptm05x5zyi1z4khaqv7' },
  });

  console.log('Updated Record:', {
    month: `${updated?.month}/${updated?.year}`,
    lopDays: Number(updated?.lopDays),
    lopDeduction: Number(updated?.lopDeduction),
    shortWorkingHours: Number((updated as any)?.shortWorkingHours || 0),
    shortHoursDeduction: Number((updated as any)?.shortHoursDeduction || 0),
    totalDeduction: Number(updated?.totalDeduction),
    netSalary: Number(updated?.netSalary),
  });
}

testRecalculate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
