import { prisma } from '../src/lib/prisma';
import { getWhatsAppSettings } from '../src/lib/whatsapp';
import { saveWhatsAppConfig } from '../src/actions/whatsapp-settings';

async function updateOtpTemplate() {
  console.log('--- SAVING GUPSHUP OTP TEMPLATE ID ---');
  const current = await getWhatsAppSettings();
  
  const updatedConfig = {
    ...current,
    useTemplate: true,
    templateIdOtp: 'a932b713-b730-4dca-bf4c-da46e60b0581',
  };

  const res = await saveWhatsAppConfig(updatedConfig);
  console.log('Save Result:', res);

  const updatedSetting = await prisma.payrollSetting.findUnique({
    where: { key: 'whatsapp_gupshup_config' },
  });
  console.log('\nUpdated Database Value:');
  console.log(updatedSetting?.value);

  process.exit(0);
}

updateOtpTemplate();
