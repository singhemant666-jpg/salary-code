import crypto from 'crypto';

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'mpcg-payroll-slip-secret-2026';

/**
 * Generate a deterministic secure token for an employee's monthly payroll salary slip.
 * Allows WhatsApp media crawler and public download without an HR login session.
 */
export function generateSalarySlipToken(payrollId: string): string {
  const raw = crypto.createHmac('sha256', TOKEN_SECRET).update(`mpcg-slip-${payrollId}`).digest('hex').slice(0, 32);
  // Break into 4-char groups with hyphens so WhatsApp never interprets 10 consecutive digits as a phone number
  return raw.match(/.{1,4}/g)?.join('-') || raw;
}

/**
 * Verify if the provided salary slip token matches the payroll record.
 * Supports both hyphenated and un-hyphenated tokens for backward compatibility.
 */
export function verifySalarySlipToken(payrollId: string, token?: string | null): boolean {
  if (!token || !payrollId) return false;
  const cleanInput = token.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const rawExpected = crypto.createHmac('sha256', TOKEN_SECRET).update(`mpcg-slip-${payrollId}`).digest('hex').slice(0, 32).toLowerCase();
  try {
    const inputBuf = Buffer.from(cleanInput);
    const expectedBuf = Buffer.from(rawExpected);
    if (inputBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, expectedBuf);
  } catch {
    return false;
  }
}
