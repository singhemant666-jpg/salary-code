'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import {
  validateImportData,
  processDailyPunches,
  type RawPunch,
  type AttendanceSettings,
} from '@/lib/attendance-processor';
import { getPayrollSettings } from '@/actions/payroll';
import { sendAttendanceWhatsAppNotification } from '@/lib/whatsapp';
import type { ActionResult } from '@/types';

// ============================================================
// Import Attendance from Excel/CSV
// ============================================================

export async function importAttendance(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const file = formData.get('file') as File;
  if (!file) return { success: false, message: 'No file uploaded' };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    if (rows.length === 0) {
      return { success: false, message: 'File is empty or has no data rows' };
    }

    // Parse both row array (for Matrix reports) and objects (for Flat sheets)
    const arrayRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Record<string, unknown>[];
    const objectRows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    if (arrayRows.length === 0 && objectRows.length === 0) {
      return { success: false, message: 'File is empty or has no data rows' };
    }

    // Get all employee biometric IDs for validation
    const employees = await prisma.employee.findMany({
      select: { id: true, biometricId: true, employeeId: true },
    });

    const biometricMap = new Map<string, string>();
    const validIds = new Set<string>();
    
    for (const emp of employees) {
      const bioId = emp.biometricId.trim();
      const empId = emp.employeeId.trim();
      const strippedBio = bioId.replace(/^0+/, '') || bioId;
      const strippedEmp = empId.replace(/^0+/, '') || empId;

      biometricMap.set(bioId, emp.id);
      biometricMap.set(empId, emp.id);
      biometricMap.set(strippedBio, emp.id);
      biometricMap.set(strippedEmp, emp.id);

      validIds.add(bioId);
      validIds.add(empId);
      validIds.add(strippedBio);
      validIds.add(strippedEmp);
    }

    // Get existing punches to detect duplicates
    const existingRaw = await prisma.attendanceRaw.findMany({
      select: { employeeId: true, date: true, time: true },
    });
    const existingPunches = new Set<string>();
    for (const raw of existingRaw) {
      const dateStr = raw.date.toISOString().split('T')[0];
      const timeStr = raw.time;
      existingPunches.add(`${raw.employeeId}_${dateStr}_${timeStr}`);
    }

    // Validate import data (try arrayRows for Matrix reports, fallback to objectRows)
    const result = validateImportData(arrayRows, validIds, existingPunches);

    if (result.success.length === 0) {
      return {
        success: false,
        message: `No valid records to import. ${result.errors.length} errors found.`,
        data: result.errors as never,
      };
    }

    // Auto-register any missing employees from the import file
    const missingEmpMap = new Map<string, { bioId: string; name: string }>();
    for (const punch of result.success) {
      const dbId = biometricMap.get(punch.employeeId);
      if (!dbId) {
        missingEmpMap.set(punch.employeeId, {
          bioId: punch.biometricId || punch.employeeId,
          name: punch.employeeName || `Employee ${punch.employeeId}`,
        });
      }
    }

    for (const [code, info] of Array.from(missingEmpMap.entries())) {
      try {
        const newEmp = await prisma.employee.create({
          data: {
            employeeId: code,
            biometricId: info.bioId,
            name: info.name,
            standardWorkingHours: 9.00,
            status: 'ACTIVE',
          },
        });
        await prisma.employeeSalaryStructure.create({
          data: {
            employeeId: newEmp.id,
            basicSalary: 25000,
            hra: 5000,
            conveyance: 2000,
            otherAllowance: 1000,
            effectiveDate: new Date(),
            isActive: true,
          },
        });
        biometricMap.set(code, newEmp.id);
        biometricMap.set(info.bioId, newEmp.id);
      } catch (err) {
        // If employee already exists (e.g. duplicate key), fetch existing
        const existingEmp = await prisma.employee.findFirst({
          where: { OR: [{ employeeId: code }, { biometricId: info.bioId }] },
        });
        if (existingEmp) {
          biometricMap.set(code, existingEmp.id);
          biometricMap.set(info.bioId, existingEmp.id);
        }
      }
    }

    // Create batch ID
    const batchId = `IMPORT_${Date.now()}`;

    // Save raw attendance records
    const createData = result.success.map((punch: RawPunch) => ({
      employeeId: biometricMap.get(punch.employeeId) || punch.employeeId,
      date: new Date(punch.date),
      time: punch.time,
      punchType: punch.punchType as 'IN' | 'OUT',
      source: 'IMPORT',
      importBatchId: batchId,
    }));

    await prisma.attendanceRaw.createMany({ data: createData });

    // Auto-process attendance for detected month & year from the import sheet
    let processedMessage = '';
    let detectedMonth = 6;
    let detectedYear = 2026;
    if (result.success.length > 0) {
      const dateParts = result.success[0].date.split('-');
      detectedYear = parseInt(dateParts[0]);
      detectedMonth = parseInt(dateParts[1]);

      await processAttendance(detectedMonth, detectedYear);
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      processedMessage = ` and automatically processed daily attendance for ${monthNames[detectedMonth - 1]} ${detectedYear}!`;
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'IMPORT',
      entity: 'Attendance',
      newValue: {
        batchId,
        totalRows: result.totalRows,
        imported: result.success.length,
        errors: result.errors.length,
        duplicates: result.duplicates,
      },
    });

    revalidatePath('/dashboard/attendance');
    return {
      success: true,
      message: `Imported ${result.success.length} records${processedMessage}`,
      data: { month: detectedMonth, year: detectedYear } as never,
    };
  } catch (error) {
    console.error('Import attendance error:', error);
    return { success: false, message: 'Failed to import attendance file' };
  }
}

