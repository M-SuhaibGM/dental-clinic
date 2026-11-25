import { STATUSES, capitalize } from '../utils/format';

/**
 * A status badge that is also the dropdown. While `saving` it is disabled with a spinner, so the user sees the new
 * value instantly (optimistic) but cannot change it again until the database has confirmed it.
 */
export default function StatusSelect({ value, saving, onChange, label }) {
  return (
    <span className={`status-select status-${value} ${saving ? 'is-saving' : ''}`}>
      <select value={value} disabled={saving} onChange={(e) => onChange(e.target.value)} aria-label={label} aria-busy={saving}>
        {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
      </select>
      {saving ? <span className="spinner spinner-xs" aria-hidden="true" />
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}
    </span>
  );
}
