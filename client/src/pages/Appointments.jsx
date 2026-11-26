import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import Icon from '../components/Icons';
import Avatar from '../components/Avatar';
import StatusSelect from '../components/StatusSelect';
import { AsyncView } from '../components/StateViews';
import { useToast } from '../components/Toast';
import AppointmentForm from '../features/AppointmentForm';
import { useFetch, useDebounced } from '../hooks/useFetch';
import { appointmentService, doctorService } from '../services';
import { STATUSES, capitalize, formatDate, formatTime } from '../utils/format';

const FILTER_KEYS = ['search', 'status', 'doctor_id', 'date', 'from'];

export default function Appointments() {
  const toast = useToast();
  // Filters live in the URL so they survive refresh and can be linked to (e.g. from the dashboard cards).
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const [search, setSearch] = useState(filters.search);
  const q = useDebounced(search);

  const setFilter = (key, value) => setParams((p) => {
    value ? p.set(key, value) : p.delete(key);
    return p;
  }, { replace: true });

  useEffect(() => { if (q !== filters.search) setFilter('search', q); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: appointments, loading, error, reload, mutate } = useFetch(
    () => appointmentService.list(filters),
    [filters.search, filters.status, filters.doctor_id, filters.date, filters.from],
    { key: `appointments:${JSON.stringify(filters)}` },
  );
  const { data: doctors } = useFetch(() => doctorService.list(), [], { key: 'doctors:|' });

  const [editing, setEditing] = useState(null); // null closed, {} new, appointment = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // Deep links: /appointments?new=1 opens the form, ?edit=ID opens an existing appointment.
  useEffect(() => {
    const editId = params.get('edit');
    if (params.get('new')) setEditing({});
    else if (editId) appointmentService.get(editId).then(setEditing).catch((e) => toast(e.message, 'error'));
    if (params.get('new') || editId) setParams((p) => { p.delete('new'); p.delete('edit'); return p; }, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Status changes are optimistic: the row shows the new status at once, the dropdown stays disabled until the
  // database confirms (then the server's row replaces ours), and a failure rolls the row back.
  const [saving, setSaving] = useState(() => new Set());
  const setRow = (id, patch) => mutate((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const markSaving = (id, on) => setSaving((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });

  const changeStatus = async (a, status) => {
    if (status === a.status || saving.has(a.id)) return;
    const previous = a.status;
    setRow(a.id, { status });
    markSaving(a.id, true);
    try {
      const res = await appointmentService.setStatus(a.id, status);
      setRow(a.id, res.data);
      toast(res.message);
    } catch (err) {
      setRow(a.id, { status: previous });
      toast(err.message, 'error');
    } finally {
      markSaving(a.id, false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const res = await appointmentService.remove(deleting.id);
      toast(res.message);
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'when', label: 'Date & time', render: (a) => (
      <div className="stack"><strong>{formatDate(a.appointment_date)}</strong><span className="muted mono">{formatTime(a.start_time)} · {a.duration_minutes} min</span></div>) },
    { key: 'patient', label: 'Patient', render: (a) => (
      <div className="person"><Avatar name={a.patient_name} />
        <div className="stack"><strong>{a.patient_name}</strong><span className="muted">{a.patient_phone}</span></div></div>) },
    { key: 'doctor_name', label: 'Doctor', render: (a) => (
      <div className="stack"><span>{a.doctor_name}</span><span className="muted">{a.doctor_specialization}</span></div>) },
    { key: 'reason', label: 'Reason', className: 'truncate' },
    { key: 'status', label: 'Status', render: (a) => (
      <StatusSelect value={a.status} saving={saving.has(a.id)} label={`Change status for ${a.patient_name}`}
        onChange={(status) => changeStatus(a, status)} />) },
    { key: 'actions', label: 'Actions', className: 'actions', render: (a) => (
      <div className="row-actions">
        <Button size="sm" variant="ghost" icon="edit" aria-label={`Edit appointment for ${a.patient_name}`} onClick={() => setEditing(a)} />
        <Button size="sm" variant="ghost" icon="trash" className="danger-text" aria-label={`Delete appointment for ${a.patient_name}`} onClick={() => setDeleting(a)} />
      </div>) },
  ];

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);
  const clearFilters = () => { setSearch(''); setParams({}, { replace: true }); };

  return (
    <>
      <PageHeader title="Appointments" subtitle="Book, reschedule and track patient visits"
        actions={<Button icon="plus" onClick={() => setEditing({})}>New appointment</Button>} />

      <div className={`card ${loading && appointments ? 'refreshing' : ''}`}>
        <div className="toolbar">
          <label className="search">
            <Icon name="search" />
            <input type="search" placeholder="Search" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search appointments" />
          </label>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
          </select>
          <select value={filters.doctor_id} onChange={(e) => setFilter('doctor_id', e.target.value)} aria-label="Filter by doctor">
            <option value="">All doctors</option>
            {doctors?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="date" value={filters.date} onChange={(e) => setFilter('date', e.target.value)} aria-label="Filter by date" />
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
        </div>
        {filters.from && <p className="filter-note">Showing appointments from {formatDate(filters.from)} onward</p>}

        <AsyncView loading={loading && !appointments} error={error} onRetry={reload} isEmpty={appointments?.length === 0}
          empty={hasFilters
            ? <EmptyState title="No matching appointments" message="Try changing the filters"
                action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
            : <EmptyState icon="calendar" title="No appointments yet" message="Book the first appointment to get started"
                action={<Button icon="plus" onClick={() => setEditing({})}>New appointment</Button>} />}>
          {appointments && <DataTable columns={columns} rows={appointments} caption="Appointments" />}
        </AsyncView>
      </div>

      {editing && (
        <AppointmentForm appointment={editing.id ? editing : null} doctors={doctors ?? []}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
      <ConfirmDialog open={!!deleting} title="Delete appointment?" loading={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete}
        message={deleting && <>Delete <strong>{deleting.patient_name}</strong>'s appointment on {formatDate(deleting.appointment_date)} at {formatTime(deleting.start_time)}? This cannot be undone.</>} />
    </>
  );
}
