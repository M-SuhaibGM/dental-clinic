import Icon from './Icons';

export default function StatCard({ label, value, icon, tone = 'teal', hint }) {
  return (
    <div className={`card stat-card tone-${tone}`}>
      <div className="stat-icon"><Icon name={icon} /></div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  );
}
