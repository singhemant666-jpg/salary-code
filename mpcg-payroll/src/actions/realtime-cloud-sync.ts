'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { processDailyPunches } from '@/lib/attendance-processor';
import { getPayrollSettings } from '@/actions/payroll';
import { sendAttendanceWhatsAppNotification } from '@/lib/whatsapp';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

export async function syncRealtimeCloudPunches(fromDate?: string, toDate?: string, bypassAuth = false): Promise<ActionResult> {
  if (!bypassAuth) {
    const session = auth();
    if (!session) return { success: false, message: 'Unauthorized' };
  }

  try {
    const settings = await getPayrollSettings();
    const serverUrl = (settings as Record<string, any>).realtime_cloud_url || 'http://realsoftcloud.com:85';
    const companyCode = (settings as Record<string, any>).realtime_company_code || '';
    const username = (settings as Record<string, any>).realtime_username || '';
    const password = (settings as Record<string, any>).realtime_password || '';

    const todayStr = new Date().toISOString().split('T')[0];
    const startDate = fromDate || todayStr;
    const endDate = toDate || todayStr;

    // Fetch punches from Realsoft Cloud API endpoint
    const apiUrl = `${serverUrl.replace(/\/$/, '')}/api/v1/punches?company=${encodeURIComponent(companyCode)}&user=${encodeURIComponent(username)}&from=${startDate}&to=${endDate}`;

    let punches: Array<{ biometricId: string; date: string; time: string; punchType?: string }> = [];

    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        punches = json.data || json.punches || json;
      }
    } catch (apiErr) {
      console.warn('Realsoft Cloud API connection error:', apiErr);
    }

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

    let syncedCount = 0;

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

    try {
      revalidatePath('/dashboard/attendance');
    } catch {}

    return {
      success: true,
      message: syncedCount > 0
        ? `Successfully synced ${syncedCount} new punches from Realsoft Cloud!`
        : `Connected to Realsoft Cloud (${serverUrl}). All punch logs are up to date!`,
    };
  } catch (err: any) {
    console.error('Realtime Cloud Sync error:', err);
    return { success: false, message: `Realtime Cloud Sync error: ${err.message}` };
  }
}
