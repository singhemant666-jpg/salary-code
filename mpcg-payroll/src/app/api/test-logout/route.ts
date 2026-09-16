import { NextRequest, NextResponse } from 'next/server';
import { sendAttendanceWhatsAppNotification } from '@/lib/whatsapp';

/**
 * Dedicated Endpoint to Test Logout WhatsApp Notification
 * Accepts GET or POST request
 * Usage: GET or POST /api/test-logout?mobile=9876543210
 */
export async function GET(req: NextRequest) {
  return handleTest(req);
}

export async function POST(req: NextRequest) {
  return handleTest(req);
}

async function handleTest(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  let mobile = searchParams.get('mobile') || searchParams.get('phone') || '';

  if (!mobile && req.method === 'POST') {
    try {
      const body = await req.json();
      mobile = body.mobile || body.phone || body.EmpCode || body.empCode || '';
    } catch {}
  }

  if (!mobile) {
    return NextResponse.json({
      error: 'Please pass a target mobile number. Example: /api/test-logout?mobile=9876543210',
      usage: 'GET or POST /api/test-logout?mobile=9876543210'
    }, { status: 400 });
  }

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const result = await sendAttendanceWhatsAppNotification({
    employeeName: 'Test Employee (Logout Test)',
    mobile,
    type: 'LOGOUT',
    dateStr: todayStr,
    timeStr,
    workingHours: 9.00,
    companyName: 'MY PAIN CLINIC GLOBAL',
  });

  return NextResponse.json({
    status: result.success ? 'SUCCESS' : 'FAILED',
    message: result.message,
    sentTo: mobile,
    type: 'LOGOUT',
    details: result
  });
}
