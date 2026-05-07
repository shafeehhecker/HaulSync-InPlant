const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { auth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

router.get('/', auth, requireRole(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'name, email, password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), password: hashed, role: role || 'VIEWER' },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.patch('/:id', auth, requireRole(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { name, role, active, password } = req.body;
    const data = {};
    if (name)     data.name = name;
    if (role)     data.role = role;
    if (active !== undefined) data.active = active;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot deactivate your own account' });
    await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
