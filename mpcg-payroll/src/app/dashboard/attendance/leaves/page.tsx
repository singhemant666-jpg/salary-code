export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import LeavesClient, { type LeaveItem } from './LeavesClient';

export default async function LeavesPage() {
  // Fetch clinical skills via direct raw SQL for complete runtime safety
  const skillsMap = new Map<string, string | null>();
  try {
    const skillsRows = await prisma.$queryRaw<Array<{ employeeId: string; clinicalSkills: string | null }>>`SELECT employeeId, clinicalSkills FROM employees`;
    skillsRows.forEach((r) => skillsMap.set(r.employeeId, r.clinicalSkills));
  } catch {
    // Ignore if not present
  }

  const rawLeaves = await prisma.leave.findMany({
    include: {
      employee: {
        select: {
          employeeId: true,
          name: true,
          department: true,
          mobile: true,
          designation: true,
          shiftStartTime: true,
          shiftEndTime: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 250,
  });

  const rawEmployees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      employeeId: true,
      department: true,
      designation: true,
      shiftStartTime: true,
      shiftEndTime: true,
      mobile: true,
    },
    orderBy: { name: 'asc' },
  });

  const employees = rawEmployees.map((emp) => ({
    ...emp,
    clinicalSkills: skillsMap.get(emp.employeeId) ?? (emp as any).clinicalSkills ?? null,
  }));

  const plainLeaves: LeaveItem[] = rawLeaves.map((leave) => ({
    id: leave.id,
    employeeId: leave.employeeId,
    status: leave.status,
    leaveType: leave.leaveType,
    isHalfDay: Boolean(leave.isHalfDay),
    isSuddenLeave: Boolean((leave as any).isSuddenLeave || leave.reason?.includes('[SUDDEN LEAVE]')),
    halfDayTime: leave.halfDayTime || null,
    reason: leave.reason,
    approvedBy: leave.approvedBy,
    mobileNumber: leave.mobileNumber,
    createdAt: leave.createdAt.toISOString(),
    fromDateStr: leave.fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    toDateStr: leave.toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    fromDateRaw: leave.fromDate.toISOString().split('T')[0],
    toDateRaw: leave.toDate.toISOString().split('T')[0],
    employee: {
      name: leave.employee.name,
      employeeId: leave.employee.employeeId,
      department: leave.employee.department,
      mobile: leave.employee.mobile,
      designation: (leave.employee as any).designation || null,
      shiftStartTime: (leave.employee as any).shiftStartTime || '09:00',
      shiftEndTime: (leave.employee as any).shiftEndTime || '18:00',
      clinicalSkills: skillsMap.get(leave.employee.employeeId) ?? (leave.employee as any).clinicalSkills ?? null,
    },
  }));

  return <LeavesClient initialLeaves={plainLeaves} employees={employees} />;
}

