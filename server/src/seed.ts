/**
 * Adds three demo users you can log in as, or link loans to:
 *   @rahul 9000011111   @priya 9000022222   @aman 9000033333
 * Rahul and Priya already have a few loans between them. Safe to run more than once.
 */
import { pool } from './db.js';
import { migrate } from './migrate.js';

const demo = [
  { phone: '9000011111', username: 'rahul' },
  { phone: '9000022222', username: 'priya' },
  { phone: '9000033333', username: 'aman' },
];

await migrate(false);
const ids: Record<string, number> = {};
for (const u of demo) {
  const row = (
    await pool.query(
      `INSERT INTO users (phone, username) VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET username = EXCLUDED.username RETURNING id`,
      [u.phone, u.username],
    )
  ).rows[0];
  ids[u.username] = row.id;
}

const existing = (await pool.query('SELECT COUNT(*)::int AS n FROM loans WHERE created_by = $1', [ids.rahul])).rows[0].n;
if (existing === 0) {
  const add = (sql: string, params: unknown[]) => pool.query(sql, params);
  // Rahul lent Priya ₹1,200, accepted, due 5 days ago (overdue).
  await add(
    `INSERT INTO loans (created_by, lender_id, borrower_id, amount_paise, due_date, status, accepted_at)
     VALUES ($1, $1, $2, 120000, CURRENT_DATE - 5, 'active', now())`,
    [ids.rahul, ids.priya],
  );
  // Rahul borrowed ₹500 from Priya, already repaid.
  await add(
    `INSERT INTO loans (created_by, lender_id, borrower_id, amount_paise, due_date, status, accepted_at, repaid_at)
     VALUES ($1, $2, $1, 50000, CURRENT_DATE - 20, 'repaid', now(), now())`,
    [ids.rahul, ids.priya],
  );
  // A personal note: Rahul lent his cousin ₹3,000.
  await add(
    `INSERT INTO loans (created_by, lender_id, counterparty_name, amount_paise, due_date, status, accepted_at)
     VALUES ($1, $1, 'Cousin Vikram', 300000, CURRENT_DATE + 12, 'active', now())`,
    [ids.rahul],
  );
}

console.log('Demo users ready: @rahul 9000011111, @priya 9000022222, @aman 9000033333');
await pool.end();
