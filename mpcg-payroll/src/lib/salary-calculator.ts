// ============================================================
// Salary Calculator — Pure Functions
// ============================================================
// No database dependency. All inputs are passed as arguments.
// Uses standard JavaScript number arithmetic (sufficient precision
// for Indian salary calculations up to ₹99 Crore).

import { getDaysInMonth } from './currency-utils';

// ============================================================
// Types
// ============================================================

export interface SalaryStructure {
  basicSalary: number;
  hra: number;
  conveyance: number;
  otherAllowance: number;
}

export interface PayrollInput {
  salaryStructure: SalaryStructure;
  month: number;       // 1-12
  year: number;
  totalDays: number;   // Total days in month
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  weeklyOffs: number;
  holidays: number;
  overtimeHours: number;
  totalWorkingHours?: number;
  standardWorkingHours?: number;
  
  // Additional earnings
  incentiveAmount: number;
  bonusAmount: number;
  commissionAmount: number;
  
  // Deductions
  advanceDeduction: number;
  loanDeduction: number;
  otherDeduction: number;
  pfDeduction: number;
  
  // Settings
  lopCalculationMethod: 'calendar' | 'fixed30';
  overtimeRatePerHour: number;
  lopBasedOn: 'gross' | 'basic' | 'basic_hra'; // What salary base to use for LOP
  suddenLeavePenalty?: boolean;
  unpaidLeaveDaysWithLetter?: number;
  missingPunchDays?: number;
}

export interface PayrollResult {
  // Attendance
  totalDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lopDays: number;
  weeklyOffs: number;
  holidays: number;
  paidDays: number;
  shortWorkingHours: number;

  // Earnings
  basicSalary: number;
  hra: number;
  conveyance: number;
  otherAllowance: number;
  incentiveAmount: number;
  bonusAmount: number;
  overtimeAmount: number;
  commissionAmount: number;
  grossSalary: number;

  // Deductions
  lopDeduction: number;
  shortHoursDeduction: number;
  advanceDeduction: number;
  loanDeduction: number;
  otherDeduction: number;
  pfDeduction: number;
  totalDeduction: number;

  // Net
  netSalary: number;
}

// ============================================================
// Core Calculations
// ============================================================

/**
 * Calculate LOP (Loss of Pay) deduction
 */
export function calculateLOP(
  monthlySalaryBase: number,
  lopDays: number,
  method: 'calendar' | 'fixed30',
  month: number,
  year: number,
  suddenLeavePenalty: boolean = true,
  unpaidLeaveDaysWithLetter: number = 0
): number {
  if (lopDays <= 0) return 0;

  const divisor = 30;

  let effectiveLopDays = lopDays;

  if (suddenLeavePenalty) {
    const totalLop = Math.ceil(lopDays);
    const lopWithLetter = unpaidLeaveDaysWithLetter || 0;
    
    let penaltyDays = 0;
    let letterCountUsed = 0;

    for (let dayNum = 1; dayNum <= totalLop; dayNum++) {
      const dayWeight = (dayNum === totalLop && lopDays % 1 !== 0) ? (lopDays % 1) : 1;

      if (dayNum === 1) {
        // 1st day always deducts 1 day of salary
        penaltyDays += 1 * dayWeight;
      } else if (dayNum === 2) {
        // 2nd day: check if we have a letter in leave management
        if (letterCountUsed < lopWithLetter) {
          penaltyDays += 1 * dayWeight; // Has letter -> deducts 1 day
          letterCountUsed += dayWeight;
        } else {
          penaltyDays += 2 * dayWeight; // No letter -> deducts 2 days
        }
      } else {
        // 3rd day onwards always deducts 2 days
        penaltyDays += 2 * dayWeight;
      }
    }
    effectiveLopDays = penaltyDays;
  }

  return round2((monthlySalaryBase / divisor) * effectiveLopDays);
}

/**
 * Calculate overtime pay
 */
export function calculateOvertime(
  overtimeHours: number,
  ratePerHour: number
): number {
  if (overtimeHours <= 0 || ratePerHour <= 0) return 0;
  return round2(overtimeHours * ratePerHour);
}

/**
 * Calculate LOP days from attendance
 * LOP = Total days - (Present + Paid Leave + Weekly Off + Holiday)
 */
export function calculateLOPDays(
  totalDays: number,
  presentDays: number,
  paidLeaveDays: number,
  weeklyOffs: number,
  holidays: number,
  missingPunchDays: number = 0
): number {
  const accountedDays = presentDays + paidLeaveDays + weeklyOffs + holidays + missingPunchDays;
  const lopDays = totalDays - accountedDays;
  return Math.max(0, lopDays);
}

/**
 * Get the salary base for LOP calculation
 */
