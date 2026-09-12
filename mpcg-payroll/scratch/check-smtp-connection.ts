import { prisma } from '../src/lib/prisma';
import { getSMTPSettings, createEmailTransporter } from '../src/lib/email';
import nodemailer from 'nodemailer';

async function checkSMTPConnection() {
  console.log('--- TESTING SMTP SERVER CONNECTION & CREDENTIALS ---');

  // 1. Fetch DB setting
  const dbSetting = await prisma.payrollSetting.findUnique({
    where: { key: 'smtp_email_config' },
  });
  console.log('1. Database payrollSetting (smtp_email_config):');
  console.log(dbSetting ? dbSetting.value : 'No entry found in DB table');

  // 2. Merged SMTP Settings
  const settings = await getSMTPSettings();
  console.log('\n2. Active SMTP Settings:');
  console.log({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    user: settings.user,
    passProvided: settings.pass ? `Yes (${settings.pass.length} chars)` : 'No (MISSING)',
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
  });

  if (!settings.user || !settings.pass) {
    console.error('❌ Error: SMTP Username or Password is missing!');
    process.exit(1);
  }

  // 3. Test SMTP connection via transporter.verify()
  console.log(`\n3. Connecting to ${settings.host}:${settings.port} (secure: ${settings.port === 465 || settings.secure})...`);
  
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465 || settings.secure,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
    tls: {
      rejectUnauthorized: false, // Allows self-signed SSL if needed on custom mail servers
    },
  });

  try {
    await transporter.verify();
    console.log('\n✅ SUCCESS: SMTP Server connection verified successfully! Server is ready to send emails.');
  } catch (err: any) {
    console.error('\n❌ SMTP CONNECTION ERROR:');
    console.error(err.message || err);
  }

  process.exit(0);
}

checkSMTPConnection();
