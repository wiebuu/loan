import 'dotenv/config';

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
};
