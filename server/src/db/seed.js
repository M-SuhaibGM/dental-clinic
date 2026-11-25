import { pathToFileURL } from 'node:url';
import { pool } from './pool.js';
import { migrate } from './migrate.js';
import { toISODate, weekdayOf } from '../utils/dates.js';
import { doctors, appointments } from './mockData.js';

function nextWorkingDate(offset, days) {
  const step = offset < 0 ? -1 : 1;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  for (let i = 0; i < 7 && !days.includes(weekdayOf(toISODate(d))); i++) d.setDate(d.getDate() + step);
  return toISODate(d);
}

async function seedDoctors(client) {
  const ids = [];
  for (const d of doctors) {
    const { rows: [row] } = await client.query(
      `INSERT INTO doctors (name, specialization, email, phone, available_days, start_time, end_time, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [d.name, d.specialization, d.email, d.phone, d.available_days, d.start_time, d.end_time, d.is_active],
    );
    ids.push(row.id);
  }
  return ids;
}

async function seedAppointments(client, ids) {
  for (const a of appointments) {
    const doc = doctors[a.doctor];
    await client.query(
      `INSERT INTO appointments (patient_name, patient_phone, patient_email, doctor_id, appointment_date,
                                 start_time, duration_minutes, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [a.patient_name, a.patient_phone, a.patient_email, ids[a.doctor],
       nextWorkingDate(a.dayOffset, doc.available_days), a.start_time, a.duration_minutes, a.reason, a.status],
    );
  }
}

export async function seed({ reset = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (reset) await client.query('TRUNCATE appointments, doctors RESTART IDENTITY CASCADE');

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM doctors');
    if (rows[0].n > 0) {
      await client.query('ROLLBACK');
      console.log('ℹ Database already has data — seed skipped (use `npm run db:reset` to reseed)');
      return;
    }

    const ids = await seedDoctors(client);
    await seedAppointments(client, ids);

    await client.query('COMMIT');
    console.log(`✔ Seeded ${doctors.length} doctors and ${appointments.length} appointments`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate()
    .then(() => seed({ reset: process.argv.includes('--reset') }))
    .then(() => pool.end())
    .catch((err) => { console.error(err); process.exit(1); });
}