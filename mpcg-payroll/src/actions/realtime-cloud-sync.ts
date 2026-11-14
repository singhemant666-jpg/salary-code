'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getPayrollSettings } from '@/actions/payroll';
import { processAttendanceInternal } from '@/actions/attendance';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Scrapes live punch access data from Realsoft Cloud WebForms portal.
 */
async function scrapeRealsoftCloudPortal(
  portalUrl: string,
  companyCode: string,
  username: string,
  password: string
): Promise<Array<{ biometricId: string; date: string; time: string; punchType: string }>> {
  const cleanBase = portalUrl.replace(/:85\/?$/, '').replace(/\/$/, '');
  const baseUrl = cleanBase.startsWith('http') ? cleanBase : `http://${cleanBase}`;

  // 1. Initial GET to retrieve login form viewstate
  const loginRes = await fetch(`${baseUrl}/default.aspx`, { cache: 'no-store' });
  if (!loginRes.ok) return [];

  const html = await loginRes.text();
  const vsMatch = html.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/);
  const vsgMatch = html.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
  const evMatch = html.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/);
  const initialCookie = loginRes.headers.get('set-cookie');

  const params = new URLSearchParams();
  if (vsMatch) params.append('__VIEWSTATE', vsMatch[1]);
  if (vsgMatch) params.append('__VIEWSTATEGENERATOR', vsgMatch[1]);
  if (evMatch) params.append('__EVENTVALIDATION', evMatch[1]);
  params.append('TextBox1', companyCode);
  params.append('TextBox2', username);
  params.append('TextBox3', password);
  params.append('Button1', 'Log in');

  const postRes = await fetch(`${baseUrl}/default.aspx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(initialCookie ? { Cookie: initialCookie } : {}),
    },
    body: params.toString(),
    redirect: 'manual',
    cache: 'no-store',
  });

  const sessionCookie = postRes.headers.get('set-cookie');
  const allCookies = [initialCookie, sessionCookie]
    .filter(Boolean)
    .map(c => c!.split(';')[0])
    .join('; ');

  // 2. Fetch DailyAccessActivity.aspx with session cookies
  const actRes = await fetch(`${baseUrl}/DailyAccessActivity.aspx`, {
    headers: { Cookie: allCookies },
    cache: 'no-store',
  });
  if (!actRes.ok) return [];
  const actHtml = await actRes.text();

  // 3. Parse GridView1 table rows
  const rows = [...actHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const extractedPunches: Array<{ biometricId: string; date: string; time: string; punchType: string }> = [];

  for (const r of rows) {
    const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    if (cells.length >= 7) {
      const cardNo = cells[1];
      const dateStr = cells[2]; // dd/mm/yyyy
      const inTime = cells[4] && cells[4] !== '&nbsp;' && cells[4].includes(':') ? cells[4] : null;
      const outTime = cells[5] && cells[5] !== '&nbsp;' && cells[5].includes(':') ? cells[5] : null;

      if (cardNo && dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [d, m, y] = parts;
          const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          if (inTime) {
            extractedPunches.push({
              biometricId: cardNo,
              date: isoDate,
              time: inTime,
              punchType: 'IN',
            });
          }
          if (outTime) {
            extractedPunches.push({
              biometricId: cardNo,
              date: isoDate,
              time: outTime,
              punchType: 'OUT',
            });
          }
        }
      }
    }
  }

  return extractedPunches;
}

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
    const serverUrl = (settings as Record<string, any>).realtime_cloud_url || 'http://realsoftcloud.com';
    const companyCode = (settings as Record<string, any>).realtime_company_code || 'MPCGLOBAL';
    const username = (settings as Record<string, any>).realtime_username || 'MPC';
    const password = (settings as Record<string, any>).realtime_password || 'Mpc@123';

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = fromDate || `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = toDate || `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    let punches: Array<{ biometricId: string; date: string; time: string; punchType?: string }> = [];
    let cloudConnected = false;
    let cloudStatusMsg = '';

    if (serverUrl && companyCode && username) {
      // First attempt: Scrape live access punches from Realsoft Cloud WebForms portal
      try {
        const livePunches = await scrapeRealsoftCloudPortal(serverUrl, companyCode, username, password);
        if (livePunches.length > 0) {
          punches = livePunches;
          cloudConnected = true;
        }
      } catch (scrapeErr: any) {
        cloudStatusMsg = `Scrape: ${scrapeErr.message}`;
      }

      // Fallback: If REST API is configured and portal didn't return punches
      if (punches.length === 0) {
        const apiUrl = `${serverUrl.replace(/\/$/, '')}/api/v1/punches?company=${encodeURIComponent(companyCode)}&user=${encodeURIComponent(username)}&from=${startDate}&to=${endDate}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const json = await res.json();
            punches = json.data || json.punches || (Array.isArray(json) ? json : []);
            cloudConnected = true;
          }
        } catch {}
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

      const biometricMap = new Map<string, (typeof employees)[0]>();
      for (const emp of employees) {
        const bio = (emp.biometricId || '').trim();
        const empId = (emp.employeeId || '').trim();
        const strippedBio = bio.replace(/^0+/, '') || bio;
        const strippedEmp = empId.replace(/^0+/, '') || empId;

        if (bio) {
          biometricMap.set(bio, emp);
          biometricMap.set(bio.padStart(8, '0'), emp);
        }
        if (empId) {
          biometricMap.set(empId, emp);
          biometricMap.set(empId.toLowerCase(), emp);
        }
        if (strippedBio) {
          biometricMap.set(strippedBio, emp);
          biometricMap.set(strippedBio.padStart(8, '0'), emp);
          biometricMap.set(`MPC-${strippedBio.padStart(3, '0')}`, emp);
          biometricMap.set(`MPC-${strippedBio}`, emp);
        }
        if (strippedEmp) {
          biometricMap.set(strippedEmp, emp);
          biometricMap.set(`MPC-${strippedEmp.padStart(3, '0')}`, emp);
          biometricMap.set(`MPC-${strippedEmp}`, emp);
        }
      }

      for (const p of punches) {
        const rawId = String(p.biometricId || '').trim();
        const strippedId = rawId.replace(/^0+/, '') || rawId;
        const emp = biometricMap.get(rawId) || biometricMap.get(strippedId) || biometricMap.get(`MPC-${strippedId.padStart(3, '0')}`);

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

    // Process raw attendance into daily attendance for the target month (with full preservation of pre-existing records)
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
        message = `Connected to Realsoft Cloud (all punch logs up to date). Attendance records for ${monthLabel} refreshed successfully!`;
      }
    } else {
      if (syncedCount > 0) {
        message = `Processed ${syncedCount} punches and updated attendance records for ${monthLabel}.`;
      } else {
        message = `Attendance records for ${monthLabel} recalculated successfully! (Cloud status: ${cloudStatusMsg || 'No new device logs'})`;
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
