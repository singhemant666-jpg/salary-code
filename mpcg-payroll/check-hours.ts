import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // Check days where our values differ from biometric machine
  const diffDays = ['2026-06-03', '2026-06-06', '2026-06-08', '2026-06-16'];
  
  for (const day of diffDays) {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const punches = await p.attendanceRaw.findMany({
      where: {
        employee: { employeeId: 'MPC-173' },
        date: {
          gte: new Date(day),
          lt: nextDay,
        },
      },
      select: { time: true, punchType: true },
      orderBy: { time: 'asc' },
    });
    
    console.log(`${day}: ${punches.map(r => `${r.time}(${r.punchType})`).join(', ')}`);
    
    // Check if times have seconds
    for (const p2 of punches) {
      const parts = p2.time.split(':');
      if (parts.length === 3) {
        console.log(`  → HAS SECONDS: ${p2.time}`);
      }
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
