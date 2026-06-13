const prisma = require('../lib/prisma');

async function getAllBuses(req, res) {
  try {
    const buses = await prisma.bus.findMany({
      include: { driver: { include: { user: { select: { name: true, id: true } } } }, route: { include: { stops: { orderBy: { order: 'asc' } } } }, locations: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });
    res.json(buses);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getBus(req, res) {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.id },
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } },
        route: { include: { stops: { orderBy: { order: 'asc' } } } },
        locations: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.json(bus);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function createBus(req, res) {
  const { plateNumber, capacity, schoolId } = req.body;
  try {
    const bus = await prisma.bus.create({ data: { plateNumber, capacity, schoolId } });
    res.status(201).json(bus);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Plate number already exists' });
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateBus(req, res) {
  const { driverUserId, routeId, plateNumber, capacity } = req.body;
  const busId = req.params.id;

  try {
    // Handle driver assignment separately (Driver model, not Bus)
    if (driverUserId !== undefined) {
      // Unassign any driver currently on this bus
      await prisma.driver.updateMany({ where: { busId }, data: { busId: null } });
      // Assign new driver if provided
      if (driverUserId) {
        await prisma.driver.update({ where: { userId: driverUserId }, data: { busId } });
      }
    }

    // Handle route assignment
    if (routeId !== undefined) {
      // Remove bus from any route that currently has it
      await prisma.route.updateMany({ where: { busId }, data: { busId: null } });
      if (routeId) {
        await prisma.route.update({ where: { id: routeId }, data: { busId } });
      }
    }

    // Update bus fields
    const updateData = {};
    if (plateNumber) updateData.plateNumber = plateNumber;
    if (capacity) updateData.capacity = capacity;

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: { driver: { include: { user: { select: { name: true } } } }, route: true },
    });
    res.json(bus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteBus(req, res) {
  try {
    await prisma.bus.delete({ where: { id: req.params.id } });
    res.json({ message: 'Bus deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

async function getBusLocation(req, res) {
  try {
    const location = await prisma.busLocation.findFirst({
      where: { busId: req.params.id },
      orderBy: { timestamp: 'desc' },
    });
    res.json(location);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getAllBuses, getBus, createBus, updateBus, deleteBus, getBusLocation };
