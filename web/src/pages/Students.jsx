import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', routeId: '', stopId: '', nfcCardId: '' });
  const [editing, setEditing] = useState(null);   // student being edited (inline)
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  async function load() {
    const [st, rt] = await Promise.all([api.get('/students'), api.get('/routes')]);
    setStudents(st.data);
    setRoutes(rt.data);
  }
  useEffect(() => { load(); }, []);

  const stopsFor = (routeId) => routes.find(r => r.id === routeId)?.stops ?? [];

  async function createStudent(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/students', {
        name: form.name,
        grade: form.grade || undefined,
        routeId: form.routeId || null,
        stopId: form.stopId || null,
        nfcCardId: form.nfcCardId || undefined,
      });
      setForm({ name: '', grade: '', routeId: '', stopId: '', nfcCardId: '' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to add student'); }
  }

  function startEdit(st) {
    setEditing(st.id);
    setEditForm({
      name: st.name,
      grade: st.grade || '',
      routeId: st.route?.id || '',
      stopId: st.stop?.id || '',
      nfcCardId: st.nfcCardId || '',
    });
    setError('');
  }

  async function saveEdit(id) {
    setError('');
    try {
      await api.put(`/students/${id}`, {
        name: editForm.name,
        grade: editForm.grade || null,
        routeId: editForm.routeId || null,
        stopId: editForm.stopId || null,
        nfcCardId: editForm.nfcCardId || null,
      });
      setEditing(null);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save'); }
  }

  async function removeStudent(id) {
    setError('');
    try {
      await api.delete(`/students/${id}`);
      setConfirmDelete(null);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Delete failed'); setConfirmDelete(null); }
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  const linked = students.filter(s => s.parent).length;
  const withCard = students.filter(s => s.nfcCardId).length;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Students</h1>
          <p style={s.subtitle}>{students.length} students · {linked} linked to a parent · {withCard} with NFC card</p>
        </div>
        <button style={s.addBtn} onClick={() => { setShowForm(!showForm); setError(''); }}>
          {showForm ? '✕ Cancel' : '+ Add Student'}
        </button>
      </div>

      {error && <div style={s.errorMsg}>⚠ {error}</div>}

      {/* Add form */}
      {showForm && (
        <form onSubmit={createStudent} style={s.formCard}>
          <div style={s.formGrid}>
            <input style={s.input} placeholder="Full name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input style={s.input} placeholder="Grade / class (optional)" value={form.grade}
              onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
            <select style={s.select} value={form.routeId}
              onChange={e => setForm(f => ({ ...f, routeId: e.target.value, stopId: '' }))}>
              <option value="">No route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select style={s.select} value={form.stopId} disabled={!form.routeId}
              onChange={e => setForm(f => ({ ...f, stopId: e.target.value }))}>
              <option value="">No stop</option>
              {stopsFor(form.routeId).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
            <input style={s.input} placeholder="NFC card UID (optional)" value={form.nfcCardId}
              onChange={e => setForm(f => ({ ...f, nfcCardId: e.target.value }))} />
            <button style={s.submitBtn}>Add Student</button>
          </div>
          <p style={s.hint}>A unique student code is generated automatically — parents use it to link their child in the app.</p>
        </form>
      )}

      {/* Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Student</th>
              <th style={s.th}>Code</th>
              <th style={s.th}>Parent</th>
              <th style={s.th}>Route / Stop</th>
              <th style={s.th}>NFC Card</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(st => {
              const isEditing = editing === st.id;
              const isPendingDelete = confirmDelete === st.id;
              return (
                <tr key={st.id} style={isPendingDelete ? { ...s.tr, background: 'rgba(239,68,68,0.05)' } : s.tr}>
                  {isEditing ? (
                    <>
                      <td style={s.td}>
                        <input style={s.cellInput} value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                        <input style={{ ...s.cellInput, marginTop: 6 }} value={editForm.grade}
                          onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} placeholder="Grade" />
                      </td>
                      <td style={s.td}><span style={s.codeBadge}>{st.studentCode}</span></td>
                      <td style={s.td}>{st.parent?.user?.name || <span style={s.muted}>—</span>}</td>
                      <td style={s.td}>
                        <select style={s.cellSelect} value={editForm.routeId}
                          onChange={e => setEditForm(f => ({ ...f, routeId: e.target.value, stopId: '' }))}>
                          <option value="">No route</option>
                          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select style={{ ...s.cellSelect, marginTop: 6 }} value={editForm.stopId} disabled={!editForm.routeId}
                          onChange={e => setEditForm(f => ({ ...f, stopId: e.target.value }))}>
                          <option value="">No stop</option>
                          {stopsFor(editForm.routeId).map(st2 => <option key={st2.id} value={st2.id}>{st2.name}</option>)}
                        </select>
                      </td>
                      <td style={s.td}>
                        <input style={s.cellInput} value={editForm.nfcCardId}
                          onChange={e => setEditForm(f => ({ ...f, nfcCardId: e.target.value }))} placeholder="NFC UID" />
                      </td>
                      <td style={s.td}>
                        <div style={s.actionRow}>
                          <button style={s.saveBtn} onClick={() => saveEdit(st.id)}>Save</button>
                          <button style={s.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={s.td}>
                        <div style={s.studentCell}>
                          <div style={s.avatar}>{st.name[0]}</div>
                          <div>
                            <div style={s.studentName}>{st.name}</div>
                            {st.grade && <div style={s.grade}>{st.grade}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <button style={s.codeBadge} title="Click to copy" onClick={() => copyCode(st.studentCode)}>
                          {copied === st.studentCode ? '✓ Copied' : st.studentCode}
                        </button>
                      </td>
                      <td style={s.td}>
                        {st.parent?.user
                          ? <span style={s.parentLinked}>{st.parent.user.name}</span>
                          : <span style={s.muted}>Not linked</span>}
                      </td>
                      <td style={s.td}>
                        {st.route
                          ? <span style={s.routeText}>{st.route.name}{st.stop ? ` · ${st.stop.name}` : ''}</span>
                          : <span style={s.muted}>Unassigned</span>}
                      </td>
                      <td style={s.td}>
                        {st.nfcCardId
                          ? <span style={s.nfcBadge}>🔖 {st.nfcCardId}</span>
                          : <span style={s.muted}>No card</span>}
                      </td>
                      <td style={s.td}>
                        {isPendingDelete ? (
                          <div style={s.actionRow}>
                            <span style={s.confirmText}>Delete?</span>
                            <button style={s.confirmYes} onClick={() => removeStudent(st.id)}>Yes</button>
                            <button style={s.cancelBtn} onClick={() => setConfirmDelete(null)}>No</button>
                          </div>
                        ) : (
                          <div style={s.actionRow}>
                            <button style={s.editBtn} onClick={() => startEdit(st)}>Edit</button>
                            <button style={s.deleteBtn} onClick={() => { setError(''); setConfirmDelete(st.id); }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {students.length === 0 && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>🎒</div>
            <p style={s.emptyTitle}>No students yet</p>
            <p style={s.emptyDesc}>Add students above. Each gets a unique code parents use to link in the app.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 36px 40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14 },
  addBtn: {
    padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  errorMsg: { fontSize: 13, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 14 },

  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 },
  hint: { fontSize: 12, color: 'var(--text-muted)', marginTop: 12 },
  input: {
    padding: '9px 13px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  },
  select: {
    padding: '9px 13px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  },
  submitBtn: {
    padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },

  tableCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)',
  },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 20px', fontSize: 13, verticalAlign: 'top' },
  studentCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  studentName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  grade: { fontSize: 11, color: 'var(--text-muted)' },
  codeBadge: {
    fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)',
    background: 'var(--accent-bg)', padding: '4px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', cursor: 'pointer',
  },
  parentLinked: { color: 'var(--success)', fontWeight: 500 },
  routeText: { color: 'var(--text-secondary)' },
  nfcBadge: { fontSize: 12, color: 'var(--success)', background: 'var(--success-bg)', padding: '3px 10px', borderRadius: 'var(--radius-sm)' },
  muted: { fontSize: 12, color: 'var(--text-muted)' },

  cellInput: {
    width: '100%', padding: '6px 9px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
  },
  cellSelect: {
    width: '100%', padding: '6px 9px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
  },

  actionRow: { display: 'flex', alignItems: 'center', gap: 6 },
  editBtn: {
    padding: '5px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  deleteBtn: {
    padding: '5px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 'var(--radius)', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  saveBtn: {
    padding: '5px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)',
    color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  cancelBtn: {
    padding: '5px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  confirmText: { fontSize: 12, color: '#ef4444', fontWeight: 500 },
  confirmYes: {
    padding: '5px 12px', background: '#ef4444', border: 'none', borderRadius: 'var(--radius)',
    color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },

  emptyState: { textAlign: 'center', padding: '50px 20px' },
  emptyIcon: { fontSize: 36, marginBottom: 12, opacity: 0.4 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' },
};
