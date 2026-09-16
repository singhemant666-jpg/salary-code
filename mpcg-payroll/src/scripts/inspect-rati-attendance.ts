import { prisma } from '@/lib/prisma';

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'RATI' } },
  });

  if (!emp) return;

  const attendance = await prisma.attendanceDaily.findMany({
    where: {
      employeeId: emp.id,
      date: {
        gte: new Date('2026-09-15T00:00:00.000Z'),
        lte: new Date('2026-09-17T23:59:59.999Z'),
      }
    }
  });

  console.log('=== RATI ATTENDANCE (SEPT 15-17) ===');
  console.log(JSON.stringify(attendance, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
