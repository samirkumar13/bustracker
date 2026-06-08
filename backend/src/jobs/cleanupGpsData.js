const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// How many days of GPS history to keep
const GPS_RETENTION_DAYS = 90;

async function runCleanup() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GPS_RETENTION_DAYS);

  try {
    const result = await prisma.busLocation.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    if (result.count > 0) {
      console.log(`[GPS Cleanup] Deleted ${result.count} location record(s) older than ${GPS_RETENTION_DAYS} days.`);
    } else {
      console.log(`[GPS Cleanup] Nothing to delete (no records older than ${GPS_RETENTION_DAYS} days).`);
    }
  } catch (err) {
    console.error('[GPS Cleanup] Error during cleanup:', err.message);
  }
}

function startGpsCleanupJob() {
  // Run once at startup to catch any backlog
  runCleanup();

  // Then run every day at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log('[GPS Cleanup] Running scheduled cleanup...');
    runCleanup();
  });

  console.log('[GPS Cleanup] Scheduled — runs daily at 2:00 AM, retains last 90 days.');
}

module.exports = { startGpsCleanupJob };
