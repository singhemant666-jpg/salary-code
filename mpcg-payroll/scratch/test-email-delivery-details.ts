import nodemailer from 'nodemailer';
import { getSMTPSettings } from '../src/lib/email';
import { prisma } from '../src/lib/prisma';
import { sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function testDeliveryDetails() {
  console.log('--- DETAILED EMAIL DELIVERY DIAGNOSIS ---');
  const settings = await getSMTPSettings();

  console.log('SMTP Host:', settings.host);
  console.log('SMTP User:', settings.user);
  console.log('From Name:', settings.fromName);
  console.log('From Email:', settings.fromEmail);

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true, // Enable Nodemailer debug mode
    logger: true,
  });

  const targetEmail = 'singhemant666@gmail.com';

  // Test 1: Simple email without attachment
  console.log('\n--- TEST 1: Simple text email without attachment ---');
  try {
    const info1 = await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.user}>`,
      to: targetEmail,
      subject: `[TEST 1] Plain text test - ${new Date().toISOString()}`,
      text: `Test email sent at ${new Date().toLocaleString()}`,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
    });
    console.log('TEST 1 SENT! Message ID:', info1.messageId);
    console.log('Server Response:', info1.response);
  } catch (err: any) {
    console.error('TEST 1 FAILED:', err);
  }

  // Test 2: Salary Slip Email with PDF Attachment via Server Action
  console.log('\n--- TEST 2: Salary slip email with PDF attachment ---');
  try {
    const payroll = await prisma.monthlyPayroll.findFirst({
      where: { employee: { OR: [{ name: { contains: 'SAHIL' } }, { employeeId: 'MPC-175' }] } },
      orderBy: { createdAt: 'desc' },
    });
    if (payroll) {
      const res = await sendSingleSalarySlipEmail(payroll.id);
      console.log('TEST 2 RESULT:', res);
    }
  } catch (err: any) {
    console.error('TEST 2 FAILED:', err);
  }

  process.exit(0);
}

testDeliveryDetails();
