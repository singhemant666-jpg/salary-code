import nodemailer from 'nodemailer';
import { getSMTPSettings } from '../src/lib/email';

async function testPorts() {
  const settings = await getSMTPSettings();
  console.log('Testing SMTP connection options for host:', settings.host);
  console.log('User:', settings.user);

  const configs = [
    { name: 'Port 465 (secure: true)', port: 465, secure: true, rejectUnauthorized: true },
    { name: 'Port 465 (secure: true, rejectUnauthorized: false)', port: 465, secure: true, rejectUnauthorized: false },
    { name: 'Port 587 (secure: false)', port: 587, secure: false, rejectUnauthorized: true },
    { name: 'Port 587 (secure: false, rejectUnauthorized: false)', port: 587, secure: false, rejectUnauthorized: false },
    { name: 'Port 25 (secure: false)', port: 25, secure: false, rejectUnauthorized: false },
  ];

  for (const cfg of configs) {
    console.log(`\nTesting ${cfg.name}...`);
    try {
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
        tls: {
          rejectUnauthorized: cfg.rejectUnauthorized,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      await transporter.verify();
      console.log(`✅ SUCCESS on ${cfg.name}!`);

      // Try sending test email
      console.log(`Sending test email via ${cfg.name}...`);
      const info = await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.user}>`,
        to: 'singhemant666@gmail.com',
        subject: `Test Email via ${cfg.name}`,
        text: 'This is a test email to verify SMTP delivery.',
      });
      console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
      console.log(`Response: ${info.response}`);
      process.exit(0);
    } catch (err: any) {
      console.error(`❌ FAILED on ${cfg.name}: ${err.message} (code: ${err.code})`);
    }
  }

  process.exit(1);
}

testPorts();
