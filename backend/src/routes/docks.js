const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, requireRole } = require('../middleware/auth');
const { findBestSlot, autoAllocateDock } = require('../engines/slotAllocator');

const prisma = new PrismaClient();

// GET /api/docks  — list all docks with stats
router.get('/', auth, async (req, res, next) => {
  try {
    const docks = await prisma.dock.findMany({
      where: { active: true },
      include: {
        bays: true,
        slots: {
          where: {
            date: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) },
            status: { in: ['RESERVED', 'OCCUPIED'] },
          },
        },
      },
    });
    res.json(docks);
  } catch (err) { next(err); }
});

// GET /api/docks/slots  — list slots (today by default)
router.get('/slots', auth, async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23,59,59,999);

    const slots = await prisma.dockSlot.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: {
        dock: { select: { name: true } },
        vendor: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ dock: { name: 'asc' } }, { startTime: 'asc' }],
    });

    res.json(slots.map(s => ({
      ...s,
      dock: s.dock.name,
      vendorName: s.vendor?.name || s.vendorName,
    })));
  } catch (err) { next(err); }
});

// GET /api/docks/availability  — find free slots for a given dock + date
router.get('/availability', auth, async (req, res, next) => {
  try {
    const { dockId, date, duration } = req.query;
    if (!dockId || !date) return res.status(400).json({ message: 'dockId and date required' });

    const slot = await findBestSlot({ dockId, date, durationMins: duration ? Number(duration) : undefined });
    res.json({ available: !!slot, slot });
  } catch (err) { next(err); }
});

// POST /api/docks/slots  — book a new slot
router.post('/slots', auth, async (req, res, next) => {
  try {
    const {
      dockId, dock: dockName, date, startTime, endTime,
      vehicleNumber, vendorId, vendorName, purpose = 'INBOUND',
      priority = 'NORMAL', notes, autoAllocate,
    } = req.body;

    if (!date) return res.status(400).json({ message: 'date is required' });

    let resolvedDockId = dockId;

    // Auto-allocate least busy dock
    if (autoAllocate || (!dockId && !dockName)) {
      const dock = await autoAllocateDock(date);
      if (!dock) return res.status(404).json({ message: 'No docks available' });
      resolvedDockId = dock.id;
    } else if (!dockId && dockName) {
      const dock = await prisma.dock.findUnique({ where: { name: dockName } });
      if (!dock) return res.status(404).json({ message: `Dock "${dockName}" not found` });
      resolvedDockId = dock.id;
    }

    if (!resolvedDockId) return res.status(400).json({ message: 'dockId or dock name required' });

    // Find times — either provided or auto-allocated
    let resolvedStart = startTime;
    let resolvedEnd   = endTime;
    if (!startTime || !endTime) {
      const slot = await findBestSlot({ dockId: resolvedDockId, date });
      if (!slot) return res.status(409).json({ message: 'No available slot for this dock on this date' });
      resolvedStart = slot.startTime;
      resolvedEnd   = slot.endTime;
    }

    // Conflict check
    const conflict = await prisma.dockSlot.findFirst({
      where: {
        dockId: resolvedDockId,
        date: new Date(date),
        status: { in: ['RESERVED', 'OCCUPIED'] },
        OR: [
          { startTime: { lt: resolvedEnd }, endTime: { gt: resolvedStart } },
        ],
      },
    });
    if (conflict) return res.status(409).json({ message: `Slot conflict: ${conflict.startTime}–${conflict.endTime} already booked` });

    const created = await prisma.dockSlot.create({
      data: {
        dockId: resolvedDockId,
        date: new Date(date),
        startTime: resolvedStart,
        endTime: resolvedEnd,
        vehicleNumber: vehicleNumber?.toUpperCase() || null,
        vendorId: vendorId || null,
        purpose,
        priority,
        status: 'RESERVED',
        notes,
        createdById: req.user.id,
      },
      include: { dock: { select: { name: true } } },
    });

    req.io?.emit('dock:slotBooked', { id: created.id, dock: created.dock.name, startTime: resolvedStart, endTime: resolvedEnd });

    res.status(201).json({ ...created, dock: created.dock.name });
  } catch (err) { next(err); }
});

// PATCH /api/docks/slots/:id  — update slot status
router.patch('/slots/:id', auth, async (req, res, next) => {
  try {
    const { status, vehicleNumber, notes } = req.body;
    const updated = await prisma.dockSlot.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(vehicleNumber && { vehicleNumber: vehicleNumber.toUpperCase() }),
        ...(notes && { notes }),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/docks/slots/:id  — cancel slot
router.delete('/slots/:id', auth, requireRole('SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'DOCK_OPERATOR'), async (req, res, next) => {
  try {
    await prisma.dockSlot.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ message: 'Slot cancelled' });
  } catch (err) { next(err); }
});

module.exports = router;
