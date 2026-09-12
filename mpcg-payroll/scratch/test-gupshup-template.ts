import { prisma } from '../src/lib/prisma';
import { getWhatsAppSettings, sendGupshupTemplate, sendGupshupWhatsApp } from '../src/lib/whatsapp';

async function testGupshupTemplate() {
  const dbSetting = await prisma.payrollSetting.findUnique({
    where: { key: 'whatsapp_gupshup_config' },
  });
  console.log('Database Settings:', dbSetting?.value);

  const settings = await getWhatsAppSettings();
  console.log('Merged Settings:', settings);

  const targetMobile = '9967904923';

  // Test 1: Send template message if templateId exists
  if (settings.useTemplate && (settings.templateIdLogin || (settings as any).templateIdOtp)) {
    const templateId = (settings as any).templateIdOtp || settings.templateIdLogin;
    console.log(`\nSending Gupshup Template message (ID: ${templateId}) to ${targetMobile}...`);
    const resTemplate = await sendGupshupTemplate(targetMobile, templateId, ['Sahil', '123456']);
    console.log('Template Result:', JSON.stringify(resTemplate, null, 2));
  }

  // Test 2: Send text message
  console.log(`\nSending Gupshup Raw Text message to ${targetMobile}...`);
  const resText = await sendGupshupWhatsApp(targetMobile, 'Your OTP for verification is 123456');
  console.log('Raw Text Result:', JSON.stringify(resText, null, 2));

  process.exit(0);
}

testGupshupTemplate();
