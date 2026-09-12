interface OTPRecord {
  otp: string;
  expiresAt: number;
}

// Global store to persist across Next.js dev reloads
const globalForOtp = global as unknown as { otpMap?: Map<string, OTPRecord> };

export const otpMap = globalForOtp.otpMap || new Map<string, OTPRecord>();
if (process.env.NODE_ENV !== 'production') globalForOtp.otpMap = otpMap;
