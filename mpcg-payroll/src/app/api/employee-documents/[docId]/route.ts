import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { docId } = await params;

  // Fetch doc from DB
  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Security: resolve and verify path stays within employee-documents dir
  const uploadsRoot = path.join(process.cwd(), 'employee-documents');
  const baseFileName = path.basename(doc.filePath.replace(/\\/g, '/'));
  const normalizedCandidate = path.join(uploadsRoot, doc.employeeId, baseFileName);
  const targetPath = fs.existsSync(normalizedCandidate)
    ? normalizedCandidate
    : (fs.existsSync(doc.filePath) ? doc.filePath : null);

  if (!targetPath) {
    return new NextResponse('File not found on disk', { status: 404 });
  }

  const resolvedPath = path.resolve(targetPath);
  if (!resolvedPath.startsWith(uploadsRoot) && !resolvedPath.startsWith(process.cwd())) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  const ext = path.extname(doc.fileName).toLowerCase();

  // Determine content disposition — inline for images/pdf, attachment for others
  const inlineTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const disposition = inlineTypes.includes(doc.mimeType)
    ? `inline; filename="${doc.fileName}"`
    : `attachment; filename="${doc.fileName}"`;

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': disposition,
      'Content-Length': String(fileBuffer.length),
      'Cache-Control': 'private, no-cache',
    },
  });
}

