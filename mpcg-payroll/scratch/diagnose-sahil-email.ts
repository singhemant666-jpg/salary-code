import { prisma } from '../src/lib/prisma';
import { getSMTPSettings, createEmailTransporter } from '../src/lib/email';

async function diagnoseSahilEmail() {
  console.log('--- DIAGNOSING SAHIL SINGH SALARY SLIP EMAIL ---');

  // 1. Fetch Sahil Singh's record
  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        { name: { contains: 'SAHIL' } },
        { employeeId: 'MPC-175' },
        { mobile: '9967904923' },
      ],
    },
  });

  if (!emp) {
    console.error('❌ Employee Sahil Singh not found!');
    process.exit(1);
  }

  console.log('Employee Record:');
  console.log({
    id: emp.id,
    name: emp.name,
    employeeId: emp.employeeId,
    email: emp.email,
    mobile: emp.mobile,
  });

  if (!emp.email || emp.email.trim() === '') {
    console.error(`❌ WARNING: Employee "${emp.name}" has NO EMAIL ADDRESS set in the employee profile!`);
    console.error('If email field in employee profile is blank or incorrect, emails cannot be delivered.');
  }

  // 2. Fetch SMTP settings
  const settings = await getSMTPSettings();
  console.log('\nActive SMTP Configuration:');
  console.log({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    user: settings.user,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
  });

  // 3. Send test email to Sahil's email if present or specified email
  const targetEmail = emp.email || 'accounts@mypainclinicglobal.com';
  console.log(`\nAttempting to send direct Nodemailer email to: ${targetEmail}...`);

  try {
    const transporter = await createEmailTransporter();
    
    // Ensure From header uses authenticated SMTP user to prevent SPF/DMARC spam filtering
    const fromAddress = settings.user; // accounts@mypainclinicglobal.com

    const info = await transporter.sendMail({
      from: `"${settings.fromName}" <${fromAddress}>`,
      to: targetEmail,
      subject: `[TEST] Salary Slip Email Delivery Check - ${emp.name}`,
      text: `Hello ${emp.name},\n\nThis is a test email to verify salary slip email delivery for ${emp.name}.\nIf you see this in your inbox or spam folder, email sending is working!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #06b6d4;">MY PAIN CLINIC GLOBAL</h2>
          <p>Hello <strong>${emp.name}</strong>,</p>
          <p>This is a test email to verify salary slip email delivery for <strong>${emp.name}</strong>.</p>
          <p>Recipient Email: <code>${targetEmail}</code></p>
        </div>
      `,
    });

    console.log('\n✅ NODEMAILER RESPONSE:');
    console.log(JSON.stringify({
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      response: info.response,
    }, null, 2));

  } catch (err: any) {
    console.error('\n❌ EMAIL SENDING ERROR:');
    console.error(err);
  }

  process.exit(0);
}

diagnoseSahilEmail();
