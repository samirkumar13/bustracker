require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const userRoutes = require('./routes/users');
const stopRoutes = require('./routes/stops');
const attendanceRoutes = require('./routes/attendance');
const { setupSocketHandlers } = require('./services/socketService');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Attach io to every request so routes can emit events
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
