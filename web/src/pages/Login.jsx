import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@school.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(email, password);
      if (user.role !== 'ADMIN') { setError('Admin access only'); setLoading(false); return; }
      navigate('/');
    } catch {
      setError('Invalid credentials');
    } finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      {/* Background decoration */}
      <div style={s.bgGlow} />
      <div style={s.bgGlow2} />

      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logo}>🚌</div>
        </div>
        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Sign in to BusTracker Admin</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@school.com"
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div style={s.error}>
              <span>⚠</span> {error}
            </div>
          )}
          <button style={s.btn} disabled={loading}>
            {loading ? (
              <span style={s.spinner}>⟳</span>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={s.demo}>
          Demo: <code style={s.code}>admin@school.com</code> / <code style={s.code}>admin123</code>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,70,229,0.08), transparent 70%)',
    top: '-15%',
    right: '-10%',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.05), transparent 70%)',
    bottom: '-10%',
    left: '-5%',
    pointerEvents: 'none',
  },
  card: {
    width: 380,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '36px 32px 28px',
    position: 'relative',
    zIndex: 1,
    boxShadow: 'var(--shadow-lg)',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'var(--accent-bg)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.3px' },
  input: {
    padding: '10px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'var(--font)',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  error: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    padding: '11px 0',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    transition: 'all 0.15s ease',
    marginTop: 4,
  },
  spinner: { display: 'inline-block', animation: 'spin 1s linear infinite' },
  demo: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 12,
    marginTop: 22,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
  },
  code: {
    background: 'var(--bg-input)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font)',
  },
};
