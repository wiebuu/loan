import { Router } from 'express';
import { requireAuth, requireUsername, type User } from '../auth.js';
import { pool } from '../db.js';
import { conflict, notFound } from '../errors.js';
import { summary } from '../loans.js';
import { parse, phoneSchema, usernameSchema } from '../validation.js';

export const meRouter = Router();
const guard = [requireAuth];

export function userView(u: User) {
  return { id: u.id, phone: u.phone, username: u.username, createdAt: u.created_at };
}

/** Show only the last 4 digits of someone else's number. */
const maskPhone = (phone: string) => `••••••${phone.slice(-4)}`;

// GET /me -> the logged-in user
meRouter.get('/me', ...guard, (req, res) => {
  res.json({ user: userView(req.user!) });
});

// PATCH /me { username } -> set or change the username
meRouter.patch('/me', ...guard, async (req, res) => {
  const username = parse(usernameSchema, req.body?.username);
  const taken = await pool.query('SELECT 1 FROM users WHERE username = $1 AND id <> $2', [username, req.user!.id]);
  if (taken.rowCount) throw conflict('That username is taken');
  const user = (await pool.query('UPDATE users SET username = $1 WHERE id = $2 RETURNING *', [username, req.user!.id]))
    .rows[0];
  res.json({ user: userView(user) });
});

// GET /me/stats -> numbers for the profile screen
meRouter.get('/me/stats', ...guard, requireUsername, async (req, res) => {
  const counts = (
    await pool.query(
      `SELECT COUNT(*) FILTER (WHERE lender_id = $1) AS "timesLent",
              COUNT(*) FILTER (WHERE borrower_id = $1) AS "timesBorrowed",
              COUNT(DISTINCT COALESCE('u' || CASE WHEN lender_id = $1 THEN borrower_id ELSE lender_id END,
                                      'n' || lower(trim(counterparty_name)))) AS people
       FROM loans
       WHERE (lender_id = $1 OR borrower_id = $1) AND status IN ('active', 'paid_claimed', 'repaid')`,
      [req.user!.id],
    )
  ).rows[0];
  res.json({
    timesLent: Number(counts.timesLent),
    timesBorrowed: Number(counts.timesBorrowed),
    people: Number(counts.people),
    ...(await summary(req.user!.id)),
  });
});

// GET /users/lookup?q=rahul or ?q=9876543210 -> find another Loan user to link a loan to
meRouter.get('/users/lookup', ...guard, requireUsername, async (req, res) => {
  const q = String(req.query.q ?? '').trim().replace(/^@/, '');
  const byPhone = /^\d+$/.test(q);
  const value = byPhone ? parse(phoneSchema, q) : parse(usernameSchema, q);
  const user = (
    await pool.query(`SELECT * FROM users WHERE ${byPhone ? 'phone' : 'username'} = $1 AND username IS NOT NULL`, [value])
  ).rows[0] as User | undefined;
  if (!user) throw notFound(byPhone ? 'Nobody on Loan has that number' : 'No Loan user with that username');
  if (user.id === req.user!.id) throw conflict("That's you");
  res.json({ user: { id: user.id, username: user.username, phone: maskPhone(user.phone) } });
});
