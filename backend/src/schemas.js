const { z } = require('zod');

const id = z.string().min(1);

const register = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'DRIVER', 'PARENT'], { message: 'Invalid role' }),
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
  studentId: id,                       // Student record id
  nfcCardId: z.string().min(1, 'NFC card ID is required'),
});

const linkChild = z.object({
  studentCode: z.string().min(1, 'Student code is required'),
});

// ── Student records (managed by school admin) ────────────────────────────────
const createStudent = z.object({
  name: z.string().min(1, 'Student name is required'),
  grade: z.string().optional(),
  routeId: z.string().nullable().optional(),
  stopId: z.string().nullable().optional(),
  nfcCardId: z.string().optional(),
});

const updateStudent = z.object({
  name: z.string().min(1).optional(),
  grade: z.string().nullable().optional(),
  routeId: z.string().nullable().optional(),
  stopId: z.string().nullable().optional(),
  nfcCardId: z.string().nullable().optional(),
});

const deleteAccount = z.object({
  password: z.string().min(1, 'Password is required to confirm deletion'),
});

const broadcast = z.object({
  message: z.string().min(1, 'Message is required').max(280, 'Max 280 characters'),
  type: z.enum(['DELAY', 'INFO', 'EMERGENCY']).default('INFO'),
});

module.exports = {
  register, login,
  createBus, updateBus, broadcast,
  createRoute, updateRoute,
  createStop, updateStop,
  nfcScan, gpsUpdate, assignCard,
  linkChild,
  createStudent, updateStudent,
  deleteAccount,
};
