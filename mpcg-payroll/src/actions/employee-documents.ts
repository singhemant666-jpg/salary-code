'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import {
  isS3Configured,
  uploadEmployeeDocumentToS3,
  deleteEmployeeDocumentFromS3,
  deleteFileFromS3,
} from '@/lib/s3';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ============================================================
// GET EMPLOYEE DOCUMENTS
// ============================================================

export async function getEmployeeDocuments(employeeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { uploadedAt: 'desc' },
  });

  return docs;
}

// ============================================================
// UPLOAD EMPLOYEE DOCUMENT (AWS S3 ONLY)
// ============================================================

export async function uploadEmployeeDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };
  if (!hasPermission(session.user, 'employees.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const employeeId = formData.get('employeeId') as string;
  const docType = formData.get('docType') as string;
  const notes = formData.get('notes') as string | null;
  const file = formData.get('file') as File | null;

  if (!employeeId || !docType || !file) {
    return { success: false, error: 'Missing required fields' };
  }

  // Validate doc type
  const docTypeDef = DOCUMENT_TYPES.find((d) => d.value === docType);
  if (!docTypeDef) {
    return { success: false, error: 'Invalid document type' };
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'File type not allowed. Accepted: PDF, JPG, PNG, DOCX' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File size exceeds 5MB limit' };
  }

  // Fetch employee details to format clean S3 Key
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { employeeId: true, name: true },
  });
  const empCode = employee?.employeeId || employeeId;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${safeName}`;
  const s3Key = `employee-documents/${empCode}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let savedLocation = s3Key;

    if (isS3Configured()) {
      // Primary: Save directly and ONLY to AWS S3
      const s3Res = await uploadEmployeeDocumentToS3(s3Key, buffer, file.type);
      if (!s3Res.success) {
        throw new Error(s3Res.error || 'Failed to upload document to AWS S3');
      }
      savedLocation = s3Key;
    } else {
      // Local fallback for offline/development environment without AWS credentials
      const uploadDir = path.join(process.cwd(), 'employee-documents', employeeId);
      fs.mkdirSync(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, fileName);
      fs.writeFileSync(localFilePath, buffer);
      savedLocation = localFilePath;
    }

    // Save record to DB
    await prisma.employeeDocument.create({
      data: {
        employeeId,
        docType,
        label: docTypeDef.label,
        fileName: file.name,
        filePath: savedLocation,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: session.user.name || session.user.email || 'Unknown',
        notes: notes || null,
      },
    });

    revalidatePath(`/dashboard/employees/${employeeId}`);
    return { success: true, s3Key: isS3Configured() ? s3Key : undefined };
  } catch (err: any) {
    console.error('[EmployeeDocuments] Upload error:', err);
    return { success: false, error: err.message || 'Upload failed' };
  }
}

// ============================================================
// DELETE EMPLOYEE DOCUMENT
// ============================================================

export async function deleteEmployeeDocument(docId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };
  if (!hasPermission(session.user, 'employees.edit')) {
    return { success: false, error: 'Permission denied' };
  }

  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc) return { success: false, error: 'Document not found' };

  // 1. Delete from S3 if it's an S3 key or S3 is configured
  if (doc.filePath.startsWith('employee-documents/') || isS3Configured()) {
    const s3Key = doc.filePath.startsWith('employee-documents/')
      ? doc.filePath
      : `employee-documents/${doc.employeeId}/${path.basename(doc.filePath)}`;
    try {
      await deleteFileFromS3(s3Key);
    } catch (s3Err) {
      console.warn('[S3] Failed to delete document from S3:', s3Err);
    }
  }

  // 2. Delete file from local disk if it was saved on disk
  try {
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
  } catch {
    // ignore
  }

  await prisma.employeeDocument.delete({ where: { id: docId } });

  revalidatePath(`/dashboard/employees/${doc.employeeId}`);
  return { success: true };
}
