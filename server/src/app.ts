import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { HttpError } from './errors.js';
import { authRouter } from './routes/auth.js';
import { loansRouter } from './routes/loans.js';
import { meRouter } from './routes/me.js';
import { notificationsRouter } from './routes/notifications.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/auth', authRouter);
  app.use(meRouter);
  app.use(loansRouter);
  app.use(notificationsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Express 5 sends errors thrown in async handlers here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
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
