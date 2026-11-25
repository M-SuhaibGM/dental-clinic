import { initials } from '../utils/format';

const TONES = ['teal', 'blue', 'violet', 'amber', 'rose', 'slate'];

/** Round initials badge; the colour is derived from the name so the same person always looks the same. */
export default function Avatar({ name, size = 'md' }) {
  const tone = TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
  return <span className={`avatar avatar-${size} avatar-${tone}`} aria-hidden="true">{initials(name)}</span>;
}
