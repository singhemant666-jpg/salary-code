'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getPayrollSettings } from '@/actions/payroll';
import { processAttendanceInternal } from '@/actions/attendance';
import { validateImportData } from '@/lib/attendance-processor';
import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

/**
 * Authenticates against Realsoft Cloud WebForms and returns base URL + cookies.
 */
async function loginRealsoftCloud(
  portalUrl: string,
  companyCode: string,
  username: string,
  password: string
): Promise<{ baseUrl: string; cookieHeader: string }> {
  const cleanBase = portalUrl.replace(/:85\/?$/, '').replace(/\/$/, '');
  const baseUrl = cleanBase.startsWith('http') ? cleanBase : `http://${cleanBase}`;

  // 1. Initial GET to retrieve login tokens
  const r1 = await fetch(`${baseUrl}/default.aspx`, { cache: 'no-store' });
  if (!r1.ok) throw new Error(`Cannot reach Realsoft Cloud at ${baseUrl}`);

  const h1 = await r1.text();
  const c1 = (r1.headers as any).getSetCookie?.() || [];

  const vsMatch = h1.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/);
  const vsgMatch = h1.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
  const evMatch = h1.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/);

  const params = new URLSearchParams();
  if (vsMatch) params.append('__VIEWSTATE', vsMatch[1]);
  if (vsgMatch) params.append('__VIEWSTATEGENERATOR', vsgMatch[1]);
  if (evMatch) params.append('__EVENTVALIDATION', evMatch[1]);
  params.append('TextBox1', companyCode);
  params.append('TextBox2', username);
  params.append('TextBox3', password);
  params.append('Button1', 'Log in');

  const r2 = await fetch(`${baseUrl}/default.aspx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': c1.map((c: string) => c.split(';')[0]).join('; '),
    },
    body: params.toString(),
    redirect: 'manual',
    cache: 'no-store',
  });

  const c2 = (r2.headers as any).getSetCookie?.() || [];
  const allCookiesList = [...c1, ...c2];

  // Visit Welcome.aspx to establish AntiXsrfToken & session context
  const r3 = await fetch(`${baseUrl}/Welcome.aspx`, {
    headers: { Cookie: allCookiesList.map((c: string) => c.split(';')[0]).join('; ') },
    redirect: 'manual',
    cache: 'no-store',
  });
  if (r3.status === 302 && r3.headers.get('location')?.includes('AccountUpgradeMessage')) {
    throw new Error('Realsoft Cloud is locked: Registered employees (46) exceed your 45-user subscription tier on realsoftcloud.com. Please renew/upgrade your subscription or contact Realsoft support at +91 7045852888.');
  }
  const c3 = (r3.headers as any).getSetCookie?.() || [];
  allCookiesList.push(...c3);

  const cookieHeader = allCookiesList.map((c: string) => c.split(';')[0]).join('; ');
  return { baseUrl, cookieHeader };
}

/**
 * Connects to Realsoft Cloud and downloads all active employee profiles from EmployeeList.aspx.
 */
export async function fetchRealsoftCloudEmployees(
  portalUrl: string,
  companyCode: string,
  username: string,
  password: string
): Promise<Array<{
  name: string;
  cardNo: string;
  empCode: string;
  department: string | null;
  designation: string | null;
  branch: string | null;
}>> {
  const { baseUrl, cookieHeader } = await loginRealsoftCloud(portalUrl, companyCode, username, password);

  const empListRes = await fetch(`${baseUrl}/EmployeeList.aspx`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!empListRes.ok) throw new Error(`Failed to load EmployeeList.aspx: HTTP ${empListRes.status}`);

  const empHtml = await empListRes.text();
  const trs = [...empHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const cloudEmployees: Array<{
    name: string;
    cardNo: string;
    empCode: string;
    department: string | null;
    designation: string | null;
    branch: string | null;
  }> = [];

  for (const tr of trs) {
    const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    if (tds.length >= 7) {
      const rawName = tds[2] || '';
      const rawCardNo = tds[3] || '';
      const rawEmpCode = tds[4] || '';
      const rawDept = tds[5] || '';
      const rawDesig = tds[6] || '';
      const rawBranch = tds[8] || '';

      if (rawEmpCode && rawEmpCode !== 'EmpCode' && rawEmpCode !== '&nbsp;' && rawName) {
        cloudEmployees.push({
          name: rawName,
          cardNo: rawCardNo || rawEmpCode,
          empCode: rawEmpCode,
          department: rawDept && rawDept !== '-' && rawDept !== '&nbsp;' ? rawDept : null,
          designation: rawDesig && rawDesig !== '-' && rawDesig !== '&nbsp;' ? rawDesig : null,
          branch: rawBranch && rawBranch !== '-' && rawBranch !== '&nbsp;' ? rawBranch : null,
        });
      }
    }
  }

  return cloudEmployees;
}

/**
 * Connects to Realsoft Cloud WebForms portal, downloads the full-month
 * Performance Matrix Report (MnPerformance.xls), and scrapes today's live access punches.
 */
async function fetchRealsoftCloudAttendance(
  portalUrl: string,
  companyCode: string,
  username: string,
  password: string,
  targetMonth: number,
  targetYear: number,
  validIds: Set<string>
): Promise<{
  monthPunches: Array<{ employeeId: string; biometricId?: string; employeeName?: string; date: string; time: string; punchType: string }>;
  presetDailyMap?: Map<string, { workingHours: number; overtimeHours: number }>;
  todayPunches: Array<{ biometricId: string; date: string; time: string; punchType: string }>;
}> {
  const { baseUrl, cookieHeader } = await loginRealsoftCloud(portalUrl, companyCode, username, password);

  // 1. Fetch today's live activity from DailyAccessActivity.aspx
  const todayPunches: Array<{ biometricId: string; date: string; time: string; punchType: string }> = [];
  try {
    const actRes = await fetch(`${baseUrl}/DailyAccessActivity.aspx`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    if (actRes.ok) {
      const actHtml = await actRes.text();
      const rows = [...actHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const r of rows) {
        const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (cells.length >= 7) {
          const cardNo = cells[1];
          const dateStr = cells[2];
          const inTime = cells[4] && cells[4] !== '&nbsp;' && cells[4].includes(':') ? cells[4] : null;
          const outTime = cells[5] && cells[5] !== '&nbsp;' && cells[5].includes(':') ? cells[5] : null;

          if (cardNo && dateStr) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              if (inTime) todayPunches.push({ biometricId: cardNo, date: isoDate, time: inTime, punchType: 'IN' });
              if (outTime) todayPunches.push({ biometricId: cardNo, date: isoDate, time: outTime, punchType: 'OUT' });
            }
          }
        }
      }
    }
  } catch (actErr) {
    console.error('DailyAccessActivity scrape warning:', actErr);
  }

  // 2. Fetch Full Month Performance Report from NewMonthly.aspx
  let monthPunches: Array<{ employeeId: string; biometricId?: string; employeeName?: string; date: string; time: string; punchType: string }> = [];
  let presetDailyMap: Map<string, { workingHours: number; overtimeHours: number }> | undefined;

  try {
    const nmRes = await fetch(`${baseUrl}/NewMonthly.aspx`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    if (nmRes.ok) {
      const nmHtml = await nmRes.text();
      const nmVs = nmHtml.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/)?.[1];
      const nmVsg = nmHtml.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1];
      const nmEv = nmHtml.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/)?.[1];

      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const fromDateFormatted = `01/${String(targetMonth).padStart(2, '0')}/${targetYear}`;
      const toDateFormatted = `${String(daysInMonth).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}/${targetYear}`;

      const nmParams = new URLSearchParams();
      if (nmVs) nmParams.append('__VIEWSTATE', nmVs);
      if (nmVsg) nmParams.append('__VIEWSTATEGENERATOR', nmVsg);
      if (nmEv) nmParams.append('__EVENTVALIDATION', nmEv);
      nmParams.append('ctl00$MainContent$txtdate', fromDateFormatted);
      nmParams.append('ctl00$MainContent$txttodate', toDateFormatted);
      nmParams.append('ctl00$MainContent$CheckBox5', 'on');
      nmParams.append('ctl00$MainContent$Button18formance', 'Performance Report');

      const repRes = await fetch(`${baseUrl}/NewMonthly.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieHeader,
          'Referer': `${baseUrl}/NewMonthly.aspx`,
        },
        body: nmParams.toString(),
        cache: 'no-store',
      });

      if (repRes.ok) {
        const repHtml = await repRes.text();
        const exportMatch = repHtml.match(/"ExportUrlBase":"([^"]+)"/);
        if (exportMatch) {
          const exportUrl = `${baseUrl}${exportMatch[1].replace(/\\u0026/g, '&')}Excel`;
          const fileRes = await fetch(exportUrl, {
            headers: {
              'Cookie': cookieHeader,
              'Referer': `${baseUrl}/NewMonthly.aspx`,
            },
            cache: 'no-store',
          });

          if (fileRes.ok) {
            const buf = Buffer.from(await fileRes.arrayBuffer());
            if (buf.length > 5000) {
              const wb = XLSX.read(buf, { type: 'buffer' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const arrayRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as Record<string, unknown>[];

              // Parse via attendance processor
              const parsed = validateImportData(arrayRows, validIds, new Set());
              monthPunches = parsed.success;
              presetDailyMap = parsed.presetDailyMap;
            }
          }
        }
      }
    }
  } catch (mErr) {
    console.error('Full month report fetch warning:', mErr);
  }

  return { monthPunches, presetDailyMap, todayPunches };
}

