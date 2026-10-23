import pg from 'pg';
import { config } from './config.js';

// BIGINT ids come back as strings by default; they fit in a JS number here.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
// Keep DATE columns as 'YYYY-MM-DD' strings instead of JS Dates shifted by time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Every connection uses the app's time zone, so CURRENT_DATE means "today" for the user.
  options: `-c TimeZone=${config.timezone}`,
});

export type Db = pg.Pool | pg.PoolClient;

/** Run `fn` inside a transaction; roll back if it throws. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
