import { prisma } from '../src/lib/prisma';

async function inspectRecord() {
  const p = await prisma.monthlyPayroll.findUnique({
    where: { id: 'cmtv4bptm05x5zyi1z4khaqv7' },
  });
  console.log('Anjali MonthlyPayroll Record Fields:', {
    id: p?.id,
    waiveShortHoursDeduction: (p as any)?.waiveShortHoursDeduction,
    isShortHoursCustomized: (p as any)?.isShortHoursCustomized,
    shortHoursDeduction: Number((p as any)?.shortHoursDeduction || 0),
    shortWorkingHours: Number((p as any)?.shortWorkingHours || 0),
    presentDays: Number(p?.presentDays),
    totalWorkingHours: Number((p as any)?.totalWorkingHours || 0),
  });
}

inspectRecord();
