import { pool, query } from '../db/pool.js';
import { ApiError } from '../middleware/errors.js';
import { appointmentSchema, appointmentFilters, statusSchema, parseId } from '../validators/schemas.js';
import { toMinutes, weekdayOf } from '../utils/dates.js';

const SELECT = `
  SELECT a.*, d.name AS doctor_name, d.specialization AS doctor_specialization
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id`;

const ACTIVE = ['pending', 'confirmed']; // statuses that occupy a time slot

// Wraps an INSERT/UPDATE ... RETURNING * so the joined row comes back in the same round trip.
const joined = (writeSql) => `
  WITH w AS (${writeSql})
  SELECT w.*, d.name AS doctor_name, d.specialization AS doctor_specialization
    FROM w JOIN doctors d ON d.id = w.doctor_id`;

async function findAppointment(id, db = pool) {
  const { rows } = await db.query(`${SELECT} WHERE a.id = $1`, [parseId(id)]);
  if (!rows[0]) throw new ApiError(404, 'Appointment not found');
  return rows[0];
}

/**
 * Business rules for a booking that occupies a slot:
 *  1. doctor must exist (and be active)
 *  2. slot must fall inside the doctor's working days/hours
 *  3. slot must not overlap another pending/confirmed appointment of the same doctor
 */
async function assertBookable(db, a, excludeId = null) {
  // One round trip for both the doctor and any clashing appointment (round trips dominate latency to a remote DB).
  const { rows } = await db.query(
    `SELECT d.*,
            (SELECT row_to_json(c) FROM (
               SELECT id, patient_name, start_time, duration_minutes FROM appointments
                WHERE doctor_id = d.id AND appointment_date = $2 AND status = ANY($3)
                  AND ($4::int IS NULL OR id <> $4)
                  AND start_time < ($5::time + make_interval(mins => $6))
                  AND $5::time < (start_time + make_interval(mins => duration_minutes))
                LIMIT 1) c) AS clash
       FROM doctors d WHERE d.id = $1`,
    [a.doctor_id, a.appointment_date, ACTIVE, excludeId, a.start_time, a.duration_minutes],
  );
  const doctor = rows[0];
  if (!doctor) throw new ApiError(400, 'Selected doctor does not exist', { doctor_id: 'Doctor not found' });
  if (!ACTIVE.includes(a.status)) return; // completed/cancelled rows don't block the calendar

  if (!doctor.is_active) throw new ApiError(400, `${doctor.name} is inactive and cannot take bookings`, { doctor_id: 'Doctor is inactive' });

  const start = toMinutes(a.start_time);
  const end = start + a.duration_minutes;
  const day = weekdayOf(a.appointment_date);
  if (!doctor.available_days.includes(day)) {
    throw new ApiError(400, `${doctor.name} is not available on ${day} (works ${doctor.available_days.join(', ')})`,
      { appointment_date: 'Doctor not available on this day' });
  }
  if (start < toMinutes(doctor.start_time) || end > toMinutes(doctor.end_time)) {
    throw new ApiError(400,
      `Appointment must be within ${doctor.name}'s hours (${doctor.start_time.slice(0, 5)}–${doctor.end_time.slice(0, 5)})`,
      { start_time: 'Outside working hours' });
  }

  // Two ranges overlap when each one starts before the other ends (checked in SQL above).
  const c = doctor.clash;
  if (c) {
    throw new ApiError(409,
      `Time slot overlaps with ${c.patient_name}'s appointment at ${c.start_time.slice(0, 5)} (${c.duration_minutes} min)`,
      { start_time: 'Overlaps an existing appointment' });
  }
}

