/**
 * Demo mode only: fills the logged-in user's account with a realistic set of loans and
 * notifications, so you can see how the app looks with data in it. The other people are
 * demo users (created here if they don't exist yet) and a few plain names.
 */
import type { PoolClient } from 'pg';
import type { User } from './auth.js';
import { transaction } from './db.js';
import { conflict } from './errors.js';
import { formatPaise } from './money.js';

const PEOPLE = [
  { phone: '9000011111', username: 'rahul' },
  { phone: '9000022222', username: 'priya' },
  { phone: '9000033333', username: 'aman' },
  { phone: '9000044444', username: 'neha' },
  { phone: '9000055555', username: 'arjun' },
];

const GOA_NOTE = 'Goa trip, hotel share';

const daysAgo = (d: number) => `now() - interval '${d} days'`;

export async function addSampleData(me: User): Promise<{ loans: number; notifications: number }> {
  return transaction(async (db) => {
    const already = await db.query('SELECT 1 FROM loans WHERE (lender_id = $1 OR borrower_id = $1) AND is_demo LIMIT 1', [me.id]);
    if (already.rowCount) throw conflict('The demo data is already in your account');

    // Five other people, never yourself.
    const others: { id: number; username: string }[] = [];
    for (const p of PEOPLE) {
      if (p.phone === me.phone || p.username === me.username) continue;
      const row = (
        await db.query(
          `INSERT INTO users (phone, username) VALUES ($1, $2)
           ON CONFLICT (phone) DO UPDATE SET username = COALESCE(users.username, EXCLUDED.username)
           RETURNING id, username`,
          [p.phone, p.username],
        )
      ).rows[0];
      if (row.id !== me.id) others.push(row);
    }
    const [a, b, c, d, e] = [...others, ...others].slice(0, 5); // fewer than five only if names clash

    let loans = 0;
    let notifications = 0;

    async function loan(opts: {
      createdBy: number;
      lender: number | null;
      borrower: number | null;
      name?: string;
      rupees: number;
      due: number; // days from today; negative is in the past
      note: string;
      status: string;
      ageDays: number;
      repaidDaysAgo?: number;
      events: { actor: number; type: string; daysAgo: number; note?: string }[];
    }) {
      const id = (
        await db.query(
          `INSERT INTO loans (created_by, lender_id, borrower_id, counterparty_name, amount_paise, due_date, note, status,
                              is_demo, created_at, accepted_at, repaid_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + $6::int, $7, $8, true, ${daysAgo(opts.ageDays)},
                   ${opts.status === 'pending' ? 'NULL' : daysAgo(Math.max(opts.ageDays - 1, 0))},
                   ${opts.repaidDaysAgo === undefined ? 'NULL' : daysAgo(opts.repaidDaysAgo)})
           RETURNING id`,
          [opts.createdBy, opts.lender, opts.borrower, opts.name ?? null, opts.rupees * 100, opts.due, opts.note, opts.status],
        )
      ).rows[0].id as number;
      for (const ev of opts.events) {
        await db.query(
          `INSERT INTO loan_events (loan_id, actor_id, type, note, created_at) VALUES ($1, $2, $3, $4, ${daysAgo(ev.daysAgo)})`,
          [id, ev.actor, ev.type, ev.note ?? null],
        );
      }
      loans++;
      return id;
    }

    async function notify(db: PoolClient, loanId: number, type: string, message: string, ageHours: number, read: boolean) {
      await db.query(
        `INSERT INTO notifications (user_id, loan_id, type, message, created_at, read_at)
         VALUES ($1, $2, $3, $4, now() - interval '${ageHours} hours', ${read ? 'now()' : 'NULL'})`,
        [me.id, loanId, type, message],
      );
      notifications++;
    }

    const me_ = me.id;

    // You lent b ₹2,400 three weeks ago; it's 6 days late.
    const goa = await loan({
      createdBy: me_, lender: me_, borrower: b.id, rupees: 2400, due: -6, note: GOA_NOTE, status: 'active', ageDays: 21,
      events: [{ actor: me_, type: 'created', daysAgo: 21 }, { actor: b.id, type: 'accept', daysAgo: 20 }],
    });
    await notify(db, goa, 'accepted', `@${b.username} accepted the ${formatPaise(240000)} loan.`, 20 * 24, true);

    // c says they lent you ₹750: waiting for you to accept.
    const movie = await loan({
      createdBy: c.id, lender: c.id, borrower: me_, rupees: 750, due: 10, note: 'Movie and snacks', status: 'pending', ageDays: 0,
      events: [{ actor: c.id, type: 'created', daysAgo: 0 }],
    });
    await notify(db, movie, 'loan_request', `@${c.username} says they lent you ${formatPaise(75000)}. Accept it to add it to your loans.`, 1, false);

    // a says they paid back ₹1,500: waiting for you to confirm.
    const concert = await loan({
      createdBy: me_, lender: me_, borrower: a.id, rupees: 1500, due: 3, note: 'Concert tickets', status: 'paid_claimed', ageDays: 12,
      events: [
        { actor: me_, type: 'created', daysAgo: 12 },
        { actor: a.id, type: 'accept', daysAgo: 12 },
        { actor: a.id, type: 'claimPaid', daysAgo: 0, note: 'GPay to your number' },
      ],
    });
    await notify(db, concert, 'paid_claimed', `@${a.username} says they paid back ${formatPaise(150000)} (GPay to your number). Confirm once you've got it.`, 3, false);

    // You borrowed ₹600 from d; due in 2 days and they've reminded you.
    const lunch = await loan({
      createdBy: d.id, lender: d.id, borrower: me_, rupees: 600, due: 2, note: 'Lunch at college', status: 'active', ageDays: 9,
      events: [
        { actor: d.id, type: 'created', daysAgo: 9 },
        { actor: me_, type: 'accept', daysAgo: 9 },
        { actor: d.id, type: 'remind', daysAgo: 0 },
      ],
    });
    await notify(db, lunch, 'reminder', `@${d.username} is reminding you to pay back ${formatPaise(60000)} (due in 2 days).`, 5, false);

    // You lent e ₹5,000, due in 25 days.
    await loan({
      createdBy: me_, lender: me_, borrower: e.id, rupees: 5000, due: 25, note: 'Laptop repair', status: 'active', ageDays: 4,
      events: [{ actor: me_, type: 'created', daysAgo: 4 }, { actor: e.id, type: 'accept', daysAgo: 4 }],
    });

    // Personal reminders, just names.
    await loan({
      createdBy: me_, lender: me_, borrower: null, name: 'Rohan (roommate)', rupees: 1200, due: 4, note: 'Electricity bill',
      status: 'active', ageDays: 6, events: [{ actor: me_, type: 'created', daysAgo: 6 }],
    });
    await loan({
      createdBy: me_, lender: null, borrower: me_, name: 'Kabir', rupees: 300, due: -2, note: 'Auto fare', status: 'active',
      ageDays: 8, events: [{ actor: me_, type: 'created', daysAgo: 8 }],
    });

    // Settled ones.
    const pizza = await loan({
      createdBy: me_, lender: me_, borrower: b.id, rupees: 800, due: -12, note: 'Pizza night', status: 'repaid', ageDays: 30,
      repaidDaysAgo: 14,
      events: [
        { actor: me_, type: 'created', daysAgo: 30 },
        { actor: b.id, type: 'accept', daysAgo: 30 },
        { actor: b.id, type: 'claimPaid', daysAgo: 15, note: 'Cash' },
        { actor: me_, type: 'confirmPaid', daysAgo: 14 },
      ],
    });
    await notify(db, pizza, 'paid_claimed', `@${b.username} says they paid back ${formatPaise(80000)} (Cash). Confirm once you've got it.`, 15 * 24, true);
    const books = await loan({
      createdBy: c.id, lender: c.id, borrower: me_, rupees: 1000, due: -5, note: 'Books', status: 'repaid', ageDays: 25,
      repaidDaysAgo: 7,
      events: [
        { actor: c.id, type: 'created', daysAgo: 25 },
        { actor: me_, type: 'accept', daysAgo: 25 },
        { actor: me_, type: 'claimPaid', daysAgo: 8, note: 'UPI' },
        { actor: c.id, type: 'confirmPaid', daysAgo: 7 },
      ],
    });
    await notify(db, books, 'paid_confirmed', `@${c.username} confirmed they got your ${formatPaise(100000)}. All settled.`, 7 * 24, true);

    return { loans, notifications };
  });
}

/**
 * Demo mode only: take the demo loans back out of this account. Their history and
 * notifications go with them. Loans you added yourself are never touched.
 */
export async function removeSampleData(me: User): Promise<{ loans: number }> {
  return transaction(async (db) => {
    const { rowCount } = await db.query('DELETE FROM loans WHERE is_demo AND (lender_id = $1 OR borrower_id = $1)', [me.id]);
    return { loans: rowCount ?? 0 };
  });
}
