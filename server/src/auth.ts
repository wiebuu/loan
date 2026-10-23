import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';
import { pool } from './db.js';
import { HttpError } from './errors.js';

export interface User {
  id: number;
  phone: string;
  username: string | null;
  created_at: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Create (or replace) a 6-digit code for this phone and print it in the server log. */
export async function issueOtp(phone: string): Promise<string> {
  const existing = await pool.query(
    `SELECT EXTRACT(EPOCH FROM now() - created_at) AS age FROM otp_codes WHERE phone = $1`,
    [phone],
  );
  const age = existing.rows[0]?.age;
  if (age !== undefined && Number(age) < config.otpResendSeconds) {
    const wait = Math.ceil(config.otpResendSeconds - Number(age));
    throw new HttpError(429, `Wait ${wait}s before asking for another code`);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await pool.query(
    `INSERT INTO otp_codes (phone, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))
     ON CONFLICT (phone) DO UPDATE
       SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = now()`,
    [phone, sha256(code), config.otpTtlMinutes],
  );
  // Mock SMS: the assignment asks for the OTP to be printed in the server log.
  console.log(`[otp] +91${phone} -> ${code}`);
  return code;
}

/** Check the code. On success, create the user if needed and start a session. */
export async function verifyOtp(phone: string, code: string): Promise<{ token: string; user: User }> {
  const row = (
    await pool.query(
      `UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1
       RETURNING code_hash, attempts, expires_at < now() AS expired`,
      [phone],
    )
  ).rows[0];

  if (!row) throw new HttpError(400, 'Ask for a code first');
  if (row.expired) throw new HttpError(400, 'That code has expired. Ask for a new one');
  if (row.attempts > config.otpMaxAttempts) throw new HttpError(429, 'Too many tries. Ask for a new code');
  if (row.code_hash !== sha256(code)) throw new HttpError(400, 'Incorrect OTP');

  await pool.query('DELETE FROM otp_codes WHERE phone = $1', [phone]);
  const user = (
    await pool.query(
      `INSERT INTO users (phone) VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING *`,
      [phone],
    )
  ).rows[0] as User;

  const token = randomBytes(32).toString('hex');
  await pool.query('INSERT INTO sessions (token_hash, user_id) VALUES ($1, $2)', [sha256(token), user.id]);
  return { token, user };
}

export async function endSession(token: string) {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Express middleware: needs "Authorization: Bearer <token>", puts the user on req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'Log in first');
  const user = (
    await pool.query(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
      [sha256(token)],
    )
  ).rows[0] as User | undefined;
  if (!user) throw new HttpError(401, 'Your session has ended. Log in again');
  req.user = user;
  next();
}

/** Like requireAuth, but also needs the user to have picked a username. */
export function requireUsername(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.username) throw new HttpError(403, 'Pick a username first');
  next();
}

export { bearer };
