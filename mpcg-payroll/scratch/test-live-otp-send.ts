import { sendLeaveWhatsAppOTP } from '../src/actions/leaves';

async function testLiveOtp() {
  console.log('--- TESTING LIVE WHATSAPP OTP DISPATCH WITH NEW TEMPLATE ID ---');
  const targetMobile = '9967904923';
  const empId = 'MPC-175';

  console.log(`Sending WhatsApp OTP to ${targetMobile}...`);
  const res = await sendLeaveWhatsAppOTP(empId, targetMobile);

  console.log('\nResult:');
  console.log(JSON.stringify(res, null, 2));

  process.exit(0);
}

testLiveOtp();
