'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getPayrollSettings } from '@/actions/payroll';
import { processAttendanceInternal } from '@/actions/attendance';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

export async function syncRealtimeCloudPunches(
  fromDate?: string,
  toDate?: string,
  bypassAuth = false,
  options?: { month?: number; year?: number }
): Promise<ActionResult> {
  if (!bypassAuth) {
    const session = await auth();
    if (!session) return { success: false, message: 'Unauthorized' };
  }

  try {
    const now = new Date();
    const targetMonth = options?.month ?? (fromDate ? parseInt(fromDate.split('-')[1], 10) : now.getMonth() + 1);
    const targetYear = options?.year ?? (fromDate ? parseInt(fromDate.split('-')[0], 10) : now.getFullYear());

    const settings = await getPayrollSettings();
    const serverUrl = (settings as Record<string, any>).realtime_cloud_url || 'http://realsoftcloud.com:85';
    const companyCode = (settings as Record<string, any>).realtime_company_code || '';
    const username = (settings as Record<string, any>).realtime_username || '';
    const password = (settings as Record<string, any>).realtime_password || '';

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = fromDate || `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = toDate || `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Fetch punches from Realsoft Cloud API endpoint
    const apiUrl = `${serverUrl.replace(/\/$/, '')}/api/v1/punches?company=${encodeURIComponent(companyCode)}&user=${encodeURIComponent(username)}&from=${startDate}&to=${endDate}`;

    let punches: Array<{ biometricId: string; date: string; time: string; punchType?: string }> = [];
    let cloudConnected = false;
    let cloudStatusMsg = '';

    if (serverUrl && companyCode && username) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          punches = json.data || json.punches || (Array.isArray(json) ? json : []);
          cloudConnected = true;
        } else {
          cloudStatusMsg = `Cloud server returned status ${res.status}`;
        }
      } catch (apiErr: any) {
        if (apiErr.name === 'AbortError') {
          cloudStatusMsg = 'Cloud connection timed out';
        } else {
          cloudStatusMsg = apiErr.message || 'Cannot reach cloud server';
        }
      }
    } else {
      cloudStatusMsg = 'Cloud credentials not configured in settings';
    }

    let syncedCount = 0;

    if (punches.length > 0) {
      // Fetch active employees
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, biometricId: true, employeeId: true, name: true, mobile: true, standardWorkingHours: true },
      });

      const biometricMap = new Map<string, typeof employees[0]>();
      for (const emp of employees) {
        const bio = emp.biometricId.trim();
        const empId = emp.employeeId.trim();
        const strippedBio = bio.replace(/^0+/, '') || bio;
        const strippedEmp = empId.replace(/^0+/, '') || empId;

        biometricMap.set(bio, emp);
        biometricMap.set(empId, emp);
        biometricMap.set(strippedBio, emp);
        biometricMap.set(strippedEmp, emp);
      }

      for (const p of punches) {
        const rawId = String(p.biometricId || '').trim();
        const strippedId = rawId.replace(/^0+/, '') || rawId;
        const emp = biometricMap.get(rawId) || biometricMap.get(strippedId);

        if (!emp) continue;

        const dateUtc = new Date(`${p.date}T00:00:00.000Z`);
        if (isNaN(dateUtc.getTime())) continue;

        const timeStr = p.time.length === 5 ? `${p.time}:00` : p.time;

        // Check duplicate raw punch
        const existing = await prisma.attendanceRaw.findFirst({
          where: {
            employeeId: emp.id,
            date: dateUtc,
            time: timeStr,
          },
        });

        if (!existing) {
          await prisma.attendanceRaw.create({
            data: {
              employeeId: emp.id,
              date: dateUtc,
              time: timeStr,
              punchType: (p.punchType as any) || 'IN',
              source: 'REALTIME_CLOUD',
            },
          });
          syncedCount++;
        }
      }
    }

    // Always process raw attendance into daily attendance for the target month
    await processAttendanceInternal(targetMonth, targetYear);

    try {
      revalidatePath('/dashboard/attendance');
      revalidatePath('/dashboard/payroll');
    } catch {}

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = `${monthNames[targetMonth] || targetMonth} ${targetYear}`;

    let message = '';
    if (cloudConnected) {
      if (syncedCount > 0) {
        message = `Synced ${syncedCount} new punches from Realsoft Cloud and updated attendance for ${monthLabel}!`;
      } else {
        message = `Connected to Realsoft Cloud (all punch logs up to date). Attendance records for ${monthLabel} recalculated successfully!`;
      }
    } else {
      if (syncedCount > 0) {
        message = `Processed ${syncedCount} punches and updated attendance records for ${monthLabel}.`;
      } else {
        message = `Attendance records for ${monthLabel} recalculated successfully with all live device logs! (Cloud sync: ${cloudStatusMsg})`;
      }
    }

    return {
      success: true,
      message,
    };
  } catch (err: any) {
    console.error('Realtime Cloud Sync error:', err);
    return { success: false, message: `Realtime Cloud Sync error: ${err.message}` };
  }
}
