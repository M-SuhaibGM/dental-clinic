import { Router } from 'express';
import { pool } from '../db/pool.js';
import * as doctors from '../controllers/doctors.js';
import * as appointments from '../controllers/appointments.js';
import { getStats } from '../controllers/stats.js';

const router = Router();

// Health check used by Render — also verifies the DB connection.
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

router.get('/stats', getStats);

router.route('/doctors').get(doctors.listDoctors).post(doctors.createDoctor);
router.route('/doctors/:id').get(doctors.getDoctor).put(doctors.updateDoctor).delete(doctors.deleteDoctor);

router.route('/appointments').get(appointments.listAppointments).post(appointments.createAppointment);
router.route('/appointments/:id')
  .get(appointments.getAppointment)
  .put(appointments.updateAppointment)
  .delete(appointments.deleteAppointment);
router.patch('/appointments/:id/status', appointments.updateStatus);

export default router;
