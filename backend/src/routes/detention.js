const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, requireRole } = require('../middleware/auth');
const { calcDetention } = require('../engines/detentionEngine');

const prisma = new PrismaClient();

// GET /api/detention  — list detention cases
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const cases = await prisma.detentionCase.findMany({
      where: {
        ...(status ? { status } : {}),
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        visit: {
          select: {
            vehicleNumber: true, vendorName: true, purpose: true,
            gateInAt: true, gateOutAt: true, freeTimeMinutes: true,
            detentionRate: true, bay: { select: { bayId: true } },
          },
        },
        approvals: {
          include: { approver: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(cases.map(c => ({
      id: c.id,
      visitId: c.visitId,
      vehicleNumber: c.visit.vehicleNumber,
      vendorName: c.visit.vendorName,
      purpose: c.visit.purpose,
      bay: c.visit.bay?.bayId || null,
      gateInTime: c.visit.gateInAt,
      freeTimeMinutes: c.freeTimeMinutes,
      overdueMins: c.overdueMins,
      chargesAccrued: c.chargesAccrued,
      chargesWaived: c.chargesWaived,
      chargesCollected: c.chargesCollected,
      status: c.status,
      escalatedAt: c.escalatedAt,
      resolvedAt: c.resolvedAt,
      approvals: c.approvals,
      createdAt: c.createdAt,
    })));
  } catch (err) { next(err); }
});

// GET /api/detention/summary  — totals for dashboard
router.get('/summary', auth, async (req, res, next) => {
  try {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(); dayEnd.setHours(23, 59, 59, 999);

    const [active, escalated, resolved] = await Promise.all([
      prisma.detentionCase.findMany({ where: { status: 'ACTIVE',    createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.detentionCase.findMany({ where: { status: 'ESCALATED', createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.detentionCase.findMany({ where: { status: { in: ['WAIVED','COLLECTED','PARTIAL'] }, createdAt: { gte: dayStart, lte: dayEnd } } }),
    ]);

    const sum = (arr, field) => arr.reduce((s, c) => s + (c[field] || 0), 0);

    res.json({
      activeCases:      active.length,
      escalatedCases:   escalated.length,
      resolvedToday:    resolved.length,
      totalAccrued:     sum([...active, ...escalated], 'chargesAccrued'),
      totalWaived:      sum(resolved, 'chargesWaived'),
      totalCollected:   sum(resolved, 'chargesCollected'),
    });
  } catch (err) { next(err); }
});

// GET /api/detention/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const det = await prisma.detentionCase.findUnique({
      where: { id: req.params.id },
      include: {
        visit: true,
        approvals: { include: { approver: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!det) return res.status(404).json({ message: 'Detention case not found' });

    // Live recalc if still active
    if (['ACTIVE', 'ESCALATED'].includes(det.status)) {
      const live = calcDetention(det.visit);
      det._live = live;
    }

    res.json(det);
  } catch (err) { next(err); }
});

// POST /api/detention/:id/approve  — waive / collect / partial
router.post('/:id/approve', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'FINANCE'), async (req, res, next) => {
  try {
    const { action, waiveAmount = 0, reason } = req.body;

    if (!action || !reason) return res.status(400).json({ message: 'action and reason are required' });
    if (!['APPROVE', 'COLLECT', 'PARTIAL'].includes(action)) {
      return res.status(400).json({ message: 'action must be APPROVE | COLLECT | PARTIAL' });
    }

    const detCase = await prisma.detentionCase.findUnique({ where: { id: req.params.id } });
    if (!detCase) return res.status(404).json({ message: 'Detention case not found' });
    if (['WAIVED', 'COLLECTED'].includes(detCase.status)) {
      return res.status(400).json({ message: 'Case already resolved' });
    }

    const waived    = action === 'APPROVE' ? detCase.chargesAccrued : Number(waiveAmount);
    const collected = action === 'COLLECT' ? detCase.chargesAccrued : Math.max(0, detCase.chargesAccrued - waived);
    const newStatus = action === 'APPROVE' ? 'WAIVED' : action === 'COLLECT' ? 'COLLECTED' : 'PARTIAL';

    const [approval, updated] = await prisma.$transaction([
      prisma.detentionApproval.create({
        data: {
          caseId: req.params.id,
          approverId: req.user.id,
          action,
          waiveAmount: waived,
          reason,
        },
      }),
      prisma.detentionCase.update({
        where: { id: req.params.id },
        data: {
          status: newStatus,
          chargesWaived: waived,
          chargesCollected: collected,
          resolvedAt: new Date(),
        },
      }),
    ]);

    req.io?.emit('detention:resolved', {
      caseId: req.params.id,
      status: newStatus,
      waived,
      collected,
      resolvedBy: req.user.name,
    });

    res.json({ approval, detentionCase: updated });
  } catch (err) { next(err); }
});

// POST /api/detention/:id/escalate  — manual escalation
router.post('/:id/escalate', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER'), async (req, res, next) => {
  try {
    const updated = await prisma.detentionCase.update({
      where: { id: req.params.id },
      data: { status: 'ESCALATED', escalatedAt: new Date() },
    });
    req.io?.emit('detention:escalated', { caseId: req.params.id });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
