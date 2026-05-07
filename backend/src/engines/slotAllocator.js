/**
 * Slot Allocator Engine
 * Priority-based dock slot allocation with buffer time management.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRIORITY_WEIGHT = { URGENT: 1, HIGH: 2, NORMAL: 3 };

/**
 * Find the best available slot for a new booking
 */
async function findBestSlot({ dockId, date, durationMins, priority = 'NORMAL' }) {
  const dock = await prisma.dock.findUnique({ where: { id: dockId } });
  if (!dock) throw new Error('Dock not found');

  const slotDur = durationMins || dock.slotDurationMins;
  const buffer = dock.bufferMins;
  const dayStart = dock.startHour * 60;   // in minutes from midnight
  const dayEnd = dock.endHour * 60;

  const existing = await prisma.dockSlot.findMany({
    where: {
      dockId,
      date: new Date(date),
      status: { in: ['RESERVED', 'OCCUPIED'] },
    },
  });

  // Convert HH:MM to minutes
  const toMins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const toTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const occupied = existing
    .map(s => ({ start: toMins(s.startTime), end: toMins(s.endTime) + buffer }))
    .sort((a, b) => a.start - b.start);

  // Find first gap that fits slotDur + buffer
  let cursor = dayStart;
  for (const slot of occupied) {
    if (cursor + slotDur <= slot.start) {
      return { startTime: toTime(cursor), endTime: toTime(cursor + slotDur), dockId };
    }
    cursor = Math.max(cursor, slot.end);
  }
  // Check space after last slot
  if (cursor + slotDur <= dayEnd) {
    return { startTime: toTime(cursor), endTime: toTime(cursor + slotDur), dockId };
  }

  return null; // No slot available
}

/**
 * Get queue depth for a dock on a given date
 */
async function getDockQueue(dockId, date) {
  return prisma.dockSlot.count({
    where: {
      dockId,
      date: new Date(date),
      status: { in: ['RESERVED', 'OCCUPIED'] },
    },
  });
}

/**
 * Auto-allocate the least-busy dock for a new booking
 */
async function autoAllocateDock(date) {
  const docks = await prisma.dock.findMany({ where: { active: true } });

  const withQueue = await Promise.all(
    docks.map(async (d) => ({ dock: d, queueDepth: await getDockQueue(d.id, date) }))
  );

  // Least busy dock first
  withQueue.sort((a, b) => a.queueDepth - b.queueDepth);
  return withQueue[0]?.dock || null;
}

module.exports = { findBestSlot, getDockQueue, autoAllocateDock, PRIORITY_WEIGHT };