function getLOPBase(
  structure: SalaryStructure,
  basedOn: 'gross' | 'basic' | 'basic_hra'
): number {
  switch (basedOn) {
    case 'basic':
      return structure.basicSalary;
    case 'basic_hra':
      return structure.basicSalary + structure.hra;
    case 'gross':
    default:
      return structure.basicSalary + structure.hra + structure.conveyance + structure.otherAllowance;
  }
}

/**
 * Main payroll calculation function
 */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const { salaryStructure } = input;
  const missingPunchDays = input.missingPunchDays || 0;

  // Calculate LOP days
  const lopDays = calculateLOPDays(
    input.totalDays,
    input.presentDays,
    input.paidLeaveDays,
    input.weeklyOffs,
    input.holidays,
    missingPunchDays
  );

  // Paid days = Total - LOP - Unpaid Leave
  const paidDays = input.totalDays - lopDays;

  // Earnings
  const basicSalary = salaryStructure.basicSalary;
  const hra = salaryStructure.hra;
  const conveyance = salaryStructure.conveyance;
  const otherAllowance = salaryStructure.otherAllowance;
  const incentiveAmount = input.incentiveAmount;
  const bonusAmount = input.bonusAmount;
  const commissionAmount = input.commissionAmount;
  const overtimeAmount = calculateOvertime(input.overtimeHours, input.overtimeRatePerHour);

  const grossSalary = round2(
    basicSalary + hra + conveyance + otherAllowance +
    incentiveAmount + bonusAmount + overtimeAmount + commissionAmount
  );

  // Deductions
  const lopBase = getLOPBase(salaryStructure, input.lopBasedOn);
  const lopDeduction = calculateLOP(
    lopBase,
    lopDays,
    input.lopCalculationMethod,
    input.month,
    input.year,
    input.suddenLeavePenalty ?? true,
    input.unpaidLeaveDaysWithLetter ?? 0
  );

  // Short Working Hours (Under-time) Calculation on Present Days
  const standardHours = input.standardWorkingHours || 9;
  const totalActualWorkingHours = input.totalWorkingHours || 0;
  const expectedPresentHours = round2(input.presentDays * standardHours);
  
  let shortWorkingHours = 0;
  let shortHoursDeduction = 0;

  if (expectedPresentHours > totalActualWorkingHours && totalActualWorkingHours > 0) {
    shortWorkingHours = round2(expectedPresentHours - totalActualWorkingHours);
    const hourlyRate = basicSalary / (30 * standardHours);
    shortHoursDeduction = round2(shortWorkingHours * hourlyRate);
  }

  const advanceDeduction = input.advanceDeduction;
  const loanDeduction = input.loanDeduction;
  const otherDeduction = input.otherDeduction;
  const pfDeduction = input.pfDeduction;

  const totalDeduction = round2(
    lopDeduction + shortHoursDeduction + advanceDeduction + loanDeduction + otherDeduction + pfDeduction
  );

  // Net Salary
  const netSalary = round2(grossSalary - totalDeduction);

  return {
    totalDays: input.totalDays,
    presentDays: input.presentDays,
    paidLeaveDays: input.paidLeaveDays,
    unpaidLeaveDays: input.unpaidLeaveDays,
    lopDays,
    weeklyOffs: input.weeklyOffs,
    holidays: input.holidays,
    paidDays,
    shortWorkingHours,

    basicSalary,
    hra,
    conveyance,
    otherAllowance,
    incentiveAmount,
    bonusAmount,
    overtimeAmount,
    commissionAmount,
    grossSalary,

    lopDeduction,
    shortHoursDeduction,
    advanceDeduction,
    loanDeduction,
    otherDeduction,
    pfDeduction,
    totalDeduction,

    netSalary,
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Round to 2 decimal places
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validate payroll calculation against expected values
 * Useful for admin review
 */
export function validatePayrollResult(result: PayrollResult): string[] {
  const errors: string[] = [];

  if (result.netSalary < 0) {
    errors.push('Net salary is negative. Total deductions exceed gross salary.');
  }

  if (result.lopDays > result.totalDays) {
    errors.push('LOP days exceed total days in month.');
  }

  if (result.grossSalary <= 0) {
    errors.push('Gross salary is zero or negative.');
  }

  const expectedGross = round2(
    result.basicSalary + result.hra + result.conveyance + result.otherAllowance +
    result.incentiveAmount + result.bonusAmount + result.overtimeAmount + result.commissionAmount
  );
  if (Math.abs(result.grossSalary - expectedGross) > 0.01) {
    errors.push(`Gross salary mismatch. Expected: ${expectedGross}, Got: ${result.grossSalary}`);
  }

  const expectedDeduction = round2(
    result.lopDeduction + (result.shortHoursDeduction || 0) + result.advanceDeduction + result.loanDeduction +
    result.otherDeduction + result.pfDeduction
  );
  if (Math.abs(result.totalDeduction - expectedDeduction) > 0.01) {
    errors.push(`Total deduction mismatch. Expected: ${expectedDeduction}, Got: ${result.totalDeduction}`);
  }

  return errors;
}
