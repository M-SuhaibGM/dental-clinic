import { capitalize } from '../utils/format';

/** Generic pill. tone: neutral | success | warning | info | danger */
export default function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const STATUS_TONE = { pending: 'warning', confirmed: 'info', completed: 'success', cancelled: 'danger' };

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{capitalize(status)}</Badge>;

export const ActiveBadge = ({ active }) => <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
