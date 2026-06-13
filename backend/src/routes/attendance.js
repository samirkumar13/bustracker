const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');
const prisma = require('../lib/prisma');

// ── Arduino NFC scan (no JWT — uses device API key) ──────────────────────────
router.post('/scan', validate(s.nfcScan), async (req, res) => {
  const { nfcCardId, busId, deviceKey } = req.body;

  // Simple device key auth for Arduino
  if (deviceKey !== process.env.ARDUINO_DEVICE_KEY) {
    return res.status(401).json({ error: 'Invalid device key' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { nfcCardId },
      include: { parent: { include: { user: true } } },
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

    // Notify ONLY this child's parent (private room, not a global broadcast)
    const parentUserId = student.parent?.userId;
    if (parentUserId) {
      req.io.to(`parent:${parentUserId}`).emit('attendance:update', {
        studentName: student.name,
        status,
        busId,
        timestamp: attendance.timestamp,
      });
    }

    // Real-time table update for admins only (contains all students' names)
    req.io.to('admins').emit('attendance:new', {
      id: attendance.id,
      busId,
      status,
      timestamp: attendance.timestamp,
      student: { name: student.name },
    });

    console.log(`NFC: ${student.name} ${status} bus ${busId}`);
    res.json({ student: student.name, status, timestamp: attendance.timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Arduino GPS update (no JWT — uses device API key) ────────────────────────
router.post('/gps', validate(s.gpsUpdate), async (req, res) => {
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

// ── Get attendance for a bus (today) — admin only (full roster of all students) ─
router.get('/bus/:busId', authenticate, authorize('ADMIN'), async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: { busId: req.params.busId, timestamp: { gte: today } },
    include: { student: { select: { name: true } } },
    orderBy: { timestamp: 'desc' },
  });
  res.json(records);
});

// ── Get attendance for a student record ───────────────────────────────────────
// Admin can view any student; a parent may only view a child linked to them.
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const student = await prisma.student.findUnique({
        where: { id: req.params.studentId },
        select: { parent: { select: { userId: true } } },
      });
      if (!student || student.parent?.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const records = await prisma.attendance.findMany({
      where: { studentId: req.params.studentId },
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
router.post('/assign-card', authenticate, authorize('ADMIN'), validate(s.assignCard), async (req, res) => {
  const { studentId, nfcCardId } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id: studentId },        // studentId is the Student record id
      data: { nfcCardId },
    });
    res.json({ ok: true, student });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Card already assigned to another student' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
