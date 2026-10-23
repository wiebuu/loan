import { Router } from 'express';
import { bearer, endSession, issueOtp, verifyOtp } from '../auth.js';
import { config } from '../config.js';
import { otpSchema, parse, phoneSchema } from '../validation.js';
import { userView } from './me.js';

export const authRouter = Router();

// POST /auth/request-otp { phone } -> sends (logs) a 6-digit code
authRouter.post('/request-otp', async (req, res) => {
  const phone = parse(phoneSchema, req.body?.phone);
  const code = await issueOtp(phone);
  // In demo mode the code also comes back so the app can fill it in by itself.
  res.json({ sent: true, ...(config.otpInResponse ? { devOtp: code } : {}) });
});

// POST /auth/verify-otp { phone, otp } -> { token, user }
authRouter.post('/verify-otp', async (req, res) => {
  const phone = parse(phoneSchema, req.body?.phone);
  const otp = parse(otpSchema, req.body?.otp);
  const { token, user } = await verifyOtp(phone, otp);
  res.json({ token, user: userView(user) });
});

// POST /auth/logout
authRouter.post('/logout', async (req, res) => {
  const token = bearer(req);
  if (token) await endSession(token);
  res.json({ ok: true });
});
