import { prisma } from '@/lib/prisma';

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'RATI' } },
  });

  if (!emp) {
    console.log('Rati not found');
    return;
  }

  console.log('=== RATI PROFILE ===');
  console.log('Name:', emp.name);
  console.log('ID:', emp.employeeId);
  console.log('Biometric ID:', emp.biometricId);
  console.log('shiftStartTime:', emp.shiftStartTime);
  console.log('shiftEndTime:', emp.shiftEndTime);
}

main().catch(console.error).finally(() => prisma.$disconnect());
