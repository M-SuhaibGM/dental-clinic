/** A label, a figure and what the figure counts. No icons or decoration: the number is the content. */
export default function StatCard({ label, value, hint }) {
  return (
    <div className="card stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}
