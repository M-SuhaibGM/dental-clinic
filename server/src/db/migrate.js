import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { pool } from './pool.js';

export async function migrate() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('✔ Schema ready');
}

// Run directly: `npm run db:migrate`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().then(() => pool.end()).catch((err) => { console.error(err); process.exit(1); });
}
