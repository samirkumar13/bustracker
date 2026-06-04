const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── School ──────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'school-1' },
    update: { lat: 12.8456, lng: 77.6603, address: 'Bannerghatta Road, Bengaluru' },
    create: {
      id: 'school-1',
      name: 'Greenwood High School',
      address: 'Bannerghatta Road, Bengaluru',
      lat: 12.8456,
      lng: 77.6603,
    },
  });
  console.log('✅ School created:', school.name);

  // ── Users ────────────────────────────────────────────────
  const hash = (p) => bcrypt.hashSync(p, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@school.com', password: hash('admin123'), role: 'ADMIN' },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@school.com' },
    update: {},
    create: { name: 'John Driver', email: 'driver@school.com', password: hash('driver123'), role: 'DRIVER', phone: '555-0101' },
  });

  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@school.com' },
    update: {},
    create: { name: 'Mary Parent', email: 'parent@school.com', password: hash('parent123'), role: 'PARENT', phone: '555-0102' },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@school.com' },
    update: {},
    create: { name: 'Alex Student', email: 'student@school.com', password: hash('student123'), role: 'STUDENT' },
  });

  console.log('✅ Users created: admin, driver, parent, student');

  // ── Role profiles ────────────────────────────────────────
  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: { userId: driverUser.id },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: { userId: parentUser.id },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, parentId: parent.id },
  });

  // ── Bus ──────────────────────────────────────────────────
  const bus = await prisma.bus.upsert({
    where: { plateNumber: 'BUS-001' },
    update: {},
    create: {
      plateNumber: 'BUS-001',
      capacity: 40,
      schoolId: school.id,
    },
  });

  // Assign driver to bus
  await prisma.driver.update({
    where: { id: driver.id },
    data: { busId: bus.id },
  });

  console.log('✅ Bus created: BUS-001, assigned to John Driver');

  // ── Route + Stops ────────────────────────────────────────
  // Delete existing route stops to avoid duplicates on re-seed
  const existingRoute = await prisma.route.findFirst({ where: { name: 'Morning Route A' } });
  if (existingRoute) {
    await prisma.stop.deleteMany({ where: { routeId: existingRoute.id } });
    await prisma.route.delete({ where: { id: existingRoute.id } });
  }

  const route = await prisma.route.create({
    data: {
      name: 'Morning Route A',
      schoolId: school.id,
      busId: bus.id,
      stops: {
        create: [
          { name: 'Arekere Gate Stop',    lat: 12.8395, lng: 77.6570, order: 1 },
          { name: 'Meenakshi Temple Stop',lat: 12.8418, lng: 77.6585, order: 2 },
          { name: 'Hulimavu Stop',        lat: 12.8438, lng: 77.6595, order: 3 },
          { name: 'Greenwood High School',lat: 12.8456, lng: 77.6603, order: 4 },
        ],
      },
    },
    include: { stops: true },
  });

  console.log('✅ Route created: Morning Route A with 4 stops');

  // Assign student to route + first stop
  await prisma.student.update({
    where: { id: student.id },
    data: { routeId: route.id, stopId: route.stops[0].id },
  });

  console.log('✅ Student assigned to route and stop');

  // ── Summary ──────────────────────────────────────────────
  console.log('\n🎉 Seed complete! Test accounts:\n');
  console.log('  Role     | Email                | Password');
  console.log('  ---------|----------------------|----------');
  console.log('  ADMIN    | admin@school.com     | admin123');
  console.log('  DRIVER   | driver@school.com    | driver123');
  console.log('  PARENT   | parent@school.com    | parent123');
  console.log('  STUDENT  | student@school.com   | student123');
  console.log('');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
