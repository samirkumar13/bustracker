const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');

router.use(authenticate, authorize('ADMIN'));

// GET /api/audit-logs?limit=100&action=BROADCAST_SENT
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const where = req.query.action ? { action: req.query.action } : {};
  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
