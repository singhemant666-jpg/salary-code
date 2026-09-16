import { prisma } from '@/lib/prisma';

async function main() {
  const invalidLeaves: any[] = await prisma.$queryRawUnsafe(
    "SELECT id, employeeId, leaveType, status, fromDate, toDate FROM leaves WHERE leaveType = '' OR leaveType IS NULL OR leaveType NOT IN ('PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE', 'CASUAL_LEAVE')"
  );
  console.log('INVALID LEAVES COUNT:', invalidLeaves.length);
  console.log('INVALID LEAVES DETAILS:', JSON.stringify(invalidLeaves, null, 2));

  if (invalidLeaves.length > 0) {
    console.log('Fixing invalid leave records...');
    const result = await prisma.$executeRawUnsafe(
      "UPDATE leaves SET leaveType = 'CASUAL_LEAVE' WHERE leaveType = '' OR leaveType IS NULL OR leaveType NOT IN ('PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE', 'CASUAL_LEAVE')"
    );
    console.log('UPDATED ROWS:', result);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
