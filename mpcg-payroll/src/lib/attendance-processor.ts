// ============================================================
// Attendance Processor — Business Logic
// ============================================================
// Converts raw biometric punches into daily attendance records.

export interface RawPunch {
  employeeId: string;
  biometricId?: string;
  employeeName?: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:MM or HH:MM:SS
  punchType: 'IN' | 'OUT';
}

export interface AttendanceSettings {
  standardWorkingHours: number;     // e.g., 8
  halfDayThreshold: number;         // e.g., 4
  lateThresholdMinutes: number;     // e.g., 15
  overtimeAfterHours: number;       // e.g., 8
  shiftStartTime: string;           // e.g., "09:00"
  shiftEndTime: string;             // e.g., "18:00"
  weeklyOffDays: number[];          // e.g., [0] for Sunday (0=Sun, 6=Sat)
}

export interface DailyAttendanceResult {
  employeeId: string;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  workingHours: number;
  status: AttendanceStatusType;
  lateMinutes: number;
  earlyDeparture: number;
  overtimeHours: number;
  remarks: string;
}

export type AttendanceStatusType = 
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'PAID_LEAVE'
  | 'UNPAID_LEAVE'
  | 'WEEKLY_OFF'
  | 'HOLIDAY'
  | 'WORK_FROM_HOME'
  | 'ON_DUTY'
  | 'MISSING_PUNCH';

// ============================================================
// Core Processing Functions
// ============================================================

/**
 * Group raw punches by employee and date
 */
export function groupPunchesByEmployeeDate(
  punches: RawPunch[]
): Map<string, Map<string, RawPunch[]>> {
  const grouped = new Map<string, Map<string, RawPunch[]>>();

  for (const punch of punches) {
    if (!grouped.has(punch.employeeId)) {
      grouped.set(punch.employeeId, new Map());
    }
    const empMap = grouped.get(punch.employeeId)!;
    if (!empMap.has(punch.date)) {
      empMap.set(punch.date, []);
    }
    empMap.get(punch.date)!.push(punch);
  }

  return grouped;
}

/**
 * Process raw punches for a single employee on a single day
 */
