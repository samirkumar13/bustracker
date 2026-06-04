/**
 * BusTracker — GPS Simulator
 *
 * Pretends to be the Arduino GPS tracker.
 * Moves a bus smoothly along its route stops, loops back to start.
 *
 * Usage:
 *   cd simulator
 *   npm install
 *   node gps-simulator.js
 *
 * Options (set at top of file):
 *   BUS_ID        — from your DB (shown in admin dashboard)
 *   STEP_INTERVAL — how often to send a location update (ms)
 *   STEPS         — how many interpolation steps between each stop
 */

const http = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const SERVER_HOST  = 'localhost';
const SERVER_PORT  = 3000;
const DEVICE_KEY   = 'arduino-secret-key-123';
const BUS_ID       = process.env.BUS_ID || 'cmpz44rar000bkmv7olehpymn';

const STEP_INTERVAL = 2000;  // ms between each GPS ping
const STEPS         = 10;    // interpolation steps between stops (smoothness)
// ─────────────────────────────────────────────────────────────────────────────


async function getToken() {
  const body = JSON.stringify({ email: 'admin@school.com', password: 'admin123' });
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: SERVER_HOST, port: SERVER_PORT, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d).token); } catch { reject(); } });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function fetchRoute() {
  return new Promise(async (resolve, reject) => {
    const token = await getToken();
    const opts = {
      hostname: SERVER_HOST, port: SERVER_PORT,
      path: `/api/buses/${BUS_ID}`,
      headers: { Authorization: `Bearer ${token}` },
    };
    http.get(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Failed to parse bus data')); }
      });
    }).on('error', reject);
  });
}

function postLocation(lat, lng, speed) {
  const body = JSON.stringify({ busId: BUS_ID, lat, lng, speed, deviceKey: DEVICE_KEY });
  const opts = {
    hostname: SERVER_HOST, port: SERVER_PORT,
    path: '/api/attendance/gps',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };
  return new Promise((resolve) => {
    const req = http.request(opts, res => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', () => resolve());  // swallow errors, keep simulating
    req.write(body);
    req.end();
  });
}

function interpolate(from, to, steps) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    });
  }
  return points;
}

function calcSpeed(from, to) {
  // rough km/h estimate between two coords
  const R = 6371;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(from.lat * Math.PI/180) * Math.cos(to.lat * Math.PI/180) * Math.sin(dLng/2)**2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.min(60, Math.round((dist / (STEP_INTERVAL / 1000)) * 3600));
}

async function run() {
  console.log(`\n🚌 BusTracker GPS Simulator`);
  console.log(`   Bus ID: ${BUS_ID}`);
  console.log(`   Server: http://${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`   Interval: ${STEP_INTERVAL}ms\n`);

  // Get bus + route from backend
  let busData;
  try {
    busData = await fetchRoute();
  } catch (e) {
    console.error('❌  Could not connect to backend. Is it running?\n   Start with: cd backend && npm run dev');
    process.exit(1);
  }

  const stops = busData?.route?.stops;
  if (!stops || stops.length < 2) {
    console.error('❌  Bus has no route or fewer than 2 stops. Assign a route in the admin dashboard first.');
    process.exit(1);
  }

  console.log(`✅  Route: "${busData.route.name}" — ${stops.length} stops`);
  stops.forEach((s, i) => console.log(`   Stop ${i+1}: ${s.name} (${s.lat}, ${s.lng})`));
  console.log('\n▶  Simulation starting...\n');

  // Build full list of interpolated points (stops → loop back)
  function buildPoints() {
    const pts = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const segment = interpolate(
        { lat: stops[i].lat, lng: stops[i].lng },
        { lat: stops[i+1].lat, lng: stops[i+1].lng },
        STEPS
      );
      segment.forEach((p, idx) => {
        const spd = calcSpeed({ lat: stops[i].lat, lng: stops[i].lng }, { lat: stops[i+1].lat, lng: stops[i+1].lng });
        pts.push({ ...p, speed: spd, label: idx === 0 ? `Leaving ${stops[i].name}` : null });
      });
    }
    // Return leg (reverse back to start)
    for (let i = stops.length - 1; i > 0; i--) {
      const segment = interpolate(
        { lat: stops[i].lat, lng: stops[i].lng },
        { lat: stops[i-1].lat, lng: stops[i-1].lng },
        STEPS
      );
      segment.forEach(p => pts.push({ ...p, speed: 30 }));
    }
    return pts;
  }

  const points = buildPoints();
  let idx = 0;
  let lap = 1;

  async function tick() {
    const pt = points[idx];
    await postLocation(pt.lat, pt.lng, pt.speed);

    const label = pt.label ? ` → ${pt.label}` : '';
    process.stdout.write(`\r   Lap ${lap} | Point ${idx+1}/${points.length} | lat: ${pt.lat.toFixed(5)}, lng: ${pt.lng.toFixed(5)} | ${pt.speed} km/h${label}   `);

    idx++;
    if (idx >= points.length) {
      idx = 0;
      lap++;
      console.log(`\n\n🔄  Lap ${lap} starting...\n`);
    }

    setTimeout(tick, STEP_INTERVAL);
  }

  tick();
}

run();
