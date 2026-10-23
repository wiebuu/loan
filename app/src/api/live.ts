import { API_URL, getToken } from './index';

/**
 * Live updates from the server: keeps one GET /events stream (Server-Sent Events) open and
 * calls `onChange` whenever the server says something changed for you. Reconnects by itself
 * (backing off up to 30 s) if the connection drops, e.g. on a network change.
 *
 * Built on XMLHttpRequest, which React Native can read as the data arrives, so no extra
 * library is needed. Returns a function that closes the stream.
 */
export function subscribeLive(onChange: () => void): () => void {
  let xhr: XMLHttpRequest | null = null;
  let stopped = false;
  let seen = 0;
  let retry = 1000;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(connect, retry);
    retry = Math.min(retry * 2, 30_000);
  };

  async function connect() {
    if (stopped) return;
    const token = await getToken();
    if (!token || stopped) return schedule();
    const req = new XMLHttpRequest();
    xhr = req;
    seen = 0;
    req.open('GET', `${API_URL}/events`);
    req.setRequestHeader('Authorization', `Bearer ${token}`);
    req.setRequestHeader('Accept', 'text/event-stream');
    req.onprogress = () => {
      const text = req.responseText ?? '';
      const chunk = text.slice(seen);
      seen = text.length;
      // Connected: reset the back-off. A "data:" line means something changed.
      retry = 1000;
      if (chunk.includes('data:')) onChange();
    };
    req.onreadystatechange = () => {
      if (req.readyState === 4 && xhr === req) schedule();
    };
    req.onerror = () => {
      if (xhr === req) schedule();
    };
    req.send();
  }

  connect();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    xhr?.abort();
    xhr = null;
  };
}
