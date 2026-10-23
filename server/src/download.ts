import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { config } from './config.js';

/**
 * The page people open to get the Android app: /download.
 * The APK itself lives in config.downloadsDir (deploy.command uploads it there).
 */
export const downloadRouter = Router();

const APK = 'Loan.apk';
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

downloadRouter.get('/download/icon.png', (_req, res) => {
  res.sendFile(join(publicDir, 'icon.png'), { maxAge: '1d' });
});

downloadRouter.get(`/download/${APK}`, async (_req, res) => {
  const file = join(config.downloadsDir, APK);
  try {
    await stat(file);
  } catch {
    res.status(404).type('text').send('The app has not been uploaded yet.');
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Cache-Control', 'no-cache');
  res.download(file, APK);
});

downloadRouter.get(['/', '/download'], async (_req, res) => {
  let info: { size: string; date: string } | null = null;
  try {
    const s = await stat(join(config.downloadsDir, APK));
    info = {
      size: `${(s.size / 1024 / 1024).toFixed(0)} MB`,
      date: s.mtime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: config.timezone }),
    };
  } catch {
    /* not uploaded yet */
  }
  res.type('html').send(page(info));
});

function page(info: { size: string; date: string } | null): string {
  const button = info
    ? `<a class="btn" href="/download/${APK}" download>Download for Android</a>
       <p class="meta">Version 1.0 · ${info.size} · Updated ${info.date}</p>`
    : `<p class="meta">The app isn't available yet. Check back soon.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Get Loan</title>
<meta name="description" content="Download the Loan app for Android.">
<link rel="icon" href="/download/icon.png">
<style>
  :root { --bg:#F4F5F1; --card:#FFFFFF; --ink:#111513; --muted:#5C6560; --border:#E5E7E1; --brand:#0B8459; --top:#DCEFE3; --accent:#C4F16A; --onAccent:#111513; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0A0D0C; --card:#141917; --ink:#EDF2EF; --muted:#9BA69F; --border:#222925; --brand:#3DD598; --top:#10251B; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
    color:var(--ink); background: linear-gradient(180deg, var(--top) 0, var(--bg) 320px); background-color: var(--bg); }
  main { max-width: 440px; margin: 0 auto; padding: 56px 20px 40px; }
  .hero { text-align:center; }
  .icon { width:96px; height:96px; border-radius:24px; box-shadow: 0 8px 24px rgba(0,0,0,.12); }
  h1 { font-size: 32px; letter-spacing: -0.02em; margin: 20px 0 6px; }
  .tag { color: var(--muted); margin: 0 0 28px; font-size: 17px; line-height: 1.4; }
  .btn { display:block; text-align:center; text-decoration:none; background: var(--accent); color: var(--onAccent);
    font-weight: 700; font-size: 18px; padding: 17px 20px; border-radius: 16px; }
  .btn:active { transform: scale(.98); }
  .meta { color: var(--muted); font-size: 14px; text-align:center; margin: 12px 0 0; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-top: 32px; }
  .card h2 { font-size: 16px; margin: 0 0 12px; }
  ol { margin: 0; padding-left: 20px; color: var(--muted); line-height: 1.55; font-size: 15px; }
  ol li { margin-bottom: 8px; }
  ol b { color: var(--ink); font-weight: 600; }
  .note { font-size: 13px; color: var(--muted); text-align:center; margin-top: 24px; }
</style>
</head>
<body>
<main>
  <div class="hero">
    <img class="icon" src="/download/icon.png" alt="">
    <h1>Loan</h1>
    <p class="tag">Keep track of money you lend and borrow with friends.</p>
  </div>
  ${button}
  <div class="card">
    <h2>How to install</h2>
    <ol>
      <li>Open this page <b>on your Android phone</b> and tap <b>Download for Android</b>.</li>
      <li>Open the downloaded <b>Loan.apk</b> (from the notification or your Downloads).</li>
      <li>If Android asks, allow installs from your browser, then tap <b>Install</b>.</li>
    </ol>
  </div>
  <p class="note">Android only. Already have Loan? Installing again updates it and keeps your account.</p>
</main>
</body>
</html>`;
}
