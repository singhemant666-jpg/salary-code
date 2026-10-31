'use client';

import { useState, useTransition } from 'react';
import { FileText, Upload, Trash2, Eye, X } from 'lucide-react';
import { DOCUMENT_TYPES, DOC_TYPE_COLORS } from '@/lib/document-types';
import {
  uploadEmployeeDocument,
  deleteEmployeeDocument,
} from '@/actions/employee-documents';

// ============================================================
// TYPES
// ============================================================

interface EmployeeDocument {
  id: string;
  employeeId: string;
  docType: string;
  label: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string | null;
  uploadedAt: Date;
  notes: string | null;
}

interface Props {
  employeeId: string;
  initialDocuments: EmployeeDocument[];
  canEdit: boolean;
}

// ============================================================
// HELPERS
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDocColor(docType: string): string {
  return DOC_TYPE_COLORS[docType] || '#6b7280';
}

// ============================================================
// COMPONENT
// ============================================================

export default function EmployeeDocuments({ employeeId, initialDocuments, canEdit }: Props) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>(initialDocuments);
  const [isPending, startTransition] = useTransition();

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState<string>(DOCUMENT_TYPES[0].value);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ---- Upload handler ----
  function handleUpload() {
    if (!file) {
      setUploadError('Please select a file');
      return;
    }
    setUploadError('');
    setUploadSuccess('');

    const fd = new FormData();
    fd.append('employeeId', employeeId);
    fd.append('docType', docType);
    fd.append('notes', notes);
    fd.append('file', file);

    startTransition(async () => {
      const result = await uploadEmployeeDocument(fd);
      if (result.success) {
        setUploadSuccess('Document uploaded successfully!');
        setShowUpload(false);
        setFile(null);
        setNotes('');
        setDocType(DOCUMENT_TYPES[0].value);
        // Refresh doc list by re-fetching via server action (page will revalidate)
        // For optimistic UI we can reload; Next.js revalidatePath handles server state
        window.location.reload();
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    });
  }

  // ---- Delete handler ----
  function handleDelete(docId: string) {
    startTransition(async () => {
      const result = await deleteEmployeeDocument(docId);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setDeleteConfirmId(null);
      } else {
        alert(result.error || 'Delete failed');
      }
    });
  }

  return (
    <div
      className="glass-card-static"
      style={{ marginTop: '1.5rem' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FileText size={18} style={{ color: '#8b5cf6' }} />
          Employee Documents
          {documents.length > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                background: 'rgba(139,92,246,0.12)',
                color: '#7c3aed',
                border: '1px solid rgba(139,92,246,0.25)',
                marginLeft: '0.25rem',
              }}
            >
              {documents.length}
            </span>
          )}
        </h3>

        {/* Upload Button — always shown; server action enforces permission */}
        <button
            onClick={() => {
              setShowUpload((v) => !v);
              setUploadError('');
              setUploadSuccess('');
            }}
            disabled={isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(139,92,246,0.4)',
              background: showUpload ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.08)',
              color: '#a78bfa',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {showUpload ? <X size={15} /> : <Upload size={15} />}
            {showUpload ? 'Cancel' : 'Upload Document'}
          </button>
      </div>

      {/* Success banner */}
      {uploadSuccess && (
        <div
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#16a34a',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '1rem',
          }}
        >
          ✅ {uploadSuccess}
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem',
          }}
        >
          <h4
            style={{
              margin: '0 0 1rem 0',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Upload New Document
          </h4>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {/* Doc Type */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                }}
              >
                Document Type *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                }}
              >
                File * (PDF, JPG, PNG, DOCX — max 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              />
              {file && (
                <div
                  style={{
                    marginTop: '0.35rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Selected: {file.name} ({formatFileSize(file.size)})
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                }}
              >
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this document..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {uploadError && (
              <div
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                }}
              >
                ⚠️ {uploadError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleUpload}
                disabled={isPending || !file}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isPending || !file ? 'rgba(139,92,246,0.3)' : '#7c3aed',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isPending || !file ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Upload size={14} />
                {isPending ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setFile(null);
                  setNotes('');
                  setUploadError('');
                }}
                disabled={isPending}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            color: 'var(--text-tertiary)',
            fontSize: '0.9rem',
            fontStyle: 'italic',
            borderRadius: '10px',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}
        >
          No documents uploaded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {documents.map((doc) => {
            const color = getDocColor(doc.docType);
            const isConfirmDelete = deleteConfirmId === doc.id;

            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  transition: 'background 0.15s',
                }}
              >
                {/* Left: icon + info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '9px',
                      background: `${color}18`,
                      border: `1px solid ${color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} style={{ color }} />
                  </div>

                  {/* Details */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {/* Badge */}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '5px',
                          background: `${color}15`,
                          color,
                          border: `1px solid ${color}30`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                        }}
                      >
                        {doc.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '280px',
                        }}
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        gap: '0.6rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                      {doc.uploadedBy && (
                        <>
                          <span>·</span>
                          <span>by {doc.uploadedBy}</span>
                        </>
                      )}
                      {doc.notes && (
                        <>
                          <span>·</span>
                          <span
                            style={{ fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={doc.notes}
                          >
                            {doc.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {/* View button */}
                  <a
                    href={`/api/employee-documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '7px',
                      border: '1px solid rgba(6,182,212,0.3)',
                      background: 'rgba(6,182,212,0.08)',
                      color: '#06b6d4',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Eye size={13} />
                    View
                  </a>

                  {/* Delete button / confirm */}
                  <>
                    {isConfirmDelete ? (
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>
                            Delete?
                          </span>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={isPending}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.4)',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#ef4444',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.12)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(doc.id)}
                          disabled={isPending}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '7px',
                            border: '1px solid rgba(239,68,68,0.25)',
                            background: 'rgba(239,68,68,0.06)',
                            color: '#f87171',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      )}
                    </>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

