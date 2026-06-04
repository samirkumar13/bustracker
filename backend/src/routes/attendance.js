const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

// ── Arduino NFC scan (no JWT — uses device API key) ──────────────────────────
// Arduino posts to this endpoint when a student taps their NFC card
router.post('/scan', async (req, res) => {
  const { nfcCardId, busId, deviceKey } = req.body;

  // Simple device key auth for Arduino
  if (deviceKey !== process.env.ARDUINO_DEVICE_KEY) {
    return res.status(401).json({ error: 'Invalid device key' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { nfcCardId },
      include: { user: true, parent: { include: { user: true } } },
    });

    if (!student) return res.status(404).json({ error: 'Student card not registered' });

    // Determine if boarding or exiting (toggle based on last record)
    const last = await prisma.attendance.findFirst({
      where: { studentId: student.id, busId },
      orderBy: { timestamp: 'desc' },
    });

    const status = !last || last.status === 'EXITED' ? 'BOARDED' : 'EXITED';

    const attendance = await prisma.attendance.create({
      data: { studentId: student.id, busId, status },
    });

    // Emit to parent's userId room (parent listens on their own userId)
    const parentUserId = student.parent?.userId;
    req.io.emit(`attendance:${parentUserId}`, {
      studentName: student.user.name,
      status,
      busId,
      timestamp: attendance.timestamp,
    });

    console.log(`NFC: ${student.user.name} ${status} bus ${busId}`);
    res.json({ student: student.user.name, status, timestamp: attendance.timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Arduino GPS update (no JWT — uses device API key) ────────────────────────
// Arduino GPS module posts location every few seconds
router.post('/gps', async (req, res) => {
  const { busId, lat, lng, speed, deviceKey } = req.body;

  if (deviceKey !== process.env.ARDUINO_DEVICE_KEY) {
    return res.status(401).json({ error: 'Invalid device key' });
  }

  try {
    await prisma.busLocation.create({ data: { busId, lat, lng, speed, source: 'arduino' } });

    // Broadcast to all tracking this bus
    req.io.to(`bus:${busId}`).emit('bus:location', { busId, lat, lng, speed, timestamp: new Date() });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Get attendance for a bus (today) ─────────────────────────────────────────
router.get('/bus/:busId', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: { busId: req.params.busId, timestamp: { gte: today } },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { timestamp: 'desc' },
  });
  res.json(records);
});

// ── Get attendance by userId (looks up student profile first) ─────────────────
router.get('/student/:userId', authenticate, async (req, res) => {
  try {
    // Accept either a studentId or a userId
    const student = await prisma.student.findFirst({
      where: { OR: [{ id: req.params.userId }, { userId: req.params.userId }] },
    });
    if (!student) return res.json([]);

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: { bus: { select: { plateNumber: true } } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json(records);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Assign NFC card to student (admin only) ───────────────────────────────────
router.post('/assign-card', authenticate, authorize('ADMIN'), async (req, res) => {
  const { studentId, nfcCardId } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id: studentId },
      data: { nfcCardId },
    });
    res.json({ ok: true, student });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Card already assigned to another student' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
