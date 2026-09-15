import { prisma } from '../src/lib/prisma';
import { testSMTPConnection, sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function testSetting() {
  console.log('--- TESTING SAVED SMTP SETTINGS ---');
  const setting = await prisma.payrollSetting.findUnique({
    where: { key: 'smtp_email_config' },
  });
  console.log('Saved DB SMTP Setting:');
  if (setting) {
    const parsed = JSON.parse(setting.value);
    console.log({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      passLength: parsed.pass ? parsed.pass.length : 0,
    });
  }

  console.log('\nTesting SMTP Connection to singhemant666@gmail.com...');
  const testRes = await testSMTPConnection('singhemant666@gmail.com');
  console.log('Test Connection Result:', testRes);

  if (testRes.success) {
    console.log('\nSending test salary slip email to Sahil Singh...');
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

testSetting();
