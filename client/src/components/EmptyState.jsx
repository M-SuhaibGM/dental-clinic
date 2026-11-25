import Icon from './Icons';

export default function EmptyState({ icon = 'search', title, message, action }) {
  return (
    <div className="state-box">
      <div className="state-icon"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
