import { sendGupshupWhatsApp, getWhatsAppSettings } from '../src/lib/whatsapp';

async function testGupshupSend() {
  console.log('--- TESTING REAL GUPSHUP MESSAGE DISPATCH ---');
  const settings = await getWhatsAppSettings();
  console.log('Settings being used:');
  console.log({
    enabled: settings.enabled,
    appName: settings.appName,
    sourceNumber: settings.sourceNumber,
    apiKeyLength: settings.apiKey?.length,
  });

  const testMobile = '9967904923';
  const testMsg = 'MY PAIN CLINIC GLOBAL\n\nYour OTP for Employee Verification is: 123456';
  
  console.log(`\nSending WhatsApp message to ${testMobile}...`);
  const result = await sendGupshupWhatsApp(testMobile, testMsg);
  
  console.log('\n--- GUPSHUP API RESPONSE RESULT ---');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

testGupshupSend();
