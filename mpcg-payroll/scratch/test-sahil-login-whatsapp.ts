import { prisma } from '../src/lib/prisma';
import { getWhatsAppSettings, sendAttendanceWhatsAppNotification } from '../src/lib/whatsapp';
import { saveWhatsAppConfig } from '../src/actions/whatsapp-settings';

async function testSahilLogin() {
  console.log('--- TESTING SAHIL SINGH LOGIN WHATSAPP NOTIFICATION ---');

  // 1. Find Sahil Singh
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
    console.error('❌ Employee Sahil Singh not found in database!');
    process.exit(1);
  }

  console.log(`Found Employee: ${emp.name} (${emp.employeeId}), Mobile: ${emp.mobile}`);

  // 2. Ensure Login Template ID is updated to f5ed7c27-7a52-4456-8f77-289f64e9cea2
  const currentSettings = await getWhatsAppSettings();
  const updatedConfig = {
    ...currentSettings,
    enabled: true,
    useTemplate: true,
    templateIdLogin: 'f5ed7c27-7a52-4456-8f77-289f64e9cea2',
    templateIdOtp: '5001f3b2-30fc-4e95-ad5c-ec4e10409abd',
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

  console.log('✅ Database updated with Login Template ID: f5ed7c27-7a52-4456-8f77-289f64e9cea2');

  // 3. Send Login WhatsApp Notification to Sahil Singh
  console.log(`\nDispatching Login WhatsApp Notification to +91 ${emp.mobile}...`);
  
  const result = await sendAttendanceWhatsAppNotification({
    employeeName: emp.name,
    mobile: emp.mobile || '9967904923',
    type: 'LOGIN',
    dateStr: '12-Sep-2026',
    timeStr: '10:05 AM',
    lateMinutes: 5,
    companyName: 'MY PAIN CLINIC GLOBAL',
  });

  console.log('\n--- GUPSHUP DISPATCH RESULT ---');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

testSahilLogin();