export function processDailyPunches(
  employeeId: string,
  date: string,
  punches: RawPunch[],
  settings: AttendanceSettings,
  isHoliday: boolean,
  isWeeklyOff: boolean
): DailyAttendanceResult {
  // Sort punches by time
  const sorted = [...punches].sort((a, b) => a.time.localeCompare(b.time));

  // Find IN and OUT punches
  const inPunches = sorted.filter(p => p.punchType === 'IN');
  const outPunches = sorted.filter(p => p.punchType === 'OUT');

  let effectiveIn = inPunches.length > 0 ? inPunches[0].time : null;
  let effectiveOut = outPunches.length > 0 ? outPunches[outPunches.length - 1].time : null;

  // Handle single and multiple punch assignment correctly
  if (sorted.length > 1) {
    if (!effectiveIn) effectiveIn = sorted[0].time;
    if (!effectiveOut) effectiveOut = sorted[sorted.length - 1].time;
  } else if (sorted.length === 1) {
    const singlePunch = sorted[0];
    const [h] = singlePunch.time.split(':').map(Number);
    // If single punch is at or after 13:00 (1:00 PM), it is a DEPARTURE / OUT punch
    if (h >= 13) {
      effectiveIn = null;
      effectiveOut = singlePunch.time;
    } else {
      effectiveIn = singlePunch.time;
      effectiveOut = null;
    }
  }

  // Calculate working hours in HH.MM raw decimal format (e.g. 9h 22m -> 9.22)
  let workingHours = 0;
  let totalMins = 0;
  if (effectiveIn && effectiveOut && effectiveIn !== effectiveOut) {
    const [sh, sm] = effectiveIn.split(':').map(Number);
    const [eh, em] = effectiveOut.split(':').map(Number);
    totalMins = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMins > 0) {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      workingHours = Math.round((hrs + mins / 100) * 100) / 100;
    }
  }

  // Calculate late minutes (ONLY if there is a valid IN punch)
  let lateMinutes = 0;
  if (effectiveIn) {
    const diffMinutes = calculateTimeDiffMinutes(settings.shiftStartTime, effectiveIn);
    if (diffMinutes > 0) {
      lateMinutes = diffMinutes;
    }
  }

  // Calculate early departure
  let earlyDeparture = 0;
  if (effectiveOut) {
    const diffMinutes = calculateTimeDiffMinutes(effectiveOut, settings.shiftEndTime);
    if (diffMinutes > 0) {
      earlyDeparture = diffMinutes;
    }
  }

  // Calculate overtime (ONLY extra time worked OVER standard shift hours e.g. 9.0h)
  let overtimeHours = 0;
  const shiftHoursThreshold = settings.standardWorkingHours || settings.overtimeAfterHours || 9;
  const shiftMinsThreshold = Math.round(shiftHoursThreshold * 60);
  if (totalMins > shiftMinsThreshold) {
    const extraMins = totalMins - shiftMinsThreshold;
    const otHrs = Math.floor(extraMins / 60);
    const otMins = extraMins % 60;
    overtimeHours = Math.round((otHrs + otMins / 100) * 100) / 100;
  }

  // Determine status
  let status: AttendanceStatusType;
  let remarks = '';

  if (isHoliday && punches.length === 0) {
    status = 'HOLIDAY';
    remarks = 'Public holiday';
  } else if (isWeeklyOff && punches.length === 0) {
    status = 'WEEKLY_OFF';
    remarks = 'Weekly off';
  } else if (punches.length === 0) {
    status = 'ABSENT';
    remarks = 'No punch recorded';
  } else if (!effectiveIn || !effectiveOut) {
    status = 'MISSING_PUNCH';
    remarks = !effectiveIn ? 'IN punch missing' : 'OUT punch missing';
  } else if (workingHours > settings.halfDayThreshold) {
    status = 'PRESENT';
    if (lateMinutes > settings.lateThresholdMinutes) {
      remarks = `Late by ${lateMinutes} minutes`;
    }
  } else if (workingHours > 0) {
    status = 'HALF_DAY';
    remarks = `Worked ${workingHours.toFixed(2)} hours (<= ${settings.halfDayThreshold}h half-day threshold)`;
  } else {
    status = 'ABSENT';
    remarks = 'Insufficient working hours';
  }

  // Holiday/Weekly off with attendance — mark as present (working on off day)
  if ((isHoliday || isWeeklyOff) && punches.length > 0 && workingHours > 0) {
    status = 'PRESENT';
    remarks = isHoliday
      ? 'Worked on holiday'
      : 'Worked on weekly off';
    // All hours on off day count as overtime
    overtimeHours = workingHours;
  }

  return {
    employeeId,
    date,
    firstIn: effectiveIn,
    lastOut: effectiveOut,
    workingHours: Math.round(workingHours * 100) / 100,
    status,
    lateMinutes,
    earlyDeparture,
    overtimeHours,
    remarks,
  };
}

// ============================================================
// Excel/CSV Import Validation
// ============================================================

export interface ImportValidationError {
  row: number;
  employeeId?: string;
  field: string;
  message: string;
}

export interface ImportResult {
  success: RawPunch[];
  errors: ImportValidationError[];
  duplicates: number;
  totalRows: number;
  presetDailyMap?: Map<string, { workingHours: number; overtimeHours: number }>;
}

/**
 * Validate imported attendance data (supports both Flat Tabular and Realtime RS 70 Matrix Report formats)
 */
