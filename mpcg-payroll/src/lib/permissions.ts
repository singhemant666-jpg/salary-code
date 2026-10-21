// ============================================================
// MPCG Payroll & HRMS - Permissions & Role-Based Access Control
// ============================================================

export type PermissionKey =
  // Dashboard
  | 'dashboard.view'
  // Employees
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.salary' // View / Edit Basic Salary, Bank details, Salary structures
  // Attendance
  | 'attendance.view'
  | 'attendance.import'
  | 'attendance.leaves'
  | 'attendance.shifts'
  // Payroll
  | 'payroll.view'
  | 'payroll.calculate'
  | 'payroll.deductions' // Edit deductions, penalties & waivers
  | 'payroll.finalize'   // Approve / Finalize payroll
  // Salary Slips
  | 'salary_slips.view'
  | 'salary_slips.send'  // Send via Email / WhatsApp
  // Reports
  | 'reports.view'
  // Settings
  | 'settings.payroll'
  | 'settings.holidays'
  | 'settings.notifications' // WhatsApp & Email SMTP
  | 'settings.salary_slip_layout'
  // System / Administration
  | 'users.manage'
  | 'audit.view';

export type PermissionCategory =
  | 'Dashboard'
  | 'Employees'
  | 'Attendance'
  | 'Payroll'
  | 'Salary Slips'
  | 'Reports'
  | 'Settings'
  | 'Administration';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: PermissionCategory;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Dashboard
  {
    key: 'dashboard.view',
    label: 'Executive Dashboard',
    description: 'Access main overview, workforce KPIs, live attendance metrics, and payroll summary cards',
    category: 'Dashboard',
  },
  // Employees
  {
    key: 'employees.view',
    label: 'View Employees',
    description: 'View employee directory, profiles, and attendance details',
    category: 'Employees',
  },
  {
    key: 'employees.create',
    label: 'Add Employees',
    description: 'Onboard and add new employee records',
    category: 'Employees',
  },
  {
    key: 'employees.edit',
    label: 'Edit Employees',
    description: 'Update employee designations, contact info, and shift timings',
    category: 'Employees',
  },
  {
    key: 'employees.delete',
    label: 'Delete / Terminate',
    description: 'Deactivate, mark as exited, or remove employees',
    category: 'Employees',
  },
  {
    key: 'employees.salary',
    label: 'Manage Salary & Bank Info',
    description: 'View and edit basic salary, bank accounts, and CTC structures',
    category: 'Employees',
  },

  // Attendance
  {
    key: 'attendance.view',
    label: 'View Attendance',
    description: 'View daily biometric punch logs and monthly attendance summary',
    category: 'Attendance',
  },
  {
    key: 'attendance.import',
    label: 'Import Attendance',
    description: 'Upload and sync biometric machine CSV / punch logs',
    category: 'Attendance',
  },
  {
    key: 'attendance.leaves',
    label: 'Manage Leaves',
    description: 'Review, approve, and reject employee leave applications',
    category: 'Attendance',
  },
  {
    key: 'attendance.shifts',
    label: 'Shift Timing Overrides',
    description: 'Apply custom shift start and end times for specific dates',
    category: 'Attendance',
  },

  // Payroll
  {
    key: 'payroll.view',
    label: 'View Payroll',
    description: 'Access monthly payroll register and salary calculations',
    category: 'Payroll',
  },
  {
    key: 'payroll.calculate',
    label: 'Generate / Calculate Payroll',
    description: 'Trigger monthly payroll calculations and recalculate hours',
    category: 'Payroll',
  },
  {
    key: 'payroll.deductions',
    label: 'Edit Deductions & Waivers',
    description: 'Modify LOP days, waive late/sudden penalties, edit TDS & PT',
    category: 'Payroll',
  },
  {
    key: 'payroll.finalize',
    label: 'Approve & Finalize',
    description: 'Lock monthly payroll and authorize final salary payouts',
    category: 'Payroll',
  },

  // Salary Slips
  {
    key: 'salary_slips.view',
    label: 'View & Download Slips',
    description: 'Preview, download PDF / Word salary slips',
    category: 'Salary Slips',
  },
  {
    key: 'salary_slips.send',
    label: 'Dispatch Salary Slips',
    description: 'Send salary slips directly to employees via Email & WhatsApp',
    category: 'Salary Slips',
  },

  // Reports
  {
    key: 'reports.view',
    label: 'View & Export Reports',
    description: 'Access payroll reports, salary register, and Excel exports',
    category: 'Reports',
  },

  // Settings
  {
    key: 'settings.payroll',
    label: 'Payroll & Policy Settings',
    description: 'Configure standard hours, late grace allowance, sandwich rules',
    category: 'Settings',
  },
  {
    key: 'settings.holidays',
    label: 'Manage Holidays & Offs',
    description: 'Manage company public holidays and weekly off schedules',
    category: 'Settings',
  },
  {
    key: 'settings.notifications',
    label: 'WhatsApp & Email SMTP',
    description: 'Configure Gupshup API keys and SMTP mail server credentials',
    category: 'Settings',
  },
  {
    key: 'settings.salary_slip_layout',
    label: 'Salary Slip Template',
    description: 'Customize salary slip design, headers, and company branding',
    category: 'Settings',
  },

  // Administration
  {
    key: 'users.manage',
    label: 'User & Permission Management',
    description: 'Create and manage system user accounts and assign permissions',
    category: 'Administration',
  },
  {
    key: 'audit.view',
    label: 'Audit Trail',
    description: 'View timestamped system activity logs and security history',
    category: 'Administration',
  },
];

