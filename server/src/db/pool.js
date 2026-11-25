import pg from 'pg';
import 'dotenv/config';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects (avoids timezone shifts).
pg.types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.');
}

// Render (and most hosted Postgres) require SSL; local Postgres usually does not.
const useSSL = process.env.DATABASE_SSL === 'true';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  // pg's default closes idle connections after 10s, so almost every click paid for a brand-new TCP+TLS+auth
  // handshake (2-3s to a remote database). Keep a couple of connections permanently warm instead.
  min: 2,
  idleTimeoutMillis: 5 * 60_000,
  keepAlive: true,
  connectionTimeoutMillis: 15_000,
});

// Optional: serverless Postgres (Neon free tier) suspends its compute after ~5 min idle and the next request then
// waits 2-4s for it to wake. Set DB_KEEPALIVE_MS=240000 to ping it and keep it awake (uses compute hours).
const keepAliveMs = Number(process.env.DB_KEEPALIVE_MS) || 0;
if (keepAliveMs > 0) setInterval(() => pool.query('SELECT 1').catch(() => {}), keepAliveMs).unref();

// Without this, an idle connection dropped by the host (Neon/Render do this) would crash the process.
pool.on('error', (err) => console.error('Idle database client error:', err.message));

export const query = (text, params) => pool.query(text, params);

/** Opens `n` connections up front so the first requests after a (re)start don't each pay the handshake. */
export async function warmPool(n = 2) {
  const clients = await Promise.all(Array.from({ length: n }, () => pool.connect()));
  clients.forEach((c) => c.release());
}
