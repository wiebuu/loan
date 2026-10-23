import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { pool } from '../db.js';
import { subscribe } from '../events.js';

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

// POST /notifications/:id/read -> mark one as read (only your own)
notificationsRouter.post('/notifications/:id/read', ...guard, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid notification id' });
    return;
  }
  await pool.query('UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL', [
    id,
    req.user!.id,
  ]);
  res.json({ ok: true });
});

// GET /events -> a live stream (Server-Sent Events). The app keeps it open and reloads
// whenever a "changed" message arrives. A comment line every 20 s keeps it from timing out.
notificationsRouter.get('/events', ...guard, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  const unsubscribe = subscribe(req.user!.id, res);
  const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
  // Start fresh every 25 minutes so nothing builds up on a very long connection.
  const recycle = setTimeout(() => res.end(), 25 * 60_000);
  req.on('close', () => {
    clearInterval(ping);
    clearTimeout(recycle);
    unsubscribe();
  });
});
