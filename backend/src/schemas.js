const { z } = require('zod');

const id = z.string().min(1);

const register = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'DRIVER', 'PARENT', 'STUDENT'], { message: 'Invalid role' }),
  phone: z.string().optional(),
});

const login = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const createBus = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  capacity: z.coerce.number().int().positive('Capacity must be a positive integer'),
  schoolId: id,
});

const updateBus = z.object({
  plateNumber: z.string().min(1).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  driverUserId: z.string().nullable().optional(),
  routeId: z.string().nullable().optional(),
});

const createRoute = z.object({
  name: z.string().min(1, 'Route name is required'),
  schoolId: id,
  stops: z.array(z.object({
    name: z.string().min(1),
    lat: z.coerce.number(),
    lng: z.coerce.number(),
  })).optional(),
});

const updateRoute = z.object({
  name: z.string().min(1).optional(),
  busId: z.string().nullable().optional(),
});

const createStop = z.object({
  name: z.string().min(1, 'Stop name is required'),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  order: z.coerce.number().int().nonnegative(),
  routeId: id,
});

const updateStop = z.object({
  name: z.string().min(1).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  order: z.coerce.number().int().nonnegative().optional(),
});

const nfcScan = z.object({
  nfcCardId: z.string().min(1, 'NFC card ID is required'),
  busId: id,
  deviceKey: z.string().min(1, 'Device key is required'),
});

const gpsUpdate = z.object({
  busId: id,
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  speed: z.coerce.number().optional(),
  deviceKey: z.string().min(1, 'Device key is required'),
});

const assignCard = z.object({
  studentId: id,
  nfcCardId: z.string().min(1, 'NFC card ID is required'),
});

const linkChild = z.object({
  studentEmail: z.string().email('Invalid student email'),
});

const studentAssignment = z.object({
  routeId: z.string().nullable().optional(),
  stopId: z.string().nullable().optional(),
});

module.exports = {
  register, login,
  createBus, updateBus,
  createRoute, updateRoute,
  createStop, updateStop,
  nfcScan, gpsUpdate, assignCard,
  linkChild, studentAssignment,
};
