const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');
const { audit } = require('../services/auditService');
const prisma = require('../lib/prisma');

router.use(authenticate);

// Generate a short, human-friendly student code (e.g. STU-AB12C)
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `STU-${suffix}`;
}

// Default school for Phase 1 (single tenant). Falls back to the first school.
async function defaultSchoolId() {
  const school = await prisma.school.findFirst({ select: { id: true } });
  return school?.id ?? null;
}

const studentInclude = {
  parent: { include: { user: { select: { name: true, email: true } } } },
  route: { select: { id: true, name: true } },
  stop: { select: { id: true, name: true } },
};

// ── List all students (admin only) ───────────────────────────────────────────
router.get('/', authorize('ADMIN'), async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: studentInclude,
      orderBy: { name: 'asc' },
    });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Create a student record (admin only) ─────────────────────────────────────
router.post('/', authorize('ADMIN'), validate(s.createStudent), async (req, res) => {
  const { name, grade, routeId, stopId, nfcCardId } = req.body;
  try {
    const schoolId = await defaultSchoolId();
    if (!schoolId) return res.status(400).json({ error: 'No school configured. Run the seed first.' });

    // Retry a few times in case of a code collision
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const student = await prisma.student.create({
          data: {
            name,
            studentCode: genCode(),
            grade: grade || null,
            schoolId,
            routeId: routeId || null,
            stopId: stopId || null,
            nfcCardId: nfcCardId || null,
          },
          include: studentInclude,
        });
        audit(req, 'STUDENT_CREATED', 'STUDENT', student.id, { name: student.name, code: student.studentCode });
        return res.status(201).json(student);
      } catch (err) {
        if (err.code === 'P2002' && err.meta?.target?.includes('studentCode')) continue; // collision → retry
        if (err.code === 'P2002' && err.meta?.target?.includes('nfcCardId'))
          return res.status(409).json({ error: 'That NFC card is already assigned to another student' });
        throw err;
      }
    }
    res.status(500).json({ error: 'Could not generate a unique student code, please try again' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Update a student record (admin only) ─────────────────────────────────────
router.put('/:id', authorize('ADMIN'), validate(s.updateStudent), async (req, res) => {
  const { name, grade, routeId, stopId, nfcCardId } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (grade !== undefined) data.grade = grade || null;
  if (routeId !== undefined) data.routeId = routeId || null;
  if (stopId !== undefined) data.stopId = stopId || null;
  if (nfcCardId !== undefined) data.nfcCardId = nfcCardId || null;

  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data,
      include: studentInclude,
    });
    audit(req, 'STUDENT_UPDATED', 'STUDENT', student.id, { changes: data });
    res.json(student);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'That NFC card is already assigned to another student' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Student not found' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Delete a student record (admin only) ─────────────────────────────────────
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { studentId: req.params.id } });
      await tx.student.delete({ where: { id: req.params.id } });
    });
    audit(req, 'STUDENT_DELETED', 'STUDENT', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Student not found' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
