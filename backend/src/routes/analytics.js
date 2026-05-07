const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/analytics/dashboard  — live dashboard snapshot
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const now   = new Date();
    const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(now); dayEnd.setHours(23,59,59,999);

    const ACTIVE = ['CHECKED_IN','QUEUED','IN_DOCK','LOADING','UNLOADING','QC_HOLD','COMPLETE'];

    const [
      activeVisits,
      gateInsToday,
      gateOutsToday,
      allBays,
      detentionCases,
      todayVisits,
    ] = await Promise.all([
      prisma.gateVisit.findMany({
        where: { status: { in: ACTIVE } },
        include: { bay: { select: { bayId: true } }, detentionCase: { select: { overdueMins: true, chargesAccrued: true, status: true } } },
        orderBy: { gateInAt: 'asc' },
      }),
      prisma.gateVisit.count({ where: { gateInAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.gateVisit.count({ where: { gateOutAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.bay.findMany({ include: { dock: { select: { name: true } } } }),
      prisma.detentionCase.findMany({ where: { status: { in: ['ACTIVE','ESCALATED'] } } }),
      prisma.gateVisit.findMany({
        where: { gateInAt: { gte: dayStart, lte: dayEnd } },
        select: { gateInAt: true, gateOutAt: true },
      }),
    ]);

    // Average TAT (mins) for completed visits today
    const completedToday = todayVisits.filter(v => v.gateOutAt);
    const avgTatMins = completedToday.length
      ? Math.round(completedToday.reduce((s, v) => s + (new Date(v.gateOutAt) - new Date(v.gateInAt)) / 60000, 0) / completedToday.length)
      : null;

    const totalBays   = allBays.length;
    const occupiedBays = allBays.filter(b => b.status === 'IN_USE').length;
    const dockUtil    = totalBays > 0 ? Math.round((occupiedBays / totalBays) * 100) : 0;

    const totalDetention    = detentionCases.reduce((s, c) => s + (c.chargesAccrued || 0), 0);
    const waivedDetention   = detentionCases.filter(c => c.status === 'WAIVED').reduce((s, c) => s + (c.chargesWaived || 0), 0);

    // Hourly gate traffic
    const trafficBuckets = {};
    for (const v of todayVisits) {
      const h = String(new Date(v.gateInAt).getHours()).padStart(2, '0');
      trafficBuckets[h] = trafficBuckets[h] || { hour: h, entries: 0, exits: 0 };
      trafficBuckets[h].entries++;
      if (v.gateOutAt) trafficBuckets[h].exits++;
    }
    const gateTraffic = Object.values(trafficBuckets).sort((a,b) => a.hour.localeCompare(b.hour));

    // TAT trend by hour
    const tatBuckets = {};
    for (const v of completedToday) {
      const h = String(new Date(v.gateInAt).getHours()).padStart(2, '0');
      tatBuckets[h] = tatBuckets[h] || { hour: `${h}:00`, total: 0, count: 0 };
      tatBuckets[h].total += (new Date(v.gateOutAt) - new Date(v.gateInAt)) / 60000;
      tatBuckets[h].count++;
    }
    const tatTrend = Object.values(tatBuckets)
      .sort((a,b) => a.hour.localeCompare(b.hour))
      .map(b => ({ hour: b.hour, tat: Math.round(b.total / b.count) }));

    res.json({
      vehiclesOnPremises: activeVisits.length,
      avgTAT: avgTatMins ? `${Math.floor(avgTatMins/60)}h ${avgTatMins%60}m` : 'N/A',
      tatDelta: avgTatMins ? `${avgTatMins} min avg` : '',
      tatDeltaUp: true,
      dockUtilization: `${dockUtil}%`,
      dockDelta: `${occupiedBays}/${totalBays} occupied`,
      detentionToday: `₹${totalDetention.toLocaleString('en-IN')}`,
      detentionWaived: `₹${waivedDetention.toLocaleString('en-IN')}`,
      detentionAlerts: detentionCases.filter(c => c.status === 'ESCALATED').length,
      gateInsToday,
      gateOutsToday,
      pendingQueue: activeVisits.filter(v => v.status === 'QUEUED').length,
      baysOccupied: occupiedBays,
      totalBays,
      qcHolds: activeVisits.filter(v => v.status === 'QC_HOLD').length,
      gateTraffic,
      tatTrend,
      activeVisits: activeVisits.slice(0, 10).map(v => ({
        id: v.id,
        vehicleNumber: v.vehicleNumber,
        vendor: v.vendorName,
        purpose: v.purpose,
        bay: v.bay?.bayId || null,
        gateInTime: new Date(v.gateInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        status: v.status,
        detentionMins: v.detentionCase?.overdueMins || 0,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/inplant  — historical analytics for period
router.get('/inplant', auth, async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;

    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const [visits, detCases, bays] = await Promise.all([
      prisma.gateVisit.findMany({
        where: { gateInAt: { gte: from } },
        select: { gateInAt: true, gateOutAt: true, vendorName: true, purpose: true },
      }),
      prisma.detentionCase.findMany({
        where: { createdAt: { gte: from } },
        select: { status: true, chargesAccrued: true, chargesWaived: true, chargesCollected: true, visit: { select: { purpose: true } } },
      }),
      prisma.bay.findMany({ include: { dock: { select: { name: true } } } }),
    ]);

    const completed = visits.filter(v => v.gateOutAt);
    const avgTatMins = completed.length
      ? Math.round(completed.reduce((s,v) => s + (new Date(v.gateOutAt) - new Date(v.gateInAt)) / 60000, 0) / completed.length)
      : 0;

    // Daily traffic
    const dailyMap = {};
    for (const v of visits) {
      const d = new Date(v.gateInAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      dailyMap[d] = dailyMap[d] || { date: d, entries: 0, exits: 0 };
      dailyMap[d].entries++;
      if (v.gateOutAt) dailyMap[d].exits++;
    }
    const dailyTraffic = Object.values(dailyMap);

    // TAT trend by day
    const tatDayMap = {};
    for (const v of completed) {
      const d = new Date(v.gateInAt).toLocaleDateString('en-IN', { weekday: 'short' });
      tatDayMap[d] = tatDayMap[d] || { date: d, total: 0, count: 0 };
      tatDayMap[d].total += (new Date(v.gateOutAt) - new Date(v.gateInAt)) / 60000;
      tatDayMap[d].count++;
    }
    const tatTrend = Object.values(tatDayMap).map(d => ({ date: d.date, tat: Math.round(d.total / d.count) }));

    // Vendor visits
    const vendorMap = {};
    for (const v of visits) {
      vendorMap[v.vendorName] = (vendorMap[v.vendorName] || 0) + 1;
    }
    const vendorVisits = Object.entries(vendorMap)
      .map(([vendor, visits]) => ({ vendor, visits }))
      .sort((a,b) => b.visits - a.visits)
      .slice(0, 6);

    // Detention by purpose
    const purposeMap = {};
    for (const c of detCases) {
      const p = c.visit?.purpose || 'UNKNOWN';
      purposeMap[p] = (purposeMap[p] || 0) + 1;
    }
    const detentionByPurpose = Object.entries(purposeMap).map(([name, value]) => ({ name, value }));

    // Dock utilization by dock
    const dockMap = {};
    for (const b of bays) {
      const dk = b.dock.name;
      dockMap[dk] = dockMap[dk] || { dock: dk, totalBays: 0, occupied: 0 };
      dockMap[dk].totalBays++;
      if (b.status === 'IN_USE') dockMap[dk].occupied++;
    }
    const dockUtilization = Object.values(dockMap).map(d => ({
      ...d,
      totalSlots: d.totalBays * days,
      utilPct: Math.round((d.occupied / d.totalBays) * 100),
      avgDwell: `${Math.floor(avgTatMins / 60)}h ${avgTatMins % 60}m`,
    }));

    res.json({
      totalVehicles: visits.length,
      avgTAT: avgTatMins ? `${Math.floor(avgTatMins/60)}h ${avgTatMins%60}m` : 'N/A',
      detentionCases: detCases.length,
      dockEfficiency: `${Math.round((completed.length / Math.max(visits.length, 1)) * 100)}%`,
      dailyTraffic,
      tatTrend,
      vendorVisits,
      detentionByPurpose,
      dockUtilization,
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/tat-report  — detailed TAT breakdown
router.get('/tat-report', auth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate()-7); return d; })();
    const end   = to   ? new Date(to)   : new Date();

    const visits = await prisma.gateVisit.findMany({
      where: { gateInAt: { gte: start, lte: end }, gateOutAt: { not: null } },
      select: { vehicleNumber: true, vendorName: true, purpose: true, vehicleType: true, gateInAt: true, gateOutAt: true },
    });

    const rows = visits.map(v => ({
      vehicleNumber: v.vehicleNumber,
      vendorName: v.vendorName,
      purpose: v.purpose,
      vehicleType: v.vehicleType,
      gateIn: v.gateInAt,
      gateOut: v.gateOutAt,
      tatMins: Math.round((new Date(v.gateOutAt) - new Date(v.gateInAt)) / 60000),
    }));

    const avgTat = rows.length ? Math.round(rows.reduce((s,r) => s + r.tatMins, 0) / rows.length) : 0;

    res.json({ rows, avgTatMins: avgTat, totalVisits: rows.length });
  } catch (err) { next(err); }
});

module.exports = router;
