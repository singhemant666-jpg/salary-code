import { prisma } from '../src/lib/prisma';
import { testSMTPConnection, sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function setOfficialSMTP() {
  console.log('--- SAVING OFFICIAL CPANEL SMTP CREDENTIALS IN DB ---');

  const config = {
    host: 'mail.mypainclinicglobal.com',
    port: 465,
    secure: true,
    user: 'accounts@mypainclinicglobal.com',
    pass: 'mpc@acc1988',
    fromName: 'MY PAIN CLINIC GLOBAL Payroll',
    fromEmail: 'accounts@mypainclinicglobal.com',
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

  console.log('✅ Saved Official cPanel SMTP Credentials in DB!');

  console.log('\nTesting connection...');
  const testRes = await testSMTPConnection('accounts@mypainclinicglobal.com');
  console.log('Test Connection Result:', testRes);

  process.exit(0);
}

setOfficialSMTP();
