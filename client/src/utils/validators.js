// Field rules + "as you type" sanitizers. Mirrors server/src/validators/schemas.js so the API enforces the same limits.

export const LIMITS = {
  personName: { min: 3, max: 60 },
  patientName: { min: 2, max: 60 },
  specialization: { min: 3, max: 60 },
  email: { max: 100 },
  reason: { min: 5, max: 500 },
};

const NAME_RE = /^\p{L}[\p{L} .'’-]*$/u;
const SPECIALIZATION_RE = /^\p{L}[\p{L} &/,.'’-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// ---- Sanitizers: run on every keystroke, so disallowed characters simply cannot be typed ----
const collapse = (v) => v.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
export const sanitizeName = (v) => collapse(v.replace(/[^\p{L} .'’-]/gu, '')).replace(/^[^\p{L}]+/u, '');
export const sanitizeSpecialization = (v) => collapse(v.replace(/[^\p{L} &/,.'’-]/gu, '')).replace(/^[^\p{L}]+/u, '');
export const sanitizeEmail = (v) => v.replace(/\s/g, '');

/** Keeps digits and an optional leading "+": "+92" + 10 digits (13 chars) or 11 digits starting with 0. */
export const sanitizePhone = (v) => {
  const plus = v.trimStart().startsWith('+');
  const digits = v.replace(/\D/g, '');
  return (plus ? '+' : '') + digits.slice(0, plus ? 12 : 11);
};
export const phoneMaxLength = (v) => (v.startsWith('+') ? 13 : 11);

// ---- Validators: return an error message, or '' when the value is fine ----
export function validateName(v, label, { min, max } = LIMITS.personName, re = NAME_RE) {
  const s = v.trim();
  if (!s) return `${label} is required`;
  if (!re.test(s)) return `${label} can only contain letters, spaces, . ' and -`;
  if (s.length < min) return `${label} must be at least ${min} characters`;
  if (s.length > max) return `${label} must be at most ${max} characters`;
  return '';
}

export const validateSpecialization = (v) =>
  validateName(v, 'Specialization', LIMITS.specialization, SPECIALIZATION_RE).replace("letters, spaces, . ' and -", 'letters and spaces');

export function validatePhone(v) {
  const s = v.trim();
  if (!s) return 'Phone is required';
  if (s.startsWith('+')) {
    if (!s.startsWith('+92')) return 'Only Pakistani numbers (+92) are supported';
    const n = s.length - 3;
    return n === 10 ? '' : `After +92 enter exactly 10 digits (${n}/10 entered)`;
  }
  if (!s.startsWith('0')) return 'Start with 0 (11 digits) or +92 (then 10 digits)';
  return s.length === 11 ? '' : `Enter all 11 digits (${s.length}/11 entered)`;
}

export function validateEmail(v, { required = false } = {}) {
  const s = v.trim();
  if (!s) return required ? 'Email is required' : '';
  if (s.length > LIMITS.email.max) return `Email must be at most ${LIMITS.email.max} characters`;
  return EMAIL_RE.test(s) ? '' : 'Enter a valid email, e.g. name@example.com';
}

export function validateText(v, label, { min, max }) {
  const s = v.trim();
  if (!s) return `${label} is required`;
  if (s.length < min) return `${label} must be at least ${min} characters (${s.length}/${min})`;
  if (s.length > max) return `${label} must be at most ${max} characters`;
  return '';
}

/** Drops empty-string results so the object only holds real errors. */
export const compact = (errors) => Object.fromEntries(Object.entries(errors).filter(([, m]) => m));
