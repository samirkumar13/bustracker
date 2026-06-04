import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Buses() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ plateNumber: '', capacity: 40, schoolId: 'school-1' });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [b, r, u] = await Promise.all([api.get('/buses'), api.get('/routes'), api.get('/users')]);
    setBuses(b.data);
    setRoutes(r.data);
    setDrivers(u.data.filter(u => u.role === 'DRIVER'));
  }
  useEffect(() => { load(); }, []);

  async function createBus(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/buses', form);
      setForm({ plateNumber: '', capacity: 40, schoolId: 'school-1' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  async function assignDriver(busId, driverUserId) {
    await api.put(`/buses/${busId}`, { driverUserId });
    load();
  }

  async function assignRoute(busId, routeId) {
    await api.put(`/buses/${busId}`, { routeId });
    load();
  }

  async function deleteBus(id) {
    if (!confirm('Delete this bus?')) return;
    await api.delete(`/buses/${id}`);
    load();
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Buses</h1>
          <p style={s.subtitle}>Manage your fleet of school buses</p>
        </div>
        <button style={s.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Bus'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>Register New Bus</h3>
          <form onSubmit={createBus} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Plate Number</label>
              <input style={s.input} placeholder="e.g. BUS-002" value={form.plateNumber}
                onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value }))} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Capacity</label>
              <input style={s.input} type="number" value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} required />
            </div>
            <div>
              {error && <p style={s.error}>⚠ {error}</p>}
              <button style={s.submitBtn}>Create Bus</button>
            </div>
          </form>
        </div>
      )}

      {/* Buses table */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>{buses.length} buses</span>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Bus</th>
              <th style={s.th}>Capacity</th>
              <th style={s.th}>Driver</th>
              <th style={s.th}>Route</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buses.map(bus => (
              <tr key={bus.id} style={s.tr}>
                <td style={s.td}>
                  <div style={s.busCell}>
                    <div style={s.busIcon}>⬡</div>
                    <span style={s.plateText}>{bus.plateNumber}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <span style={s.capacityBadge}>{bus.capacity} seats</span>
                </td>
                <td style={s.td}>
                  <select style={s.select} value={bus.driver?.userId || ''} onChange={e => assignDriver(bus.id, e.target.value)}>
                    <option value="">Unassigned</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </td>
                <td style={s.td}>
                  <select style={s.select} value={bus.route?.id || ''} onChange={e => assignRoute(bus.id, e.target.value)}>
                    <option value="">No route</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td style={s.td}>
                  <span style={bus.driver?.isActive ? s.statusLive : s.statusOffline}>
                    {bus.driver?.isActive ? '● Live' : '○ Offline'}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  <button style={s.deleteBtn} onClick={() => deleteBus(bus.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {buses.length === 0 && <p style={s.empty}>No buses registered yet</p>}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 36px 40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14 },
  addBtn: {
    padding: '9px 18px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },

  formCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    marginBottom: 20,
  },
  formTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 },
  form: { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: {
    padding: '9px 13px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
    minWidth: 180,
  },
  error: { color: 'var(--danger)', fontSize: 12, marginBottom: 6 },
  submitBtn: {
    padding: '9px 20px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },

  tableCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  tableHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  tableTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 20px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    borderBottom: '1px solid var(--border)',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' },
  td: { padding: '14px 20px', fontSize: 13 },
  busCell: { display: 'flex', alignItems: 'center', gap: 10 },
  busIcon: {
    width: 30,
    height: 30,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  },
  plateText: { fontWeight: 600, color: 'var(--text-primary)' },
  capacityBadge: { fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 20 },
  select: {
    padding: '6px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  statusLive: { color: 'var(--success)', fontSize: 12, fontWeight: 600 },
  statusOffline: { color: 'var(--text-muted)', fontSize: 12 },
  deleteBtn: {
    padding: '5px 12px',
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'var(--font)',
  },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 },
};
