import { query } from '../db/pool.js';
import { toISODate } from '../utils/dates.js';

// GET /api/stats?date=YYYY-MM-DD — dashboard summary. The client sends its own "today" so
// the numbers match the clinic's timezone even if the server runs in UTC.
export async function getStats(req, res) {
  const today = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? '') ? req.query.date : toISODate(new Date());

  // One round trip: counts + the next 8 appointments as a JSON array.
  const { rows: [stats] } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM doctors)                                   AS total_doctors,
       (SELECT COUNT(*)::int FROM doctors WHERE is_active)                   AS active_doctors,
       (SELECT COUNT(*)::int FROM appointments
         WHERE appointment_date >= $1 AND status IN ('pending','confirmed')) AS upcoming_appointments,
       (SELECT COUNT(*)::int FROM appointments
         WHERE appointment_date = $1 AND status <> 'cancelled')             AS today_appointments,
       (SELECT COUNT(*)::int FROM appointments WHERE status = 'pending')     AS pending_appointments,
       COALESCE((SELECT json_agg(u) FROM (
          SELECT a.id, a.patient_name, a.appointment_date, a.start_time, a.duration_minutes, a.reason, a.status,
                 d.name AS doctor_name
            FROM appointments a JOIN doctors d ON d.id = a.doctor_id
           WHERE a.appointment_date >= $1 AND a.status IN ('pending','confirmed')
           ORDER BY a.appointment_date, a.start_time LIMIT 8) u), '[]'::json) AS upcoming`,
    [today],
  );

  res.json({ data: { ...stats, date: today } });
}
