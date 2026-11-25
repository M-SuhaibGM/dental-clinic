import { pathToFileURL } from 'node:url';
import { pool } from './pool.js';
import { migrate } from './migrate.js';
import { toISODate, weekdayOf } from '../utils/dates.js';

export const doctors = [
  { name: 'Dr. Ayesha Khan',   specialization: 'General Dentistry',   email: 'ayesha.khan@brightsmile.pk',   phone: '+92 300 1234567', available_days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], start_time: '09:00', end_time: '17:00', is_active: true },
  { name: 'Dr. Bilal Ahmed',   specialization: 'Orthodontics',        email: 'bilal.ahmed@brightsmile.pk',   phone: '+92 301 2345678', available_days: ['Mon','Wed','Fri'],                         start_time: '10:00', end_time: '18:00', is_active: true },
  { name: 'Dr. Sara Malik',    specialization: 'Endodontics',         email: 'sara.malik@brightsmile.pk',    phone: '+92 302 3456789', available_days: ['Tue','Thu','Sat'],                         start_time: '09:00', end_time: '15:00', is_active: true },
  { name: 'Dr. Usman Raza',    specialization: 'Oral Surgery',        email: 'usman.raza@brightsmile.pk',    phone: '+92 303 4567890', available_days: ['Mon','Tue','Wed','Thu'],                   start_time: '11:00', end_time: '19:00', is_active: true },
  { name: 'Dr. Hina Siddiqui', specialization: 'Pediatric Dentistry', email: 'hina.siddiqui@brightsmile.pk', phone: '+92 304 5678901', available_days: ['Mon','Tue','Wed','Thu','Fri'],             start_time: '08:00', end_time: '14:00', is_active: true },
  { name: 'Dr. Omar Farooq',   specialization: 'Periodontics',        email: 'omar.farooq@brightsmile.pk',   phone: '+92 305 6789012', available_days: ['Sat','Sun'],                               start_time: '10:00', end_time: '16:00', is_active: false },
];

export const appointments = [
  { doctor: 0, dayOffset: 0,  start_time: '09:00', duration_minutes: 30, patient_name: 'Ali Hassan',         patient_phone: '+92 321 1111111', patient_email: 'ali.hassan@example.com',     reason: 'Routine check-up and cleaning',          status: 'confirmed' },
  { doctor: 0, dayOffset: 0,  start_time: '10:00', duration_minutes: 45, patient_name: 'Fatima Noor',        patient_phone: '+92 321 2222222', patient_email: null,                         reason: 'Tooth sensitivity on lower left molar',  status: 'pending'   },
  { doctor: 0, dayOffset: 0,  start_time: '14:30', duration_minutes: 30, patient_name: 'Hamza Tariq',        patient_phone: '+92 321 3333333', patient_email: 'hamza.t@example.com',        reason: 'Filling replacement',                    status: 'pending'   },
  { doctor: 1, dayOffset: 1,  start_time: '11:00', duration_minutes: 60, patient_name: 'Zara Iqbal',         patient_phone: '+92 321 4444444', patient_email: 'zara.iqbal@example.com',     reason: 'Braces adjustment',                      status: 'confirmed' },
  { doctor: 1, dayOffset: 3,  start_time: '15:00', duration_minutes: 45, patient_name: 'Ahmed Shah',         patient_phone: '+92 321 5555555', patient_email: null,                         reason: 'Orthodontic consultation',               status: 'pending'   },
  { doctor: 2, dayOffset: 1,  start_time: '09:30', duration_minutes: 90, patient_name: 'Mariam Javed',       patient_phone: '+92 321 6666666', patient_email: 'mariam.j@example.com',       reason: 'Root canal treatment (session 1)',       status: 'confirmed' },
  { doctor: 2, dayOffset: 5,  start_time: '12:00', duration_minutes: 60, patient_name: 'Mariam Javed',       patient_phone: '+92 321 6666666', patient_email: 'mariam.j@example.com',       reason: 'Root canal treatment (session 2)',       status: 'pending'   },
  { doctor: 3, dayOffset: 2,  start_time: '13:00', duration_minutes: 60, patient_name: 'Imran Qureshi',      patient_phone: '+92 321 7777777', patient_email: null,                         reason: 'Wisdom tooth extraction',                status: 'confirmed' },
  { doctor: 3, dayOffset: 4,  start_time: '16:00', duration_minutes: 30, patient_name: 'Sana Butt',          patient_phone: '+92 321 8888888', patient_email: 'sana.butt@example.com',      reason: 'Post-surgery follow-up',                 status: 'pending'   },
  { doctor: 4, dayOffset: 2,  start_time: '08:30', duration_minutes: 30, patient_name: 'Ayaan Ali',            patient_phone: '+92 321 9999999', patient_email: null,                         reason: 'First dental visit (age 7)',                   status: 'pending'   },
  { doctor: 4, dayOffset: 6,  start_time: '10:30', duration_minutes: 30, patient_name: 'Eman Rashid'         , patient_phone: '+92 322 1010101', patient_email: 'rashid.family@example.com',  reason: 'Fluoride treatment (age 9)',                   status: 'confirmed' },
  { doctor: 0, dayOffset: 7,  start_time: '11:30', duration_minutes: 30, patient_name: 'Usama Rehman',       patient_phone: '+92 322 1212121', patient_email: null,                         reason: 'Teeth whitening consultation',           status: 'pending'   },
  { doctor: 0, dayOffset: -1, start_time: '12:00', duration_minutes: 30, patient_name: 'Nadia Pervaiz',      patient_phone: '+92 322 1313131', patient_email: 'nadia.p@example.com',        reason: 'Scaling and polishing',                  status: 'completed' },
  { doctor: 1, dayOffset: -3, start_time: '12:30', duration_minutes: 45, patient_name: 'Kamran Akmal',       patient_phone: '+92 322 1414141', patient_email: null,                         reason: 'Retainer fitting',                       status: 'completed' },
  { doctor: 3, dayOffset: -2, start_time: '17:00', duration_minutes: 30, patient_name: 'Rabia Anwar',        patient_phone: '+92 322 1515151', patient_email: 'rabia.a@example.com',        reason: 'Jaw pain assessment',                    status: 'cancelled' },
  { doctor: 4, dayOffset: -5, start_time: '12:00', duration_minutes: 30, patient_name: 'Hadi Khan',           patient_phone: '+92 322 1616161', patient_email: null,                         reason: 'Cavity check (age 6)',                         status: 'completed' },
];

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