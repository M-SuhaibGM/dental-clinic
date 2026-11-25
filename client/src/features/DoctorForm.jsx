import Modal from '../components/Modal';
import Button from '../components/Button';
import { Input, PhoneInput, Field, FormError } from '../components/FormField';
import { useForm } from '../hooks/useForm';
import { useToast } from '../components/Toast';
import { doctorService } from '../services';
import { DAYS, hhmm } from '../utils/format';
import {
  LIMITS, compact, sanitizeName, sanitizeSpecialization, sanitizePhone, sanitizeEmail,
  validateName, validateSpecialization, validatePhone, validateEmail,
} from '../utils/validators';

const EMPTY = {
  name: '', specialization: '', email: '', phone: '',
  available_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start_time: '09:00', end_time: '17:00', is_active: true,
};

const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function validate(v) {
  const e = {
    name: validateName(v.name, 'Name'),
    specialization: validateSpecialization(v.specialization),
    email: validateEmail(v.email, { required: true }),
    phone: validatePhone(v.phone),
  };
  if (!v.available_days.length) e.available_days = 'Select at least one day';
  if (!v.start_time) e.start_time = 'Start time is required';
  if (!v.end_time) e.end_time = 'End time is required';
  else if (v.start_time && v.end_time <= v.start_time) e.end_time = 'End time must be after start time';
  else if (v.start_time && toMinutes(v.end_time) - toMinutes(v.start_time) < 60) e.end_time = 'Working hours must span at least 1 hour';
  return compact(e);
}

/** Create / edit doctor in a modal. Pass `doctor` to edit, omit to create. */
export default function DoctorForm({ doctor, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(doctor);
  const initial = isEdit
    ? { ...doctor, phone: sanitizePhone(doctor.phone), start_time: hhmm(doctor.start_time), end_time: hhmm(doctor.end_time) }
    : EMPTY;

  const { values, errors, formError, submitting, setField, bind, handleSubmit } = useForm(initial, {
    validate,
    onSubmit: async (v) => {
      const payload = {
        name: v.name.trim(), specialization: v.specialization.trim(), email: v.email.trim(), phone: v.phone,
        available_days: DAYS.filter((d) => v.available_days.includes(d)),
        start_time: v.start_time, end_time: v.end_time, is_active: v.is_active,
      };
      const res = isEdit ? await doctorService.update(doctor.id, payload) : await doctorService.create(payload);
      toast(res.message);
      onSaved(res.data);
    },
  });

  const toggleDay = (day) =>
    setField('available_days', values.available_days.includes(day)
      ? values.available_days.filter((d) => d !== day)
      : [...values.available_days, day]);

  return (
    <Modal open title={isEdit ? `Edit ${doctor.name}` : 'Add doctor'} onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button type="submit" form="doctor-form" loading={submitting}>{isEdit ? 'Save changes' : 'Add doctor'}</Button>
      </>}>
      <form id="doctor-form" onSubmit={handleSubmit} noValidate className="form-grid">
        <FormError message={formError} />
        <Input label="Full name" required placeholder="Dr. Jane Doe" maxLength={LIMITS.personName.max} autoComplete="off"
          hint="Letters only — no numbers" error={errors.name} {...bind('name', { sanitize: sanitizeName })} />
        <Input label="Specialization" required placeholder="Orthodontics" maxLength={LIMITS.specialization.max} autoComplete="off"
          error={errors.specialization} {...bind('specialization', { sanitize: sanitizeSpecialization })} />
        <Input label="Email" type="email" required placeholder="name@example.com" maxLength={LIMITS.email.max}
          error={errors.email} {...bind('email', { sanitize: sanitizeEmail })} />
        <PhoneInput label="Phone" required error={errors.phone} {...bind('phone', { sanitize: sanitizePhone })} />

        <Field label="Available days" name="available_days" required error={errors.available_days}>
          <div className="day-picker" role="group" aria-label="Available days">
            {DAYS.map((d) => (
              <button type="button" key={d} aria-pressed={values.available_days.includes(d)}
                className={`day-chip ${values.available_days.includes(d) ? 'on' : ''}`} onClick={() => toggleDay(d)}>{d}</button>
            ))}
          </div>
        </Field>
        <div className="form-row">
          <Input label="Start time" type="time" required error={errors.start_time} {...bind('start_time')} />
          <Input label="End time" type="time" required error={errors.end_time} {...bind('end_time')} />
        </div>
        <label className="switch">
          <input type="checkbox" checked={values.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
          <span>Active (can receive new appointments)</span>
        </label>
      </form>
    </Modal>
  );
}
