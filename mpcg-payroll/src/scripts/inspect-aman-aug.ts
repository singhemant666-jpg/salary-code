import { prisma } from '@/lib/prisma';

async function main() {
  const p = await prisma.monthlyPayroll.findFirst({
    where: {
      employee: { name: { contains: 'AMAN' } },
      month: 8,
      year: 2026,
    },
    include: { employee: true }
  });

  console.log('=== AMAN AUGUST 2026 PAYROLL ===');
  console.log(JSON.stringify(p, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
