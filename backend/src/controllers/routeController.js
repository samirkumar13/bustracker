const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllRoutes(req, res) {
  try {
    const routes = await prisma.route.findMany({
      include: { stops: { orderBy: { order: 'asc' } }, bus: true },
    });
    res.json(routes);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getRoute(req, res) {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: {
        stops: { orderBy: { order: 'asc' } },
        bus: { include: { locations: { orderBy: { timestamp: 'desc' }, take: 1 } } },
        students: { select: { id: true, name: true } },
      },
    });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json(route);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function createRoute(req, res) {
  const { name, schoolId, stops } = req.body;
  try {
    const route = await prisma.route.create({
      data: {
        name,
        schoolId,
        stops: {
          create: stops?.map((s, i) => ({ name: s.name, lat: s.lat, lng: s.lng, order: i + 1 })),
        },
      },
      include: { stops: true },
    });
    res.status(201).json(route);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateRoute(req, res) {
  try {
    const route = await prisma.route.update({
      where: { id: req.params.id },
      data: { name: req.body.name, busId: req.body.busId },
    });
    res.json(route);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteRoute(req, res) {
  const { id } = req.params;
  try {
    // Unlink students from this route/stop before deletion
    await prisma.student.updateMany({ where: { routeId: id }, data: { routeId: null, stopId: null } });
    // Unlink bus from this route
    await prisma.route.update({ where: { id }, data: { busId: null } });
    // Delete stops, then the route
    await prisma.stop.deleteMany({ where: { routeId: id } });
    await prisma.route.delete({ where: { id } });
    res.json({ message: 'Route deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getAllRoutes, getRoute, createRoute, updateRoute, deleteRoute };
