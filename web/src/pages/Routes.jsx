import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const stopIcon = L.divIcon({
  className: '',
  html: '<div style="background:#6366f1;width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.4);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:system-ui"></div>',
  iconSize: [24, 24], iconAnchor: [12, 12],
});

function StopMarkerIcon(num) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#6366f1;width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.4);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:system-ui">${num}</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  });
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState({ name: '', stops: [] });
  const [pendingStop, setPendingStop] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedRoute, setExpandedRoute] = useState(null);

  async function load() { const { data } = await api.get('/routes'); setRoutes(data); }
  useEffect(() => { load(); }, []);

  function handleMapClick({ lat, lng }) {
    const name = pendingStop.trim() || `Stop ${form.stops.length + 1}`;
    setForm(f => ({ ...f, stops: [...f.stops, { name, lat: +lat.toFixed(6), lng: +lng.toFixed(6) }] }));
    setPendingStop('');
  }
  function removeStop(i) { setForm(f => ({ ...f, stops: f.stops.filter((_, idx) => idx !== i) })); }
  function updateStopName(i, name) { setForm(f => { const stops = [...f.stops]; stops[i] = { ...stops[i], name }; return { ...f, stops }; }); }

  async function createRoute(e) {
    e.preventDefault(); setError('');
    if (form.stops.length < 2) return setError('Add at least 2 stops on the map');
    setSaving(true);
    try {
      await api.post('/routes', { name: form.name, schoolId: 'school-1', stops: form.stops });
      setForm({ name: '', stops: [] });
      setShowCreate(false);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function deleteRoute(id) {
    if (!confirm('Delete this route?')) return;
    await api.delete(`/routes/${id}`);
    load();
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Routes</h1>
          <p style={s.subtitle}>Define bus routes and their stops</p>
        </div>
        <button style={s.addBtn} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Cancel' : '+ New Route'}
        </button>
      </div>

      {/* Create route form */}
      {showCreate && (
        <div style={s.createCard}>
          <div style={s.createTop}>
            <div style={s.createFields}>
              <div style={s.field}>
                <label style={s.label}>Route Name</label>
                <input style={s.input} placeholder="e.g. Morning Route B" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Next Stop Name</label>
                <input style={s.inputHighlight} placeholder="Type name, then click on map..."
                  value={pendingStop} onChange={e => setPendingStop(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={s.mapWrap}>
            <MapContainer center={[18.5204, 73.8567]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; OSM &copy; CARTO'
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {form.stops.map((stop, i) => (
                <Marker key={i} position={[stop.lat, stop.lng]} icon={StopMarkerIcon(i + 1)}>
                  <Popup><b>Stop {i + 1}</b><br />{stop.name}<br /><small>{stop.lat}, {stop.lng}</small></Popup>
                </Marker>
              ))}
              {form.stops.length > 1 && (
                <Polyline positions={form.stops.map(s => [s.lat, s.lng])} color="#6366f1" weight={3} opacity={0.7} dashArray="8,4" />
              )}
            </MapContainer>
          </div>

          {/* Stop list */}
          {form.stops.length > 0 && (
            <div style={s.stopList}>
              {form.stops.map((stop, i) => (
                <div key={i} style={s.stopRow}>
                  <div style={s.stopNum}>{i + 1}</div>
                  <input style={s.stopNameInput} value={stop.name} onChange={e => updateStopName(i, e.target.value)} />
                  <span style={s.stopCoord}>{stop.lat}, {stop.lng}</span>
                  <button style={s.removeStopBtn} onClick={() => removeStop(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <div style={s.errorMsg}>⚠ {error}</div>}
          <div style={s.createActions}>
            <span style={s.stopCount}>{form.stops.length} stops placed</span>
            <button style={s.createBtn} onClick={createRoute} disabled={saving || !form.name || form.stops.length < 2}>
              {saving ? 'Creating...' : '✓ Create Route'}
            </button>
          </div>
        </div>
      )}

      {/* Existing routes */}
      <div style={s.routeList}>
        {routes.map(route => (
          <div key={route.id} style={s.routeCard}>
            <div style={s.routeTop}>
              <div style={s.routeInfo}>
                <div style={s.routeIcon}>◎</div>
                <div>
                  <div style={s.routeName}>{route.name}</div>
                  <div style={s.routeMeta}>
                    {route.stops?.length ?? 0} stops · Bus: {route.bus?.plateNumber ?? 'Unassigned'}
                  </div>
                </div>
              </div>
              <div style={s.routeActions}>
                <button style={s.expandBtn} onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}>
                  {expandedRoute === route.id ? 'Hide ▲' : 'Stops ▼'}
                </button>
                <button style={s.deleteBtn} onClick={() => deleteRoute(route.id)}>Delete</button>
              </div>
            </div>
            {expandedRoute === route.id && route.stops?.length > 0 && (
              <div style={s.stopsExpanded}>
                {route.stops.map((stop, i) => (
                  <div key={stop.id} style={s.expandedStop}>
                    <div style={s.expandedNum}>{i + 1}</div>
                    <span style={s.expandedName}>{stop.name}</span>
                    <span style={s.expandedCoord}>{stop.lat}, {stop.lng}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {routes.length === 0 && !showCreate && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>◎</div>
            <p style={s.emptyTitle}>No routes yet</p>
            <p style={s.emptyDesc}>Create your first route by clicking "+ New Route" above</p>
          </div>
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
  addBtn: { padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },

  createCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 },
  createTop: { marginBottom: 14 },
  createFields: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: { padding: '9px 13px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', minWidth: 220 },
  inputHighlight: { padding: '9px 13px', background: 'var(--bg-input)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', minWidth: 260 },

  mapWrap: { height: 360, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 },

  stopList: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 },
  stopRow: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' },
  stopNum: { width: 22, height: 22, background: 'var(--accent)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  stopNameInput: { flex: 1, padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' },
  stopCoord: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', minWidth: 120 },
  removeStopBtn: { background: 'var(--danger-bg)', border: 'none', color: 'var(--danger)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12 },

  errorMsg: { color: 'var(--danger)', background: 'var(--danger-bg)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 },
  createActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  stopCount: { fontSize: 12, color: 'var(--text-muted)' },
  createBtn: { padding: '9px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },

  routeList: { display: 'flex', flexDirection: 'column', gap: 10 },
  routeCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  routeTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' },
  routeInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  routeIcon: { width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  routeName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  routeMeta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  routeActions: { display: 'flex', gap: 6 },
  expandBtn: { padding: '5px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' },
  deleteBtn: { padding: '5px 12px', background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' },

  stopsExpanded: { borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 },
  expandedStop: { display: 'flex', alignItems: 'center', gap: 10 },
  expandedNum: { width: 20, height: 20, background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  expandedName: { fontSize: 13, color: 'var(--text-primary)', flex: 1 },
  expandedCoord: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' },

  emptyState: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: 36, color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: 'var(--text-muted)' },
};
