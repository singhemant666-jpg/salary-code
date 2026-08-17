'use client';

import { useState, useRef } from 'react';
import { importAttendance, processAttendance } from '@/actions/attendance';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AttendanceImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const now = new Date();
  const [processMonth, setProcessMonth] = useState(now.getMonth() + 1);
  const [processYear, setProcessYear] = useState(now.getFullYear());
  const [result, setResult] = useState<{ success: boolean; message: string; data?: { month: number; year: number } } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await importAttendance(formData);
    setResult(res as never);
    setUploading(false);
    if (res.success) {
      setFile(null);
      if (res.data && 'month' in (res.data as Record<string, unknown>)) {
        const d = res.data as { month: number; year: number };
        setProcessMonth(d.month);
        setProcessYear(d.year);
      }
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setResult(null);
    const res = await processAttendance(processMonth, processYear);
    setResult(res);
    setProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Attendance</h1>
          <p className="page-subtitle">Upload RS 70 attendance data from Excel or CSV file</p>
        </div>
        <Link href="/dashboard/attendance" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          View Attendance
        </Link>
      </div>

      {/* Result Message */}
      {result && (
        <div style={{
          padding: '1rem 1.25rem',
          background: result.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: result.success ? '#15803d' : '#b91c1c',
          fontWeight: 500,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {result.success ? <CheckCircle2 size={20} color="#16a34a" /> : <AlertCircle size={20} color="#dc2626" />}
            <span style={{ fontSize: '0.925rem' }}>{result.message}</span>
          </div>
          {result.success && result.data?.month && (
            <Link
              href={`/dashboard/attendance?month=${result.data.month}&year=${result.data.year}`}
              className="btn btn-sm"
              style={{
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 600,
                padding: '0.4rem 0.85rem'
              }}
            >
              View Processed Attendance →
            </Link>
          )}
        </div>
      )}

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Upload Section */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
            <FileSpreadsheet size={20} style={{ color: '#0891b2', marginRight: '0.5rem' }} />
            Step 1: Upload Attendance File
          </h3>

          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={40} style={{ color: '#0891b2', margin: '0 auto 1rem', display: 'block' }} />
            <div className="upload-text" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {file ? (
                <span style={{ color: '#0891b2', fontWeight: 600 }}>
                  📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                'Drag & drop your attendance file here, or click to browse'
              )}
            </div>
            <div className="upload-hint" style={{ color: 'var(--text-secondary)' }}>Supports .xlsx, .xls, and .csv files</div>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
          </div>

          <button
            onClick={handleUpload}
            className="btn btn-primary"
            disabled={!file || uploading}
            style={{
              width: '100%',
              marginTop: '1rem',
              background: file ? '#0891b2' : undefined,
              borderColor: file ? '#0891b2' : undefined,
              color: '#ffffff',
              fontWeight: 600
            }}
          >
            <Upload size={16} />
            {uploading ? 'Uploading & Validating...' : 'Upload & Import'}
          </button>

          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Expected columns in your file:
            </p>
            <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <div>• <strong style={{ color: 'var(--text-primary)' }}>Employee ID / Biometric ID</strong> — e.g., 001, MPC-001</div>
              <div>• <strong style={{ color: 'var(--text-primary)' }}>Date</strong> — DD-MM-YYYY or YYYY-MM-DD</div>
              <div>• <strong style={{ color: 'var(--text-primary)' }}>Time</strong> — HH:MM or HH:MM:SS</div>
              <div>• <strong style={{ color: 'var(--text-primary)' }}>Type</strong> — IN / OUT (optional)</div>
            </div>
          </div>
        </div>

        {/* Process Section */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
            <RefreshCw size={20} style={{ color: '#16a34a', marginRight: '0.5rem' }} />
            Step 2: Process Raw Attendance
          </h3>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            After importing raw punches, process them into daily attendance records.
            This will calculate working hours, detect late arrivals, missing punches,
            overtime, and apply leave/holiday rules.
          </p>

          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Month</label>
              <select
                className="form-select"
                value={processMonth}
                onChange={(e) => setProcessMonth(parseInt(e.target.value))}
                style={{ fontWeight: 500, color: 'var(--text-primary)' }}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Year</label>
              <select
                className="form-select"
                value={processYear}
                onChange={(e) => setProcessYear(parseInt(e.target.value))}
                style={{ fontWeight: 500, color: 'var(--text-primary)' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleProcess}
            className="btn"
            disabled={processing}
            style={{
              width: '100%',
              background: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.75rem 1rem'
            }}
          >
            <RefreshCw size={18} className={processing ? 'spinning' : ''} />
            {processing ? 'Processing Attendance...' : 'Process Attendance'}
          </button>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(8,145,178,0.06)',
            border: '1px solid rgba(8,145,178,0.2)',
            borderRadius: '8px',
          }}>
            <p style={{ color: '#0891b2', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              What processing does:
            </p>
            <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              <div>✓ Identifies First IN and Last OUT</div>
              <div>✓ Calculates working hours per day</div>
              <div>✓ Detects late arrivals &amp; early departures</div>
              <div>✓ Flags missing punches for review</div>
              <div>✓ Applies holidays and weekly offs</div>
              <div>✓ Calculates overtime hours</div>
              <div>✓ Integrates approved leaves</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
