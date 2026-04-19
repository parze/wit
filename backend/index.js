require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./src/logger');

const authRoutes = require('./src/routes/auth');
const coursesRoutes = require('./src/routes/courses');
const documentsRoutes = require('./src/routes/documents');
const childRoutes = require('./src/routes/child');
const chatRoutes = require('./src/routes/chat');
const parentRoutes = require('./src/routes/parent');
const childrenRoutes = require('./src/routes/children');

const http = require('http');
const { Server } = require('socket.io');
const { registerTTSHandlers } = require('./src/tts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  const { userId } = socket.handshake.query;
  if (userId) socket.join(`user:${userId}`);
  registerTTSHandlers(io, socket);
});

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// POST /api/auth/register
// POST /api/auth/login
app.use('/api/auth', authRoutes);

// GET    /api/courses
// POST   /api/courses
// GET    /api/courses/:id
// PUT    /api/courses/:id
// DELETE /api/courses/:id
// POST   /api/courses/:id/compile
// POST   /api/courses/:id/enroll
app.use('/api/courses', coursesRoutes);

// POST   /api/courses/:id/documents
// GET    /api/courses/:id/documents
app.use('/api/courses', documentsRoutes);

// DELETE /api/documents/:id
app.delete('/api/documents/:id', (req, res, next) => {
  req.url = `/documents/${req.params.id}`;
  documentsRoutes(req, res, next);
});

// GET /api/child/courses
// GET /api/child/courses/:id
// POST /api/child/courses/:id/complete
app.use('/api/child', childRoutes);

// POST /api/chat/:courseId
app.use('/api/chat', chatRoutes);

// GET /api/parent/courses/:id/progress
app.use('/api/parent', parentRoutes);

// GET /api/children
app.use('/api/children', childrenRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Lärmig backend running on port ${PORT}`);
});

module.exports = app;
