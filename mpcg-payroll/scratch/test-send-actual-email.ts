import { testSMTPConnection } from '../src/actions/salary-slip-email';

async function testSendEmail() {
  console.log('--- TESTING REAL EMAIL DISPATCH VIA SMTP SERVER ---');
  const targetEmail = 'accounts@mypainclinicglobal.com';

  console.log(`Sending test email to ${targetEmail}...`);
  const result = await testSMTPConnection(targetEmail);

  console.log('\n--- EMAIL DISPATCH RESULT ---');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

testSendEmail();
