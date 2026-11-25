import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { StatusBadge } from '../components/Badge';
import { AsyncView } from '../components/StateViews';
import { useFetch } from '../hooks/useFetch';
import { statsService } from '../services';
import { formatDate, formatTime, todayISO } from '../utils/format';

const columns = [
  { key: 'when', label: 'When', render: (a) => (
    <div className="stack">
      <strong>{a.appointment_date === todayISO() ? 'Today' : formatDate(a.appointment_date)}</strong>
      <span className="muted">{formatTime(a.start_time)} · {a.duration_minutes} min</span>
    </div>) },
  { key: 'patient_name', label: 'Patient', render: (a) => <strong>{a.patient_name}</strong> },
  { key: 'doctor_name', label: 'Doctor' },
  { key: 'reason', label: 'Reason', className: 'truncate' },
  { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => statsService.get(), [], { key: 'stats' });

  return (
    <>
      <PageHeader title={greeting()} subtitle={`Here's the clinic at a glance · ${formatDate(todayISO())}`}
        actions={<Button icon="plus" onClick={() => navigate('/appointments?new=1')}>New appointment</Button>} />

      <AsyncView loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <>
            <section className="stats-grid" aria-label="Summary">
              <Link to="/doctors" className="card-link">
                <StatCard label="Total doctors" value={data.total_doctors} icon="doctor" hint={`${data.active_doctors} active`} />
              </Link>
              <Link to={`/appointments?from=${data.date}`} className="card-link">
                <StatCard label="Upcoming appointments" value={data.upcoming_appointments} icon="calendar" tone="blue" hint="Pending + confirmed" />
              </Link>
              <Link to={`/appointments?date=${data.date}`} className="card-link">
                <StatCard label="Today's appointments" value={data.today_appointments} icon="clock" tone="violet" hint="Excluding cancelled" />
              </Link>
              <Link to="/appointments?status=pending" className="card-link">
                <StatCard label="Pending" value={data.pending_appointments} icon="hourglass" tone="amber" hint="Awaiting confirmation" />
              </Link>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Upcoming appointments</h2>
                <Link to="/appointments" className="link">View all →</Link>
              </div>
              {data.upcoming.length ? (
                <DataTable columns={columns} rows={data.upcoming} caption="Upcoming appointments"
                  onRowClick={(a) => navigate(`/appointments?edit=${a.id}`)} />
              ) : (
                <EmptyState icon="calendar" title="No upcoming appointments" message="New bookings will show up here." />
              )}
            </section>
          </>
        )}
      </AsyncView>
    </>
  );
}
