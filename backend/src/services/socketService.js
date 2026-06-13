const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GEOFENCE_RADIUS_KM = 0.5; // 500 metres

// Dedup: key = `${busId}:${stopId}:${YYYY-MM-DD}` — cleared when driver stops trip
const notifiedToday = new Map();

// Route cache — avoids hitting DB on every 2-second GPS pulse
const busRouteCache = new Map(); // busId → { plateNumber, stops, expiresAt }

// ─── helpers ────────────────────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getBusRouteForGeofence(busId) {
  const cached = busRouteCache.get(busId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    select: {
      plateNumber: true,
      route: {
        select: {
          stops: {
            select: {
              id: true,
              name: true,
              lat: true,
              lng: true,
              students: {
                where: { parentId: { not: null } },
                select: {
                  name: true,
                  parent: { select: { userId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const data = {
    plateNumber: bus?.plateNumber ?? '',
    stops: bus?.route?.stops ?? [],
    expiresAt: Date.now() + 10 * 60 * 1000, // cache 10 minutes
  };
  busRouteCache.set(busId, data);
  return data;
}

async function checkGeofence(io, busId, busLat, busLng) {
  try {
    const { stops, plateNumber } = await getBusRouteForGeofence(busId);
    if (!stops.length) return;

    const today = new Date().toISOString().slice(0, 10);

    for (const stop of stops) {
      const dist = haversineKm(busLat, busLng, stop.lat, stop.lng);
      if (dist > GEOFENCE_RADIUS_KM) continue;

      const key = `${busId}:${stop.id}:${today}`;
      if (notifiedToday.has(key)) continue; // already fired today for this stop
      notifiedToday.set(key, Date.now());

      // Rough ETA assuming 20 km/h (refined on mobile from live speed)
      const etaMin = dist < 0.05 ? 0 : Math.max(1, Math.round((dist / 20) * 60));

      for (const student of stop.students) {
        const parentUserId = student.parent?.userId;
        if (!parentUserId) continue;

        io.to(`parent:${parentUserId}`).emit('geofence:alert', {
          stopName: stop.name,
          studentName: student.name,
          busPlate: plateNumber,
          etaMin,
          distanceM: Math.round(dist * 1000),
        });
      }

      console.log(
        `[Geofence] Bus ${busId} is ${Math.round(dist * 1000)}m from stop "${stop.name}" — notified parents`
      );
    }
  } catch (err) {
    console.error('[Geofence] Error:', err.message);
  }
}

function clearTripNotifications(busId) {
  const today = new Date().toISOString().slice(0, 10);
  for (const key of notifiedToday.keys()) {
    if (key.startsWith(`${busId}:`) && key.endsWith(today)) {
      notifiedToday.delete(key);
    }
  }
}

// ─── socket handlers ─────────────────────────────────────────────────────────

function setupSocketHandlers(io) {
  // Authenticate every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.email} (${socket.user.role})`);

    // Every parent automatically joins their personal room so targeted alerts reach them
    if (socket.user.role === 'PARENT') {
      socket.join(`parent:${socket.user.id}`);
    }

    // Admins join a shared room for the live attendance feed (all students' data)
    if (socket.user.role === 'ADMIN') {
      socket.join('admins');
    }

    // ── Driver events ────────────────────────────────────────────────────────

    socket.on('driver:start', ({ busId }) => {
      if (socket.user.role !== 'DRIVER') return;
      socket.busId = busId;
      socket.join(`bus:${busId}`);
      busRouteCache.delete(busId); // force fresh cache on new trip
      io.emit('bus:active', { busId, active: true });
      console.log(`Driver started tracking bus ${busId}`);
    });

    socket.on('driver:location', async ({ busId, lat, lng, speed }) => {
      if (socket.user.role !== 'DRIVER') return;

      // Persist location
      await prisma.busLocation.create({ data: { busId, lat, lng, speed } });

      // Broadcast to all trackers
      io.to(`bus:${busId}`).emit('bus:location', { busId, lat, lng, speed, timestamp: new Date() });

      // Geofence check (non-blocking — errors are swallowed inside checkGeofence)
      checkGeofence(io, busId, lat, lng);
    });

    socket.on('driver:stop', ({ busId }) => {
      if (socket.user.role !== 'DRIVER') return;
      socket.leave(`bus:${busId}`);
      io.emit('bus:active', { busId, active: false });
      clearTripNotifications(busId); // reset so next trip can notify again
    });

    // ── Parent / viewer events ───────────────────────────────────────────────

    socket.on('track:bus', ({ busId }) => {
      socket.join(`bus:${busId}`);
      console.log(`${socket.user.email} tracking bus ${busId}`);
    });

    socket.on('untrack:bus', ({ busId }) => {
      socket.leave(`bus:${busId}`);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      if (socket.busId) {
        io.emit('bus:active', { busId: socket.busId, active: false });
      }
      console.log(`Socket disconnected: ${socket.user.email}`);
    });
  });
}

module.exports = { setupSocketHandlers };
