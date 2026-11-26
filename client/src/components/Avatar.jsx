import { initials } from '../utils/format';

/** Round initials badge in one quiet tone, so colour in the app is reserved for status and the accent. */
export default function Avatar({ name, size = 'md' }) {
  return <span className={`avatar avatar-${size}`} aria-hidden="true">{initials(name)}</span>;
}
