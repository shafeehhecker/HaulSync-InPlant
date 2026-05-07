const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, requireRole } = require('../middleware/auth');
const { calcDetention } = require('../engines/detentionEngine');

const prisma = new PrismaClient();

const ACTIVE_STATUSES = ['CHECKED_IN', 'QUEUED', 'IN_DOCK', 'LOADING', 'UNLOADING', 'QC_HOLD', 'COMPLETE'];

// GET /api/gate — list visits (today by default)
router.get('/', auth, async (req, res, next) => {
  try {
    const { date, status, search, page = 1, limit = 50 } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const where = {
      gateInAt: { gte: dayStart, lte: dayEnd },
      ...(status && { status }),
      ...(search && {
        OR: [
          { vehicleNumber: { contains: search, mode: 'insensitive' } },
          { vendorName:    { contains: search, mode: 'insensitive' } },
          { driverName:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [visits, total] = await Promise.all([
      prisma.gateVisit.findMany({
        where,
        orderBy: { gateInAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
        include: {
          bay: { select: { bayId: true } },
          detentionCase: { select: { status: true, overdueMins: true, chargesAccrued: true } },
        },
      }),
      prisma.gateVisit.count({ where }),
    ]);

    res.json(visits.map(v => ({
      ...v,
      bay: v.bay?.bayId || null,
      detentionStatus: v.detentionCase?.status,
      detentionMins: v.detentionCase?.overdueMins || 0,
      detentionCharges: v.detentionCase?.chargesAccrued || 0,
      gateInTime: v.gateInAt,
    })));
  } catch (err) { next(err); }
});

// GET /api/gate/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const visit = await prisma.gateVisit.findUnique({
      where: { id: req.params.id },
      include: {
        bay: true,
        dockSlot: { include: { dock: true } },
        detentionCase: { include: { approvals: { include: { approver: { select: { name: true, role: true } } } } } },
        documents: true,
        createdBy: { select: { name: true } },
        checkedOutBy: { select: { name: true } },
      },
    });
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    // Compute live detention
    if (ACTIVE_STATUSES.includes(visit.status)) {
      const det = calcDetention(visit);
      visit._liveDetention = det;
    }

    res.json(visit);
  } catch (err) { next(err); }
});

// POST /api/gate/checkin
router.post('/checkin', auth, async (req, res, next) => {
  try {
    const {
      vehicleNumber, vehicleType = 'HEAVY', driverName, driverPhone,
      vendorName, vendorId, purpose = 'INBOUND', poReference, lrNumber,
      remarks, freeTimeMinutes, detentionRate,
    } = req.body;

    if (!vehicleNumber || !vendorName) {
      return res.status(400).json({ message: 'vehicleNumber and vendorName are required' });
    }

    // Check for duplicate active visit
    const duplicate = await prisma.gateVisit.findFirst({
      where: { vehicleNumber: vehicleNumber.toUpperCase(), status: { in: ACTIVE_STATUSES } },
    });
    if (duplicate) return res.status(409).json({ message: `${vehicleNumber} is already on premises (${duplicate.status})` });

    // Resolve vendor free time / rate
    let resolvedFreeTime = freeTimeMinutes;
    let resolvedRate = detentionRate;
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (vendor) {
        resolvedFreeTime = resolvedFreeTime ?? vendor.freeTimeMinutes;
        resolvedRate = resolvedRate ?? vendor.detentionRatePerHour;
      }
    }

    const visit = await prisma.gateVisit.create({
      data: {
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleType,
        driverName,
        driverPhone,
        vendorName,
        vendorId: vendorId || null,
        purpose,
        poReference,
        lrNumber,
        remarks,
        freeTimeMinutes: resolvedFreeTime ?? 180,
        detentionRate: resolvedRate ?? 750,
        status: 'CHECKED_IN',
        createdById: req.user.id,
      },
    });

    // Emit to connected clients
    req.io?.emit('gate:checkin', {
      id: visit.id,
      vehicleNumber: visit.vehicleNumber,
      vendorName: visit.vendorName,
      purpose: visit.purpose,
      gateInAt: visit.gateInAt,
      status: visit.status,
    });

    res.status(201).json(visit);
  } catch (err) { next(err); }
});

// PATCH /api/gate/:id/status  — update visit status
router.patch('/:id/status', auth, async (req, res, next) => {
  try {
    const { status, bayId, qcStatus, qcNotes, loadingProgress } = req.body;

    const visit = await prisma.gateVisit.findUnique({ where: { id: req.params.id } });
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    const updateData = {
      ...(status && { status }),
      ...(qcStatus && { qcStatus }),
      ...(qcNotes && { qcNotes }),
      ...(loadingProgress !== undefined && { loadingProgress }),
    };

    // Auto-timestamp loading start/end
    if (status === 'LOADING' && !visit.loadingStartAt) updateData.loadingStartAt = new Date();
    if (status === 'COMPLETE' && !visit.loadingEndAt)   updateData.loadingEndAt = new Date();

    // Handle bay assignment
    if (bayId) {
      updateData.bayId = bayId;
      updateData.bayAssignedAt = new Date();
      await prisma.bay.update({ where: { id: bayId }, data: { status: 'IN_USE' } });
    }

    // Handle QC hold
    if (status === 'QC_HOLD' && bayId) {
      await prisma.bay.update({ where: { id: bayId }, data: { status: 'HOLD' } });
    }

    const updated = await prisma.gateVisit.update({ where: { id: req.params.id }, data: updateData });

    req.io?.emit('gate:status', { id: updated.id, vehicleNumber: updated.vehicleNumber, status: updated.status });

    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/gate/:id/checkout
router.post('/:id/checkout', auth, async (req, res, next) => {
  try {
    const visit = await prisma.gateVisit.findUnique({
      where: { id: req.params.id },
      include: { bay: true, detentionCase: true },
    });
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    if (visit.status === 'CHECKED_OUT') return res.status(400).json({ message: 'Already checked out' });

    // Free up the bay
    if (visit.bayId) {
      await prisma.bay.update({ where: { id: visit.bayId }, data: { status: 'FREE' } });
    }

    const finalDetention = calcDetention(visit);

    // Finalize detention case
    if (visit.detentionCase && finalDetention.overdueMins > 0) {
      await prisma.detentionCase.update({
        where: { visitId: visit.id },
        data: {
          overdueMins: finalDetention.overdueMins,
          chargesAccrued: finalDetention.chargesAccrued,
        },
      });
    }

    const updated = await prisma.gateVisit.update({
      where: { id: req.params.id },
      data: {
        status: 'CHECKED_OUT',
        gateOutAt: new Date(),
        checkedOutById: req.user.id,
        loadingEndAt: visit.loadingEndAt || new Date(),
      },
    });

    req.io?.emit('gate:checkout', { id: updated.id, vehicleNumber: updated.vehicleNumber, gateOutAt: updated.gateOutAt });

    res.json({ ...updated, finalDetention });
  } catch (err) { next(err); }
});

// DELETE /api/gate/:id  — cancel
router.delete('/:id', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'GATE_MANAGER'), async (req, res, next) => {
  try {
    const visit = await prisma.gateVisit.findUnique({ where: { id: req.params.id } });
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    if (visit.status === 'CHECKED_OUT') return res.status(400).json({ message: 'Cannot cancel a completed visit' });

    if (visit.bayId) await prisma.bay.update({ where: { id: visit.bayId }, data: { status: 'FREE' } });

    await prisma.gateVisit.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Visit cancelled' });
  } catch (err) { next(err); }
});

module.exports = router;