// ============================================================
// Process Raw Attendance into Daily Records
// ============================================================

export async function processAttendance(month: number, year: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const settings = await getPayrollSettings();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Get all raw punches for the month
    const rawPunches = await prisma.attendanceRaw.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: { employee: { select: { id: true, biometricId: true } } },
    });

    // Get holidays for the month
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });
    const holidayDates = new Set(holidays.map((h: { date: Date }) => h.date.toISOString().split('T')[0]));

    // Get all active employees with their per-employee working hours and mobile numbers for WhatsApp alerts
    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, mobile: true, standardWorkingHours: true },
    });

    // Get approved leaves for the month
    const leaves = await prisma.leave.findMany({
      where: {
        status: 'APPROVED',
        fromDate: { lte: endDate },
        toDate: { gte: startDate },
      },
    });

    // Build leave map: employeeId -> { date -> leaveType }
    const leaveMap = new Map<string, Map<string, string>>();
    for (const leave of leaves) {
      if (!leaveMap.has(leave.employeeId)) {
        leaveMap.set(leave.employeeId, new Map());
      }
      const empLeaves = leaveMap.get(leave.employeeId)!;
      const from = new Date(Math.max(leave.fromDate.getTime(), startDate.getTime()));
      const to = new Date(Math.min(leave.toDate.getTime(), endDate.getTime()));
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        empLeaves.set(d.toISOString().split('T')[0], leave.leaveType);
      }
    }

    // Group raw punches by employee and date
    const punchMap = new Map<string, Map<string, typeof rawPunches>>();
    for (const punch of rawPunches) {
      const empId = punch.employeeId;
      if (!punchMap.has(empId)) punchMap.set(empId, new Map());
      const dateStr = punch.date.toISOString().split('T')[0];
      if (!punchMap.get(empId)!.has(dateStr)) punchMap.get(empId)!.set(dateStr, []);
      punchMap.get(empId)!.get(dateStr)!.push(punch);
    }

    const attendanceSettings: AttendanceSettings = {
      standardWorkingHours: settings.standard_working_hours,
      halfDayThreshold: settings.half_day_threshold,
      lateThresholdMinutes: settings.late_threshold_minutes,
      overtimeAfterHours: settings.overtime_after_hours,
      shiftStartTime: settings.shift_start_time,
      shiftEndTime: settings.shift_end_time,
      weeklyOffDays: settings.weekly_off_days,
    };

    let processed = 0;

    // Process each day for each employee
    for (const employee of activeEmployees) {
      const empStandardHours = Number(employee.standardWorkingHours) || settings.standard_working_hours || 9;
      const empHalfDayThreshold = settings.half_day_threshold || 5;
      const empOvertimeAfter = Math.min(settings.overtime_after_hours, empStandardHours);

      const attendanceSettings: AttendanceSettings = {
        standardWorkingHours: empStandardHours,
        halfDayThreshold: empHalfDayThreshold,
        lateThresholdMinutes: settings.late_threshold_minutes,
        overtimeAfterHours: empOvertimeAfter,
        shiftStartTime: settings.shift_start_time,
        shiftEndTime: settings.shift_end_time,
        weeklyOffDays: settings.weekly_off_days,
      };

      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const dayOfWeek = dayDate.getUTCDay();
        const isHoliday = holidayDates.has(dateStr);
        const isWeeklyOff = settings.weekly_off_days.includes(dayOfWeek);

        // Check if leave exists
        const empLeaves = leaveMap.get(employee.id);
        const leaveType = empLeaves?.get(dateStr);

        // Get punches for this employee and date
        const dayPunches = punchMap.get(employee.id)?.get(dateStr) || [];

        let status: string;
        let firstIn: string | null = null;
        let lastOut: string | null = null;
        let workingHours = 0;
        let lateMinutes = 0;
        let earlyDeparture = 0;
        let overtimeHours = 0;

        if (leaveType) {
          // Leave takes precedence
          status = leaveType === 'PAID_LEAVE' || leaveType === 'SICK_LEAVE' || leaveType === 'CASUAL_LEAVE'
            ? 'PAID_LEAVE'
            : 'UNPAID_LEAVE';
        } else if (dayPunches.length > 0) {
          // Process punches
          const punchData = dayPunches.map((p: { employeeId: string; time: string; punchType: string }) => ({
            employeeId: p.employeeId,
            date: dateStr,
            time: p.time,
            punchType: p.punchType as 'IN' | 'OUT',
          }));

          const result = processDailyPunches(
            employee.id,
            dateStr,
            punchData,
            attendanceSettings,
            isHoliday,
            isWeeklyOff
          );

          status = result.status;
          firstIn = result.firstIn || null;
          lastOut = result.lastOut || null;
          workingHours = result.workingHours;
          lateMinutes = result.lateMinutes;
          earlyDeparture = result.earlyDeparture;
          overtimeHours = result.overtimeHours;
        } else if (isHoliday) {
          status = 'HOLIDAY';
        } else if (isWeeklyOff) {
          status = 'WEEKLY_OFF';
        } else {
          status = 'ABSENT';
        }

        // Upsert daily attendance
        await prisma.attendanceDaily.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: dayDate,
            },
          },
          update: {
            firstIn,
            lastOut,
            workingHours,
            status: status as never,
            lateMinutes,
            earlyDeparture,
            overtimeHours,
          },
          create: {
            employeeId: employee.id,
            date: dayDate,
            firstIn,
            lastOut,
            workingHours,
            status: status as never,
            lateMinutes,
            earlyDeparture,
            overtimeHours,
          },
        });

        // Trigger automated WhatsApp notifications if mobile number exists
        if (employee.mobile && (firstIn || lastOut)) {
          if (firstIn) {
            sendAttendanceWhatsAppNotification({
              employeeName: employee.name,
              mobile: employee.mobile,
              type: 'LOGIN',
              dateStr,
              timeStr: firstIn,
            }).catch(err => console.error('WhatsApp Login Alert error:', err));
          }

          if (lastOut) {
            sendAttendanceWhatsAppNotification({
              employeeName: employee.name,
              mobile: employee.mobile,
              type: 'LOGOUT',
              dateStr,
              timeStr: lastOut,
              workingHours,
            }).catch(err => console.error('WhatsApp Logout Alert error:', err));
          }
        }

        processed++;
      }
    }

    // Auto-calculate payroll records for this month
    try {
      const { calculateAllPayrolls } = await import('@/actions/payroll');
      await calculateAllPayrolls(month, year);
    } catch (calcErr) {
      console.error('Auto payroll calculation warning:', calcErr);
    }

    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    return { success: true, message: `Processed ${processed} attendance records` };
  } catch (error) {
    console.error('Process attendance error:', error);
    return { success: false, message: 'Failed to process attendance' };
  }
}

