import nodemailer from 'nodemailer';

async function testCpanel() {
  console.log('--- TESTING CPANEL SMTP CREDENTIALS (accounts@mypainclinicglobal.com) ---');

  const transporter = nodemailer.createTransport({
    host: 'mail.mypainclinicglobal.com',
    port: 465,
    secure: true,
    auth: {
      user: 'accounts@mypainclinicglobal.com',
      pass: 'mpc@acc1988',
    },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    console.log('✅ SUCCESS: cPanel SMTP login (accounts@mypainclinicglobal.com) verified successfully!');
  } catch (err: any) {
    console.error('❌ cPanel SMTP Error:', err.message);
  }

  process.exit(0);
}

testCpanel();
