import { describe, expect, it } from 'vitest';
import { daysFromToday, signUp } from './helpers.js';

describe('personal loans (just a reminder for yourself)', () => {
  it('are active straight away and count in the summary', async () => {
    const me = await signUp('9100000001', 'solo');

    const lent = await me
      .post('/loans')
      .send({ role: 'lender', amount: 1500, dueDate: daysFromToday(-3), counterpartyName: 'Rahul' })
      .expect(201);
    expect(lent.body.loan).toMatchObject({ status: 'active', linked: false, overdue: true, role: 'lender' });
    expect(lent.body.loan.counterparty.name).toBe('Rahul');
    expect(lent.body.loan.actions).toEqual(['markRepaid', 'delete']);

    await me
      .post('/loans')
      .send({ role: 'lender', amount: 499.5, dueDate: daysFromToday(5), counterpartyName: 'rahul ' })
      .expect(201);
    await me
      .post('/loans')
      .send({ role: 'borrower', amount: 200, dueDate: daysFromToday(2), counterpartyName: 'Sneha' })
      .expect(201);

    let summary = (await me.get('/summary').expect(200)).body;
    expect(summary).toMatchObject({ totalLent: 1999.5, totalRepaid: 0, overdueAmount: 1500, toPay: 200 });

    await me.post(`/loans/${lent.body.loan.id}/mark-repaid`).expect(200);
    summary = (await me.get('/summary').expect(200)).body;
    expect(summary).toMatchObject({ totalLent: 1999.5, totalRepaid: 1500, overdueAmount: 0, toReceive: 499.5 });

    // "Rahul" and "rahul " are the same person on the People screen.
    const { people } = (await me.get('/people').expect(200)).body;
    const rahul = people.find((p: { name: string }) => p.name.toLowerCase().startsWith('rahul'));
    expect(rahul).toMatchObject({ timesLent: 2, totalLent: 1999.5, owesYou: 499.5 });
    expect(people).toHaveLength(2);
    const sneha = people.find((p: { name: string }) => p.name === 'Sneha');
    expect(sneha).toMatchObject({ timesBorrowed: 1, totalBorrowed: 200, youOwe: 200, timesLent: 0 });
  });

  it('validates input', async () => {
    const me = await signUp('9100000002', 'validator');
    const bad = (body: object) => me.post('/loans').send(body).expect(400);
    const base = { role: 'lender', amount: 100, dueDate: daysFromToday(3), counterpartyName: 'X' };

    expect((await bad({ ...base, amount: 0 })).body.error).toMatch(/more than 0/);
    expect((await bad({ ...base, amount: 10.555 })).body.error).toMatch(/2 decimal/);
    expect((await bad({ ...base, dueDate: '2026-02-30' })).body.error).toMatch(/does not exist/);
    expect((await bad({ ...base, counterpartyName: undefined })).body.error).toMatch(/Loan user or type a name/);
    await bad({ ...base, role: 'friend' });
  });
});

