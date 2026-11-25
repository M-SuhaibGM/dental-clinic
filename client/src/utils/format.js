export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** '2026-11-26' -> 'Thu, 26 Nov 2026' (parsed as a calendar date, no timezone shift) */
export const formatDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

/** '14:30:00' -> '2:30 PM' */
export const formatTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const hhmm = (t) => (t ? t.slice(0, 5) : '');

export const formatHours = (start, end) => `${formatTime(start)} – ${formatTime(end)}`;

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** '2026-11-26' -> 'Thu' (calendar date, no timezone shift) */
export const weekdayOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
};

/** 'Dr. Ayesha Khan' -> 'AK' (skips titles) */
export const initials = (name) =>
  name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
