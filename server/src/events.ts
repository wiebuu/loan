import type { Response } from 'express';

/**
 * Live updates. Each logged-in app keeps one long-lived GET /events request open (a
 * Server-Sent Events stream). When something changes for a user (a request, a reminder,
 * a payment...), we send them a tiny "changed" message and the app reloads straight away,
 * instead of waiting for its next check.
 */
const clients = new Map<number, Set<Response>>();

export function subscribe(userId: number, res: Response) {
  let set = clients.get(userId);
  if (!set) clients.set(userId, (set = new Set()));
  set.add(res);
  return () => {
    set!.delete(res);
    if (set!.size === 0) clients.delete(userId);
  };
}

/** Tell every open app of this user that their data changed. */
export function publish(userId: number, type = 'changed') {
  const set = clients.get(userId);
  if (!set) return;
  const line = `data: ${JSON.stringify({ type, at: Date.now() })}\n\n`;
  for (const res of set) res.write(line);
}