export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, PermissionDefinition[]> = {
  Dashboard: ALL_PERMISSIONS.filter(p => p.category === 'Dashboard'),
  Employees: ALL_PERMISSIONS.filter(p => p.category === 'Employees'),
  Attendance: ALL_PERMISSIONS.filter(p => p.category === 'Attendance'),
  Payroll: ALL_PERMISSIONS.filter(p => p.category === 'Payroll'),
  'Salary Slips': ALL_PERMISSIONS.filter(p => p.category === 'Salary Slips'),
  Reports: ALL_PERMISSIONS.filter(p => p.category === 'Reports'),
  Settings: ALL_PERMISSIONS.filter(p => p.category === 'Settings'),
  Administration: ALL_PERMISSIONS.filter(p => p.category === 'Administration'),
};

/**
 * Default permission presets for user roles
 */
export const ROLE_PRESETS: Record<'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE', PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map(p => p.key),
  HR_ADMIN: [
    'dashboard.view',
    'employees.view',
    'employees.create',
    'employees.edit',
    'attendance.view',
    'attendance.import',
    'attendance.leaves',
    'attendance.shifts',
    'reports.view',
  ],
  ACCOUNTANT: [
    'dashboard.view',
    'employees.view',
    'employees.salary',
    'attendance.view',
    'payroll.view',
    'payroll.calculate',
    'payroll.deductions',
    'payroll.finalize',
    'salary_slips.view',
    'salary_slips.send',
    'reports.view',
  ],
  EMPLOYEE: [],
};

/**
 * Safely parse permissions from database JSON string, array, or fallback to role defaults
 */
export function parsePermissions(raw: any, role?: string): PermissionKey[] {
  if (Array.isArray(raw)) {
    return raw.filter((k): k is PermissionKey => typeof k === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((k): k is PermissionKey => typeof k === 'string');
      }
    } catch {
      return raw.split(',').map(s => s.trim()).filter((k): k is PermissionKey => Boolean(k));
    }
  }
  // Default to role preset
  if (role && role in ROLE_PRESETS) {
    return ROLE_PRESETS[role as keyof typeof ROLE_PRESETS];
  }
  return [];
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: { role?: string; permissions?: any } | null | undefined,
  requiredPermission: PermissionKey
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const permissions = parsePermissions(user.permissions, user.role);
  return permissions.includes(requiredPermission) || (permissions as string[]).includes('*');
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  user: { role?: string; permissions?: any } | null | undefined,
  requiredPermissions: PermissionKey[]
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return requiredPermissions.some(p => hasPermission(user, p));
}
