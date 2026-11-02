import { handlers } from '@/lib/auth';
import { NextRequest } from 'next/server';

function normalizeRequest(req: NextRequest): NextRequest {
  const incomingProto = req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'http';
  const forwardedProto = req.headers.get('x-forwarded-proto') || incomingProto;
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host || 'localhost:3000';

  const newHeaders = new Headers(req.headers);
  newHeaders.set('host', forwardedHost);
  newHeaders.set('x-forwarded-host', forwardedHost);
  newHeaders.set('x-forwarded-proto', forwardedProto);

  const parsed = new URL(req.url);
  parsed.protocol = forwardedProto.endsWith(':') ? forwardedProto : `${forwardedProto}:`;
  parsed.host = forwardedHost;
  const fixedUrl = parsed.toString();

  const init: any = {
    headers: newHeaders,
    method: req.method,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }

  return new NextRequest(fixedUrl, init);
}

export const GET = (req: NextRequest) => handlers.GET(normalizeRequest(req));
export const POST = (req: NextRequest) => handlers.POST(normalizeRequest(req));
