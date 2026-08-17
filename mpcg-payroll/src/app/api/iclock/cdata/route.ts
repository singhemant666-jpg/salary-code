import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAttendanceWhatsAppNotification } from '@/lib/whatsapp';

/**
 * Realtime RS 70 / ZKTeco Native iClock ADMS Protocol Endpoint
 * Endpoint: GET & POST /iclock/cdata
 *
 * This allows your Realtime RS70 biometric machine to push punches
 * DIRECTLY to your server in real-time over WiFi or Ethernet!
 */

// GET request: Device handshake & heartbeat check
export async function GET(req: NextRequest) {
  return new NextResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// POST request: Real-time punch data pushed by Realtime RS 70
export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    if (!rawText || rawText.trim() === '') {
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // Fetch active employees for matching
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

    // Lines are tab-separated or newline-separated:
    // Format: "174\t2026-08-17 09:15:00\t0\t1..."
    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);

    for (const line of lines) {
      const parts = line.split(/[\t\s]+/);
      if (parts.length < 2) continue;

      const bioId = parts[0].trim();
      const timestampStr = parts[1] && parts[2] ? `${parts[1]} ${parts[2]}` : parts[1];

      const strippedId = bioId.replace(/^0+/, '') || bioId;
      const employee = biometricMap.get(bioId) || biometricMap.get(strippedId);

      if (!employee) {
        console.warn(`Realtime RS70: Employee not found for Biometric ID "${bioId}"`);
        continue;
      }

      const punchDate = new Date(timestampStr);
      const validDate = isNaN(punchDate.getTime()) ? new Date() : punchDate;
      const dateOnlyStr = validDate.toISOString().split('T')[0];

      const hoursStr = String(validDate.getHours()).padStart(2, '0');
      const minsStr = String(validDate.getMinutes()).padStart(2, '0');
      const secsStr = String(validDate.getSeconds()).padStart(2, '0');
      const timeStr = `${hoursStr}:${minsStr}:${secsStr}`;

      const dateUtc = new Date(Date.UTC(
        validDate.getFullYear(),
        validDate.getMonth(),
        validDate.getDate()
      ));

      // 1. Create AttendanceRaw
      await prisma.attendanceRaw.create({
        data: {
          employeeId: employee.id,
          date: dateUtc,
          time: timeStr,
          punchType: 'IN',
          source: 'API',
        },
      });

      // 2. Fetch or update AttendanceDaily
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

      let workingHours = Number(existingDaily?.workingHours || 0);
      if (firstIn && lastOut) {
        const [h1, m1] = firstIn.split(':').map(Number);
        const [h2, m2] = lastOut.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) {
          workingHours = parseFloat((mins / 60).toFixed(2));
        }
      }

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
          status: 'PRESENT',
        },
        create: {
          employeeId: employee.id,
          date: dateUtc,
          firstIn,
          lastOut,
          workingHours,
          status: 'PRESENT',
        },
      });

      // 3. Send Instant WhatsApp Alert!
      if (employee.mobile) {
        if (isNewLogin && firstIn) {
          sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGIN',
            dateStr: dateOnlyStr,
            timeStr: firstIn,
          }).catch(err => console.error('Realtime RS70 WhatsApp Login error:', err));
        } else if (isNewLogout && lastOut) {
          sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGOUT',
            dateStr: dateOnlyStr,
            timeStr: lastOut,
            workingHours,
          }).catch(err => console.error('Realtime RS70 WhatsApp Logout error:', err));
        }
      }
    }

    // Realtime RS70 requires "OK" response to confirm punch received
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: any) {
    console.error('Realtime RS70 iClock API Error:', error);
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}
