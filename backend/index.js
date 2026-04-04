require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./src/logger');

const authRoutes = require('./src/routes/auth');
const coursesRoutes = require('./src/routes/courses');
const documentsRoutes = require('./src/routes/documents');
const studentRoutes = require('./src/routes/student');
const chatRoutes = require('./src/routes/chat');
const quizRoutes = require('./src/routes/quiz');
const teacherRoutes = require('./src/routes/teacher');
const studentsRoutes = require('./src/routes/students');
const classesRoutes = require('./src/routes/classes');
const aiTeachersRoutes = require('./src/routes/aiTeachers');
const instructionsRoutes = require('./src/routes/instructions');

const http = require('http');
const { Server } = require('socket.io');
const { registerTTSHandlers } = require('./src/tts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  const { studentId } = socket.handshake.query;
  if (studentId) socket.join(`student:${studentId}`);
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

// GET /api/student/courses
// GET /api/student/courses/:id
// POST /api/student/courses/:id/complete
// GET /api/student/courses/:courseId/quiz
// POST /api/student/courses/:courseId/quiz
app.use('/api/student', studentRoutes);

// POST /api/chat/:courseId
app.use('/api/chat', chatRoutes);

// GET    /api/courses/:id/quiz
// POST   /api/courses/:id/quiz
// POST   /api/courses/:id/quiz/questions
// POST   /api/courses/:id/quiz/generate
// DELETE /api/quiz/questions/:qid
app.use('/api/courses', quizRoutes);
app.use('/api/quiz', quizRoutes);

// GET /api/teacher/courses/:id/progress
app.use('/api/teacher', teacherRoutes);

// GET /api/students
app.use('/api/students', studentsRoutes);

// GET/POST /api/classes
// POST /api/classes/:id/members
// DELETE /api/classes/:id/members/:studentId
// POST /api/classes/:id/courses
// DELETE /api/classes/:id/courses/:courseId
app.use('/api/classes', classesRoutes);

// GET/POST/PUT/DELETE /api/ai-teachers
app.use('/api/ai-teachers', aiTeachersRoutes);

// GET/POST/PUT/DELETE /api/instructions
app.use('/api/instructions', instructionsRoutes);

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