describe('loans between two users', () => {
  it('goes request -> accept -> reminder -> "I paid" -> confirm, and keeps the history', async () => {
    const asha = await signUp('9200000001', 'asha');
    const ravi = await signUp('9200000002', 'ravi');
    const stranger = await signUp('9200000003', 'stranger');

    // Asha lent Ravi ₹2,500.
    const created = await asha
      .post('/loans')
      .send({ role: 'lender', amount: 2500, dueDate: daysFromToday(7), counterpartyUserId: ravi.id, note: 'Goa trip' })
      .expect(201);
    const id = created.body.loan.id;
    expect(created.body.loan).toMatchObject({ status: 'pending', linked: true, actions: ['cancel'] });

    // Pending loans don't count yet.
    expect((await asha.get('/summary')).body.totalLent).toBe(0);

    // Ravi sees it from the other side, with Accept / Decline, and got a notification.
    const ravisView = (await ravi.get(`/loans/${id}`).expect(200)).body.loan;
    expect(ravisView).toMatchObject({ role: 'borrower', actions: ['accept', 'decline'] });
    expect(ravisView.counterparty).toMatchObject({ username: 'asha', name: '@asha' });
    const inbox = (await ravi.get('/notifications').expect(200)).body;
    expect(inbox.unread).toBe(1);
    expect(inbox.notifications[0].message).toMatch(/@asha says they lent you ₹2,500/);

    // Only Ravi can accept, and strangers can't even see it.
    await asha.post(`/loans/${id}/accept`).expect(409);
    await stranger.get(`/loans/${id}`).expect(404);
    await stranger.post(`/loans/${id}/accept`).expect(404);

    await ravi.post(`/loans/${id}/accept`).expect(200);
    expect((await asha.get('/summary')).body).toMatchObject({ totalLent: 2500, toReceive: 2500 });
    expect((await ravi.get('/summary')).body).toMatchObject({ totalBorrowed: 2500, toPay: 2500 });

    // Asha reminds Ravi; a second reminder right away is refused.
    await asha.post(`/loans/${id}/remind`).expect(200);
    const again = await asha.post(`/loans/${id}/remind`).expect(429);
    expect(again.body.error).toMatch(/another in \d+ min/);
    expect((await ravi.get('/notifications')).body.notifications[0].message).toMatch(/reminding you to pay back ₹2,500/);
    expect((await asha.get(`/loans/${id}`)).body.loan.canRemindAt).not.toBeNull();

    // Ravi says he paid. Only Asha can confirm; she says not yet, then he tries again and she confirms.
    await ravi.post(`/loans/${id}/claim-paid`).send({ note: 'UPI' }).expect(200);
    await ravi.post(`/loans/${id}/confirm-paid`).expect(409);
    expect((await asha.get(`/loans/${id}`)).body.loan.actions).toEqual(['confirmPaid', 'rejectPaid']);
    await asha.post(`/loans/${id}/reject-paid`).expect(200);
    await ravi.post(`/loans/${id}/claim-paid`).send({ note: 'UPI' }).expect(200);
    const done = (await asha.post(`/loans/${id}/confirm-paid`).expect(200)).body.loan;
    expect(done).toMatchObject({ status: 'repaid', actions: [] });

    expect((await asha.get('/summary')).body).toMatchObject({ totalLent: 2500, totalRepaid: 2500, toReceive: 0 });

    const history = (await ravi.get(`/loans/${id}`)).body.loan.events.map((e: { type: string }) => e.type);
    expect(history).toEqual(['created', 'accept', 'remind', 'claimPaid', 'rejectPaid', 'claimPaid', 'confirmPaid']);

    // Both of them show up on each other's People screen.
    const ashasPeople = (await asha.get('/people')).body.people;
    expect(ashasPeople).toEqual([expect.objectContaining({ name: '@ravi', timesLent: 1, totalLent: 2500, owesYou: 0 })]);
    const stats = (await ravi.get('/me/stats').expect(200)).body;
    expect(stats).toMatchObject({ timesBorrowed: 1, timesLent: 0, people: 1 });
  });

  it('lets the borrower add the loan, and the lender decline it', async () => {
    const lender = await signUp('9300000001', 'meera');
    const borrower = await signUp('9300000002', 'kabir');

    const { loan } = (
      await borrower
        .post('/loans')
        .send({ role: 'borrower', amount: 300, dueDate: daysFromToday(1), counterpartyUserId: lender.id })
        .expect(201)
    ).body;

    const msg = (await lender.get('/notifications')).body.notifications[0].message;
    expect(msg).toMatch(/@kabir says they borrowed ₹300 from you/);

    await lender.post(`/loans/${loan.id}/decline`).expect(200);
    // The person who declined no longer sees it; the creator sees it as declined and can remove it.
    expect((await lender.get('/loans')).body.loans).toHaveLength(0);
    const mine = (await borrower.get('/loans')).body.loans;
    expect(mine[0]).toMatchObject({ status: 'declined', actions: ['delete'] });
    await borrower.delete(`/loans/${loan.id}`).expect(200);
    expect((await borrower.get('/loans')).body.loans).toHaveLength(0);
  });

  it('lets the lender mark it repaid directly, and the creator cancel a pending request', async () => {
    const a = await signUp('9400000001', 'tara');
    const b = await signUp('9400000002', 'neel');

    const first = (await a.post('/loans').send({ role: 'lender', amount: 50, dueDate: daysFromToday(2), counterpartyUserId: b.id })).body.loan;
    await b.post(`/loans/${first.id}/accept`).expect(200);
    await b.post(`/loans/${first.id}/mark-repaid`).expect(409); // only the lender can
    await a.post(`/loans/${first.id}/mark-repaid`).expect(200);
    expect((await b.get('/notifications')).body.notifications[0].message).toMatch(/@tara marked your ₹50 loan as repaid/);

    const second = (await a.post('/loans').send({ role: 'lender', amount: 80, dueDate: daysFromToday(2), counterpartyUserId: b.id })).body.loan;
    await a.post(`/loans/${second.id}/cancel`).expect(200);
    expect((await b.get('/loans')).body.loans.map((l: { id: number }) => l.id)).not.toContain(second.id);
  });

  it("won't link a loan to yourself or to someone who isn't on Loan", async () => {
    const a = await signUp('9500000001', 'lonely');
    const base = { role: 'lender', amount: 10, dueDate: daysFromToday(1) };
    await a.post('/loans').send({ ...base, counterpartyUserId: a.id }).expect(400);
    await a.post('/loans').send({ ...base, counterpartyUserId: 999999 }).expect(404);
  });
});
