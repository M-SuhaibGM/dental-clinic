import { z } from 'zod';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

const time = (label) => z.string({ error: `${label} is required` }).regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Must be a time in HH:MM format');

// ---- Shared field rules (the client has a mirror of these in client/src/utils/validators.js) ----
const NAME_RE = /^\p{L}[\p{L} .'’-]*$/u; // letters, spaces, . ' - — no digits or other symbols

const personName = (label, { min = 3, max = 60 } = {}) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .regex(NAME_RE, `${label} can only contain letters, spaces, . ' and -`)
    .transform((v) => v.replace(/\s+/g, ' '));

// Pakistani numbers: "+92" followed by 10 digits, or 11 digits starting with 0. Spaces/dashes/brackets are ignored.
// Stored in a tidy format: "+92 300 1234567" / "0300 1234567".
const phone = z.string({ error: 'Phone is required' }).trim().min(1, 'Phone is required')
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^(\+92\d{10}|0\d{10})$/, 'Enter +92 followed by 10 digits, or 11 digits starting with 0'))
  .transform((v) => (v.startsWith('+') ? `+92 ${v.slice(3, 6)} ${v.slice(6)}` : `${v.slice(0, 4)} ${v.slice(4)}`));

const email = z.string({ error: 'Email is required' }).trim().toLowerCase().min(1, 'Email is required')
  .max(100, 'Email must be at most 100 characters')
  .pipe(z.email('Must be a valid email'));

const text = (label, { min, max }) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`);

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const doctorSchema = z
  .object({
    name: personName('Name'),
    specialization: text('Specialization', { min: 3, max: 60 })
      .regex(/^\p{L}[\p{L} &/,.'’-]*$/u, 'Specialization can only contain letters and spaces'),
    email,
    phone,
    available_days: z.array(z.enum(DAYS), { error: 'Select at least one available day' }).min(1, 'Select at least one available day'),
    start_time: time('Start time'),
    end_time: time('End time'),
    is_active: z.boolean().default(true),
  })
  .refine((d) => d.end_time > d.start_time, { message: 'End time must be after start time', path: ['end_time'] })
  .refine((d) => d.end_time <= d.start_time || toMin(d.end_time) - toMin(d.start_time) >= 60,
    { message: 'Working hours must span at least 1 hour', path: ['end_time'] });

export const appointmentSchema = z.object({
  patient_name: personName('Patient name', { min: 2, max: 60 }),
  patient_phone: phone,
  patient_email: z.union([email, z.literal(''), z.null()]).optional().transform((v) => v || null),
  doctor_id: z.coerce.number({ error: 'Doctor is required' }).int().positive('Doctor is required'),
  appointment_date: z.iso.date({ error: (i) => (i.input === undefined ? 'Date is required' : 'Must be a valid date (YYYY-MM-DD)') }),
  start_time: time('Time'),
  duration_minutes: z.coerce.number().int().min(10, 'Minimum 10 minutes').max(240, 'Maximum 240 minutes').default(30),
  reason: text('Reason', { min: 5, max: 500 }),
  status: z.enum(STATUSES).default('pending'),
});

export const statusSchema = z.object({ status: z.enum(STATUSES) });

// ---- Query-string filters for the list endpoints (empty values are ignored) ----
const optional = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const isoDate = z.iso.date('Must be a valid date (YYYY-MM-DD)');

export const doctorFilters = z.object({
  search: optional(z.string().trim().max(100)),
  active: optional(z.enum(['true', 'false']).transform((v) => v === 'true')),
});

export const appointmentFilters = z.object({
  search: optional(z.string().trim().max(100)),
  status: optional(z.enum(STATUSES)),
  doctor_id: optional(z.coerce.number({ error: 'Invalid doctor_id' }).int('Invalid doctor_id').positive('Invalid doctor_id')),
  date: optional(isoDate),
  from: optional(isoDate),
  to: optional(isoDate),
});

export const idParam = z.coerce.number({ error: 'Invalid id' }).int('Invalid id').positive('Invalid id');
