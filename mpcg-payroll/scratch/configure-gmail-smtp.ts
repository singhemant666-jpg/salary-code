import { prisma } from '../src/lib/prisma';
import { testSMTPConnection, sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function configureGmailSMTP() {
  console.log('--- CONFIGURING GMAIL SMTP WITH USER APP PASSWORD ---');

  const config = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'singhemant666@gmail.com',
    pass: 'kwkjnhiztjhhyzdy',
    fromName: 'MY PAIN CLINIC GLOBAL Payroll',
    fromEmail: 'singhemant666@gmail.com',
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

  console.log('\nTesting Gmail SMTP Connection...');
  const testRes = await testSMTPConnection('singhemant666@gmail.com');
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

configureGmailSMTP();
