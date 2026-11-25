import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Enable CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

/**
 * Handle OPTIONS preflight request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Validate API Key or Bearer Token
 */
function isAuthorized(req: NextRequest): boolean {
  const url = new URL(req.url);
  const queryKey = url.searchParams.get('api_key') || url.searchParams.get('token') || url.searchParams.get('key');
  const headerKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  const providedKey = queryKey || headerKey || bearerKey;

  const validKeys = [
    process.env.EXTERNAL_API_KEY,
    process.env.AUTH_SECRET,
    'mpcg_leaves_api_key_2026',
    'mpcg_api_key_2026_leaves',
    'mpcg_external_secret_2026',
  ].filter(Boolean);

  if (providedKey && validKeys.includes(providedKey)) {
    return true;
  }

  // Allow local development calls without token
  const host = req.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }

  return false;
}

/**
 * GET /api/external/absent-employees
 * or /api/leaves/absent
 *
 * Query Params:
 * - date: "YYYY-MM-DD" (defaults to today in IST Asia/Kolkata)
 * - from: "YYYY-MM-DD" (optional date range start)
 * - to: "YYYY-MM-DD" (optional date range end)
 * - department: filter by department name (e.g. "Physiotherapy")
 * - branch: filter by branch name
 * - status: "APPROVED" (default), "PENDING", or "ALL"
 * - include_attendance: "true" (default) or "false" (whether to check unpunched/absent daily records)
 * - api_key: string (or pass header x-api-key)
 */
