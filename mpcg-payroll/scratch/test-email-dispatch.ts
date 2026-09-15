import nodemailer from 'nodemailer';
import { prisma } from '../src/lib/prisma';
import { getSMTPSettings } from '../src/lib/email';
import { sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

async function testDispatch() {
  console.log('--- TESTING DIRECT EMAIL DISPATCH ---');
  const settings = await getSMTPSettings();

  console.log('Active Settings:', {
    host: settings.host,
    port: settings.port,
    user: settings.user,
    passLength: settings.pass?.length,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
  });

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465 || settings.secure,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    console.log('✅ Transporter connection verified!');

    const targetEmail = 'singhemant666@gmail.com';
    console.log(`Sending email to ${targetEmail}...`);
    const info = await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.user}>`,
      to: targetEmail,
      subject: 'Test Email — MPCG Payroll System',
      text: 'This is a test email sent from the MPCG Payroll Management System.',
    });

    console.log('✅ SUCCESS! Message ID:', info.messageId);
    console.log('Server Response:', info.response);

    // Send actual salary slip for Sahil Singh
    const payroll = await prisma.monthlyPayroll.findFirst({
      where: { employee: { OR: [{ name: { contains: 'SAHIL' } }, { employeeId: 'MPC-175' }] } },
      orderBy: { createdAt: 'desc' },
    });
    if (payroll) {
      console.log('\nSending real salary slip PDF to Sahil Singh...');
      const res = await sendSingleSalarySlipEmail(payroll.id);
      console.log('Salary Slip Send Result:', res);
    }

  } catch (err: any) {
    console.error('❌ DISPATCH ERROR:', err);
  }

  process.exit(0);
}

testDispatch();
