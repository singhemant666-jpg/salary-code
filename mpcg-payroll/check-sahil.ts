import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Let's list DB values vs calculator values
async function main() {
  const sahilRecords = await prisma.attendanceDaily.findMany({
    where: {
      employee: { employeeId: 'MPC-175' },
      date: {
        gte: new Date('2026-06-01'),
        lt: new Date('2026-07-01'),
      },
    },
    orderBy: { date: 'asc' },
  });

  for (const r of sahilRecords) {
    const dStr = r.date.toISOString().slice(0, 10);
    const wh = Number(r.workingHours || 0);
    if (wh > 0) {
      console.log(`Day ${new Date(r.date).getUTCDate().toString().padStart(2, '0')}: DB = ${wh.toFixed(2)} | In: ${r.firstIn} | Out: ${r.lastOut}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
