import { prisma } from '../src/lib/prisma';
import { getWhatsAppSettings } from '../src/lib/whatsapp';
import { sendLeaveWhatsAppOTP } from '../src/actions/leaves';

async function updateAndTestNewTemplateId() {
  console.log('--- UPDATING GUPSHUP OTP TEMPLATE ID TO 5001f3b2-30fc-4e95-ad5c-ec4e10409abd ---');
  
  const newTemplateId = '5001f3b2-30fc-4e95-ad5c-ec4e10409abd';
  const current = await getWhatsAppSettings();

  const updatedConfig = {
    ...current,
    useTemplate: true,
    templateIdOtp: newTemplateId,
  };

  await prisma.payrollSetting.upsert({
    where: { key: 'whatsapp_gupshup_config' },
    update: {
      value: JSON.stringify(updatedConfig),
      category: 'whatsapp',
    },
    create: {
      key: 'whatsapp_gupshup_config',
      value: JSON.stringify(updatedConfig),
      category: 'whatsapp',
      description: 'Gupshup WhatsApp API Credentials & Attendance Alert Preferences',
    },
  });

  console.log('✅ Database updated successfully with new Template ID:', newTemplateId);

  console.log('\n--- TESTING LIVE DISPATCH WITH NEW TEMPLATE ID ---');
  const targetMobile = '9967904923';
  const empId = 'MPC-175';

  const res = await sendLeaveWhatsAppOTP(empId, targetMobile);
  console.log('Send Result:');
  console.log(JSON.stringify(res, null, 2));

  process.exit(0);
}

updateAndTestNewTemplateId();
