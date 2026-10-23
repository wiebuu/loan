import { Router } from 'express';
import { requireAuth, requireUsername } from '../auth.js';
import { config } from '../config.js';
import { notFound } from '../errors.js';
import { addSampleData, removeSampleData } from '../sampleData.js';

export const demoRouter = Router();

// POST /demo/sample-data -> fill your account with sample loans (demo mode only)
demoRouter.post('/demo/sample-data', requireAuth, requireUsername, async (req, res) => {
  if (!config.otpInResponse) throw notFound('Not available');
  res.json(await addSampleData(req.user!));
});

// DELETE /demo/sample-data -> take the demo loans out of your account again (demo mode only)
demoRouter.delete('/demo/sample-data', requireAuth, requireUsername, async (req, res) => {
  if (!config.otpInResponse) throw notFound('Not available');
  res.json(await removeSampleData(req.user!));
});
