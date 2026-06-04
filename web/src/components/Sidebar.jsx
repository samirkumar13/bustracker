import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',           icon: '◈', label: 'Dashboard' },
  { to: '/buses',      icon: '⬡', label: 'Buses' },
  { to: '/routes',     icon: '◎', label: 'Routes' },
  { to: '/users',      icon: '⊕', label: 'Users' },
  { to: '/attendance', icon: '✦', label: 'Attendance' },
  { to: '/live',       icon: '◉', label: 'Live Map' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside style={s.sidebar}>
      <div style={s.brand}>
        <div style={s.logo}><span style={s.logoIcon}>🚌</span></div>
        <div>
          <div style={s.brandName}>BusTracker</div>
          <div style={s.brandSub}>Admin Panel</div>
        </div>
      </div>
      <div style={s.divider} />
      <nav style={s.nav}>
        <p style={s.navLabel}>MENU</p>
        {links.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
            <span style={s.icon}>{icon}</span><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={s.divider} />
      <div style={s.userCard}>
        <div style={s.userAvatar}>{user?.name?.[0]?.toUpperCase()}</div>
        <div style={s.userInfo}>
          <div style={s.userName}>{user?.name}</div>
          <div style={s.userRole}>Administrator</div>
        </div>
      </div>
      <button style={s.logout} onClick={logout}>↗ Sign out</button>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 240, minHeight: '100vh', background: '#fff', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', padding: '0 0 16px', position: 'sticky', top: 0, flexShrink: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 16px' },
  logo: { width: 34, height: 34, background: 'var(--accent-bg)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' },
  logoIcon: { fontSize: 18 },
  brandName: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' },
  brandSub: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: -1 },
  divider: { height: 1, background: 'var(--border)', margin: '0 16px' },
  nav: { flex: 1, padding: '12px 10px' },
  navLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.2px', padding: '0 8px', marginBottom: 6 },
  link: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', color: 'var(--text-secondary)',
    textDecoration: 'none', fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius)',
    transition: 'all 0.15s ease', marginBottom: 2,
  },
  active: { color: 'var(--accent)', background: 'var(--accent-bg)', fontWeight: 600 },
  icon: { fontSize: 15, width: 20, textAlign: 'center', opacity: 0.6 },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 6px' },
  userAvatar: {
    width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #818cf8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  userInfo: { minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: 11, color: 'var(--text-muted)' },
  logout: {
    margin: '6px 16px 0', padding: '7px 0', background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 12,
    fontWeight: 500, fontFamily: 'var(--font)',
  },
};
