import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { pool } from '../db.js';

export const notificationsRouter = Router();
const guard = [requireAuth];

// GET /notifications -> latest 50, newest first, plus how many are unread
notificationsRouter.get('/notifications', ...guard, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, loan_id AS "loanId", type, message, created_at AS "createdAt", read_at IS NOT NULL AS read
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`,
    [req.user!.id],
  );
  const unread = (
    await pool.query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [
      req.user!.id,
    ])
  ).rows[0].n;
  res.json({ notifications: rows, unread });
});

// POST /notifications/read -> mark everything as read
notificationsRouter.post('/notifications/read', ...guard, async (req, res) => {
  await pool.query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [req.user!.id]);
  res.json({ ok: true });
});
