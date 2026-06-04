import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Attendance() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/buses').then(({ data }) => { setBuses(data); if (data[0]) setSelectedBus(data[0].id); }); }, []);
  useEffect(() => { if (selectedBus) loadRecords(); }, [selectedBus]);

  async function loadRecords() {
    setLoading(true);
    const { data } = await api.get(`/attendance/bus/${selectedBus}`);
    setRecords(data);
    setLoading(false);
  }

  const boarded = records.filter(r => r.status === 'BOARDED').length;
  const exited = records.filter(r => r.status === 'EXITED').length;
  const onBus = boarded - exited;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Attendance</h1>
          <p style={s.subtitle}>NFC scan log — student check-in/out tracking</p>
        </div>
        <div style={s.controls}>
          <select style={s.select} value={selectedBus} onChange={e => setSelectedBus(e.target.value)}>
            {buses.map(b => <option key={b.id} value={b.id}>{b.plateNumber}</option>)}
          </select>
          <button style={s.refreshBtn} onClick={loadRecords}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={{ ...s.statDot, background: 'var(--success)' }} />
          <div>
            <div style={s.statValue}>{boarded}</div>
            <div style={s.statLabel}>Boarded</div>
          </div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statDot, background: 'var(--danger)' }} />
          <div>
            <div style={s.statValue}>{exited}</div>
            <div style={s.statLabel}>Exited</div>
          </div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statDot, background: 'var(--accent)' }} />
          <div>
            <div style={s.statValue}>{Math.max(0, onBus)}</div>
            <div style={s.statLabel}>On Bus Now</div>
          </div>
        </div>
      </div>

      {/* Scan log */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>Today's Scan Log</span>
          <span style={s.tableCount}>{records.length} scans</span>
        </div>

        {loading ? (
          <p style={s.empty}>Loading...</p>
        ) : records.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📋</div>
            <p style={s.emptyTitle}>No scans yet today</p>
            <p style={s.emptyDesc}>Records will appear here when students tap their NFC cards on the Arduino reader</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Student</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.studentCell}>
                      <div style={s.avatar}>{r.student?.user?.name?.[0] || '?'}</div>
                      <span style={s.studentName}>{r.student?.user?.name}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={r.status === 'BOARDED' ? s.boardedBadge : s.exitedBadge}>
                      {r.status === 'BOARDED' ? '● Boarded' : '○ Exited'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.timeText}>{new Date(r.timestamp).toLocaleTimeString()}</span>
                  </td>
                </tr>
              ))}
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
  controls: { display: 'flex', gap: 8 },
  select: {
    padding: '8px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  refreshBtn: {
    padding: '8px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  statDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  statValue: { fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' },
  statLabel: { fontSize: 12, color: 'var(--text-muted)' },

  tableCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  tableHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tableTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  tableCount: { fontSize: 12, color: 'var(--text-muted)' },
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
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 20px', fontSize: 13 },
  studentCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
  },
  studentName: { fontWeight: 600, color: 'var(--text-primary)' },
  boardedBadge: { color: 'var(--success)', background: 'var(--success-bg)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  exitedBadge: { color: 'var(--danger)', background: 'var(--danger-bg)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  timeText: { color: 'var(--text-muted)', fontSize: 12, fontFamily: 'ui-monospace, monospace' },

  emptyState: { textAlign: 'center', padding: '50px 20px' },
  emptyIcon: { fontSize: 36, marginBottom: 12, opacity: 0.4 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 },
};
