import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const busIcon = L.divIcon({
  className: '',
  html: '<div style="background:#6366f1;width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,0.9);font-size:16px;text-align:center;line-height:28px;box-shadow:0 2px 8px rgba(79,70,229,0.35)">🚌</div>',
  iconSize: [34, 34], iconAnchor: [17, 17],
});

const stopMarker = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid rgba(255,255,255,0.6);box-shadow:0 1px 4px rgba(22,163,74,0.3)"></div>',
  iconSize: [10, 10], iconAnchor: [5, 5],
});

export default function LiveMap() {
  const [buses, setBuses] = useState([]);
  const [locations, setLocations] = useState({});
  const [activeBuses, setActiveBuses] = useState(new Set());
  const [routeLines, setRouteLines] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const PROD_SOCKET = 'https://bustracker-production-b1c6.up.railway.app';
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || PROD_SOCKET, { auth: { token } });

    socketRef.current.on('bus:location', ({ busId, lat, lng }) => {
      setLocations(prev => ({ ...prev, [busId]: { lat, lng } }));
      setActiveBuses(prev => new Set([...prev, busId]));
    });

    socketRef.current.on('bus:active', ({ busId, active }) => {
      setActiveBuses(prev => {
        const next = new Set(prev);
        active ? next.add(busId) : next.delete(busId);
        return next;
      });
    });

    api.get('/buses').then(({ data }) => {
      setBuses(data);
      const locs = {};
      data.forEach(b => {
        if (b.locations?.[0]) locs[b.id] = { lat: b.locations[0].lat, lng: b.locations[0].lng };
        socketRef.current.emit('track:bus', { busId: b.id });
      });
      setLocations(locs);

      // Fetch real road paths from OSRM for each bus route
      data.forEach(bus => {
        const stops = bus.route?.stops ?? [];
        if (stops.length < 2) return;
        const waypoints = stops.map(s => `${s.lng},${s.lat}`).join(';');
        fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`)
          .then(r => r.json())
          .then(d => {
            if (d.code === 'Ok') {
              const coords = d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
              setRouteLines(prev => ({ ...prev, [bus.id]: coords }));
            }
          })
          .catch(() => {});
      });
    });

    return () => socketRef.current?.disconnect();
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Live Map</h1>
          <p style={s.subtitle}>Real-time bus positions</p>
        </div>
        <div style={s.legend}>
          <span style={s.legendItem}><span style={{ ...s.dot, background: '#6366f1' }} /> Bus</span>
          <span style={s.legendItem}><span style={{ ...s.dot, background: '#22c55e' }} /> Stop</span>
          <span style={s.legendItem}><span style={{ ...s.dot, background: '#6366f1', opacity: 0.4 }} /> Route</span>
          <span style={s.activeCount}>{activeBuses.size} active</span>
        </div>
      </div>

      <div style={s.mapWrap}>
        <MapContainer center={[20, 78]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OSM &copy; CARTO'
          />
          <FitBounds buses={buses} locations={locations} />
          {buses.map(bus => {
            const loc = locations[bus.id];
            const stops = bus.route?.stops ?? [];
            const roadCoords = routeLines[bus.id];
            return (
              <span key={bus.id}>
                {loc && (
                  <Marker position={[loc.lat, loc.lng]} icon={busIcon}>
                    <Popup>
                      <div style={{ fontFamily: 'var(--font)', padding: 4 }}>
                        <b style={{ fontSize: 14 }}>{bus.plateNumber}</b><br />
                        <span style={{ color: '#888' }}>{bus.route?.name ?? 'No route'}</span><br />
                        <small>Driver: {bus.driver?.user?.name ?? 'Unassigned'}</small>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {stops.map(stop => (
                  <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopMarker}>
                    <Popup><b>{stop.name}</b></Popup>
                  </Marker>
                ))}
                {/* Road path from OSRM, fallback to straight line */}
                {roadCoords?.length > 1 && (
                  <Polyline positions={roadCoords} color="#6366f1" weight={3} opacity={0.7} />
                )}
                {!roadCoords && stops.length > 1 && (
                  <Polyline positions={stops.map(s => [s.lat, s.lng])} color="#6366f1" weight={2} opacity={0.4} dashArray="6,4" />
                )}
              </span>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

// Fits map to all buses + stops once on load, never again (no jitter)
function FitBounds({ buses, locations }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !buses.length) return;
    const points = [];
    buses.forEach(bus => {
      const loc = locations[bus.id];
      if (loc) points.push([loc.lat, loc.lng]);
      bus.route?.stops?.forEach(s => points.push([s.lat, s.lng]));
    });
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
      fitted.current = true;
    }
  }, [buses, locations]);
  return null;
}

const s = {
  page: { padding: '28px 36px 40px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14 },
  legend: { display: 'flex', alignItems: 'center', gap: 16 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  activeCount: { fontSize: 12, fontWeight: 600, color: 'var(--success)', background: 'var(--success-bg)', padding: '3px 10px', borderRadius: 20 },
  mapWrap: {
    flex: 1,
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
  },
};
