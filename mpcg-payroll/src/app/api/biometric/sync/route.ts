import { NextRequest, NextResponse } from 'next/server';
import { syncRealtimeCloudPunches } from '@/actions/realtime-cloud-sync';

/**
 * REST endpoint to trigger Realtime Cloud Sync from a scheduled cron task
 * GET /api/biometric/sync
 */
export async function GET(req: NextRequest) {
  try {
    console.log('=== AUTOMATED REALTIME CLOUD SYNC TRIGGERED ===');
    
    // We pass dates if provided in query params, otherwise it syncs today's punches
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;

    // Simulate standard session authorization context or authenticate via simple token
    const token = searchParams.get('token');
    const secret = process.env.AUTH_SECRET || 'mpcg-payroll-secret-key-change-in-production-2026';
    
    if (token !== secret) {
      // Allow internal local requests without token
      const host = req.headers.get('host') || '';
      if (!host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('192.168.')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await syncRealtimeCloudPunches(fromDate, toDate, true);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Automated Realtime Cloud Sync Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
