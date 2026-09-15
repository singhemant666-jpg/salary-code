import nodemailer from 'nodemailer';

async function testVariations() {
  const email = 'singhemant666@gmail.com';
  const passwords = [
    'kwkj nhiz tjhh yzdy',
    'kwkjnhiztjhhyzdy',
  ];

  for (const pass of passwords) {
    console.log(`Testing pass: "${pass}"...`);
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass,
      },
    });

    try {
      await transporter.verify();
      console.log(`✅ SUCCESS with pass: "${pass}"!`);
      process.exit(0);
    } catch (err: any) {
      console.error(`❌ FAILED with pass "${pass}":`, err.message);
    }
  }

  process.exit(1);
}

testVariations();
