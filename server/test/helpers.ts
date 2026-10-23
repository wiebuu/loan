import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

/** Log in with a phone number and pick a username. Returns an authed request helper. */
export async function signUp(phone: string, username: string) {
  const sent = await request(app).post('/auth/request-otp').send({ phone }).expect(200);
  const verified = await request(app).post('/auth/verify-otp').send({ phone, otp: sent.body.devOtp }).expect(200);
  const token: string = verified.body.token;
  const as = asUser(token);
  const me = await as.patch('/me').send({ username }).expect(200);
  return { ...as, token, id: me.body.user.id as number };
}

export function asUser(token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string) => request(app).post(url).set(auth),
    patch: (url: string) => request(app).patch(url).set(auth),
    delete: (url: string) => request(app).delete(url).set(auth),
  };
}

/** A YYYY-MM-DD date `days` from today in the app's time zone. */
export function daysFromToday(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
