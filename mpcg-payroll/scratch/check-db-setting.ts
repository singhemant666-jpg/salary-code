import { prisma } from '../src/lib/prisma';

async function checkDB() {
  const settings = await prisma.payrollSetting.findMany();
  console.log('All Payroll Settings in DB:');
  console.log(JSON.stringify(settings, null, 2));

  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        { name: { contains: 'SAHIL' } },
        { employeeId: 'MPC-175' },
      ]
    }
  });
  console.log('\nSahil Singh Employee record:');
  console.log(emp);

  process.exit(0);
}

checkDB();
