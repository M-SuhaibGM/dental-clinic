import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import Icon from '../components/Icons';
import { ActiveBadge } from '../components/Badge';
import Avatar from '../components/Avatar';
import { AsyncView } from '../components/StateViews';
import { useToast } from '../components/Toast';
import DoctorForm from '../features/DoctorForm';
import { useFetch, useDebounced } from '../hooks/useFetch';
import { doctorService } from '../services';
import { DAYS, formatHours } from '../utils/format';

export default function Doctors() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const q = useDebounced(search);

  const { data: doctors, loading, error, reload } = useFetch(() => doctorService.list({ search: q, active }), [q, active], { key: `doctors:${q}|${active}` });

  const [editing, setEditing] = useState(null);      // null = closed, {} = new, doctor = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const res = await doctorService.remove(deleting.id);
      toast(res.message);
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err.message, 'error');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  const columns = [
    { key: 'name', label: 'Doctor', render: (d) => (
      <div className="person"><Avatar name={d.name} />
        <div className="stack"><strong>{d.name}</strong><span className="muted">{d.specialization}</span></div></div>) },
    { key: 'contact', label: 'Contact', render: (d) => (
      <div className="stack"><span>{d.email}</span><span className="muted">{d.phone}</span></div>) },
    { key: 'availability', label: 'Availability', render: (d) => (
      <div className="stack">
        <span className="days" aria-label={`Works ${d.available_days.join(', ')}`}>
          {DAYS.map((x) => <i key={x} className={d.available_days.includes(x) ? 'on' : ''} title={x}>{x[0]}</i>)}
        </span>
        <span className="muted mono">{formatHours(d.start_time, d.end_time)}</span></div>) },
    { key: 'upcoming_count', label: 'Upcoming', className: 'num' },
    { key: 'is_active', label: 'Status', render: (d) => <ActiveBadge active={d.is_active} /> },
    { key: 'actions', label: 'Actions', className: 'actions', render: (d) => (
      <div className="row-actions">
        <Button size="sm" variant="ghost" icon="edit" aria-label={`Edit ${d.name}`} onClick={stop(() => setEditing(d))} />
        <Button size="sm" variant="ghost" icon="trash" aria-label={`Delete ${d.name}`} className="danger-text" onClick={stop(() => setDeleting(d))} />
      </div>) },
  ];

  const filtered = Boolean(q || active);

  return (
    <>
      <PageHeader title="Doctors" subtitle="Manage the clinic's dentists, their availability and status"
        actions={<Button icon="plus" onClick={() => setEditing({})}>Add doctor</Button>} />

      <div className={`card ${loading && doctors ? 'refreshing' : ''}`}>
        <div className="toolbar">
          <label className="search">
            <Icon name="search" />
            <input type="search" placeholder="Search" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search doctors" />
          </label>
          <select value={active} onChange={(e) => setActive(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <AsyncView loading={loading && !doctors} error={error} onRetry={reload} isEmpty={doctors?.length === 0}
          empty={filtered
            ? <EmptyState title="No matching doctors" message="Try a different search or filter"
                action={<Button variant="secondary" onClick={() => { setSearch(''); setActive(''); }}>Clear filters</Button>} />
            : <EmptyState icon="doctor" title="No doctors yet" message="Add your first doctor to start booking appointments"
                action={<Button icon="plus" onClick={() => setEditing({})}>Add doctor</Button>} />}>
          {doctors && <DataTable columns={columns} rows={doctors} caption="Doctors" onRowClick={(d) => navigate(`/doctors/${d.id}`)} />}
        </AsyncView>
      </div>

      {editing && (
        <DoctorForm doctor={editing.id ? editing : null} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }} />
      )}
      <ConfirmDialog open={!!deleting} title="Delete doctor?" loading={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={<>This will permanently delete <strong>{deleting?.name}</strong>. Doctors with appointments cannot be deleted — mark them inactive instead.</>} />
    </>
  );
}
