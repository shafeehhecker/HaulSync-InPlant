const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'haulsync-inplant-dev-secret';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: insufficient role' });
    next();
  };
}

module.exports = { auth, requireRole, JWT_SECRET };
