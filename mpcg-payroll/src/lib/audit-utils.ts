/**
 * Audit Log Formatting & Presentation Utilities
 * Translates programmatic keys, booleans, and values into clean, human-friendly English.
 */

export const FIELD_NAME_MAP: Record<string, string> = {
  // Employee Profile & Policy Settings
  suddenLeavePenalty: 'Sudden Leave Penalty',
  holdSalaryOnJoining: 'Hold Salary on Joining',
  heldSalaryBalance: 'Held Salary Balance',
  holdSalaryStatus: 'Hold Salary Status',
  holdSalaryReleasedAt: 'Hold Salary Release Date',
  holdSalaryReleaseNotes: 'Hold Salary Release Notes',
  strictLateRule: 'Strict Late Rule (3rd+ late)',
  sandwichRule: 'Sandwich Rule',
  missingPunchPenalty: 'Missing Punch Penalty',
  openingPaidLeavesUsed: 'Opening Paid Leaves Used',
  lateThresholdMinutes: 'Late Grace Threshold (Mins)',
  paidLeaveBalance: 'Paid Leave Balance',
  monthlyAllowedPaidLeaves: 'Monthly Allowed Paid Leaves',
  standardWorkingHours: 'Standard Working Hours',
  halfDayThreshold: 'Half-Day Threshold (Hours)',
  overtimeAfterHours: 'Overtime Threshold (Hours)',
  pfOptOut: 'PF Exemption',
  esiOptOut: 'ESI Exemption',
  ptOptOut: 'PT Exemption',

  // Salary & Deductions
  basicSalary: 'Basic Salary',
  grossSalary: 'Gross Salary',
  netSalary: 'Net Salary',
  earnedSalary: 'Earned Basic Salary',
  hra: 'HRA',
  specialAllowance: 'Special Allowance',
  bonus: 'Bonus',
  incentiveAmount: 'Incentive / Bonus',
  loanDeduction: 'Loan Recovery Deduction',
  advanceDeduction: 'Salary Advance Deducted',
  pfDeduction: 'PF Deduction',
  esiDeduction: 'ESI Deduction',
  professionalTax: 'Prof. Tax (PT)',
  holdSalaryDeduction: 'Hold Salary Deducted',
  holdSalaryReleaseAmount: 'Hold Salary Released',
  shortHoursDeduction: 'Short Hours Deduction',
  latePenaltyDeduction: 'Late Penalty Deduction',
  suddenLeaveDeduction: 'Sudden Leave Penalty',
  halfDayDeduction: 'Half Day Deduction',
  otherDeductions: 'Other Deductions',

  // TDS Settings
  tdsPercentage: 'TDS %',
  tdsEnabled: 'TDS Deductions',
  tdsMode: 'TDS Mode',
  tdsAmount: 'TDS Amount',

  // Waivers
  waiveLatePenaltyDeduction: 'Waive Late Penalty',
  waiveSuddenLeaveDeduction: 'Waive Sudden Leave',
  waiveShortHoursDeduction: 'Waive Short Hours',
  waiveHalfDayDeduction: 'Waive Half Day',
  waiveLopDeduction: 'Waive LOP Deduction',
  waivePtDeduction: 'Waive Professional Tax',
  waiveMissingPunchDeduction: 'Waive Missing Punch',

  // Attendance Metrics
  presentDays: 'Present Days',
  absentDays: 'Absent Days',
  paidLeaves: 'Paid Leaves',
  halfDays: 'Half Days',
  lateDays: 'Late Days',
  lopDays: 'Loss of Pay (LOP) Days',
  suddenLeaves: 'Sudden Leaves',
  shortHoursCount: 'Short Hours Count',
  missingPunches: 'Missing Punch Count',
  overtimeHours: 'Overtime Hours',
  overtimeEligible: 'OT Eligible',
  overtimeRate: 'OT Hourly Rate',

  // Shift & Dates
  shiftStartTime: 'Shift Start Time',
  shiftEndTime: 'Shift End Time',
  effectiveDate: 'Effective Date',
  joiningDate: 'Joining Date',
  exitDate: 'Exit / Resignation Date',
  dateOfBirth: 'Date of Birth',

  // General & Personal
  name: 'Employee Name',
  employeeId: 'Employee ID',
  biometricId: 'Biometric Machine ID',
  deviceUserId: 'Biometric Device User ID',
  isActive: 'Active Status',
  status: 'Status',
  department: 'Department',
  designation: 'Designation',
  mobile: 'Mobile Number',
  email: 'Email Address',
  address: 'Address',
  gender: 'Gender',
  employmentType: 'Employment Type',
  branch: 'Branch Location',
  reportingManager: 'Reporting Manager',

  // Banking & Tax IDs
  bankName: 'Bank Name',
  accountNumber: 'Bank Account Number',
  bankAccountNumber: 'Bank Account Number',
  ifscCode: 'Bank IFSC Code',
  bankIfscCode: 'Bank IFSC Code',
  accountHolderName: 'Account Holder Name',
  panNumber: 'PAN Number',
  aadhaarNumber: 'Aadhaar Number',
  uanNumber: 'UAN / PF Number',
  esiNumber: 'ESI Number',
  salaryType: 'Salary Type',
  paymentMode: 'Payment Mode',
  remarks: 'Remarks',
};

