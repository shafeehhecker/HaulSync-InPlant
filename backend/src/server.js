require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');

const errorHandler = require('./middleware/errorHandler');
const { auth }     = require('./middleware/auth');
const { startDetentionEngine } = require('./engines/detentionEngine');

// Routes
const authRoutes       = require('./routes/auth');
const gateRoutes       = require('./routes/gate');
const docksRoutes      = require('./routes/docks');
const baysRoutes       = require('./routes/bays');
const detentionRoutes  = require('./routes/detention');
const analyticsRoutes  = require('./routes/analytics');
const vendorsRoutes    = require('./routes/vendors');
const usersRoutes      = require('./routes/users');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Client disconnected: ${socket.id}`));
});

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach io to every request so routes can emit events
app.use((req, _res, next) => { req.io = io; next(); });

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  module: 'haulsync-inplant',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/gate',      gateRoutes);
app.use('/api/docks',     docksRoutes);
app.use('/api/bays',      baysRoutes);
app.use('/api/detention', detentionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vendors',   vendorsRoutes);
app.use('/api/users',     usersRoutes);

// ── Static frontend (production) ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n🚀 HaulSync In-Plant backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API:    http://localhost:${PORT}/api`);

  // Start the detention auto-calculation engine
  startDetentionEngine(io);
});

module.exports = { app, server, io };
