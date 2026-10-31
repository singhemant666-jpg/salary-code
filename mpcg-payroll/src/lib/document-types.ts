// ============================================================
// EMPLOYEE DOCUMENT TYPES — shared between server actions & client components
// ============================================================

export const DOCUMENT_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
  { value: 'OFFER_LETTER', label: 'Offer Letter' },
  { value: 'APPOINTMENT_LETTER', label: 'Appointment Letter' },
  { value: 'RESUME', label: 'Resume / CV' },
  { value: 'EDUCATION_CERT', label: 'Educational Certificate' },
  { value: 'EXPERIENCE_LETTER', label: 'Experience Letter' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type DocumentTypeValue = typeof DOCUMENT_TYPES[number]['value'];

export const DOC_TYPE_COLORS: Record<string, string> = {
  AADHAAR: '#06b6d4',
  PAN: '#f59e0b',
  BANK_STATEMENT: '#22c55e',
  OFFER_LETTER: '#3b82f6',
  APPOINTMENT_LETTER: '#3b82f6',
  RESUME: '#8b5cf6',
  EDUCATION_CERT: '#f97316',
  EXPERIENCE_LETTER: '#ec4899',
  OTHER: '#6b7280',
};

