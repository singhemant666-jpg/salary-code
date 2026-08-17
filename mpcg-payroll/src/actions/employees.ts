'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/types';

// ============================================================
// Validation Schemas
// ============================================================

const employeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  biometricId: z.string().min(1, 'Biometric ID is required'),
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  panNumber: z.string().optional(),
  address: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  branch: z.string().optional(),
  reportingManager: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolderName: z.string().optional(),
  // Shift & Attendance
  standardWorkingHours: z.number().min(1).max(24).default(8),
  // Salary structure
  basicSalary: z.number().min(0, 'Basic salary must be positive'),
  hra: z.number().min(0).default(0),
  conveyance: z.number().min(0).default(0),
  otherAllowance: z.number().min(0).default(0),
  incentiveEligible: z.boolean().default(false),
  overtimeEligible: z.boolean().default(false),
});

// ============================================================
// Create Employee
// ============================================================

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const raw = Object.fromEntries(formData.entries());
  
  const parsed = employeeSchema.safeParse({
    ...raw,
    standardWorkingHours: parseFloat(raw.standardWorkingHours as string) || 8,
    basicSalary: parseFloat(raw.basicSalary as string) || 0,
    hra: parseFloat(raw.hra as string) || 0,
    conveyance: parseFloat(raw.conveyance as string) || 0,
    otherAllowance: parseFloat(raw.otherAllowance as string) || 0,
    incentiveEligible: raw.incentiveEligible === 'true',
    overtimeEligible: raw.overtimeEligible === 'true',
  });

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    parsed.error.issues.forEach(issue => {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });
    return { success: false, message: 'Validation failed', errors };
  }

  const data = parsed.data;

  // Check unique employee ID
  const existingEmpId = await prisma.employee.findUnique({
    where: { employeeId: data.employeeId },
  });
  if (existingEmpId) {
    return { success: false, message: `Employee ID "${data.employeeId}" already exists` };
  }

  // Check unique biometric ID
  const existingBioId = await prisma.employee.findUnique({
    where: { biometricId: data.biometricId },
  });
  if (existingBioId) {
    return { success: false, message: `Biometric ID "${data.biometricId}" is already assigned to ${existingBioId.name}` };
  }

  try {
    const employee = await prisma.$transaction(async (tx: Record<string, any>) => {
      const emp = await tx.employee.create({
        data: {
          employeeId: data.employeeId,
          biometricId: data.biometricId,
          name: data.name,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          mobile: data.mobile || null,
          email: data.email || null,
          panNumber: data.panNumber || null,
          address: data.address || null,
          designation: data.designation || null,
          department: data.department || null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
          employmentType: data.employmentType || 'FULL_TIME',
          branch: data.branch || null,
          reportingManager: data.reportingManager || null,
          standardWorkingHours: data.standardWorkingHours,
          bankName: data.bankName || null,
          accountNumber: data.accountNumber || null,
          ifscCode: data.ifscCode || null,
          accountHolderName: data.accountHolderName || null,
        },
      });

      await tx.employeeSalaryStructure.create({
        data: {
          employeeId: emp.id,
          basicSalary: data.basicSalary,
          hra: data.hra,
          conveyance: data.conveyance,
          otherAllowance: data.otherAllowance,
          incentiveEligible: data.incentiveEligible,
          overtimeEligible: data.overtimeEligible,
          effectiveDate: new Date(),
          isActive: true,
        },
      });

      return emp;
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CREATE',
      entity: 'Employee',
      entityId: employee.id,
      newValue: { employeeId: data.employeeId, name: data.name },
    });

    revalidatePath('/dashboard/employees');
    return { success: true, message: `Employee "${data.name}" created successfully` };
  } catch (error) {
    console.error('Create employee error:', error);
    return { success: false, message: 'Failed to create employee' };
  }
}

// ============================================================
// Get Employees
// ============================================================

export async function getEmployees(params?: {
  search?: string;
  status?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}) {
  const { search = '', status = '', department = '', page = 1, pageSize = 20 } = params || {};

  const where: Record<string, unknown> = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { employeeId: { contains: search } },
      { biometricId: { contains: search } },
      { designation: { contains: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (department) {
    where.department = department;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: where as never,
      include: {
        salaryStructures: {
          where: { isActive: true },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where: where as never }),
  ]);

  return {
    data: employees,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// Get Single Employee
// ============================================================

export async function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      salaryStructures: {
        orderBy: { effectiveDate: 'desc' },
      },
      monthlyPayrolls: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      },
    },
  });
}

// ============================================================
// Update Employee
// ============================================================

