import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isS3Configured, getFileBufferFromS3 } from '@/lib/s3';
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

  let fileBuffer: Buffer | null = null;

  // 1. Fetch from AWS S3 if stored as an S3 key or if S3 is configured
  const isS3Key = doc.filePath.startsWith('employee-documents/') || !path.isAbsolute(doc.filePath);
  if (isS3Key || isS3Configured()) {
    const s3Key = doc.filePath.startsWith('employee-documents/')
      ? doc.filePath
      : `employee-documents/${doc.employeeId}/${path.basename(doc.filePath)}`;

    try {
      fileBuffer = await getFileBufferFromS3(s3Key);
    } catch (s3Err) {
      console.warn('[S3] Failed to retrieve document from S3:', s3Err);
    }
  }

  // 2. Fallback to local disk (for documents uploaded before S3 migration or during local dev)
  if (!fileBuffer) {
    const uploadsRoot = path.join(process.cwd(), 'employee-documents');
    const baseFileName = path.basename(doc.filePath.replace(/\\/g, '/'));
    const normalizedCandidate = path.join(uploadsRoot, doc.employeeId, baseFileName);
    const targetPath = fs.existsSync(normalizedCandidate)
      ? normalizedCandidate
      : (fs.existsSync(doc.filePath) ? doc.filePath : null);

    if (targetPath) {
      const resolvedPath = path.resolve(targetPath);
      if (resolvedPath.startsWith(uploadsRoot) || resolvedPath.startsWith(process.cwd())) {
        try {
          fileBuffer = fs.readFileSync(resolvedPath);
        } catch {
          fileBuffer = null;
        }
      }
    }
  }

  if (!fileBuffer) {
    return new NextResponse('Document file not found in AWS S3 or storage', { status: 404 });
  }

  // Determine content disposition — inline for images/pdf, attachment for others
  const inlineTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const disposition = inlineTypes.includes(doc.mimeType)
    ? `inline; filename="${doc.fileName}"`
    : `attachment; filename="${doc.fileName}"`;

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': disposition,
      'Content-Length': String(fileBuffer.length),
      'Cache-Control': 'private, no-cache',
    },
  });
}
