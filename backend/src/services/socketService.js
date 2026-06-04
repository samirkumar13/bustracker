const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function setupSocketHandlers(io) {
  // Authenticate socket connections
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

    // Driver joins their bus room and starts broadcasting location
    socket.on('driver:start', ({ busId }) => {
      if (socket.user.role !== 'DRIVER') return;
      socket.busId = busId;
      socket.join(`bus:${busId}`);
      io.emit('bus:active', { busId, active: true });
      console.log(`Driver started tracking bus ${busId}`);
    });

    // Driver sends GPS update
    socket.on('driver:location', async ({ busId, lat, lng, speed }) => {
      if (socket.user.role !== 'DRIVER') return;

      // Save to DB
      await prisma.busLocation.create({ data: { busId, lat, lng, speed } });

      // Broadcast to everyone tracking this bus
      io.to(`bus:${busId}`).emit('bus:location', { busId, lat, lng, speed, timestamp: new Date() });
    });

    // Driver stops trip
    socket.on('driver:stop', ({ busId }) => {
      if (socket.user.role !== 'DRIVER') return;
      socket.leave(`bus:${busId}`);
      io.emit('bus:active', { busId, active: false });
    });

    // Parent/student subscribes to a bus
    socket.on('track:bus', ({ busId }) => {
      socket.join(`bus:${busId}`);
      console.log(`${socket.user.email} tracking bus ${busId}`);
    });

    socket.on('untrack:bus', ({ busId }) => {
      socket.leave(`bus:${busId}`);
    });

    socket.on('disconnect', () => {
      if (socket.busId) {
        io.emit('bus:active', { busId: socket.busId, active: false });
      }
      console.log(`Socket disconnected: ${socket.user.email}`);
    });
  });
}

module.exports = { setupSocketHandlers };