// ============================================================
// Get Daily Attendance
// ============================================================

export async function getDailyAttendance(params: {
  date?: string;
  month?: number;
  year?: number;
  employeeId?: string;
}) {
  const where: Record<string, unknown> = {};

  if (params.date) {
    where.date = new Date(params.date);
  } else if (params.month && params.year) {
    const startDate = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59));
    where.date = { gte: startDate, lte: endDate };
  } else {
    // Default to the latest month containing attendance records
    const latest = await prisma.attendanceDaily.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    if (latest) {
      const lMonth = latest.date.getUTCMonth() + 1;
      const lYear = latest.date.getUTCFullYear();
      const startDate = new Date(Date.UTC(lYear, lMonth - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(lYear, lMonth, 0, 23, 59, 59));
      where.date = { gte: startDate, lte: endDate };
    }
  }

  if (params.employeeId) {
    where.employeeId = params.employeeId;
  }

  return prisma.attendanceDaily.findMany({
    where: where as never,
    include: {
      employee: {
        select: { employeeId: true, name: true, designation: true, department: true, standardWorkingHours: true },
      },
    },
    orderBy: [{ date: 'asc' }, { employee: { name: 'asc' } }],
  });
}

// ============================================================
// Update Attendance Status (Manual Correction)
// ============================================================

export async function updateAttendanceStatus(
  id: string,
  newStatus: string,
  reason: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };
  if (!reason) return { success: false, message: 'Reason is required for manual correction' };

  try {
    const existing = await prisma.attendanceDaily.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Attendance record not found' };

    await prisma.attendanceDaily.update({
      where: { id },
      data: {
        status: newStatus as never,
        isManuallyEdited: true,
        editedBy: session.user.name,
        editReason: reason,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'Attendance',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: newStatus },
      reason,
    });

    revalidatePath('/dashboard/attendance');
    return { success: true, message: 'Attendance updated' };
  } catch (error) {
    console.error('Update attendance error:', error);
    return { success: false, message: 'Failed to update attendance' };
  }
}
