import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exact Working Hrs for Sahil Singh (MPC-175) June 2026 from Biometric Report
const sahilSheetHours: { [day: number]: number } = {
  1: 9.22,
  2: 0.00,
  3: 9.37,
  4: 8.58,
  5: 0.00,
  6: 9.36,
  7: 0.00,
  8: 0.00,
  9: 9.00,
  10: 9.20,
  11: 10.00,
  12: 9.34,
  13: 8.02,
  14: 0.00,
  15: 9.35,
  16: 9.18,
  17: 8.59,
  18: 10.09,
  19: 8.31,
  20: 9.22,
  21: 0.00,
  22: 0.00,
  23: 8.48,
  24: 0.00,
  25: 9.15,
  26: 9.14,
  27: 9.24,
  28: 0.00,
  29: 9.03,
  30: 9.17,
};

async function main() {
  const sahil = await prisma.employee.findFirst({
    where: { employeeId: 'MPC-175' },
    include: { salaryStructures: { where: { isActive: true } } }
  });

  const records = await prisma.attendanceDaily.findMany({
    where: {
      employee: { employeeId: 'MPC-175' },
      date: {
        gte: new Date('2026-06-01'),
        lt: new Date('2026-07-01'),
      },
    },
  });

  for (const r of records) {
    const day = new Date(r.date).getUTCDate();
    const sheetWH = sahilSheetHours[day];
    if (sheetWH !== undefined) {
      await prisma.attendanceDaily.update({
        where: { id: r.id },
        data: { workingHours: sheetWH },
      });
    }
  }

  // Calculate new total
  const updatedRecords = await prisma.attendanceDaily.findMany({
    where: {
      employee: { employeeId: 'MPC-175' },
      date: {
        gte: new Date('2026-06-01'),
        lt: new Date('2026-07-01'),
      },
    },
  });

  let sumInt = 0;
  for (const r of updatedRecords) {
    sumInt += Math.round(Number(r.workingHours || 0) * 100);
  }

  const allAttendance = await prisma.attendanceDaily.findMany({
    where: { employeeId: sahil?.id }
  });
  console.log(`Total attendance records found for Sahil: ${allAttendance.length}`);
  if (allAttendance.length > 0) {
    const dates = allAttendance.map(a => a.date.toISOString().split('T')[0]);
    console.log('Sample dates:', dates.slice(0, 10));

    // Group by month
    const monthGroups: { [key: string]: { present: number, workingHours: number } } = {};
    for (const a of allAttendance) {
      const ym = a.date.toISOString().slice(0, 7);
      if (!monthGroups[ym]) monthGroups[ym] = { present: 0, workingHours: 0 };
      if (a.status === 'PRESENT' || a.status === 'HALF_DAY') {
        monthGroups[ym].present += (a.status === 'HALF_DAY' ? 0.5 : 1);
      }
      monthGroups[ym].workingHours += Number(a.workingHours || 0);
    }
    console.log('Sahil Monthly Attendance Summary:', monthGroups);

    // For each month, calculate short hours & late mark deduction
    const basicSalary = Number(sahil?.salaryStructures[0]?.basicSalary || 0);
    const hourlyRate = basicSalary / (30 * 9);
    console.log(`Sahil Basic Salary: ${basicSalary}, Hourly Rate: ${hourlyRate.toFixed(4)}`);

    for (const [ym, data] of Object.entries(monthGroups)) {
      const expectedHours = data.present * 9;
      const shortHours = Math.max(0, expectedHours - data.workingHours);
      const lateMarkDeduction = shortHours * hourlyRate;
      console.log(`Month ${ym}: Present Days = ${data.present}, Working Hours = ${data.workingHours.toFixed(2)}, Expected = ${expectedHours.toFixed(2)}, Short Hours = ${shortHours.toFixed(2)}, Late Mark Deduction = ₹${lateMarkDeduction.toFixed(2)} (rounded: ₹${Math.round(lateMarkDeduction)})`);
    }
  }

  // Recalculate August 2026 payroll for ALL employees
  const allAugPayrolls = await prisma.monthlyPayroll.findMany({
    where: { month: 8, year: 2026 },
    include: { employee: true }
  });

  console.log(`Recalculating August 2026 payroll for ${allAugPayrolls.length} employees...`);

  for (const p of allAugPayrolls) {
    const attendanceRecords = await prisma.attendanceDaily.findMany({
      where: {
        employeeId: p.employeeId,
        date: {
          gte: new Date(Date.UTC(2026, 7, 1)),
          lte: new Date(Date.UTC(2026, 8, 0, 23, 59, 59, 999))
        }
      }
    });

    let fullPresentDays = 0;
    let totalFullHoursWorked = 0;
    let totalHalfDayHours = 0;
    let totalOvertimeMinutes = 0;

    for (const rec of attendanceRecords) {
      if (rec.status === 'PRESENT' || rec.status === 'WORK_FROM_HOME' || rec.status === 'ON_DUTY') {
        fullPresentDays++;
        totalFullHoursWorked += Number(rec.workingHours || 0);
      } else if (rec.status === 'HALF_DAY') {
        totalHalfDayHours += Number(rec.workingHours || 0);
      }
      totalOvertimeMinutes += Math.round(Number(rec.overtimeHours || 0) * 60);
    }

    totalFullHoursWorked = Math.round(totalFullHoursWorked * 100) / 100;
    totalHalfDayHours = Math.round(totalHalfDayHours * 100) / 100;
    const totalWorkingHours = Math.round((totalFullHoursWorked + totalHalfDayHours) * 100) / 100;

    const empStandardHours = Number(p.employee.standardWorkingHours || 9);
    // Expected hours calculated strictly for full proper present days * shift hours (excluding half days)
    const expectedHours = fullPresentDays * empStandardHours;
    const shortHours = Math.max(0, Math.round((expectedHours - totalFullHoursWorked) * 100) / 100);
    const basicSalary = Number(p.basicSalary);
    const hourlyRate = basicSalary / (30 * empStandardHours);
    const shortHoursDeduction = Math.round(shortHours * hourlyRate * 100) / 100;

    // Overtime: 0 if full present hours < expected hours
    const overtimeHoursDecimal = totalFullHoursWorked < expectedHours ? 0 : Math.round((totalOvertimeMinutes / 60) * 100) / 100;
    const overtimeAmount = overtimeHoursDecimal * hourlyRate;

    const grossSalary = Number(p.basicSalary) + Number(p.hra) + Number(p.conveyance) + Number(p.otherAllowance) + Number(p.incentiveAmount) + Number(p.bonusAmount) + overtimeAmount;
    const totalDeduction = Number(p.lopDeduction) + shortHoursDeduction + Number(p.holdSalaryDeduction) + Number(p.advanceDeduction) + Number(p.loanDeduction) + Number(p.otherDeduction) + Number(p.pfDeduction);
    const netSalary = grossSalary - totalDeduction;

    await prisma.monthlyPayroll.update({
      where: { id: p.id },
      data: {
        totalWorkingHours,
        shortWorkingHours: shortHours,
        shortHoursDeduction,
        overtimeHours: overtimeHoursDecimal,
        overtimeAmount,
        grossSalary,
        totalDeduction,
        netSalary
      }
    });
  }

  const hardiAttendance = await prisma.attendanceDaily.findMany({
    where: {
      employee: { employeeId: 'MPC-139' },
      date: {
        gte: new Date(Date.UTC(2026, 7, 1)),
        lte: new Date(Date.UTC(2026, 8, 0, 23, 59, 59, 999))
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log(`Hardi Mehta total records: ${hardiAttendance.length}`);
  let hardiTotal = 0;
  let hardiPresent = 0;
  for (const a of hardiAttendance) {
    if (a.status === 'PRESENT') hardiPresent++;
    hardiTotal += Number(a.workingHours || 0);
    console.log(`${a.date.toISOString().split('T')[0]}: status=${a.status}, in=${a.firstIn}, out=${a.lastOut}, wh=${a.workingHours}, late=${a.lateMinutes}m, ot=${a.overtimeHours}`);
  }
  console.log(`Hardi Summary: Present=${hardiPresent}, Total WH=${hardiTotal.toFixed(2)}, Expected=${hardiPresent * 9}, Short=${(hardiPresent * 9) - hardiTotal}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
