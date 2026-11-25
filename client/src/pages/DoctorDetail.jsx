import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icons';
import Avatar from '../components/Avatar';
import { ActiveBadge, StatusBadge } from '../components/Badge';
import { AsyncView } from '../components/StateViews';
import { useToast } from '../components/Toast';
import DoctorForm from '../features/DoctorForm';
import AppointmentForm from '../features/AppointmentForm';
import { useFetch } from '../hooks/useFetch';
import { doctorService } from '../services';
import { DAYS, formatDate, formatHours, formatTime } from '../utils/format';

const columns = [
  { key: 'date', label: 'Date', render: (a) => (
    <div className="stack"><strong>{formatDate(a.appointment_date)}</strong><span className="muted">{formatTime(a.start_time)} · {a.duration_minutes} min</span></div>) },
  { key: 'patient_name', label: 'Patient' },
  { key: 'reason', label: 'Reason', className: 'truncate' },
  { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
];

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: doctor, loading, error, reload } = useFetch(() => doctorService.get(id), [id], { key: `doctor:${id}` });
  const [modal, setModal] = useState(null); // 'edit' | 'book' | 'delete'
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      const res = await doctorService.remove(doctor.id);
      toast(res.message);
      navigate('/doctors');
    } catch (err) {
      toast(err.message, 'error');
      setModal(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/doctors" className="back-link"><Icon name="arrowLeft" size={16} /> All doctors</Link>
      <AsyncView loading={loading && !doctor} error={error} onRetry={reload}>
        {doctor && (
          <>
            <PageHeader title={<span className="doctor-hero"><Avatar name={doctor.name} size="lg" />{doctor.name}</span>} subtitle={doctor.specialization}
              actions={<>
                <Button variant="secondary" icon="edit" onClick={() => setModal('edit')}>Edit</Button>
                <Button variant="danger" icon="trash" onClick={() => setModal('delete')}>Delete</Button>
                <Button icon="plus" onClick={() => setModal('book')} disabled={!doctor.is_active}>Book</Button>
              </>} />

            <div className="detail-grid">
              <section className="card">
                <h2 className="card-title">Profile</h2>
                <dl className="details">
                  <dt>Status</dt><dd><ActiveBadge active={doctor.is_active} /></dd>
                  <dt>Email</dt><dd><a href={`mailto:${doctor.email}`} className="link">{doctor.email}</a></dd>
                  <dt>Phone</dt><dd><a href={`tel:${doctor.phone}`} className="link">{doctor.phone}</a></dd>
                  <dt>Hours</dt><dd>{formatHours(doctor.start_time, doctor.end_time)}</dd>
                </dl>
                <h3 className="subhead">Weekly availability</h3>
                <div className="week">
                  {DAYS.map((d) => (
                    <span key={d} className={`week-day ${doctor.available_days.includes(d) ? 'on' : ''}`}
                      aria-label={`${d}: ${doctor.available_days.includes(d) ? 'available' : 'unavailable'}`}>{d}</span>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <h2>Upcoming appointments</h2>
                  <Link to={`/appointments?doctor_id=${doctor.id}`} className="link">All for this doctor →</Link>
                </div>
                {doctor.appointments.length
                  ? <DataTable columns={columns} rows={doctor.appointments} caption="Upcoming appointments"
                      onRowClick={(a) => navigate(`/appointments?edit=${a.id}`)} />
                  : <EmptyState icon="calendar" title="No upcoming appointments" />}
              </section>
            </div>

            {modal === 'edit' && <DoctorForm doctor={doctor} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
            {modal === 'book' && <AppointmentForm doctors={[doctor]} defaultDoctorId={doctor.id}
              onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
            <ConfirmDialog open={modal === 'delete'} title="Delete doctor?" loading={busy} onCancel={() => setModal(null)} onConfirm={remove}
              message={<>Permanently delete <strong>{doctor.name}</strong>? This cannot be undone.</>} />
          </>
        )}
      </AsyncView>
    </>
  );
}
