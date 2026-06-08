import { useEffect, useState } from 'react';
import api from '../services/api';

const ACTION_STYLE = {
  STUDENT_CREATED:  { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a' },
  STUDENT_UPDATED:  { bg: 'rgba(59,130,246,0.12)',  text: '#2563eb' },
  STUDENT_DELETED:  { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
  USER_DELETED:     { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
  ACCOUNT_DELETED:  { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
  CHILD_LINKED:     { bg: 'rgba(168,85,247,0.12)',  text: '#9333ea' },
  NFC_ASSIGNED:     { bg: 'rgba(245,158,11,0.12)',  text: '#d97706' },
  BROADCAST_SENT:   { bg: 'rgba(14,165,233,0.12)',  text: '#0284c7' },
};

function actionStyle(action) {
  return ACTION_STYLE[action] || { bg: 'rgba(107,114,128,0.12)', text: '#4b5563' };
}

function formatDetail(detail) {
  if (!detail) return null;
  try {
    const obj = JSON.parse(detail);
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ');
  } catch {
    return detail;
  }
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs?limit=200').then(({ data }) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Audit Log</h1>
          <p style={s.subtitle}>Who did what and when — last 200 actions</p>
        </div>
        <div style={s.count}>{logs.length} entries</div>
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={s.empty}>No audit entries yet. Actions will appear here once admin operations are performed.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Timestamp', 'User', 'Action', 'Resource', 'Detail', 'IP'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const { bg, text } = actionStyle(log.action);
                return (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                    <td style={s.td}>
                      <span style={s.timestamp}>
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={s.userName}>{log.userName}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: bg, color: text }}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={s.target}>{log.targetType}</span>
                      {log.targetId && <span style={s.targetId}>#{log.targetId.slice(-8)}</span>}
                    </td>
                    <td style={s.td}>
                      <span style={s.detail}>{formatDetail(log.detail) || '—'}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.ip}>{log.ip || '—'}</span>
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
  count: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '5px 14px', borderRadius: 20 },

  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },

  timestamp: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  badge: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  target: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  targetId: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', marginLeft: 6 },
  detail: { fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ip: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' },
  empty: { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
};
