import { prisma } from '../src/lib/prisma';
import { sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function testSahilSlipEmail() {
  console.log('--- TESTING SALARY SLIP EMAIL FOR SAHIL SINGH ---');

  // Find Sahil's latest payroll record
  const payroll = await prisma.monthlyPayroll.findFirst({
    where: {
      employee: {
        OR: [
          { name: { contains: 'SAHIL' } },
          { employeeId: 'MPC-175' },
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: true,
    },
  });

  if (!payroll) {
    console.error('❌ Payroll record for Sahil Singh not found!');
    process.exit(1);
  }

  console.log(`Found payroll record ID: ${payroll.id} for employee ${payroll.employee.name}`);
  console.log(`Employee Email: ${payroll.employee.email}`);

  console.log('Sending salary slip email now...');
  const result = await sendSingleSalarySlipEmail(payroll.id);
  console.log('RESULT:', result);

  process.exit(0);
}

testSahilSlipEmail();
