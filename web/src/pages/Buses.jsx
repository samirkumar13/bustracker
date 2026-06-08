import { useEffect, useState, useCallback, Fragment } from 'react';
import api from '../services/api';

const BROADCAST_TYPES = [
  { value: 'DELAY',     label: '🕐 Delay',     color: '#d97706' },
  { value: 'INFO',      label: 'ℹ Info',       color: '#2563eb' },
  { value: 'EMERGENCY', label: '🚨 Emergency',  color: '#dc2626' },
];

export default function Buses() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ plateNumber: '', capacity: 40, schoolId: 'school-1' });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // broadcastState: { [busId]: { open, type, message, sending, sent, sentCount, error } }
  const [broadcastState, setBroadcastState] = useState({});

  // Broadcast history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/audit-logs?action=BROADCAST_SENT&limit=30');
      setHistory(data);
    } catch { /* silently ignore */ }
    setHistoryLoading(false);
  }, []);

  async function load() {
    const [b, r, u] = await Promise.all([api.get('/buses'), api.get('/routes'), api.get('/users')]);
    setBuses(b.data);
    setRoutes(r.data);
    setDrivers(u.data.filter(u => u.role === 'DRIVER'));
  }
  useEffect(() => { load(); loadHistory(); }, []);

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

  function openBroadcast(busId) {
    setBroadcastState(prev => ({
      ...prev,
      [busId]: { open: true, type: 'DELAY', message: '', sending: false, sent: false, error: '' },
    }));
  }

  function closeBroadcast(busId) {
    setBroadcastState(prev => ({ ...prev, [busId]: { ...prev[busId], open: false } }));
  }

  function setBroadcastField(busId, field, value) {
    setBroadcastState(prev => ({
      ...prev,
      [busId]: { ...prev[busId], [field]: value },
    }));
  }

  async function sendBroadcast(busId) {
    const state = broadcastState[busId];
    if (!state?.message.trim()) return;
    setBroadcastField(busId, 'sending', true);
    setBroadcastField(busId, 'error', '');
    try {
      const { data } = await api.post(`/buses/${busId}/broadcast`, {
        message: state.message.trim(),
        type: state.type,
      });
      setBroadcastState(prev => ({
        ...prev,
        [busId]: { ...prev[busId], sending: false, sent: true, sentCount: data.recipientCount },
      }));
      loadHistory(); // refresh history panel
      setTimeout(() => closeBroadcast(busId), 2500);
    } catch (err) {
      setBroadcastState(prev => ({
        ...prev,
        [busId]: {
          ...prev[busId],
          sending: false,
          error: err.response?.data?.error || 'Failed to send',
        },
      }));
    }
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
            {buses.map(bus => {
              const bs = broadcastState[bus.id];
              return (
                <Fragment key={bus.id}>
                  <tr style={s.tr}>
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
                      <div style={s.actionRow}>
                        <button style={s.broadcastBtn} onClick={() => bs?.open ? closeBroadcast(bus.id) : openBroadcast(bus.id)}>
                          📢 Broadcast
                        </button>
                        <button style={s.deleteBtn} onClick={() => deleteBus(bus.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline broadcast form — expands below the row */}
                  {bs?.open && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
                        <div style={s.broadcastPanel}>
                          <div style={s.broadcastHeader}>
                            <span style={s.broadcastTitle}>📢 Send alert to parents on {bus.route?.name || bus.plateNumber}</span>
                            <button style={s.closeBtn} onClick={() => closeBroadcast(bus.id)}>✕</button>
                          </div>

                          {/* Type selector */}
                          <div style={s.typeRow}>
                            {BROADCAST_TYPES.map(t => (
                              <button
                                key={t.value}
                                style={{
                                  ...s.typeBtn,
                                  ...(bs.type === t.value ? { background: t.color, color: '#fff', borderColor: t.color } : {}),
                                }}
                                onClick={() => setBroadcastField(bus.id, 'type', t.value)}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {/* Message */}
                          <textarea
                            style={s.textarea}
                            placeholder={
                              bs.type === 'DELAY'     ? 'e.g. Bus BUS-001 is running 15 minutes late due to traffic.' :
                              bs.type === 'EMERGENCY' ? 'e.g. Bus BUS-001 has broken down. Alternate pickup arranged.' :
                                                        'e.g. Route change tomorrow — bus will skip Oak Street stop.'
                            }
                            value={bs.message}
                            maxLength={280}
                            rows={3}
                            onChange={e => setBroadcastField(bus.id, 'message', e.target.value)}
                          />
                          <div style={s.charCount}>{bs.message.length}/280</div>

                          {bs.error && <p style={s.broadcastError}>⚠ {bs.error}</p>}

                          {bs.sent ? (
                            <p style={s.sentMsg}>Message delivered to {bs.sentCount} parent{bs.sentCount !== 1 ? 's' : ''}</p>
                          ) : (
                            <button
                              style={{ ...s.sendBtn, opacity: bs.sending || !bs.message.trim() ? 0.5 : 1 }}
                              disabled={bs.sending || !bs.message.trim()}
                              onClick={() => sendBroadcast(bus.id)}
                            >
                              {bs.sending ? 'Sending…' : 'Send to all parents'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {buses.length === 0 && <p style={s.empty}>No buses registered yet</p>}
      </div>

      {/* Broadcast history */}
      <div style={s.tableCard}>
        <div style={{ ...s.tableHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={s.tableTitle}>Broadcast history</span>
          <span style={s.historyCount}>{history.length} messages</span>
        </div>

        {historyLoading ? (
          <p style={s.empty}>Loading…</p>
        ) : history.length === 0 ? (
          <p style={s.empty}>No broadcasts sent yet. Use the 📢 Broadcast button on any bus to send an alert to parents.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Time', 'Sent by', 'Bus', 'Type', 'Message', 'Recipients'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((log, i) => {
                let detail = {};
                try { detail = JSON.parse(log.detail || '{}'); } catch { /* ignore */ }
                const bus = buses.find(b => b.id === log.targetId);
                const typeInfo = BROADCAST_TYPES.find(t => t.value === detail.type) ?? BROADCAST_TYPES[1];
                return (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    <td style={s.td}>
                      <span style={s.historyTime}>
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{log.userName}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {bus?.plateNumber ?? log.targetId?.slice(-8) ?? '—'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.typePill, color: typeInfo.color, background: typeInfo.color + '18', borderColor: typeInfo.color + '30' }}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td style={{ ...s.td, maxWidth: 340 }}>
                      <span style={s.historyMsg}>{detail.message ?? '—'}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.recipientCount}>
                        {detail.recipientCount ?? 0} parent{detail.recipientCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
    padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },

  formCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: 24, marginBottom: 20,
  },
  formTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 },
  form: { display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: {
    padding: '9px 13px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'var(--font)', outline: 'none', minWidth: 180,
  },
  error: { color: 'var(--danger)', fontSize: 12, marginBottom: 6 },
  submitBtn: {
    padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },

  tableCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  tableHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  tableTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' },
  td: { padding: '14px 20px', fontSize: 13 },
  busCell: { display: 'flex', alignItems: 'center', gap: 10 },
  busIcon: {
    width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)',
    color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
  },
  plateText: { fontWeight: 600, color: 'var(--text-primary)' },
  capacityBadge: { fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 20 },
  select: {
    padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12,
    fontFamily: 'var(--font)', outline: 'none',
  },
  statusLive: { color: 'var(--success)', fontSize: 12, fontWeight: 600 },
  statusOffline: { color: 'var(--text-muted)', fontSize: 12 },
  actionRow: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  broadcastBtn: {
    padding: '5px 12px', background: 'rgba(14,165,233,0.1)', color: '#0284c7',
    border: '1px solid rgba(14,165,233,0.25)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)', fontWeight: 600,
  },
  deleteBtn: {
    padding: '5px 12px', background: 'var(--danger-bg)', color: 'var(--danger)',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)',
  },

  // Broadcast inline panel
  broadcastPanel: {
    padding: '20px 24px 20px', background: 'var(--bg-elevated)',
    borderTop: '2px solid rgba(14,165,233,0.3)',
  },
  broadcastHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  broadcastTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16,
    cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  },
  typeRow: { display: 'flex', gap: 8, marginBottom: 14 },
  typeBtn: {
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)',
    fontFamily: 'var(--font)', transition: 'all 0.15s',
  },
  textarea: {
    width: '100%', padding: '10px 13px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  },
  charCount: { fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4, marginBottom: 10 },
  broadcastError: { color: 'var(--danger)', fontSize: 12, marginBottom: 8 },
  sentMsg: { color: 'var(--success)', fontSize: 13, fontWeight: 600, padding: '6px 0' },
  sendBtn: {
    padding: '9px 20px', background: '#0284c7', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font)', transition: 'opacity 0.15s',
  },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 },

  // History panel
  historyCount: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '3px 12px', borderRadius: 20 },
  historyTime: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' },
  historyMsg: { fontSize: 13, color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  typePill: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, border: '1px solid', whiteSpace: 'nowrap' },
  recipientCount: { fontSize: 12, color: 'var(--text-muted)' },
};
