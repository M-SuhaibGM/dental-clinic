import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doctorSchema, appointmentSchema, statusSchema, parseId } from '../src/validators/schemas.js';
import { ApiError } from '../src/middleware/errors.js';

const doctor = {
  name: 'Dr. Jane Doe', specialization: 'Orthodontics', email: 'Jane@Example.com', phone: '03001234567',
  available_days: ['Mon', 'Wed'], start_time: '09:00', end_time: '17:00',
};
const appointment = {
  patient_name: 'Ali Hassan', patient_phone: '+923211111111', doctor_id: '2',
  appointment_date: '2030-01-07', start_time: '10:00', reason: 'Routine check-up',
};

const issues = (schema, input) => {
  const r = schema.safeParse(input);
  assert.equal(r.success, false, 'expected validation to fail');
  return Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

test('doctor: valid input is normalised (email lowercased, phone formatted, active by default)', () => {
  const d = doctorSchema.parse(doctor);
  assert.equal(d.email, 'jane@example.com');
  assert.equal(d.phone, '0300 1234567');
  assert.equal(d.is_active, true);
});

test('doctor: required fields are reported by name', () => {
  const e = issues(doctorSchema, {});
  for (const f of ['name', 'specialization', 'email', 'phone', 'available_days', 'start_time', 'end_time']) assert.ok(e[f], f);
});

test('doctor: names cannot contain digits', () => {
  assert.match(issues(doctorSchema, { ...doctor, name: 'Dr. J4ne' }).name, /letters/);
});

test('doctor: rejects bad phone numbers, accepts +92 and 0-prefixed', () => {
  assert.ok(issues(doctorSchema, { ...doctor, phone: '12345' }).phone);
  assert.equal(doctorSchema.parse({ ...doctor, phone: '+92 300 1234567' }).phone, '+92 300 1234567');
});

test('doctor: end time must be after start and span at least an hour', () => {
  assert.match(issues(doctorSchema, { ...doctor, start_time: '10:00', end_time: '09:00' }).end_time, /after start/);
  assert.match(issues(doctorSchema, { ...doctor, start_time: '10:00', end_time: '10:30' }).end_time, /1 hour/);
});

test('doctor: available_days must be real weekdays and non-empty', () => {
  assert.ok(issues(doctorSchema, { ...doctor, available_days: [] }).available_days);
  assert.ok(issues(doctorSchema, { ...doctor, available_days: ['Funday'] })['available_days.0']);
});

test('appointment: valid input coerces doctor_id and applies defaults', () => {
  const a = appointmentSchema.parse(appointment);
  assert.equal(a.doctor_id, 2);
  assert.equal(a.duration_minutes, 30);
  assert.equal(a.status, 'pending');
  assert.equal(a.patient_email, null);
});

test('appointment: empty email is stored as null, bad email is rejected', () => {
  assert.equal(appointmentSchema.parse({ ...appointment, patient_email: '' }).patient_email, null);
  assert.ok(issues(appointmentSchema, { ...appointment, patient_email: 'nope' }).patient_email);
});

test('appointment: impossible dates and times are rejected', () => {
  assert.ok(issues(appointmentSchema, { ...appointment, appointment_date: '2030-02-30' }).appointment_date);
  assert.ok(issues(appointmentSchema, { ...appointment, start_time: '25:00' }).start_time);
});

test('appointment: duration limits and unknown status are rejected', () => {
  assert.ok(issues(appointmentSchema, { ...appointment, duration_minutes: 5 }).duration_minutes);
  assert.ok(issues(appointmentSchema, { ...appointment, duration_minutes: 500 }).duration_minutes);
  assert.ok(issues(appointmentSchema, { ...appointment, status: 'done' }).status);
});

test('status patch only accepts known statuses', () => {
  assert.equal(statusSchema.parse({ status: 'confirmed' }).status, 'confirmed');
  assert.equal(statusSchema.safeParse({ status: 'bogus' }).success, false);
});

test('parseId: accepts positive integers, throws a 400 ApiError naming `id` otherwise', () => {
  assert.equal(parseId('12'), 12);
  for (const bad of ['abc', '0', '-3', '1.5']) {
    assert.throws(() => parseId(bad), (err) => err instanceof ApiError && err.status === 400 && 'id' in err.details);
  }
});
