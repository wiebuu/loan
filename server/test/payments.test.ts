import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, daysFromToday, signUp } from './helpers.js';

// A real 1x1 PNG.
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==';

async function activeLoan() {
  const n = Math.floor(Math.random() * 1e6);
  const lender = await signUp(`96${String(n).padStart(8, '0')}`, `lender${n}`);
  const borrower = await signUp(`97${String(n).padStart(8, '0')}`, `borrower${n}`);
  const { loan } = (
    await lender
      .post('/loans')
      .send({ role: 'lender', amount: 1200, dueDate: daysFromToday(5), counterpartyUserId: borrower.id })
      .expect(201)
  ).body;
  await borrower.post(`/loans/${loan.id}/accept`).expect(200);
  return { lender, borrower, id: loan.id as number };
}

describe('"I\'ve paid" with how/where and a receipt', () => {
  it('needs to say how or where you paid', async () => {
    const { borrower, id } = await activeLoan();
    const res = await borrower.post(`/loans/${id}/claim-paid`).send({}).expect(400);
    expect(res.body.error).toBe('Say how or where you paid');
    await borrower.post(`/loans/${id}/claim-paid`).send({ note: '   ' }).expect(400);
  });

  it('saves the note, the link and the photo, and shows them to the lender', async () => {
    const { lender, borrower, id } = await activeLoan();

    const claimed = (
      await borrower
        .post(`/loans/${id}/claim-paid`)
        .send({ note: 'GPay to your number', receiptLink: 'https://pay.google.com/receipt/123', receiptImage: PNG_1PX })
        .expect(200)
    ).body.loan;
    expect(claimed.status).toBe('paid_claimed');

    const seen = (await lender.get(`/loans/${id}`).expect(200)).body.loan;
    expect(seen.payment).toMatchObject({ note: 'GPay to your number', receiptLink: 'https://pay.google.com/receipt/123' });
    expect(seen.payment.receiptImage).toMatch(/^\/uploads\/[0-9a-f]{32}\.png$/);

    // The photo is served back exactly as sent.
    const img = await request(app).get(seen.payment.receiptImage).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(Buffer.from(img.body).toString('base64')).toBe(PNG_1PX);

    // The lender was told how it was paid.
    const msg = (await lender.get('/notifications')).body.notifications[0].message;
    expect(msg).toMatch(/says they paid back ₹1,200 \(GPay to your number\) and added a receipt/);

    // It's kept in the history, and still shown once settled.
    await lender.post(`/loans/${id}/confirm-paid`).expect(200);
    const done = (await borrower.get(`/loans/${id}`)).body.loan;
    expect(done.payment.note).toBe('GPay to your number');
    const claimEvent = done.events.find((e: { type: string }) => e.type === 'claimPaid');
    expect(claimEvent).toMatchObject({ note: 'GPay to your number', receiptLink: 'https://pay.google.com/receipt/123' });
  });

  it('shows the latest claim after a "not received yet"', async () => {
    const { lender, borrower, id } = await activeLoan();
    await borrower.post(`/loans/${id}/claim-paid`).send({ note: 'Cash' }).expect(200);
    await lender.post(`/loans/${id}/reject-paid`).expect(200);
    expect((await lender.get(`/loans/${id}`)).body.loan.payment).toBeNull();

    await borrower.post(`/loans/${id}/claim-paid`).send({ note: 'Bank transfer, ref 88812' }).expect(200);
    const loan = (await lender.get(`/loans/${id}`)).body.loan;
    expect(loan.payment).toMatchObject({ note: 'Bank transfer, ref 88812', receiptLink: null, receiptImage: null });
  });

  it('rejects bad links and files that are not photos', async () => {
    const { borrower, id } = await activeLoan();
    const bad = (body: object) => borrower.post(`/loans/${id}/claim-paid`).send({ note: 'UPI', ...body }).expect(400);

    expect((await bad({ receiptLink: 'not a link' })).body.error).toMatch(/http/);
    expect((await bad({ receiptLink: 'javascript:alert(1)' })).body.error).toMatch(/http/);
    expect((await bad({ receiptImage: Buffer.from('hello, not an image').toString('base64') })).body.error).toMatch(
      /JPEG, PNG or WebP/,
    );

    // Nothing changed, so it can still be claimed properly.
    expect((await borrower.get(`/loans/${id}`)).body.loan.status).toBe('active');
  });

  it('refuses photos over 5 MB', async () => {
    const { borrower, id } = await activeLoan();
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024 + 10)]).toString('base64');
    const res = await borrower.post(`/loans/${id}/claim-paid`).send({ note: 'UPI', receiptImage: big }).expect(400);
    expect(res.body.error).toMatch(/under 5 MB/);
  });
});
