import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAttendanceWhatsAppNotification } from '@/lib/whatsapp';

/**
 * Real-Time Biometric Webhook / Push API Endpoint
 * URL: POST /api/biometric/punch
 *
 * Accepts punches in real-time from ZKTeco ADMS, Essl, Hikvision, Realtime,
 * or custom middleware scripts.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify API Key security (Optional x-api-key header check)
    const apiKey = req.headers.get('x-api-key');
    const secretSetting = await prisma.payrollSetting.findUnique({
      where: { key: 'biometric_api_secret' },
    });
    if (secretSetting && secretSetting.value && secretSetting.value.trim() !== '') {
      if (apiKey !== secretSetting.value.trim()) {
        return NextResponse.json({ error: 'Unauthorized: Invalid x-api-key' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Standardize body into array of punch items
    const rawItems = Array.isArray(body) ? body : [body];
    const results: Array<{ biometricId: string; status: string; whatsappSent: boolean; message?: string }> = [];

    // Fetch all employees for fast biometricId matching
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, biometricId: true, employeeId: true, name: true, mobile: true },
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

    for (const item of rawItems) {
      const bioId = (item.biometricId || item.UserId || item.EnrollNumber || item.employeeId || '').toString().trim();
      if (!bioId) {
        results.push({ biometricId: 'UNKNOWN', status: 'SKIPPED', whatsappSent: false, message: 'Missing biometric ID' });
        continue;
      }

      const strippedId = bioId.replace(/^0+/, '') || bioId;
      const employee = biometricMap.get(bioId) || biometricMap.get(strippedId);

      if (!employee) {
        results.push({ biometricId: bioId, status: 'NOT_FOUND', whatsappSent: false, message: `No active employee found for Biometric ID "${bioId}"` });
        continue;
      }

      // Parse timestamp
      let punchDate: Date;
      let timeStr: string;

      if (item.timestamp) {
        const d = new Date(item.timestamp);
        punchDate = isNaN(d.getTime()) ? new Date() : d;
      } else if (item.date && item.time) {
        punchDate = new Date(`${item.date}T${item.time}`);
        if (isNaN(punchDate.getTime())) punchDate = new Date();
      } else {
        punchDate = new Date();
      }

      const dateOnlyStr = punchDate.toISOString().split('T')[0];
      const hoursStr = String(punchDate.getHours()).padStart(2, '0');
      const minsStr = String(punchDate.getMinutes()).padStart(2, '0');
      const secsStr = String(punchDate.getSeconds()).padStart(2, '0');
      timeStr = item.time || `${hoursStr}:${minsStr}:${secsStr}`;

      const dateUtc = new Date(Date.UTC(
        punchDate.getFullYear(),
        punchDate.getMonth(),
        punchDate.getDate()
      ));

      // Determine punch type (IN / OUT)
      let punchType: 'IN' | 'OUT' = 'IN';
      if (item.punchType === 'OUT' || item.type === 'OUT' || item.state === '1') punchType = 'OUT';

      // 1. Save to AttendanceRaw
      await prisma.attendanceRaw.create({
        data: {
          employeeId: employee.id,
          date: dateUtc,
          time: timeStr,
          punchType,
          source: 'API',
        },
      });

      // 2. Fetch or initialize today's AttendanceDaily
      const existingDaily = await prisma.attendanceDaily.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: dateUtc,
          },
        },
      });

      let isNewLogin = false;
      let isNewLogout = false;
      let firstIn = existingDaily?.firstIn || null;
      let lastOut = existingDaily?.lastOut || null;

      if (!firstIn) {
        firstIn = timeStr;
        isNewLogin = true;
      } else {
        lastOut = timeStr;
        isNewLogout = true;
      }

      // Calculate working hours if both firstIn and lastOut are present
      let workingHours = Number(existingDaily?.workingHours || 0);
      if (firstIn && lastOut) {
        const [h1, m1] = firstIn.split(':').map(Number);
        const [h2, m2] = lastOut.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) {
          workingHours = parseFloat((mins / 60).toFixed(2));
        }
      }

      const status = firstIn ? 'PRESENT' : 'ABSENT';

      await prisma.attendanceDaily.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: dateUtc,
          },
        },
        update: {
          firstIn,
          lastOut,
          workingHours,
          status: status as any,
        },
        create: {
          employeeId: employee.id,
          date: dateUtc,
          firstIn,
          lastOut,
          workingHours,
          status: status as any,
        },
      });

      // 3. TRIGGER INSTANT REAL-TIME WHATSAPP NOTIFICATION
      let whatsappSent = false;
      if (employee.mobile) {
        if (isNewLogin && firstIn) {
          const alertRes = await sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGIN',
            dateStr: dateOnlyStr,
            timeStr: firstIn,
          });
          whatsappSent = alertRes.success;
        } else if (isNewLogout && lastOut) {
          const alertRes = await sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGOUT',
            dateStr: dateOnlyStr,
            timeStr: lastOut,
            workingHours,
          });
          whatsappSent = alertRes.success;
        }
      }

      results.push({
        biometricId: bioId,
        status: 'SUCCESS',
        whatsappSent,
        message: `Punch recorded for ${employee.name} (${timeStr}). WhatsApp ${whatsappSent ? 'sent' : 'skipped/disabled'}.`,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Biometric Realtime Punch API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
