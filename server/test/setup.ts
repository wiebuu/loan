import { afterAll, beforeAll, vi } from 'vitest';
import { pool } from '../src/db.js';
import { migrate } from '../src/migrate.js';

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined); // keep OTP log lines out of the output
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(false);
});

afterAll(async () => {
  await pool.end();
});