export function validateImportData(
  rows: Record<string, unknown>[],
  validEmployeeIds: Set<string>,
  existingPunches: Set<string> // "employeeId_date_time" format
): ImportResult {
  // Check if this is a Realtime RS 70 Monthly Performance Matrix report (like MnPerformance.xls)
  const isRS70Matrix = isRealtimeRS70Matrix(rows);

  if (isRS70Matrix) {
    return parseRS70MatrixData(rows, validEmployeeIds, existingPunches);
  }

  const success: RawPunch[] = [];
  const errors: ImportValidationError[] = [];
  let duplicates = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row and 0-index

    // Extract employee ID (try common column names)
    const empId = extractField(row, ['EmployeeID', 'Employee ID', 'EmpID', 'Emp ID', 'ID', 'BiometricID', 'Biometric ID', 'empid', 'employee_id']);
    if (!empId) {
      errors.push({ row: rowNum, field: 'EmployeeID', message: 'Employee ID is missing' });
      continue;
    }

    // Validate employee exists
    if (!validEmployeeIds.has(String(empId))) {
      errors.push({ row: rowNum, employeeId: String(empId), field: 'EmployeeID', message: `Employee not found: ${empId}` });
      continue;
    }

    // Extract date
    const dateVal = extractField(row, ['Date', 'AttendanceDate', 'Attendance Date', 'PunchDate', 'date']);
    if (!dateVal) {
      errors.push({ row: rowNum, employeeId: String(empId), field: 'Date', message: 'Date is missing' });
      continue;
    }

    const parsedDate = parseDate(String(dateVal));
    if (!parsedDate) {
      errors.push({ row: rowNum, employeeId: String(empId), field: 'Date', message: `Invalid date: ${dateVal}` });
      continue;
    }

    // Extract time
    const timeVal = extractField(row, ['Time', 'PunchTime', 'Punch Time', 'CheckTime', 'time']);
    if (!timeVal) {
      errors.push({ row: rowNum, employeeId: String(empId), field: 'Time', message: 'Time is missing' });
      continue;
    }

    const parsedTime = parseTime(String(timeVal));
    if (!parsedTime) {
      errors.push({ row: rowNum, employeeId: String(empId), field: 'Time', message: `Invalid time: ${timeVal}` });
      continue;
    }

    // Extract punch type (default to auto-detect)
    const typeVal = extractField(row, ['Type', 'PunchType', 'Punch Type', 'Direction', 'Status', 'InOut', 'type']);
    const punchType = parsePunchType(typeVal ? String(typeVal) : '');

    // Check duplicates
    const key = `${empId}_${parsedDate}_${parsedTime}`;
    if (existingPunches.has(key)) {
      duplicates++;
      continue;
    }

    existingPunches.add(key);

    success.push({
      employeeId: String(empId),
      date: parsedDate,
      time: parsedTime,
      punchType,
    });
  }

  return {
    success,
    errors,
    duplicates,
    totalRows: rows.length,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function extractField(row: Record<string, unknown>, possibleKeys: string[]): unknown {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
    // Case-insensitive search
    const lowerKey = key.toLowerCase();
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase() === lowerKey) {
        if (row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey] !== '') {
          return row[rowKey];
        }
      }
    }
  }
  return null;
}

function calculateTimeDiffHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return (endMinutes - startMinutes) / 60;
}

function calculateTimeDiffMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return endMinutes - startMinutes;
}

/**
 * Parse various date formats into YYYY-MM-DD
 */
