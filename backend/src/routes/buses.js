const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const c = require('../controllers/busController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');
const { audit } = require('../services/auditService');

const prisma = new PrismaClient();

router.use(authenticate);
router.get('/', c.getAllBuses);
router.get('/:id', c.getBus);
router.get('/:id/location', c.getBusLocation);
router.post('/', authorize('ADMIN'), validate(s.createBus), c.createBus);
router.put('/:id', authorize('ADMIN'), validate(s.updateBus), c.updateBus);
router.delete('/:id', authorize('ADMIN'), c.deleteBus);

// POST /api/buses/:id/broadcast — send a delay/info/emergency alert to all parents on this bus's route
router.post('/:id/broadcast', authorize('ADMIN'), validate(s.broadcast), async (req, res) => {
  const { message, type } = req.body;
  const busId = req.params.id;

  try {
    // Load bus + route + students + parents
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      select: {
        plateNumber: true,
        route: {
          select: {
            name: true,
            students: {
              where: { parentId: { not: null } },
              select: { parent: { select: { userId: true } } },
            },
          },
        },
      },
    });

    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    // Collect unique parent user IDs
    const parentIds = [
      ...new Set(
        (bus.route?.students ?? [])
          .map(s => s.parent?.userId)
          .filter(Boolean)
      ),
    ];

    // Emit to each parent's private room
    const payload = {
      busPlate: bus.plateNumber,
      routeName: bus.route?.name ?? '',
      message,
      type,
      sentAt: new Date(),
    };
    parentIds.forEach(uid => req.io.to(`parent:${uid}`).emit('admin:broadcast', payload));

    await audit(req, 'BROADCAST_SENT', 'BUS', busId, {
      type,
      message,
      recipientCount: parentIds.length,
    });

    res.json({ ok: true, recipientCount: parentIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
