import { NextResponse } from 'next/server';
import { ensureDatabaseSchemaSynced } from '@/lib/db-auto-migrate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDatabaseSchemaSynced();
    return NextResponse.json({
      success: true,
      message: 'Database schema successfully verified and synchronized with latest migrations!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