/**
 * Synchronizes all employee profiles directly from Realsoft Cloud into the MySQL database.
 * Missing employees are automatically created along with their salary structure, and existing
 * employees are enriched with departments, designations, and branches from the cloud.
 */
export async function syncEmployeesFromRealtimeCloud(bypassAuth = false): Promise<ActionResult> {
  if (!bypassAuth) {
    const session = await auth();
    if (!session) return { success: false, message: 'Unauthorized' };
  }

  try {
    const settings = await getPayrollSettings();
    const serverUrl = (settings as Record<string, any>).realtime_cloud_url || 'http://realsoftcloud.com';
    const companyCode = (settings as Record<string, any>).realtime_company_code || 'MPCGLOBAL';
    const username = (settings as Record<string, any>).realtime_username || 'MPC';
    const password = (settings as Record<string, any>).realtime_password || 'Mpc@123';

    if (!serverUrl || !companyCode || !username) {
      return { success: false, message: 'Realtime Cloud credentials are not configured in Settings.' };
    }

    const cloudEmployees = await fetchRealsoftCloudEmployees(serverUrl, companyCode, username, password);
    if (!cloudEmployees || cloudEmployees.length === 0) {
      return { success: false, message: 'No employee records could be retrieved from Realsoft Cloud.' };
    }

    // Load existing employees to match
    const existingEmployees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        biometricId: true,
        name: true,
        department: true,
        designation: true,
        branch: true,
      },
    });

    const existingMap = new Map<string, (typeof existingEmployees)[0]>();
    for (const emp of existingEmployees) {
      const bio = (emp.biometricId || '').trim();
      const empId = (emp.employeeId || '').trim();
      const strippedBio = bio.replace(/^0+/, '') || bio;
      const strippedEmp = empId.replace(/^0+/, '') || empId;

      existingMap.set(emp.id, emp);
      if (bio) {
        existingMap.set(bio, emp);
        existingMap.set(bio.padStart(8, '0'), emp);
        existingMap.set(bio.padStart(3, '0'), emp);
      }
      if (empId) {
        existingMap.set(empId, emp);
        existingMap.set(empId.toLowerCase(), emp);
      }
      if (strippedBio) {
        existingMap.set(strippedBio, emp);
        existingMap.set(`MPC-${strippedBio.padStart(3, '0')}`, emp);
        existingMap.set(`MPC-${strippedBio}`, emp);
      }
      if (strippedEmp) {
        existingMap.set(strippedEmp, emp);
        existingMap.set(`MPC-${strippedEmp.padStart(3, '0')}`, emp);
        existingMap.set(`MPC-${strippedEmp}`, emp);
      }
    }

    const newEmployeesCreated: Array<{ id: string; name: string; employeeId: string }> = [];
    let updatedCount = 0;

    for (const cloudEmp of cloudEmployees) {
      const rawCode = (cloudEmp.empCode || cloudEmp.cardNo).trim();
      const strippedCode = rawCode.replace(/^0+/, '') || rawCode;
      const formattedEmpId = `MPC-${strippedCode.padStart(3, '0')}`;
      const formattedBioId = rawCode.padStart(8, '0');

      const existing = existingMap.get(rawCode) ||
        existingMap.get(strippedCode) ||
        existingMap.get(formattedEmpId) ||
        existingMap.get(formattedBioId);

      if (!existing) {
        // Auto-register new employee
        try {
          const newEmp = await prisma.employee.create({
            data: {
              employeeId: formattedEmpId,
              biometricId: formattedBioId,
              name: cloudEmp.name.trim(),
              department: cloudEmp.department,
              designation: cloudEmp.designation,
              branch: cloudEmp.branch,
              standardWorkingHours: 9.00,
              status: 'ACTIVE',
            },
          });

          await prisma.employeeSalaryStructure.create({
            data: {
              employeeId: newEmp.id,
              basicSalary: 25000,
              hra: 0,
              conveyance: 0,
              otherAllowance: 0,
              effectiveDate: new Date(),
              isActive: true,
            },
          });

          existingMap.set(newEmp.id, newEmp as any);
          existingMap.set(rawCode, newEmp as any);
          existingMap.set(strippedCode, newEmp as any);
          existingMap.set(formattedEmpId, newEmp as any);
          existingMap.set(formattedBioId, newEmp as any);

          newEmployeesCreated.push({
            id: newEmp.id,
            name: newEmp.name,
            employeeId: newEmp.employeeId,
          });
        } catch (createErr) {
          console.error(`Error creating employee ${formattedEmpId}:`, createErr);
        }
      } else {
        // Enrich existing employee if fields are missing in DB
        const updateData: Record<string, string> = {};
        if (!existing.department && cloudEmp.department) updateData.department = cloudEmp.department;
        if (!existing.designation && cloudEmp.designation) updateData.designation = cloudEmp.designation;
        if (!existing.branch && cloudEmp.branch) updateData.branch = cloudEmp.branch;
        if ((!existing.name || existing.name.startsWith('Employee ')) && cloudEmp.name) updateData.name = cloudEmp.name.trim();

        if (Object.keys(updateData).length > 0) {
          try {
            await prisma.employee.update({
              where: { id: existing.id },
              data: updateData,
            });
            updatedCount++;
          } catch (updateErr) {
            console.error(`Error updating employee ${existing.id}:`, updateErr);
          }
        }
      }
    }

    try {
      revalidatePath('/dashboard/employees');
      revalidatePath('/dashboard/attendance');
      revalidatePath('/dashboard/payroll');
      revalidatePath('/portal');
    } catch {}

    const newNames = newEmployeesCreated.map(e => `${e.name} (${e.employeeId})`).join(', ');
    const message = newEmployeesCreated.length > 0
      ? `Successfully synced with Realtime Cloud! Added ${newEmployeesCreated.length} new employees: ${newNames}. Updated ${updatedCount} profiles. Total cloud employees: ${cloudEmployees.length}.`
      : `Realtime Cloud is fully in sync! All ${cloudEmployees.length} employees are registered. Updated ${updatedCount} profiles with cloud details.`;

    return {
      success: true,
      message,
      data: {
        newCount: newEmployeesCreated.length,
        updatedCount,
        totalCloud: cloudEmployees.length,
        newEmployees: newEmployeesCreated,
      } as any,
    };
  } catch (err: any) {
    console.error('syncEmployeesFromRealtimeCloud error:', err);
    return { success: false, message: `Realtime Cloud employee sync failed: ${err.message}` };
  }
}