/**
 * Convert any camelCase or snake_case key into a clear human-readable title
 */
export function humanizeFieldName(key: string): string {
  if (FIELD_NAME_MAP[key]) return FIELD_NAME_MAP[key];
  const spaced = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Format raw database values into clean, human-friendly presentation text
 */
export function formatValueForDisplay(val: any, key?: string, oldVal?: any): string {
  // If historical log recorded null for a boolean toggle (e.g. waiveLatePenaltyDeduction: false -> null)
  if ((val === null || val === undefined) && (oldVal === false || oldVal === true)) {
    return oldVal === false ? 'Waived' : 'Disabled';
  }

  if (val === undefined) return 'Not Set';
  if (val === null) {
    if (key && (key.startsWith('waive') || key.includes('Rule') || key.includes('Enabled'))) {
      return 'Waived';
    }
    return 'None';
  }

  // Boolean values
  if (typeof val === 'boolean') {
    if (key && key.startsWith('waive')) {
      return val ? 'Waived' : 'Standard (Not Waived)';
    }
    if (key === 'isActive') {
      return val ? 'Active' : 'Inactive';
    }
    return val ? 'Enabled' : 'Disabled';
  }

  // Numbers & currencies
  if (typeof val === 'number') {
    const currencyFields = ['salary', 'amount', 'deduction', 'incentive', 'bonus', 'rate', 'tax', 'advance', 'balance'];
    const isCurrency = key && currencyFields.some((f) => key.toLowerCase().includes(f));
    if (
      isCurrency &&
      !key.toLowerCase().includes('percentage') &&
      !key.toLowerCase().includes('hours') &&
      !key.toLowerCase().includes('days') &&
      !key.toLowerCase().includes('count') &&
      !key.toLowerCase().includes('minutes')
    ) {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    if (key && (key.includes('percentage') || key.includes('Percentage'))) {
      return `${val}%`;
    }
    if (key && (key.includes('days') || key.includes('Days'))) {
      return `${val} ${val === 1 ? 'day' : 'days'}`;
    }
    if (key && (key.includes('hours') || key.includes('Hours'))) {
      return `${val} hrs`;
    }
    if (key && (key.includes('Minutes') || key.includes('minutes'))) {
      return `${val} mins`;
    }
    return val.toLocaleString('en-IN');
  }

  // Objects
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }

  const str = String(val).trim();
  if (!str) return 'Empty';
  return str;
}

/**
 * Format audit reason string to replace raw camelCase field names with human English words.
 * Example:
 * "Updated DINGORE AJAY LAXMAN (MPC-164): suddenLeavePenalty"
 * -> "Updated DINGORE AJAY LAXMAN (MPC-164): Sudden Leave Penalty"
 */
export function formatReasonText(reason: string | null): string {
  if (!reason) return '';

  let formatted = reason;

  // Replace boolean true/false phrases like "suddenLeavePenalty (false → true)"
  formatted = formatted
    .replace(/\bfalse\b/g, 'Disabled')
    .replace(/\btrue\b/g, 'Enabled');

  // Replace known field keys
  for (const [rawKey, humanLabel] of Object.entries(FIELD_NAME_MAP)) {
    const regex = new RegExp(`\\b${rawKey}\\b`, 'g');
    formatted = formatted.replace(regex, humanLabel);
  }

  // Replace any remaining camelCase words that look like fields
  formatted = formatted.replace(/\b([a-z]+[A-Z][a-zA-Z0-9]*)\b/g, (match) => {
    return humanizeFieldName(match);
  });

  return formatted;
}
