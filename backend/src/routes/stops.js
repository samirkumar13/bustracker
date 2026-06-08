const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');

const prisma = new PrismaClient();
router.use(authenticate);

router.get('/route/:routeId', async (req, res) => {
  const stops = await prisma.stop.findMany({
    where: { routeId: req.params.routeId },
    orderBy: { order: 'asc' },
  });
  res.json(stops);
});

router.post('/', authorize('ADMIN'), validate(s.createStop), async (req, res) => {
  const { name, lat, lng, order, routeId } = req.body;
  const stop = await prisma.stop.create({ data: { name, lat, lng, order, routeId } });
  res.status(201).json(stop);
});

router.put('/:id', authorize('ADMIN'), validate(s.updateStop), async (req, res) => {
  const stop = await prisma.stop.update({ where: { id: req.params.id }, data: req.body });
  res.json(stop);
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  await prisma.stop.delete({ where: { id: req.params.id } });
  res.json({ message: 'Stop deleted' });
});

module.exports = router;
