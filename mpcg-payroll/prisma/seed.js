const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Super Admin and default data...\n');

  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mpcglobal.com' },
    update: {
      password: hashedPassword,
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
    },
    create: {
      email: 'admin@mpcglobal.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Super Admin ready: admin@mpcglobal.com / admin123');

  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hr@mpcglobal.com' },
    update: {
      password: hashedPassword,
      status: 'ACTIVE',
      role: 'HR_ADMIN',
    },
    create: {
      email: 'hr@mpcglobal.com',
      password: hashedPassword,
      name: 'HR Admin',
      role: 'HR_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ HR Admin ready: hr@mpcglobal.com / admin123');

  // Insert essential settings if missing
  const defaultSettings = [
    { key: 'standard_working_hours', value: '9', description: 'Standard working hours per day', category: 'attendance' },
    { key: 'half_day_threshold', value: '5', description: 'Minimum hours for half-day (5 Hours)', category: 'attendance' },
    { key: 'late_threshold_minutes', value: '10', description: 'Minutes after shift start considered late', category: 'attendance' },
    { key: 'overtime_after_hours', value: '9', description: 'Hours after which overtime is counted', category: 'attendance' },
    { key: 'shift_start_time', value: '09:00', description: 'Default shift start time', category: 'attendance' },
    { key: 'shift_end_time', value: '18:00', description: 'Default shift end time', category: 'attendance' },
    { key: 'weekly_off_days', value: '[0]', description: 'Weekly off days (0=Sunday, 6=Saturday)', category: 'attendance' },
    { key: 'lop_calculation_method', value: 'fixed30', description: 'LOP method: calendar or fixed30', category: 'payroll' },
    { key: 'lop_based_on', value: 'gross', description: 'LOP base: gross, basic, or basic_hra', category: 'payroll' },
    { key: 'overtime_rate_per_hour', value: '100', description: 'Overtime rate per hour in ₹', category: 'payroll' },
    { key: 'leave_approval_otp_phone', value: '9967904923', description: 'Mobile number for leave approval OTP verification', category: 'attendance' },
    { key: 'company_name', value: 'MY PAIN CLINIC GLOBAL', description: 'Company name for salary slips', category: 'company' },
  ];

  for (const s of defaultSettings) {
    await prisma.payrollSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✅ Default settings verified');

  console.log('\n🎉 Database setup complete! You can now log in:');
  console.log('👉 Email:    admin@mpcglobal.com');
  console.log('👉 Password: admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