export async function handleAbsentEmployeesRequest(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key. Provide ?api_key=... in URL, or x-api-key header, or Bearer token.',
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);

    // Default to today's date in Indian Standard Time (IST)
    const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // "YYYY-MM-DD"
    const singleDateParam = searchParams.get('date');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const departmentParam = searchParams.get('department')?.trim();
    const branchParam = searchParams.get('branch')?.trim();
    const statusParam = (searchParams.get('status') || 'APPROVED').toUpperCase();
    const includeAttendance = searchParams.get('include_attendance') !== 'false';

    // Determine query date range
    let startDateStr = todayIstStr;
    let endDateStr = todayIstStr;
    let isRangeQuery = false;

    if (fromParam && toParam) {
      startDateStr = fromParam;
      endDateStr = toParam;
      isRangeQuery = true;
    } else if (singleDateParam) {
      if (singleDateParam.toLowerCase() === 'today') {
        startDateStr = todayIstStr;
        endDateStr = todayIstStr;
      } else {
        startDateStr = singleDateParam;
        endDateStr = singleDateParam;
      }
    }

    const startUtc = new Date(`${startDateStr}T00:00:00.000Z`);
    const endUtc = new Date(`${endDateStr}T23:59:59.999Z`);

    if (isNaN(startUtc.getTime()) || isNaN(endUtc.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format',
          message: 'Please use YYYY-MM-DD format (e.g. ?date=2026-11-25 or ?from=2026-11-01&to=2026-11-30)',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch Leave Records
    const leaveWhereClause: any = {
      fromDate: { lte: new Date(`${endDateStr}T00:00:00.000Z`) },
      toDate: { gte: new Date(`${startDateStr}T00:00:00.000Z`) },
    };

    if (statusParam !== 'ALL') {
      leaveWhereClause.status = statusParam as any; // e.g. "APPROVED"
    }

    if (departmentParam) {
      leaveWhereClause.employee = {
        department: { contains: departmentParam },
      };
    }

    if (branchParam) {
      leaveWhereClause.employee = {
        ...(leaveWhereClause.employee || {}),
        branch: { contains: branchParam },
      };
    }

    const leaves = await prisma.leave.findMany({
      where: leaveWhereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            biometricId: true,
            name: true,
            department: true,
            designation: true,
            branch: true,
            mobile: true,
            shiftStartTime: true,
            shiftEndTime: true,
            status: true,
          },
        },
      },
      orderBy: [{ fromDate: 'asc' }, { employee: { name: 'asc' } }],
    });

    // Employee map to avoid duplicates
    const employeeAbsenceMap = new Map<string, any>();

    for (const l of leaves) {
      const emp = l.employee;
      if (!emp) continue;

      const fromIso = l.fromDate.toISOString().split('T')[0];
      const toIso = l.toDate.toISOString().split('T')[0];

      // Calculate leave duration in days
      const diffMs = l.toDate.getTime() - l.fromDate.getTime();
      const durationDays = l.isHalfDay ? 0.5 : Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      employeeAbsenceMap.set(emp.employeeId, {
        employeeId: emp.employeeId,
        biometricId: emp.biometricId,
        name: emp.name,
        department: emp.department || 'General',
        designation: emp.designation || 'Staff',
        branch: emp.branch || 'Head Office',
        mobile: emp.mobile || null,
        shift: {
          startTime: emp.shiftStartTime || '09:00',
          endTime: emp.shiftEndTime || '18:00',
        },
        absenceType: l.isHalfDay ? 'HALF_DAY_LEAVE' : 'APPROVED_LEAVE',
        status: l.status,
        leaveDetails: {
          leaveId: l.id,
          leaveType: l.leaveType,
          isHalfDay: l.isHalfDay,
          halfDayType: l.halfDayType || null,
          halfDayTime: l.halfDayTime || null,
          fromDate: fromIso,
          toDate: toIso,
          durationDays,
          reason: l.reason || null,
          approvedBy: l.approvedBy || 'Management',
        },
      });
    }

    // 2. If single date query and includeAttendance is true, check Daily Attendance records
    if (!isRangeQuery && includeAttendance) {
      const targetDateUtc = new Date(`${startDateStr}T00:00:00.000Z`);

      const attendanceWhereClause: any = {
        date: targetDateUtc,
        status: { in: ['ABSENT', 'PAID_LEAVE', 'UNPAID_LEAVE'] },
      };

      if (departmentParam) {
        attendanceWhereClause.employee = {
          department: { contains: departmentParam },
        };
      }

      if (branchParam) {
        attendanceWhereClause.employee = {
          ...(attendanceWhereClause.employee || {}),
          branch: { contains: branchParam },
        };
      }

      const dailyAbsences = await prisma.attendanceDaily.findMany({
        where: attendanceWhereClause,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              biometricId: true,
              name: true,
              department: true,
              designation: true,
              branch: true,
              mobile: true,
              shiftStartTime: true,
              shiftEndTime: true,
              status: true,
            },
          },
        },
      });

      for (const da of dailyAbsences) {
        const emp = da.employee;
        if (!emp || employeeAbsenceMap.has(emp.employeeId)) continue;

        employeeAbsenceMap.set(emp.employeeId, {
          employeeId: emp.employeeId,
          biometricId: emp.biometricId,
          name: emp.name,
          department: emp.department || 'General',
          designation: emp.designation || 'Staff',
          branch: emp.branch || 'Head Office',
          mobile: emp.mobile || null,
          shift: {
            startTime: emp.shiftStartTime || '09:00',
            endTime: emp.shiftEndTime || '18:00',
          },
          absenceType: 'UNMARKED_ABSENT',
          status: da.status,
          leaveDetails: null,
          attendanceRecord: {
            date: startDateStr,
            status: da.status,
            firstIn: da.firstIn,
            lastOut: da.lastOut,
            workingHours: da.workingHours ? Number(da.workingHours) : 0,
            remarks: da.remarks || 'No punch recorded / marked absent',
          },
        });
      }
    }

    const absentList = Array.from(employeeAbsenceMap.values());

    const approvedLeavesCount = absentList.filter(
      (e) => e.absenceType === 'APPROVED_LEAVE' || e.absenceType === 'HALF_DAY_LEAVE'
    ).length;
    const unmarkedAbsencesCount = absentList.filter((e) => e.absenceType === 'UNMARKED_ABSENT').length;
    const halfDayCount = absentList.filter((e) => e.absenceType === 'HALF_DAY_LEAVE').length;

    return NextResponse.json(
      {
        success: true,
        query: {
          type: isRangeQuery ? 'DATE_RANGE' : 'SINGLE_DATE',
          date: isRangeQuery ? undefined : startDateStr,
          from: isRangeQuery ? startDateStr : undefined,
          to: isRangeQuery ? endDateStr : undefined,
          department: departmentParam || 'ALL',
          branch: branchParam || 'ALL',
          status: statusParam,
        },
        timezone: 'Asia/Kolkata (IST)',
        totalAbsent: absentList.length,
        summary: {
          approvedLeaves: approvedLeavesCount,
          halfDayLeaves: halfDayCount,
          unmarkedAbsences: unmarkedAbsencesCount,
        },
        data: absentList,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error('Error in absent employees API:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: err.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleAbsentEmployeesRequest(req);
}
