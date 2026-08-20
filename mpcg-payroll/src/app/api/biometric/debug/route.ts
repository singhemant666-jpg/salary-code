import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

/**
 * Debug endpoint to capture exact raw payloads from Realtime Software.
 * This logs every incoming request's headers, body, query params to a file.
 */

const LOG_FILE = join(process.cwd(), 'realtime-debug-log.txt');

export async function GET(req: NextRequest) {
  const entry = `\n=== GET REQUEST @ ${new Date().toLocaleString('en-IN')} ===\nURL: ${req.url}\nHeaders: ${JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)}\nQuery: ${req.nextUrl.search}\n`;
  
  try { appendFileSync(LOG_FILE, entry); } catch {}
  console.log('DEBUG CAPTURE (GET):', entry);
  
  return NextResponse.json({ status: 'DEBUG_CAPTURED', method: 'GET' });
}

export async function POST(req: NextRequest) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {}

  const entry = `\n=== POST REQUEST @ ${new Date().toLocaleString('en-IN')} ===\nURL: ${req.url}\nHeaders: ${JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)}\nContent-Type: ${req.headers.get('content-type')}\nRaw Body:\n${rawBody}\n`;

  try { appendFileSync(LOG_FILE, entry); } catch {}
  console.log('DEBUG CAPTURE (POST):', entry);

  return NextResponse.json({ status: 'DEBUG_CAPTURED', method: 'POST', bodyLength: rawBody.length });
}
