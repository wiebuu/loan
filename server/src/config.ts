import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 4000),
  timezone: process.env.APP_TIMEZONE ?? 'Asia/Kolkata',
  otpInResponse: (process.env.OTP_IN_RESPONSE ?? 'true') === 'true',
  otpTtlMinutes: 5,
  otpMaxAttempts: 5,
  otpResendSeconds: 30,
  reminderCooldownMinutes: Number(process.env.REMINDER_COOLDOWN_MINUTES ?? 60),
  /** Receipt photos are saved here and served at /uploads. */
  uploadsDir: process.env.UPLOADS_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads'),
  /** The Android app (Loan.apk), served at /download. */
  downloadsDir: process.env.DOWNLOADS_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'downloads'),
  maxReceiptBytes: 5 * 1024 * 1024,
};