/**
 * Synchronizes attendance punches from Realsoft Cloud into raw punches and recalculates daily attendance.
 * If any punch belongs to an unrecorded employee, that employee is automatically created on the fly.
 */
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

    // 1. Prepare employee matching map & valid IDs
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, biometricId: true, employeeId: true, name: true, mobile: true, standardWorkingHours: true },
    });

    const biometricMap = new Map<string, (typeof employees)[0]>();
    const validIds = new Set<string>();

    for (const emp of employees) {
      const bio = (emp.biometricId || '').trim();
      const empId = (emp.employeeId || '').trim();
      const strippedBio = bio.replace(/^0+/, '') || bio;
      const strippedEmp = empId.replace(/^0+/, '') || empId;

      biometricMap.set(emp.id, emp);

      if (bio) {
        biometricMap.set(bio, emp);
        biometricMap.set(bio.padStart(8, '0'), emp);
        biometricMap.set(bio.padStart(3, '0'), emp);
        validIds.add(bio);
        validIds.add(bio.padStart(8, '0'));
        validIds.add(bio.padStart(3, '0'));
      }
      if (empId) {
        biometricMap.set(empId, emp);
        biometricMap.set(empId.toLowerCase(), emp);
        validIds.add(empId);
      }
      if (strippedBio) {
        biometricMap.set(strippedBio, emp);
        biometricMap.set(strippedBio.padStart(8, '0'), emp);
        biometricMap.set(`MPC-${strippedBio.padStart(3, '0')}`, emp);
        biometricMap.set(`MPC-${strippedBio}`, emp);
        validIds.add(strippedBio);
        validIds.add(strippedBio.padStart(8, '0'));
        validIds.add(strippedBio.padStart(3, '0'));
        validIds.add(`MPC-${strippedBio.padStart(3, '0')}`);
      }
      if (strippedEmp) {
        biometricMap.set(strippedEmp, emp);
        biometricMap.set(`MPC-${strippedEmp.padStart(3, '0')}`, emp);
        biometricMap.set(`MPC-${strippedEmp}`, emp);
        validIds.add(strippedEmp);
        validIds.add(`MPC-${strippedEmp.padStart(3, '0')}`);
      }
    }

    let syncedCount = 0;
    let cloudConnected = false;
    let cloudStatusMsg = '';

    if (serverUrl && companyCode && username) {
      try {
        const cloudData = await fetchRealsoftCloudAttendance(
          serverUrl,
          companyCode,
          username,
          password,
          targetMonth,
          targetYear,
          validIds
        );

        cloudConnected = true;

        // Helper to get or auto-register employee on the fly
        const getOrAutoRegister = async (rawCode: string, name?: string) => {
          const stripped = rawCode.replace(/^0+/, '') || rawCode;
          let match = biometricMap.get(rawCode) || biometricMap.get(stripped) || biometricMap.get(`MPC-${stripped.padStart(3, '0')}`);
          if (!match) {
            const formattedEmpId = `MPC-${stripped.padStart(3, '0')}`;
            const formattedBioId = rawCode.padStart(8, '0');
            const empName = (name && name.trim()) || `Employee ${formattedEmpId}`;

            try {
              const newEmp = await prisma.employee.create({
                data: {
                  employeeId: formattedEmpId,
                  biometricId: formattedBioId,
                  name: empName,
                  standardWorkingHours: 9.00,
                  status: 'ACTIVE',
                },
                select: { id: true, biometricId: true, employeeId: true, name: true, mobile: true, standardWorkingHours: true },
              });
              await prisma.employeeSalaryStructure.create({
                data: {
                  employeeId: newEmp.id,
                  basicSalary: 25000,
                  hra: 0,
                  conveyance: 0,
                  otherAllowance: 0,
                  effectiveDate: new Date(),
                  isActive: true,
                },
              });
              match = newEmp;
              biometricMap.set(newEmp.id, newEmp);
              biometricMap.set(rawCode, newEmp);
              biometricMap.set(stripped, newEmp);
              biometricMap.set(formattedEmpId, newEmp);
              biometricMap.set(formattedBioId, newEmp);
            } catch {
              match = (await prisma.employee.findFirst({
                where: { OR: [{ employeeId: formattedEmpId }, { biometricId: formattedBioId }] },
                select: { id: true, biometricId: true, employeeId: true, name: true, mobile: true, standardWorkingHours: true },
              })) as any;
            }
          }
          return match;
        };

        // 1. Process all monthly report punches
        for (const p of cloudData.monthPunches) {
          const rawId = String(p.employeeId || p.biometricId || '').trim();
          const emp = await getOrAutoRegister(rawId, p.employeeName);
          if (!emp) continue;

          const dateUtc = new Date(`${p.date}T00:00:00.000Z`);
          if (isNaN(dateUtc.getTime())) continue;

          const timeStr = p.time.length === 5 ? `${p.time}:00` : p.time;

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

        // 2. Process preset daily map (exact working hours & overtime from performance report)
        if (cloudData.presetDailyMap && cloudData.presetDailyMap.size > 0) {
          for (const [key, preset] of Array.from(cloudData.presetDailyMap.entries())) {
            const [empCode, dateStr] = key.split('_');
            const emp = await getOrAutoRegister(empCode);
            if (!emp) continue;

            const dateUtc = new Date(`${dateStr}T00:00:00.000Z`);
            await prisma.attendanceDaily.upsert({
              where: {
                employeeId_date: {
                  employeeId: emp.id,
                  date: dateUtc,
                },
              },
              update: {
                workingHours: preset.workingHours,
                overtimeHours: preset.overtimeHours,
              },
              create: {
                employeeId: emp.id,
                date: dateUtc,
                workingHours: preset.workingHours,
                overtimeHours: preset.overtimeHours,
                status: 'PRESENT',
              },
            });
          }
        }

        // 3. Process today's live punches from DailyAccessActivity
        for (const p of cloudData.todayPunches) {
          const rawId = String(p.biometricId || '').trim();
          const emp = await getOrAutoRegister(rawId);
          if (!emp) continue;

          const dateUtc = new Date(`${p.date}T00:00:00.000Z`);
          if (isNaN(dateUtc.getTime())) continue;

          const timeStr = p.time.length === 5 ? `${p.time}:00` : p.time;

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
      } catch (cloudErr: any) {
        cloudStatusMsg = cloudErr.message || 'Cannot fetch from Realsoft Cloud';
        console.error('Realsoft Cloud full sync error:', cloudErr);
      }
    } else {
      cloudStatusMsg = 'Cloud credentials not configured in settings';
    }

    // Always process raw attendance into daily attendance for the target month (with full preservation)
    await processAttendanceInternal(targetMonth, targetYear);

    try {
      revalidatePath('/dashboard/employees');
      revalidatePath('/dashboard/attendance');
      revalidatePath('/dashboard/payroll');
    } catch {}

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = `${monthNames[targetMonth] || targetMonth} ${targetYear}`;

    let message = '';
    if (cloudConnected) {
      if (syncedCount > 0) {
        message = `Synced ${syncedCount} attendance logs from Realsoft Cloud across all days of ${monthLabel}! Attendance records updated successfully.`;
      } else {
        message = `Connected to Realsoft Cloud (all days up to date). Attendance records for ${monthLabel} recalculated successfully!`;
      }
    } else {
      message = `Realsoft Cloud sync failed: ${cloudStatusMsg}. Existing attendance records for ${monthLabel} were preserved.`;
    }

    return {
      success: cloudConnected,
      message,
    };
  } catch (err: any) {
    console.error('Realtime Cloud Sync error:', err);
    return { success: false, message: `Realtime Cloud Sync error: ${err.message}` };
  }
}
