import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ============================================================
  // 1. Create Super Admin User
  // ============================================================
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mpcglobal.com' },
    update: {},
    create: {
      email: 'admin@mpcglobal.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Super Admin created:', admin.email);

  // Create HR Admin
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hr@mpcglobal.com' },
    update: {},
    create: {
      email: 'hr@mpcglobal.com',
      password: hashedPassword,
      name: 'HR Admin',
      role: 'HR_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ HR Admin created:', hrAdmin.email);

  // ============================================================
  // 2. Default Payroll Settings
  // ============================================================
  const defaultSettings = [
    { key: 'standard_working_hours', value: '9', description: 'Standard working hours per day', category: 'attendance' },
    { key: 'half_day_threshold', value: '5', description: 'Minimum hours for half-day (5 Hours)', category: 'attendance' },
    { key: 'late_threshold_minutes', value: '15', description: 'Minutes after shift start considered late', category: 'attendance' },
    { key: 'overtime_after_hours', value: '9', description: 'Hours after which overtime is counted', category: 'attendance' },
    { key: 'shift_start_time', value: '09:00', description: 'Default shift start time', category: 'attendance' },
    { key: 'shift_end_time', value: '18:00', description: 'Default shift end time', category: 'attendance' },
    { key: 'weekly_off_days', value: '[0]', description: 'Weekly off days (0=Sunday, 6=Saturday)', category: 'attendance' },
    { key: 'lop_calculation_method', value: 'fixed30', description: 'LOP method: calendar or fixed30', category: 'payroll' },
    { key: 'lop_based_on', value: 'gross', description: 'LOP base: gross, basic, or basic_hra', category: 'payroll' },
    { key: 'overtime_rate_per_hour', value: '100', description: 'Overtime rate per hour in ₹', category: 'payroll' },
    { key: 'company_name', value: 'MY PAIN CLINIC GLOBAL', description: 'Company name for salary slips', category: 'company' },
    { key: 'company_address', value: '', description: 'Company address', category: 'company' },
  ];

  for (const setting of defaultSettings) {
    await prisma.payrollSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Default payroll settings created');

  // ============================================================
  // 3. Indian National Holidays 2026
  // ============================================================
  const holidays2026 = [
    { date: new Date('2026-01-26'), name: 'Republic Day' },
    { date: new Date('2026-03-10'), name: 'Holi' },
    { date: new Date('2026-03-30'), name: 'Id-ul-Fitr' },
    { date: new Date('2026-04-02'), name: 'Ram Navami' },
    { date: new Date('2026-04-03'), name: 'Good Friday' },
    { date: new Date('2026-04-14'), name: 'Dr. Ambedkar Jayanti' },
    { date: new Date('2026-05-01'), name: 'May Day' },
    { date: new Date('2026-06-06'), name: 'Id-ul-Zuha (Bakrid)' },
    { date: new Date('2026-07-06'), name: 'Muharram' },
    { date: new Date('2026-08-15'), name: 'Independence Day' },
    { date: new Date('2026-08-21'), name: 'Janmashtami' },
    { date: new Date('2026-09-04'), name: 'Milad-un-Nabi' },
    { date: new Date('2026-10-02'), name: 'Mahatma Gandhi Jayanti' },
    { date: new Date('2026-10-20'), name: 'Dussehra' },
    { date: new Date('2026-11-09'), name: 'Diwali' },
    { date: new Date('2026-11-10'), name: 'Diwali (Govardhan Puja)' },
    { date: new Date('2026-11-27'), name: 'Guru Nanak Jayanti' },
    { date: new Date('2026-12-25'), name: 'Christmas' },
  ];

  for (const holiday of holidays2026) {
    await prisma.holiday.upsert({
      where: { date: holiday.date },
      update: {},
      create: { ...holiday, isOptional: false },
    });
  }
  console.log('✅ 2026 Indian holidays created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login Credentials:');
  console.log('   Super Admin: admin@mpcglobal.com / admin123');
  console.log('   HR Admin:    hr@mpcglobal.com / admin123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
