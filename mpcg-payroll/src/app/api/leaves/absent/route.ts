import { NextRequest } from 'next/server';
import { handleAbsentEmployeesRequest, OPTIONS as corsOptions } from '@/app/api/external/absent-employees/route';

export const OPTIONS = corsOptions;

export async function GET(req: NextRequest) {
  return handleAbsentEmployeesRequest(req);
}
