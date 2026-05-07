const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/bays  — list all bays with current occupancy
router.get('/', auth, async (req, res, next) => {
  try {
    const bays = await prisma.bay.findMany({
      orderBy: [{ dock: { name: 'asc' } }, { bayId: 'asc' }],
      include: {
        dock: { select: { name: true } },
        gateVisits: {
          where: { status: { notIn: ['CHECKED_OUT', 'CANCELLED'] } },
          select: {
            id: true,
            vehicleNumber: true,
            vendorName: true,
            purpose: true,
            loadingProgress: true,
            gateInAt: true,
            status: true,
          },
          take: 1,
        },
      },
    });

    res.json(bays.map(b => {
      const activeVisit = b.gateVisits[0] || null;
      return {
        id: b.id,
        bayId: b.bayId,
        dock: b.dock.name,
        dockId: b.dockId,
        status: b.status,
        vehicleNumber: activeVisit?.vehicleNumber || null,
        vendorName: activeVisit?.vendorName || null,
        purpose: activeVisit?.purpose || null,
        loadingProgress: activeVisit?.loadingProgress ?? null,
        startTime: activeVisit?.gateInAt || null,
        visitStatus: activeVisit?.status || null,
      };
    }));
  } catch (err) { next(err); }
});

// GET /api/bays/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const bay = await prisma.bay.findUnique({
      where: { id: req.params.id },
      include: {
        dock: true,
        gateVisits: {
          where: { status: { notIn: ['CHECKED_OUT', 'CANCELLED'] } },
          orderBy: { gateInAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!bay) return res.status(404).json({ message: 'Bay not found' });
    res.json(bay);
  } catch (err) { next(err); }
});

// PATCH /api/bays/:id  — update bay status or progress
router.patch('/:id', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'DOCK_OPERATOR'), async (req, res, next) => {
  try {
    const { status, loadingProgress } = req.body;

    const bay = await prisma.bay.findUnique({ where: { id: req.params.id } });
    if (!bay) return res.status(404).json({ message: 'Bay not found' });

    // Update bay status if provided
    if (status) {
      await prisma.bay.update({ where: { id: req.params.id }, data: { status } });
    }

    // Update loading progress on the active visit if provided
    if (loadingProgress !== undefined) {
      const activeVisit = await prisma.gateVisit.findFirst({
        where: { bayId: req.params.id, status: { notIn: ['CHECKED_OUT', 'CANCELLED'] } },
      });
      if (activeVisit) {
        const newStatus = loadingProgress >= 100 ? 'COMPLETE' : activeVisit.status;
        await prisma.gateVisit.update({
          where: { id: activeVisit.id },
          data: {
            loadingProgress: Math.min(100, Math.max(0, loadingProgress)),
            ...(loadingProgress >= 100 && { loadingEndAt: new Date(), status: newStatus }),
          },
        });

        req.io?.emit('bay:progress', {
          bayId: req.params.id,
          bay: bay.bayId,
          loadingProgress,
          visitId: activeVisit.id,
          vehicleNumber: activeVisit.vehicleNumber,
        });
      }
    }

    const updated = await prisma.bay.findUnique({
      where: { id: req.params.id },
      include: { dock: { select: { name: true } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/bays/:id/assign  — assign a vehicle to a bay
router.post('/:id/assign', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'DOCK_OPERATOR'), async (req, res, next) => {
  try {
    const { visitId } = req.body;
    if (!visitId) return res.status(400).json({ message: 'visitId required' });

    const bay = await prisma.bay.findUnique({ where: { id: req.params.id } });
    if (!bay) return res.status(404).json({ message: 'Bay not found' });
    if (bay.status !== 'FREE') return res.status(409).json({ message: `Bay is not free — current status: ${bay.status}` });

    await prisma.$transaction([
      prisma.bay.update({ where: { id: req.params.id }, data: { status: 'IN_USE' } }),
      prisma.gateVisit.update({
        where: { id: visitId },
        data: { bayId: req.params.id, bayAssignedAt: new Date(), status: 'IN_DOCK' },
      }),
    ]);

    req.io?.emit('bay:assigned', { bayId: req.params.id, visitId });

    res.json({ message: 'Bay assigned successfully' });
  } catch (err) { next(err); }
});

// POST /api/bays/:id/release  — release a bay
router.post('/:id/release', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'DOCK_OPERATOR'), async (req, res, next) => {
  try {
    const bay = await prisma.bay.findUnique({ where: { id: req.params.id } });
    if (!bay) return res.status(404).json({ message: 'Bay not found' });

    await prisma.bay.update({ where: { id: req.params.id }, data: { status: 'FREE' } });

    req.io?.emit('bay:released', { bayId: req.params.id, bayLabel: bay.bayId });

    res.json({ message: 'Bay released' });
  } catch (err) { next(err); }
});

module.exports = router;
