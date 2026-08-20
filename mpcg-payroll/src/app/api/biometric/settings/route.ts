import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API to fetch all settings in key-value format for client-side forms
 * GET /api/biometric/settings
 */
export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.payrollSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Failed to fetch settings API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
