import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { HttpError } from './errors.js';
import { authRouter } from './routes/auth.js';
import { demoRouter } from './routes/demo.js';
import { downloadRouter } from './download.js';
import { loansRouter } from './routes/loans.js';
import { meRouter } from './routes/me.js';
import { notificationsRouter } from './routes/notifications.js';

export function createApp() {
  const app = express();
  app.use(cors());
  // "I've paid" can carry a receipt photo, so it gets a bigger body limit than everything else.
  app.use('/loans/:id/claim-paid', express.json({ limit: '8mb' }));
  // A new loan can carry a receipt photo too.
  app.post('/loans', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d', index: false }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(downloadRouter);
  app.use('/auth', authRouter);
  app.use(meRouter);
  app.use(loansRouter);
  app.use(notificationsRouter);
  app.use(demoRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Express 5 sends errors thrown in async handlers here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if ((err as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ error: 'That photo is too big. Pick one under 5 MB' });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'Request body is not valid JSON' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our side' });
  });

  return app;
}
