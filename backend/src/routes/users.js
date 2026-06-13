const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');
const { audit } = require('../services/auditService');
const prisma = require('../lib/prisma');

router.use(authenticate);

// ── All users (admin only) ────────────────────────────────────────────────────
router.get('/', authorize('ADMIN'), async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });
  res.json(users);
});

// ── Static routes MUST come before /:id ──────────────────────────────────────

// Get parent's linked children (returns Student records)
router.get('/my-children', async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Parents only' });
  try {
    const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
    if (!parent) return res.json([]);
    const students = await prisma.student.findMany({
      where: { parentId: parent.id },
      include: {
        route: { select: { id: true, name: true } },
        stop: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(students);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Parent links to a student by the school-issued student code
router.post('/link-child', validate(s.linkChild), async (req, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Parents only' });
  const studentCode = req.body.studentCode.trim().toUpperCase();
  try {
    const student = await prisma.student.findUnique({ where: { studentCode } });
    if (!student) return res.status(404).json({ error: 'No student found with that code' });

    const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
    if (!parent) return res.status(404).json({ error: 'Parent profile not found' });

    if (student.parentId && student.parentId !== parent.id)
      return res.status(409).json({ error: 'Student already linked to another parent' });

    await prisma.student.update({ where: { id: student.id }, data: { parentId: parent.id } });
    audit(req, 'CHILD_LINKED', 'STUDENT', student.id, { studentName: student.name, studentCode });
    res.json({ ok: true, studentName: student.name });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Self-deletion (GDPR / DPDP right to erasure) ─────────────────────────────
// Parent confirms with their password, then all their personal data is wiped.
// Students are UNLINKED (not deleted — they belong to the school).
router.delete('/me', validate(s.deleteAccount), async (req, res) => {
  if (req.user.role !== 'PARENT')
    return res.status(403).json({ error: 'Only parent accounts can be self-deleted.' });

  try {
    // Verify password before wiping anything
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

    await prisma.$transaction(async (tx) => {
      const parent = await tx.parent.findUnique({ where: { userId: req.user.id } });
      if (parent) {
        // Unlink children — students stay in the system for the school
        await tx.student.updateMany({ where: { parentId: parent.id }, data: { parentId: null } });
        await tx.parent.delete({ where: { id: parent.id } });
      }
      await tx.user.delete({ where: { id: req.user.id } });
    });

    audit(req, 'ACCOUNT_DELETED', 'USER', req.user.id, { email: user.email });
    res.json({ ok: true, message: 'Account and all personal data deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Dynamic :id route — must be last among GETs ───────────────────────────────
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

// ── Delete user (admin only) ──────────────────────────────────────────────────
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  if (req.user.id === req.params.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await prisma.$transaction(async (tx) => {
      // PARENT: unlink their children (students stay, just lose the parent link)
      const parent = await tx.parent.findUnique({ where: { userId: req.params.id } });
      if (parent) {
        await tx.student.updateMany({ where: { parentId: parent.id }, data: { parentId: null } });
        await tx.parent.delete({ where: { id: parent.id } });
      }
      // DRIVER: delete profile (FK lives on Driver, Bus is unaffected)
      const driver = await tx.driver.findUnique({ where: { userId: req.params.id } });
      if (driver) {
        await tx.driver.delete({ where: { id: driver.id } });
      }
      await tx.user.delete({ where: { id: req.params.id } });
    });
    audit(req, 'USER_DELETED', 'USER', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
