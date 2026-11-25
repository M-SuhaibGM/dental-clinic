import 'dotenv/config';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { warmPool } from './db/pool.js';

const PORT = process.env.PORT || 5000;

// Create tables (idempotent) and seed mock data on first boot, so a fresh Render DB works without manual steps.
await migrate();
if (process.env.SEED_ON_START !== 'false') await seed();

await warmPool().catch((err) => console.warn('Pool warm-up skipped:', err.message));

createApp().listen(PORT, () => console.log(`🦷 API listening on http://localhost:${PORT}`));
