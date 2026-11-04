import { NextResponse } from 'next/server';
import { ensureDatabaseSchemaSynced } from '@/lib/db-auto-migrate';
import { isS3Configured, getS3BucketName } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDatabaseSchemaSynced();
    return NextResponse.json({
      success: true,
      message: 'Database schema successfully verified and synchronized with latest migrations!',
      timestamp: new Date().toISOString(),
      s3: {
        configured: isS3Configured(),
        bucketName: getS3BucketName() || 'Not configured (fallback to local disk)',
        region: process.env.AWS_REGION || 'ap-south-1',
      },
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
