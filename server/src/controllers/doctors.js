import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errors.js';
import { doctorSchema, doctorFilters, parseId } from '../validators/schemas.js';
import { toISODate } from '../utils/dates.js';

const values = (d) => [d.name, d.specialization, d.email, d.phone, d.available_days, d.start_time, d.end_time, d.is_active];
const today = () => toISODate(new Date());

async function findDoctor(id) {
  const { rows } = await query(`SELECT * FROM doctors WHERE id = $1`, [parseId(id)]);
  if (!rows[0]) throw new ApiError(404, 'Doctor not found');
  return rows[0];
}

// GET /api/doctors?search=&active=true|false
export async function listDoctors(req, res) {
  const { search, active } = doctorFilters.parse(req.query);
  const params = [today()]; // $1 = today, used for upcoming_count
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(d.name ILIKE $${params.length} OR d.specialization ILIKE $${params.length} OR d.email ILIKE $${params.length})`);
  }
  if (active !== undefined) {
    params.push(active);
    where.push(`d.is_active = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT d.*,
            (SELECT COUNT(*)::int FROM appointments a
              WHERE a.doctor_id = d.id AND a.appointment_date >= $1
                AND a.status IN ('pending','confirmed')) AS upcoming_count
       FROM doctors d
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY d.is_active DESC, d.name`,
    params,
  );
  res.json({ data: rows });
}

// GET /api/doctors/:id  — includes the doctor's upcoming appointments for the detail view (one round trip)
export async function getDoctor(req, res) {
  const { rows } = await query(
    `SELECT d.*,
            COALESCE((SELECT json_agg(x) FROM (
               SELECT id, patient_name, appointment_date, start_time, duration_minutes, reason, status
                 FROM appointments
                WHERE doctor_id = d.id AND appointment_date >= $2
                ORDER BY appointment_date, start_time LIMIT 20) x), '[]'::json) AS appointments
       FROM doctors d WHERE d.id = $1`,
    [parseId(req.params.id), today()],
  );
  if (!rows[0]) throw new ApiError(404, 'Doctor not found');
  res.json({ data: rows[0] });
}

export async function createDoctor(req, res) {
  const d = doctorSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO doctors (name, specialization, email, phone, available_days, start_time, end_time, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    values(d),
  );
  res.status(201).json({ data: rows[0], message: 'Doctor created' });
}

export async function updateDoctor(req, res) {
  const id = parseId(req.params.id);
  const d = doctorSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE doctors SET name=$1, specialization=$2, email=$3, phone=$4, available_days=$5,
            start_time=$6, end_time=$7, is_active=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *`,
    [...values(d), id],
  );
  if (!rows[0]) throw new ApiError(404, 'Doctor not found');
  res.json({ data: rows[0], message: 'Doctor updated' });
}

export async function deleteDoctor(req, res) {
  const id = parseId(req.params.id);
  // Happy path is a single statement; only when nothing was deleted do we look up why.
  const { rows } = await query(
    `DELETE FROM doctors d WHERE d.id = $1
        AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = d.id) RETURNING d.id`,
    [id],
  );
  if (rows[0]) return res.json({ data: { id }, message: 'Doctor deleted' });

  const doctor = await findDoctor(id); // 404 if it never existed
  const { rows: [{ n }] } = await query(`SELECT COUNT(*)::int AS n FROM appointments WHERE doctor_id = $1`, [id]);
  throw new ApiError(409, `${doctor.name} has ${n} appointment(s). Delete or reassign them first, or mark the doctor inactive instead.`);
}
