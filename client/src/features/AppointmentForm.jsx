import Modal from '../components/Modal';
import Button from '../components/Button';
import { Input, PhoneInput, Select, Textarea, FormError } from '../components/FormField';
import { useForm } from '../hooks/useForm';
import { useToast } from '../components/Toast';
import { appointmentService } from '../services';
import { STATUSES, DAYS, capitalize, formatHours, formatTime, hhmm, todayISO, weekdayOf } from '../utils/format';
import {
  LIMITS, compact, sanitizeName, sanitizePhone, sanitizeEmail,
  validateName, validatePhone, validateEmail, validateText,
} from '../utils/validators';

const EMPTY = {
  patient_name: '', patient_phone: '', patient_email: '', doctor_id: '',
  appointment_date: '', start_time: '', duration_minutes: 30, reason: '', status: 'pending',
};

const DURATIONS = [15, 30, 45, 60, 90, 120].map((m) => ({ value: m, label: `${m} min` }));
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const inOneYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString('en-CA'); };

/** Create / edit an appointment. `doctors` feeds the doctor selector. */
export default function AppointmentForm({ appointment, doctors, defaultDoctorId, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(appointment);
  const initial = isEdit
    ? { ...appointment, patient_phone: sanitizePhone(appointment.patient_phone), patient_email: appointment.patient_email ?? '', start_time: hhmm(appointment.start_time) }
    : { ...EMPTY, appointment_date: todayISO(), doctor_id: defaultDoctorId ?? '' };

  const doctorOf = (v) => doctors.find((d) => d.id === Number(v.doctor_id));

  const validate = (v) => {
    const doctor = doctorOf(v);
    const occupiesSlot = v.status === 'pending' || v.status === 'confirmed'; // the server only checks hours for these
    const e = {
      patient_name: validateName(v.patient_name, 'Patient name', LIMITS.patientName),
      patient_phone: validatePhone(v.patient_phone),
      patient_email: validateEmail(v.patient_email),
      doctor_id: v.doctor_id ? '' : 'Select a doctor',
      reason: validateText(v.reason, 'Reason', LIMITS.reason),
    };

    if (!v.appointment_date) e.appointment_date = 'Date is required';
    else if (!isEdit && v.appointment_date < todayISO()) e.appointment_date = 'Date cannot be in the past';
    else if (v.appointment_date > inOneYear()) e.appointment_date = 'Bookings open up to 1 year ahead';
    else if (doctor && occupiesSlot && !doctor.available_days.includes(weekdayOf(v.appointment_date))) {
      e.appointment_date = `${doctor.name} doesn't work on ${weekdayOf(v.appointment_date)} (works ${DAYS.filter((d) => doctor.available_days.includes(d)).join(', ')})`;
    }

    if (!v.start_time) e.start_time = 'Time is required';
    else if (!isEdit && v.appointment_date === todayISO() && v.start_time < nowHHMM()) e.start_time = 'That time has already passed';
    else if (doctor && occupiesSlot) {
      const start = toMinutes(v.start_time);
      if (start < toMinutes(doctor.start_time)) e.start_time = `Doctor starts at ${formatTime(doctor.start_time)}`;
      else if (start + Number(v.duration_minutes) > toMinutes(doctor.end_time)) {
        e.start_time = `Must finish by ${formatTime(doctor.end_time)} — pick an earlier time or shorter duration`;
      }
    }
    return compact(e);
  };

  const { values, errors, formError, submitting, bind, handleSubmit } = useForm(initial, {
    validate,
    onSubmit: async (v) => {
      const payload = {
        patient_name: v.patient_name.trim(), patient_phone: v.patient_phone, patient_email: v.patient_email.trim() || null,
        doctor_id: Number(v.doctor_id), appointment_date: v.appointment_date, start_time: v.start_time,
        duration_minutes: Number(v.duration_minutes), reason: v.reason.trim(), status: v.status,
      };
      const res = isEdit ? await appointmentService.update(appointment.id, payload) : await appointmentService.create(payload);
      toast(res.message);
      onSaved(res.data);
    },
  });

  const selected = doctorOf(values);
  const doctorOptions = doctors.map((d) => ({
    value: d.id,
    label: `${d.name} — ${d.specialization}${d.is_active ? '' : ' (inactive)'}`,
    disabled: !d.is_active && d.id !== appointment?.doctor_id,
  }));

  return (
    <Modal open size="lg" title={isEdit ? 'Edit appointment' : 'New appointment'} onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button type="submit" form="appointment-form" loading={submitting}>{isEdit ? 'Save changes' : 'Book appointment'}</Button>
      </>}>
      <form id="appointment-form" onSubmit={handleSubmit} noValidate className="form-grid">
        <FormError message={formError} />
        <fieldset>
          <legend>Patient</legend>
          <Input label="Patient name" required maxLength={LIMITS.patientName.max} autoComplete="off" placeholder="e.g. Ali Hassan"
            hint="Letters only — no numbers" error={errors.patient_name} {...bind('patient_name', { sanitize: sanitizeName })} />
          <div className="form-row">
            <PhoneInput label="Phone" required error={errors.patient_phone} {...bind('patient_phone', { sanitize: sanitizePhone })} />
            <Input label="Email" type="email" maxLength={LIMITS.email.max} placeholder="name@example.com" hint="Optional"
              error={errors.patient_email} {...bind('patient_email', { sanitize: sanitizeEmail })} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Booking</legend>
          <Select label="Doctor" required placeholder="Select a doctor" options={doctorOptions} error={errors.doctor_id}
            hint={selected && `Available ${selected.available_days.join(', ')} · ${formatHours(selected.start_time, selected.end_time)}`}
            {...bind('doctor_id')} />
          <div className="form-row form-row-3">
            <Input label="Date" type="date" required min={isEdit ? undefined : todayISO()} max={inOneYear()}
              error={errors.appointment_date} {...bind('appointment_date')} />
            <Input label="Time" type="time" required step="300" min={selected && hhmm(selected.start_time)} max={selected && hhmm(selected.end_time)}
              error={errors.start_time} {...bind('start_time')} />
            <Select label="Duration" options={DURATIONS} error={errors.duration_minutes} {...bind('duration_minutes')} />
          </div>
          <Textarea label="Reason for visit" required maxLength={LIMITS.reason.max} placeholder="e.g. Tooth pain on the lower left side"
            error={errors.reason} {...bind('reason')} />
          <Select label="Status" options={STATUSES.map((s) => ({ value: s, label: capitalize(s) }))} error={errors.status} {...bind('status')} />
        </fieldset>
      </form>
    </Modal>
  );
}