function parseDate(value: string): string | null {
  // Handle Excel serial number dates
  if (/^\d{5}$/.test(value)) {
    const serial = parseInt(value);
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try common formats
  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // YYYY-MM-DD
  const yyyymmdd = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native Date parse as fallback
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse various time formats into HH:MM
 */
function parseTime(value: string): string | null {
  // HH:MM:SS or HH:MM
  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const [, h, m, s] = timeMatch;
    if (s !== undefined) {
      return `${h.padStart(2, '0')}:${m}:${s.padStart(2, '0')}`;
    }
    return `${h.padStart(2, '0')}:${m}`;
  }

  // Try extracting time from datetime string
  const datetimeMatch = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (datetimeMatch) {
    const [, h, m, s] = datetimeMatch;
    if (s !== undefined) {
      return `${h.padStart(2, '0')}:${m}:${s.padStart(2, '0')}`;
    }
    return `${h.padStart(2, '0')}:${m}`;
  }

  return null;
}

/**
 * Parse punch type from various formats
 */
function parsePunchType(value: string): 'IN' | 'OUT' {
  const upper = value.toUpperCase().trim();
  if (['OUT', 'O', 'EXIT', 'CHECKOUT', 'CHECK-OUT', 'CHECK OUT', '1'].includes(upper)) {
    return 'OUT';
  }
  // Default to IN
  return 'IN';
}

/**
 * Calculate monthly attendance summary
 */
export function calculateMonthlyAttendanceSummary(
  dailyRecords: DailyAttendanceResult[]
): {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  weeklyOffs: number;
  holidays: number;
  missingPunchDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
} {
  const summary = {
    totalDays: dailyRecords.length,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    weeklyOffs: 0,
    holidays: 0,
    missingPunchDays: 0,
    totalWorkingHours: 0,
    totalOvertimeHours: 0,
    totalLateMinutes: 0,
  };

  for (const record of dailyRecords) {
    switch (record.status) {
      case 'PRESENT':
      case 'WORK_FROM_HOME':
      case 'ON_DUTY':
        summary.presentDays++;
        break;
      case 'ABSENT':
        summary.absentDays++;
        break;
      case 'HALF_DAY':
        summary.halfDays++;
        summary.presentDays += 0.5;
        break;
      case 'PAID_LEAVE':
        summary.paidLeaveDays++;
        break;
      case 'UNPAID_LEAVE':
        summary.unpaidLeaveDays++;
        break;
      case 'WEEKLY_OFF':
        summary.weeklyOffs++;
        break;
      case 'HOLIDAY':
        summary.holidays++;
        break;
      case 'MISSING_PUNCH':
        summary.missingPunchDays++;
        break;
    }

    summary.totalWorkingHours += record.workingHours;
    summary.totalOvertimeHours += record.overtimeHours;
    summary.totalLateMinutes += record.lateMinutes;
  }

  // Round totals
  summary.totalWorkingHours = Math.round(summary.totalWorkingHours * 100) / 100;
  summary.totalOvertimeHours = Math.round(summary.totalOvertimeHours * 100) / 100;

  return summary;
}

// ============================================================
// Realtime RS 70 Monthly Performance Matrix Parser
// ============================================================

function isRealtimeRS70Matrix(rows: Record<string, unknown>[]): boolean {
  if (!rows || rows.length === 0) return false;

  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const rowObj = rows[r];
    const rowValues = Object.values(rowObj || {}).map(String);
    const rowText = rowValues.join(' ');

    if (rowText.includes('Report from') || rowText.includes('Monthly Performance Report') || rowText.includes('Arrived TIme') || rowText.includes('EmpCode')) {
      return true;
    }
  }
  return false;
}

