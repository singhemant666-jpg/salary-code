import crypto from 'crypto';

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'mpcg-payroll-slip-secret-2026';

/**
 * Generate a deterministic secure token for an employee's monthly payroll salary slip.
 * Allows WhatsApp media crawler and public download without an HR login session.
 */
export function generateSalarySlipToken(payrollId: string): string {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(`mpcg-slip-${payrollId}`).digest('hex').slice(0, 32);
}

/**
 * Verify if the provided salary slip token matches the payroll record.
 */
export function verifySalarySlipToken(payrollId: string, token?: string | null): boolean {
  if (!token || !payrollId) return false;
  const expected = generateSalarySlipToken(payrollId);
  try {
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
