import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, asUser, signUp } from './helpers.js';

describe('phone + OTP login', () => {
  it('rejects a phone number that is not 10 digits', async () => {
    const res = await request(app).post('/auth/request-otp').send({ phone: '12345' }).expect(400);
    expect(res.body.error).toMatch(/10-digit/);
  });

  it('logs in with the right code, and makes you wait before asking again', async () => {
    const sent = await request(app).post('/auth/request-otp').send({ phone: '9000000001' }).expect(200);
    expect(sent.body.devOtp).toMatch(/^\d{6}$/);

    await request(app).post('/auth/request-otp').send({ phone: '9000000001' }).expect(429);

    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: '9000000001', otp: sent.body.devOtp })
      .expect(200);
    expect(res.body.token).toHaveLength(64);
    expect(res.body.user).toMatchObject({ phone: '9000000001', username: null });

    // A code works only once.
    await request(app).post('/auth/verify-otp').send({ phone: '9000000001', otp: sent.body.devOtp }).expect(400);
  });

  it('rejects a wrong code', async () => {
    const sent = await request(app).post('/auth/request-otp').send({ phone: '9000000002' }).expect(200);
    const wrong = sent.body.devOtp === '000000' ? '111111' : '000000';
    const res = await request(app).post('/auth/verify-otp').send({ phone: '9000000002', otp: wrong }).expect(400);
    expect(res.body.error).toBe('Incorrect OTP');
  });

  it('needs a token for /me and a username for loans', async () => {
    await request(app).get('/me').expect(401);

    const sent = await request(app).post('/auth/request-otp').send({ phone: '9000000003' });
    const { body } = await request(app).post('/auth/verify-otp').send({ phone: '9000000003', otp: sent.body.devOtp });
    const as = asUser(body.token);
    await as.get('/me').expect(200);
    const res = await as.get('/loans').expect(403);
    expect(res.body.error).toMatch(/username/);
  });

  it('logs out', async () => {
    const user = await signUp('9000000004', 'logout_test');
    await user.post('/auth/logout').expect(200);
    await user.get('/me').expect(401);
  });
});

describe('usernames', () => {
  it('stores usernames in lowercase and keeps them unique', async () => {
    const a = await signUp('9000000010', 'Priya_K');
    expect((await a.get('/me').expect(200)).body.user.username).toBe('priya_k');

    const sent = await request(app).post('/auth/request-otp').send({ phone: '9000000011' });
    const { body } = await request(app).post('/auth/verify-otp').send({ phone: '9000000011', otp: sent.body.devOtp });
    const b = asUser(body.token);
    await b.patch('/me').send({ username: 'priya_k' }).expect(409);
    await b.patch('/me').send({ username: '1abc' }).expect(400);
    await b.patch('/me').send({ username: 'ab' }).expect(400);
  });

  it('finds other users by username or phone, but not yourself', async () => {
    const a = await signUp('9000000020', 'finder');
    await signUp('9000000021', 'findme');

    const byName = await a.get('/users/lookup?q=@FindMe').expect(200);
    expect(byName.body.user).toMatchObject({ username: 'findme', phone: '••••••0021' });
    await a.get('/users/lookup?q=9000000021').expect(200);
    await a.get('/users/lookup?q=nobody_here').expect(404);
    await a.get('/users/lookup?q=finder').expect(409);
  });
});
