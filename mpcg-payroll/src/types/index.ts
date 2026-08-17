// ============================================================
// Shared TypeScript Types
// ============================================================

export interface PageProps {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard stats
export interface PayrollDashboardStats {
  totalEmployees: number;
  processedEmployees: number;
  pendingEmployees: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  totalIncentives: number;
  totalOvertime: number;
  totalLOP: number;
  totalAdvances: number;
}

// Employee with relations
export interface EmployeeWithSalary {
  id: string;
  employeeId: string;
  biometricId: string;
  name: string;
  designation: string | null;
  department: string | null;
  status: string;
  salaryStructures: {
    basicSalary: number;
    hra: number;
    conveyance: number;
    otherAllowance: number;
    incentiveEligible: boolean;
    overtimeEligible: boolean;
    effectiveDate: Date;
  }[];
}

// Payroll summary row
export interface PayrollSummaryRow {
  id: string;
  employeeId: string;
  employeeName: string;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  status: string;
}

// Settings map
export interface PayrollSettings {
  standard_working_hours: number;
  half_day_threshold: number;
  late_threshold_minutes: number;
  overtime_after_hours: number;
  shift_start_time: string;
  shift_end_time: string;
  weekly_off_days: number[];
  lop_calculation_method: 'calendar' | 'fixed30';
  lop_based_on: 'gross' | 'basic' | 'basic_hra';
  overtime_rate_per_hour: number;
  company_name: string;
  company_address: string;
}

export const DEFAULT_SETTINGS: PayrollSettings = {
  standard_working_hours: 8,
  half_day_threshold: 4,
  late_threshold_minutes: 15,
  overtime_after_hours: 8,
  shift_start_time: '09:00',
  shift_end_time: '18:00',
  weekly_off_days: [0], // Sunday
  lop_calculation_method: 'calendar',
  lop_based_on: 'gross',
  overtime_rate_per_hour: 100,
  company_name: 'MY PAIN CLINIC GLOBAL',
  company_address: '',
};
