import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const roleConfig = {
  ADMIN:   { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  DRIVER:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  PARENT:  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
};

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    const { data } = await api.get('/users');
    setUsers(data);
  }
  useEffect(() => { load(); }, []);

  async function deleteUser(userId) {
    setDeleteError('');
    try {
      await api.delete(`/users/${userId}`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Delete failed');
      setConfirmDelete(null);
    }
  }

  const filtered = filter === 'ALL' ? users : users.filter(u => u.role === filter);
  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Users</h1>
          <p style={s.subtitle}>{users.length} login accounts — admins, drivers and parents</p>
        </div>
      </div>

      {/* Filter pills */}
      <div style={s.filters}>
        {['ALL', 'ADMIN', 'DRIVER', 'PARENT'].map(r => (
          <button
            key={r}
            style={filter === r ? s.filterActive : s.filterBtn}
            onClick={() => setFilter(r)}
          >
            {r}{r !== 'ALL' && <span style={s.filterCount}>{roleCounts[r] || 0}</span>}
          </button>
        ))}
      </div>

      {deleteError && <div style={{ ...s.errorMsg, marginBottom: 12 }}>⚠ {deleteError}</div>}

      {/* Users table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Phone</th>
              <th style={s.th}>Joined</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const rc = roleConfig[user.role] || roleConfig.PARENT;
              const isSelf = user.id === me?.id;
              const isPendingDelete = confirmDelete === user.id;

              return (
                <tr key={user.id} style={isPendingDelete ? { ...s.tr, background: 'rgba(239,68,68,0.05)' } : s.tr}>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <div style={s.avatar}>{user.name[0]}</div>
                      <div>
                        <div style={s.userName}>
                          {user.name}
                          {isSelf && <span style={s.youBadge}>you</span>}
                        </div>
                        <div style={s.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: rc.bg, color: rc.color }}>{user.role}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.muted}>{user.phone || '—'}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.dateText}>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td style={s.td}>
                    {isSelf ? (
                      <span style={s.muted}>—</span>
                    ) : isPendingDelete ? (
                      <div style={s.confirmRow}>
                        <span style={s.confirmText}>Delete {user.name}?</span>
                        <button style={s.confirmYes} onClick={() => deleteUser(user.id)}>Delete</button>
                        <button style={s.confirmNo} onClick={() => setConfirmDelete(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button style={s.deleteBtn} onClick={() => { setDeleteError(''); setConfirmDelete(user.id); }}>
                        🗑 Delete
                      </button>
                    )}
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
  errorMsg: { fontSize: 13, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 'var(--radius)' },

  filters: { display: 'flex', gap: 6, marginBottom: 14 },
  filterBtn: {
    padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  filterActive: {
    padding: '6px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 20,
    color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  filterCount: { background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 10, fontSize: 10 },

  tableCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)',
  },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 20px', fontSize: 13 },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 },
  userEmail: { fontSize: 11, color: 'var(--text-muted)' },
  youBadge: { fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1px 6px', borderRadius: 10, letterSpacing: '0.5px' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' },
  muted: { fontSize: 12, color: 'var(--text-muted)' },
  dateText: { fontSize: 12, color: 'var(--text-muted)' },

  deleteBtn: {
    padding: '5px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 'var(--radius)', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  confirmText: { fontSize: 12, color: '#ef4444', fontWeight: 500 },
  confirmYes: {
    padding: '4px 12px', background: '#ef4444', border: 'none', borderRadius: 'var(--radius)',
    color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  confirmNo: {
    padding: '4px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 },
};
