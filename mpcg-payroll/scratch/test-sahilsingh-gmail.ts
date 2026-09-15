import { prisma } from '../src/lib/prisma';
import { testSMTPConnection, sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function testSahilGmail() {
  console.log('--- TESTING GMAIL SMTP WITH sahilsinghnewsome@gmail.com ---');

  const config = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'sahilsinghnewsome@gmail.com',
    pass: 'sdtfozcisgkdsotz',
    fromName: 'MY PAIN CLINIC GLOBAL Payroll',
    fromEmail: 'sahilsinghnewsome@gmail.com',
  };

  await prisma.payrollSetting.upsert({
    where: { key: 'smtp_email_config' },
    update: { value: JSON.stringify(config) },
    create: {
      key: 'smtp_email_config',
      value: JSON.stringify(config),
      category: 'email',
      description: 'SMTP Server Settings for Automated Email Notifications',
    },
  });

  console.log('✅ Saved Gmail SMTP Config in DB!');

  console.log('\nTesting connection for sahilsinghnewsome@gmail.com...');
  const testRes = await testSMTPConnection('sahilsinghnewsome@gmail.com');
  console.log('Test Connection Result:', testRes);

  if (testRes.success) {
    console.log('\nSending real salary slip PDF to Sahil Singh via Gmail SMTP...');
    const payroll = await prisma.monthlyPayroll.findFirst({
      where: { employee: { OR: [{ name: { contains: 'SAHIL' } }, { employeeId: 'MPC-175' }] } },
      orderBy: { createdAt: 'desc' },
    });
    if (payroll) {
      const sendRes = await sendSingleSalarySlipEmail(payroll.id);
      console.log('Salary Slip Send Result:', sendRes);
    }
  }

  process.exit(0);
}

testSahilGmail();
