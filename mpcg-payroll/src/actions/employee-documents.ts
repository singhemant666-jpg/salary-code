'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { DOCUMENT_TYPES } from '@/lib/document-types';
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
// UPLOAD EMPLOYEE DOCUMENT
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

  // Save file to disk
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${safeName}`;
  const uploadDir = path.join(process.cwd(), 'employee-documents', employeeId);

  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Save record to DB
    await prisma.employeeDocument.create({
      data: {
        employeeId,
        docType,
        label: docTypeDef.label,
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: session.user.name || session.user.email || 'Unknown',
        notes: notes || null,
      },
    });

    revalidatePath(`/dashboard/employees/${employeeId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Upload error:', err);
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

  // Delete file from disk (ignore errors if not found)
  try {
    fs.unlinkSync(doc.filePath);
  } catch {
    // ignore
  }

  await prisma.employeeDocument.delete({ where: { id: docId } });

  revalidatePath(`/dashboard/employees/${doc.employeeId}`);
  return { success: true };
}
