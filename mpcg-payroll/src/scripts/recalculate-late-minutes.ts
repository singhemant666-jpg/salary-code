import { prisma } from '@/lib/prisma';

async function main() {
  const records = await prisma.attendanceDaily.findMany({
    where: {
      firstIn: { not: null },
    },
    include: {
      employee: {
        select: { shiftStartTime: true },
      },
    },
  });

  console.log(`Recalculating lateMinutes for ${records.length} attendance records...`);
  let updatedCount = 0;

  for (const rec of records) {
    if (!rec.firstIn) continue;

    const empShift = rec.employee?.shiftStartTime || '09:00';
    const [sh, sm] = empShift.split(':').map(Number);
    const shiftMins = (sh || 9) * 60 + (sm || 0);

    const match = rec.firstIn.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[4]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      const punchMins = h * 60 + m;
      const lateMins = punchMins > shiftMins ? punchMins - shiftMins : 0;

      if (lateMins !== rec.lateMinutes) {
        await prisma.attendanceDaily.update({
          where: { id: rec.id },
          data: { lateMinutes: lateMins },
        });
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated lateMinutes for ${updatedCount} attendance records!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