function parseRS70MatrixData(
  rows: Record<string, unknown>[],
  validEmployeeIds: Set<string>,
  existingPunches: Set<string>
): ImportResult {
  const success: RawPunch[] = [];
  const errors: ImportValidationError[] = [];
  let duplicates = 0;
  const presetDailyMap = new Map<string, { workingHours: number; overtimeHours: number }>();

  // Convert array of objects to array of arrays for matrix navigation
  const grid: unknown[][] = rows.map(r => {
    if (Array.isArray(r)) return r;
    return Object.values(r);
  });

  let month: number | null = null;
  let year: number | null = null;

  // Extract report period from header
  for (let r = 0; r < Math.min(10, grid.length); r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '');
      if (val.includes('Report from')) {
        const match = val.match(/Report from\s*:\s*(\d{2})-(\d{2})-(\d{4})/i);
        if (match) {
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }
      }
    }
  }

  // Iterate over grid to find EmpCode sections
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i] || [];
    const empCodeCol = row.findIndex(cell => String(cell).trim() === 'EmpCode');

    if (empCodeCol !== -1) {
      const infoRow = grid[i + 1] || [];
      const rawEmpCode = String(infoRow[empCodeCol] || '').trim();
      const empName = String(infoRow[empCodeCol + 2] || '').trim();
      const strippedCode = rawEmpCode.replace(/^0+/, '') || rawEmpCode;
      const mpcFormattedCode = `MPC-${strippedCode.padStart(3, '0')}`;
      const mpcSpaceFormattedCode = `MPC ${strippedCode}`;

      // Match against valid IDs in system
      let matchedEmpId: string | null = null;
      if (validEmployeeIds.has(rawEmpCode)) matchedEmpId = rawEmpCode;
      else if (validEmployeeIds.has(strippedCode)) matchedEmpId = strippedCode;
      else if (validEmployeeIds.has(mpcFormattedCode)) matchedEmpId = mpcFormattedCode;
      else if (validEmployeeIds.has(mpcSpaceFormattedCode)) matchedEmpId = mpcSpaceFormattedCode;
      else {
        // Find partial match
        for (const validId of Array.from(validEmployeeIds)) {
          if (validId.endsWith(strippedCode) || validId.includes(strippedCode)) {
            matchedEmpId = validId;
            break;
          }
        }
      }

      if (!matchedEmpId) {
        // Fallback to mpcFormattedCode for auto-registration during import
        matchedEmpId = mpcFormattedCode;
      }

      // Build dynamic dayMap (colIndex -> dayNum) and find Arrived Time / Dept.Time rows
      const dayMap = new Map<number, string>();
      let arrivedRow: unknown[] | null = null;
      let deptRow: unknown[] | null = null;
      let workingHrsRow: unknown[] | null = null;
      let otHrsRow: unknown[] | null = null;

      for (let offset = 2; offset <= 10; offset++) {
        const checkRow = grid[i + offset] || [];
        const labelCell = String(checkRow[1] || checkRow[0] || '').trim();

        if (!arrivedRow && labelCell.includes('Arrived')) {
          arrivedRow = checkRow;
        } else if (!deptRow && labelCell.includes('Dept.Time')) {
          deptRow = checkRow;
        } else if (!workingHrsRow && (labelCell.includes('Working') || labelCell.includes('WorkHrs'))) {
          workingHrsRow = checkRow;
        } else if (!otHrsRow && (labelCell.includes('O.Time') || labelCell.includes('OvTim'))) {
          otHrsRow = checkRow;
        } else if (dayMap.size === 0) {
          checkRow.forEach((cell, c) => {
            const val = String(cell || '').trim();
            if (/^\d{1,2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 31) {
              dayMap.set(c, val.padStart(2, '0'));
            }
          });
        }
      }

      if (arrivedRow && deptRow && month && year && dayMap.size > 0) {
        dayMap.forEach((dayNum, col) => {
          const arrTime = String(arrivedRow![col] || '').trim();
          const depTime = String(deptRow![col] || '').trim();
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayNum}`;

          // Extract pre-calculated Working Hrs and O.Times Hrs directly from sheet row
          if (workingHrsRow) {
            const rawWh = String(workingHrsRow[col] || '').trim();
            const rawOt = otHrsRow ? String(otHrsRow[col] || '').trim() : '';

            const parseTimeToDecimal = (tStr: string) => {
              if (!tStr || tStr === '00:00' || tStr === '0' || tStr === '—') return 0;
              if (tStr.includes(':')) {
                const parts = tStr.split(':').map(Number);
                const h = parts[0] || 0;
                const m = parts[1] || 0;
                return Math.round((h + m / 100) * 100) / 100;
              }
              const num = Number(tStr);
              return isNaN(num) ? 0 : num;
            };

            const whVal = parseTimeToDecimal(rawWh);
            const otVal = parseTimeToDecimal(rawOt);

            if (whVal > 0 || otVal > 0) {
              presetDailyMap.set(`${matchedEmpId}_${dateStr}`, {
                workingHours: whVal,
                overtimeHours: otVal,
              });
            }
          }

          // Parse IN Punch
          if (arrTime && arrTime.includes(':')) {
            const parsedTime = parseTime(arrTime);
            if (parsedTime) {
              const key = `${matchedEmpId}_${dateStr}_${parsedTime}`;
              if (!existingPunches.has(key)) {
                existingPunches.add(key);
                success.push({
                  employeeId: matchedEmpId,
                  biometricId: rawEmpCode,
                  employeeName: empName,
                  date: dateStr,
                  time: parsedTime,
                  punchType: 'IN',
                });
              } else {
                duplicates++;
              }
            }
          }

          // Parse OUT Punch
          if (depTime && depTime.includes(':')) {
            const parsedTime = parseTime(depTime);
            if (parsedTime) {
              const key = `${matchedEmpId}_${dateStr}_${parsedTime}`;
              if (!existingPunches.has(key)) {
                existingPunches.add(key);
                success.push({
                  employeeId: matchedEmpId,
                  biometricId: rawEmpCode,
                  employeeName: empName,
                  date: dateStr,
                  time: parsedTime,
                  punchType: 'OUT',
                });
              } else {
                duplicates++;
              }
            }
          }
        });
      }
    }
  }

  return {
    success,
    errors,
    duplicates,
    totalRows: grid.length,
    presetDailyMap,
  };
}
