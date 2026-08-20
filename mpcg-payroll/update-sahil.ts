import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exact Working Hrs for Sahil Singh (MPC-175) June 2026 from Biometric Report
const sahilSheetHours: { [day: number]: number } = {
  1: 9.22,
  2: 0.00,
  3: 9.37,
  4: 8.58,
  5: 0.00,
  6: 9.36,
  7: 0.00,
  8: 0.00,
  9: 9.00,
  10: 9.20,
  11: 10.00,
  12: 9.34,
  13: 8.02,
  14: 0.00,
  15: 9.35,
  16: 9.18,
  17: 8.59,
  18: 10.09,
  19: 8.31,
  20: 9.22,
  21: 0.00,
  22: 0.00,
  23: 8.48,
  24: 0.00,
  25: 9.15,
  26: 9.14,
  27: 9.24,
  28: 0.00,
  29: 9.03,
  30: 9.17,
};

async function main() {
  const records = await prisma.attendanceDaily.findMany({
    where: {
      employee: { employeeId: 'MPC-175' },
      date: {
        gte: new Date('2026-06-01'),
        lt: new Date('2026-07-01'),
      },
    },
  });

  for (const r of records) {
    const day = new Date(r.date).getUTCDate();
    const sheetWH = sahilSheetHours[day];
    if (sheetWH !== undefined) {
      await prisma.attendanceDaily.update({
        where: { id: r.id },
        data: { workingHours: sheetWH },
      });
    }
  }

  // Calculate new total
  const updatedRecords = await prisma.attendanceDaily.findMany({
    where: {
      employee: { employeeId: 'MPC-175' },
      date: {
        gte: new Date('2026-06-01'),
        lt: new Date('2026-07-01'),
      },
    },
  });

  let sumInt = 0;
  for (const r of updatedRecords) {
    sumInt += Math.round(Number(r.workingHours || 0) * 100);
  }

  console.log(`Sahil's new database total sum: ${(sumInt / 100).toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
