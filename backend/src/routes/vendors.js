const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

router.get('/', auth, async (req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json(vendors);
  } catch (err) { next(err); }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        gateVisits: { orderBy: { gateInAt: 'desc' }, take: 20, select: { id: true, vehicleNumber: true, purpose: true, status: true, gateInAt: true } },
      },
    });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('SUPER_ADMIN','ADMIN'), async (req, res, next) => {
  try {
    const { name, code, contactName, contactPhone, contactEmail, freeTimeMinutes, detentionRatePerHour } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name and code required' });
    const vendor = await prisma.vendor.create({
      data: { name, code: code.toUpperCase(), contactName, contactPhone, contactEmail, freeTimeMinutes: freeTimeMinutes ?? 180, detentionRatePerHour: detentionRatePerHour ?? 750 },
    });
    res.status(201).json(vendor);
  } catch (err) { next(err); }
});

router.patch('/:id', auth, requireRole('SUPER_ADMIN','ADMIN'), async (req, res, next) => {
  try {
    const { name, contactName, contactPhone, contactEmail, freeTimeMinutes, detentionRatePerHour, active } = req.body;
    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { name, contactName, contactPhone, contactEmail, freeTimeMinutes, detentionRatePerHour, active },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('SUPER_ADMIN','ADMIN'), async (req, res, next) => {
  try {
    await prisma.vendor.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Vendor deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
