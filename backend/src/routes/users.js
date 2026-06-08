const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', authorize('ADMIN'), async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });
  res.json(users);
});

router.get('/:id', async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });
  res.json(user);
});

// List students with their NFC card status (admin only)
router.get('/students-nfc', authorize('ADMIN'), async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { user: { select: { name: true, email: true } } },
    });
    res.json(students.map(s => ({ userId: s.userId, name: s.user.name, email: s.user.email, nfcCardId: s.nfcCardId })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Parent links to a student by student email
router.post('/link-child', validate(s.linkChild), async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Parents only' });
  const { studentEmail } = req.body;
  try {
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (!studentUser || studentUser.role !== 'STUDENT')
      return res.status(404).json({ error: 'No student found with that email' });

    const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
    const student = await prisma.student.findUnique({ where: { userId: studentUser.id } });

    if (!parent || !student) return res.status(404).json({ error: 'Profile not found' });
    if (student.parentId) return res.status(409).json({ error: 'Student already linked to a parent' });

    await prisma.student.update({ where: { id: student.id }, data: { parentId: parent.id } });
    res.json({ ok: true, studentName: studentUser.name });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get parent's linked children
router.get('/my-children', async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Parents only' });
  try {
    const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
    if (!parent) return res.json([]);
    const students = await prisma.student.findMany({
      where: { parentId: parent.id },
      include: { user: { select: { name: true, email: true } }, route: true, stop: true },
    });
    res.json(students);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Student assigns themselves to a route + stop
router.put('/:id/student-assignment', validate(s.studentAssignment), async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const { routeId, stopId } = req.body;
  try {
    const student = await prisma.student.update({
      where: { userId: req.params.id },
      data: { routeId, stopId },
    });
    res.json(student);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