export async function updateEmployee(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const raw = Object.fromEntries(formData.entries());

  try {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Employee not found' };

    // Check biometric ID uniqueness (exclude current employee)
    if (raw.biometricId && raw.biometricId !== existing.biometricId) {
      const dupBio = await prisma.employee.findUnique({
        where: { biometricId: raw.biometricId as string },
      });
      if (dupBio) {
        return { success: false, message: `Biometric ID "${raw.biometricId}" is already assigned to ${dupBio.name}` };
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name: raw.name as string || existing.name,
        biometricId: raw.biometricId as string || existing.biometricId,
        dateOfBirth: raw.dateOfBirth && typeof raw.dateOfBirth === 'string' && raw.dateOfBirth.trim() !== '' ? new Date(raw.dateOfBirth) : null,
        gender: (raw.gender as 'MALE' | 'FEMALE' | 'OTHER') || null,
        mobile: (raw.mobile as string) || null,
        email: (raw.email as string) || null,
        panNumber: (raw.panNumber as string) || null,
        address: (raw.address as string) || null,
        designation: (raw.designation as string) || null,
        department: (raw.department as string) || null,
        joiningDate: raw.joiningDate && typeof raw.joiningDate === 'string' && raw.joiningDate.trim() !== '' ? new Date(raw.joiningDate) : null,
        employmentType: (raw.employmentType as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN') || 'FULL_TIME',
        branch: (raw.branch as string) || null,
        reportingManager: (raw.reportingManager as string) || null,
        standardWorkingHours: raw.standardWorkingHours ? parseFloat(raw.standardWorkingHours as string) : existing.standardWorkingHours,
        bankName: (raw.bankName as string) || null,
        accountNumber: (raw.accountNumber as string) || null,
        ifscCode: (raw.ifscCode as string) || null,
        accountHolderName: (raw.accountHolderName as string) || null,
      },
    });

    // Update salary structure if changed
    const basicSalary = parseFloat(raw.basicSalary as string);
    if (!isNaN(basicSalary)) {
      await prisma.employeeSalaryStructure.updateMany({
        where: { employeeId: id, isActive: true },
        data: { isActive: false },
      });
      
      await prisma.employeeSalaryStructure.create({
        data: {
          employeeId: id,
          basicSalary: basicSalary,
          hra: parseFloat(raw.hra as string) || 0,
          conveyance: parseFloat(raw.conveyance as string) || 0,
          otherAllowance: parseFloat(raw.otherAllowance as string) || 0,
          incentiveEligible: raw.incentiveEligible === 'true',
          overtimeEligible: raw.overtimeEligible === 'true',
          effectiveDate: new Date(),
          isActive: true,
        },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: employee.name },
    });

    revalidatePath('/dashboard/employees');
    revalidatePath(`/dashboard/employees/${id}`);
    return { success: true, message: `Employee "${employee.name}" updated successfully` };
  } catch (error: any) {
    console.error('Update employee error:', error);
    return { success: false, message: error?.message || 'Failed to update employee' };
  }
}

// ============================================================
// Toggle Employee Status
// ============================================================

export async function toggleEmployeeStatus(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return { success: false, message: 'Employee not found' };

  const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  await prisma.employee.update({
    where: { id },
    data: { status: newStatus },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name,
    action: 'UPDATE',
    entity: 'Employee',
    entityId: id,
    oldValue: { status: employee.status },
    newValue: { status: newStatus },
    reason: `Status changed to ${newStatus}`,
  });

  revalidatePath('/dashboard/employees');
  return { success: true, message: `Employee status changed to ${newStatus}` };
}

// ============================================================
// Get Departments (for filter dropdown)
// ============================================================

export async function getDepartments(): Promise<string[]> {
  const departments = await prisma.employee.findMany({
    select: { department: true },
    distinct: ['department'],
    where: { department: { not: null } },
  });
  return departments.map((d: { department: string | null }) => d.department).filter(Boolean) as string[];
}

// ============================================================
// Delete Employee
// ============================================================

export async function deleteEmployee(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return { success: false, message: 'Employee not found' };

    await prisma.employee.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'DELETE',
      entity: 'Employee',
      entityId: id,
      oldValue: { name: employee.name, employeeId: employee.employeeId },
    });

    revalidatePath('/dashboard/employees');
    return { success: true, message: `Employee "${employee.name}" deleted` };
  } catch (error) {
    console.error('Delete employee error:', error);
    return { success: false, message: 'Failed to delete employee' };
  }
}

// ============================================================
// Clear Sample Employees (MPC-001 to MPC-005)
// ============================================================

export async function clearSampleEmployees(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const sampleIds = ['MPC-001', 'MPC-002', 'MPC-003', 'MPC-004', 'MPC-005'];
    const result = await prisma.employee.deleteMany({
      where: { employeeId: { in: sampleIds } },
    });

    revalidatePath('/dashboard/employees');
    return { success: true, message: `Removed ${result.count} sample employees` };
  } catch (error) {
    console.error('Clear sample employees error:', error);
    return { success: false, message: 'Failed to remove sample employees' };
  }
}

// ============================================================
// Delete ALL Employees & Attendance Data
// ============================================================

export async function deleteAllEmployees(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.salarySlip.deleteMany();
    await prisma.monthlyPayroll.deleteMany();
    await prisma.attendanceDaily.deleteMany();
    await prisma.attendanceRaw.deleteMany();
    await prisma.leave.deleteMany();
    await prisma.employeeAdvance.deleteMany();
    await prisma.employeeSalaryStructure.deleteMany();
    const result = await prisma.employee.deleteMany();

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'DELETE',
      entity: 'AllEmployees',
      reason: 'User wiped all employee database records',
    });

    revalidatePath('/dashboard/employees');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard');
    return { success: true, message: `Successfully wiped ${result.count} employees and all attendance data` };
  } catch (error) {
    console.error('Delete all employees error:', error);
    return { success: false, message: 'Failed to clear database' };
  }
}