/** Runs fn inside a transaction holding a per-doctor lock, so two concurrent bookings can't both pass the overlap check. */
async function withDoctorLock(doctorId, fn) {
  const client = await pool.connect();
  try {
    // doctorId is a validated integer, so it is safe to inline; this saves a network round trip.
    await client.query(`BEGIN; SELECT pg_advisory_xact_lock(${Number(doctorId)})`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// GET /api/appointments?status=&doctor_id=&date=&from=&to=&search=
const FILTER_SQL = {
  status: 'a.status =',
  doctor_id: 'a.doctor_id =',
  date: 'a.appointment_date =',
  from: 'a.appointment_date >=',
  to: 'a.appointment_date <=',
};

export async function listAppointments(req, res) {
  const { search, ...filters } = appointmentFilters.parse(req.query); // bad values -> 400, not a DB error
  const where = [];
  const params = [];

  for (const [key, sql] of Object.entries(FILTER_SQL)) {
    if (filters[key] === undefined) continue;
    params.push(filters[key]);
    where.push(`${sql} $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(a.patient_name ILIKE $${params.length} OR a.patient_phone ILIKE $${params.length} OR a.reason ILIKE $${params.length})`);
  }

  const { rows } = await query(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.appointment_date, a.start_time`,
    params,
  );
  res.json({ data: rows });
}

export async function getAppointment(req, res) {
  res.json({ data: await findAppointment(req.params.id) });
}

const INSERT_COLS = 'patient_name, patient_phone, patient_email, doctor_id, appointment_date, start_time, duration_minutes, reason, status';
const values = (a) => [a.patient_name, a.patient_phone, a.patient_email, a.doctor_id, a.appointment_date,
  a.start_time, a.duration_minutes, a.reason, a.status];

export async function createAppointment(req, res) {
  const a = appointmentSchema.parse(req.body);
  const created = await withDoctorLock(a.doctor_id, async (db) => {
    await assertBookable(db, a);
    const { rows } = await db.query(
      joined(`INSERT INTO appointments (${INSERT_COLS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`), values(a));
    return rows[0];
  });
  res.status(201).json({ data: created, message: 'Appointment created' });
}

export async function updateAppointment(req, res) {
  const id = parseId(req.params.id);
  const a = appointmentSchema.parse(req.body);
  const updated = await withDoctorLock(a.doctor_id, async (db) => {
    await assertBookable(db, a, id);
    const { rows } = await db.query(
      joined(`UPDATE appointments SET patient_name=$1, patient_phone=$2, patient_email=$3, doctor_id=$4, appointment_date=$5,
              start_time=$6, duration_minutes=$7, reason=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING *`),
      [...values(a), id]);
    if (!rows[0]) throw new ApiError(404, 'Appointment not found');
    return rows[0];
  });
  res.json({ data: updated, message: 'Appointment updated' });
}

// PATCH /api/appointments/:id/status — quick status change from the list
export async function updateStatus(req, res) {
  const id = parseId(req.params.id);
  const { status } = statusSchema.parse(req.body);

  // Fast path (one round trip): moving to completed/cancelled, or between pending <-> confirmed, never takes a
  // new slot, so no booking checks are needed.
  const { rows: fast } = await query(
    joined(`UPDATE appointments SET status=$1::varchar, updated_at=NOW()
             WHERE id=$2 AND ($1::text <> ALL($3::text[]) OR status = ANY($3::text[])) RETURNING *`),
    [status, id, ACTIVE],
  );
  if (fast[0]) return res.json({ data: fast[0], message: `Status changed to ${status}` });

  // Slow path: 404, or re-activating a cancelled/completed appointment, which must not create a double booking.
  const existing = await findAppointment(id);
  const updated = await withDoctorLock(existing.doctor_id, async (db) => {
    await assertBookable(db, { ...existing, status }, existing.id);
    const { rows } = await db.query(
      joined(`UPDATE appointments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`), [status, existing.id]);
    return rows[0];
  });
  res.json({ data: updated, message: `Status changed to ${status}` });
}

export async function deleteAppointment(req, res) {
  const { rows } = await query(`DELETE FROM appointments WHERE id = $1 RETURNING id`, [parseId(req.params.id)]);
  if (!rows[0]) throw new ApiError(404, 'Appointment not found');
  res.json({ data: { id: rows[0].id }, message: 'Appointment deleted' });
}
