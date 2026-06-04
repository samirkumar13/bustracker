import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ buses: 0, routes: 0, users: 0, locations: 0 });
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/buses'), api.get('/routes'), api.get('/users')]).then(([b, r, u]) => {
      setStats({
        buses: b.data.length,
        routes: r.data.length,
        users: u.data.length,
        locations: b.data.reduce((acc, bus) => acc + (bus.locations?.length || 0), 0),
      });
      setRecentUsers(u.data.slice(-5).reverse());
    });
  }, []);

  const cards = [
    { icon: '⬡', label: 'Total Buses', value: stats.buses, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { icon: '◎', label: 'Active Routes', value: stats.routes, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { icon: '⊕', label: 'Total Users', value: stats.users, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { icon: '◉', label: 'GPS Pings', value: stats.locations, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.subtitle}>Overview of your school bus operations</p>
        </div>
      </div>

      {/* Stats grid */}
      <div style={s.grid}>
        {cards.map(({ icon, label, value, color, bg }) => (
          <div key={label} style={s.card}>
            <div style={{ ...s.cardIcon, background: bg, color }}>{icon}</div>
            <div>
              <div style={s.cardValue}>{value}</div>
              <div style={s.cardLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={s.columns}>
        {/* Quick actions */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Quick Actions</h2>
          <div style={s.actionGrid}>
            {[
              { icon: '⬡', label: 'Add Bus', desc: 'Register a new school bus', path: '/buses' },
              { icon: '◎', label: 'Create Route', desc: 'Set up a new bus route', path: '/routes' },
              { icon: '⊕', label: 'Manage Users', desc: 'Add users & assign NFC cards', path: '/users' },
              { icon: '◉', label: 'Live Map', desc: 'Track all buses in real-time', path: '/live' },
            ].map(a => (
              <a key={a.label} href={a.path} style={s.action}>
                <span style={s.actionIcon}>{a.icon}</span>
                <div>
                  <div style={s.actionLabel}>{a.label}</div>
                  <div style={s.actionDesc}>{a.desc}</div>
                </div>
                <span style={s.arrow}>→</span>
              </a>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Recent Users</h2>
          <div style={s.userList}>
            {recentUsers.map(u => (
              <div key={u.id} style={s.userRow}>
                <div style={s.userAvatar}>{u.name[0]}</div>
                <div style={s.userInfo}>
                  <div style={s.userName}>{u.name}</div>
                  <div style={s.userEmail}>{u.email}</div>
                </div>
                <span style={{ ...s.roleBadge, background: roleColor(u.role).bg, color: roleColor(u.role).text }}>
                  {u.role}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && <p style={s.empty}>No users yet</p>}
          </div>
        </div>
      </div>

      {/* Arduino integration box */}
      <div style={s.infoBox}>
        <div style={s.infoHeader}>
          <span style={s.infoIcon}>⚙</span>
          <div>
            <h3 style={s.infoTitle}>Hardware Integration</h3>
            <p style={s.infoDesc}>Arduino endpoints for GPS tracker & NFC reader</p>
          </div>
        </div>
        <div style={s.codeBlock}>
          <div style={s.codeLine}><span style={s.codeLabel}>GPS</span> <code style={s.code}>POST http://YOUR_IP:3000/api/attendance/gps</code></div>
          <div style={s.codeLine}><span style={s.codeLabel}>NFC</span> <code style={s.code}>POST http://YOUR_IP:3000/api/attendance/scan</code></div>
          <div style={s.codeLine}><span style={s.codeLabel}>KEY</span> <code style={s.code}>arduino-secret-key-123</code></div>
        </div>
      </div>
    </div>
  );
}

function roleColor(role) {
  const map = {
    ADMIN: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
    DRIVER: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    PARENT: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    STUDENT: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  };
  return map[role] || map.STUDENT;
}

const s = {
  page: { padding: '28px 36px 40px' },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    transition: 'all var(--transition)',
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 'var(--radius)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
  },
  cardValue: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' },
  cardLabel: { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },

  columns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 },
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
  },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.2px' },

  actionGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all var(--transition)',
    cursor: 'pointer',
  },
  actionIcon: { fontSize: 16, opacity: 0.5, width: 20, textAlign: 'center' },
  actionLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  actionDesc: { fontSize: 11, color: 'var(--text-muted)' },
  arrow: { marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 14 },

  userList: { display: 'flex', flexDirection: 'column', gap: 8 },
  userRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  userEmail: { fontSize: 11, color: 'var(--text-muted)' },
  roleBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 },

  infoBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
  },
  infoHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoIcon: { fontSize: 20, opacity: 0.5 },
  infoTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  infoDesc: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  codeBlock: { background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 },
  codeLine: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 },
  codeLabel: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.5px',
    minWidth: 34,
    textAlign: 'center',
  },
  code: { color: 'var(--text-secondary)', fontFamily: 'ui-monospace, monospace', fontSize: 12 },
};
