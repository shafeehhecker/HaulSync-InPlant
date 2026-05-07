/**
 * Detention Engine
 * Auto-calculates detention charges based on gate-in time, free time allotment,
 * and configured rate per hour. Runs on a cron-like interval and emits socket events.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_FREE_TIME_MINS = parseInt(process.env.FREE_TIME_MINUTES || '180');
const DEFAULT_RATE_PER_HOUR = parseFloat(process.env.DETENTION_RATE_PER_HOUR || '750');
const ALERT_LEAD_MINS = parseInt(process.env.DETENTION_ALERT_AT_MINUTES || '60');
const ESCALATE_AFTER_BREACH_MINS = parseInt(process.env.DETENTION_ESCALATE_AT_MINUTES || '30');

/**
 * Calculate detention for a single visit
 */
function calcDetention(visit, nowMs = Date.now()) {
  const gateInMs = new Date(visit.gateInAt).getTime();
  const elapsedMins = Math.floor((nowMs - gateInMs) / 60000);
  const freeTime = visit.freeTimeMinutes || DEFAULT_FREE_TIME_MINS;
  const overdueMins = Math.max(0, elapsedMins - freeTime);
  const chargesAccrued = parseFloat(((overdueMins / 60) * (visit.detentionRate || DEFAULT_RATE_PER_HOUR)).toFixed(2));
  const minutesToBreach = freeTime - elapsedMins;
  const isAlertZone = minutesToBreach > 0 && minutesToBreach <= ALERT_LEAD_MINS;
  const isBreached = overdueMins > 0;
  const isEscalated = overdueMins >= ESCALATE_AFTER_BREACH_MINS;

  return { elapsedMins, freeTime, overdueMins, chargesAccrued, isAlertZone, isBreached, isEscalated, minutesToBreach };
}

/**
 * Run the detention engine tick — update all active visits
 */
async function runDetentionTick(io) {
  const activeVisits = await prisma.gateVisit.findMany({
    where: {
      status: { notIn: ['CHECKED_OUT', 'CANCELLED'] },
      gateInAt: { not: null },
    },
  });

  for (const visit of activeVisits) {
    const { overdueMins, chargesAccrued, isBreached, isEscalated } = calcDetention(visit);

    if (!isBreached) continue;

    // Upsert detention case
    const existing = await prisma.detentionCase.findUnique({ where: { visitId: visit.id } });

    if (existing && ['WAIVED', 'COLLECTED', 'PARTIAL'].includes(existing.status)) continue;

    const detStatus = isEscalated ? 'ESCALATED' : 'ACTIVE';

    if (!existing) {
      await prisma.detentionCase.create({
        data: {
          visitId: visit.id,
          status: detStatus,
          freeTimeMinutes: visit.freeTimeMinutes || DEFAULT_FREE_TIME_MINS,
          overdueMins,
          chargesAccrued,
          ...(isEscalated && { escalatedAt: new Date() }),
        },
      });
    } else {
      await prisma.detentionCase.update({
        where: { visitId: visit.id },
        data: {
          status: detStatus,
          overdueMins,
          chargesAccrued,
          ...(isEscalated && !existing.escalatedAt && { escalatedAt: new Date() }),
        },
      });
    }

    // Emit real-time update
    if (io) {
      io.emit('detention:update', {
        visitId: visit.id,
        vehicleNumber: visit.vehicleNumber,
        overdueMins,
        chargesAccrued,
        status: detStatus,
      });
    }
  }
}

/**
 * Start periodic detention engine
 */
function startDetentionEngine(io) {
  console.log('⏱️  Detention engine started (60s interval)');
  // Run immediately on start
  runDetentionTick(io).catch(console.error);
  // Then every 60 seconds
  return setInterval(() => runDetentionTick(io).catch(console.error), 60000);
}

module.exports = { calcDetention, runDetentionTick, startDetentionEngine, DEFAULT_FREE_TIME_MINS, DEFAULT_RATE_PER_HOUR };
