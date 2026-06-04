import { useEffect, useState } from 'react';
import api from '../services/api';

const roleConfig = {
  ADMIN:   { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  DRIVER:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  PARENT:  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  STUDENT: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [nfcMap, setNfcMap] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [nfcForm, setNfcForm] = useState({ studentId: '', nfcCardId: '' });
  const [nfcMsg, setNfcMsg] = useState('');

  async function load() {
    const [usersRes, nfcRes] = await Promise.all([
      api.get('/users'),
      api.get('/users/students-nfc').catch(() => ({ data: [] })),
    ]);
    setUsers(usersRes.data);
    setStudents(usersRes.data.filter(u => u.role === 'STUDENT'));
    const map = {};
    nfcRes.data.forEach(s => { map[s.userId] = s.nfcCardId; });
    setNfcMap(map);
  }
  useEffect(() => { load(); }, []);

  async function assignNfc(e) {
    e.preventDefault(); setNfcMsg('');
    try {
      await api.post('/attendance/assign-card', nfcForm);
      setNfcMsg('success');
      setNfcForm({ studentId: '', nfcCardId: '' });
      load();
    } catch (err) { setNfcMsg(err.response?.data?.error || 'Failed'); }
  }

  const filtered = filter === 'ALL' ? users : users.filter(u => u.role === filter);
  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Users</h1>
          <p style={s.subtitle}>{users.length} total users across all roles</p>
        </div>
      </div>

      {/* NFC Assignment */}
      <div style={s.nfcCard}>
        <div style={s.nfcHeader}>
          <span style={s.nfcIcon}>🔖</span>
          <div>
            <h3 style={s.nfcTitle}>Assign NFC Card</h3>
            <p style={s.nfcDesc}>Link a physical NFC card to a student for bus attendance tracking</p>
          </div>
        </div>
        <form onSubmit={assignNfc} style={s.nfcForm}>
          <select style={s.select} value={nfcForm.studentId} onChange={e => setNfcForm(f => ({ ...f, studentId: e.target.value }))} required>
            <option value="">Select student...</option>
            {students.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
          <input style={s.input} placeholder="NFC Card UID (e.g. A1B2C3D4)" value={nfcForm.nfcCardId}
            onChange={e => setNfcForm(f => ({ ...f, nfcCardId: e.target.value }))} required />
          <button style={s.submitBtn}>Assign</button>
        </form>
        {nfcMsg && (
          <div style={nfcMsg === 'success' ? s.successMsg : s.errorMsg}>
            {nfcMsg === 'success' ? '✓ NFC card assigned successfully' : `⚠ ${nfcMsg}`}
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div style={s.filters}>
        {['ALL', 'ADMIN', 'DRIVER', 'PARENT', 'STUDENT'].map(r => (
          <button
            key={r}
            style={filter === r ? s.filterActive : s.filterBtn}
            onClick={() => setFilter(r)}
          >
            {r}{r !== 'ALL' && <span style={s.filterCount}>{roleCounts[r] || 0}</span>}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>NFC Card</th>
              <th style={s.th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const rc = roleConfig[user.role] || roleConfig.STUDENT;
              return (
                <tr key={user.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <div style={s.avatar}>{user.name[0]}</div>
                      <div>
                        <div style={s.userName}>{user.name}</div>
                        <div style={s.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: rc.bg, color: rc.color }}>{user.role}</span>
                  </td>
                  <td style={s.td}>
                    {user.role === 'STUDENT'
                      ? nfcMap[user.id]
                        ? <span style={s.nfcBadge}>🔖 {nfcMap[user.id]}</span>
                        : <span style={s.nfcNone}>No card assigned</span>
                      : <span style={s.nfcNone}>—</span>}
                  </td>
                  <td style={s.td}>
                    <span style={s.dateText}>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={s.empty}>No users found</p>}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 36px 40px' },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14 },

  nfcCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
    marginBottom: 20,
  },
  nfcHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  nfcIcon: { fontSize: 20 },
  nfcTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  nfcDesc: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  nfcForm: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  select: {
    padding: '9px 13px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
    minWidth: 220,
  },
  input: {
    padding: '9px 13px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
    minWidth: 200,
  },
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
  successMsg: { marginTop: 10, fontSize: 13, color: 'var(--success)', background: 'var(--success-bg)', padding: '8px 12px', borderRadius: 'var(--radius)' },
  errorMsg: { marginTop: 10, fontSize: 13, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 'var(--radius)' },

  filters: { display: 'flex', gap: 6, marginBottom: 14 },
  filterBtn: {
    padding: '6px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  filterActive: {
    padding: '6px 14px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent)',
    borderRadius: 20,
    color: 'var(--accent)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  filterCount: { background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 10, fontSize: 10 },

  tableCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
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
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  userEmail: { fontSize: 11, color: 'var(--text-muted)' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' },
  nfcBadge: { fontSize: 12, color: 'var(--success)', background: 'var(--success-bg)', padding: '3px 10px', borderRadius: 'var(--radius-sm)' },
  nfcNone: { fontSize: 12, color: 'var(--text-muted)' },
  dateText: { fontSize: 12, color: 'var(--text-muted)' },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 },
};
