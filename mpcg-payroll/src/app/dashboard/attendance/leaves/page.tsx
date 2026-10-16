import { prisma } from '@/lib/prisma';
import LeavesClient, { type LeaveItem } from './LeavesClient';

export default async function LeavesPage() {
  const rawLeaves = await prisma.leave.findMany({
    include: {
      employee: { select: { employeeId: true, name: true, department: true, mobile: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 250,
  });

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, employeeId: true, department: true },
    orderBy: { name: 'asc' },
  });

  const plainLeaves: LeaveItem[] = rawLeaves.map((leave) => ({
    id: leave.id,
    employeeId: leave.employeeId,
    status: leave.status,
    leaveType: leave.leaveType,
    isHalfDay: Boolean(leave.isHalfDay),
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
    },
  }));

  return <LeavesClient initialLeaves={plainLeaves} employees={employees} />;
}

