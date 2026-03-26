const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { compileCourseMaterial } = require('../compileCourse');

const router = express.Router();

// GET /api/courses - list all courses (authenticated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = db('courses')
      .join('users', 'courses.teacher_id', 'users.id')
      .select(
        'courses.id',
        'courses.title',
        'courses.description',
        'courses.teacher_id',
        'courses.created_at',
        'users.name as teacher_name'
      );

    if (req.user.role === 'teacher') {
      query = query.where('courses.teacher_id', req.user.id);
    }

    const courses = await query.orderBy('courses.created_at', 'desc');
    return res.json(courses);
  } catch (err) {
    console.error('Get courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses - create course (teacher only)
router.post('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const [course] = await db('courses')
      .insert({ title, description, teacher_id: req.user.id })
      .returning('*');
    return res.status(201).json(course);
  } catch (err) {
    console.error('Create course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/:id - get course
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses')
      .join('users', 'courses.teacher_id', 'users.id')
      .select(
        'courses.*',
        'users.name as teacher_name'
      )
      .where('courses.id', id)
      .first();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.json(course);
  } catch (err) {
    console.error('Get course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/courses/:id - update course (teacher owner only)
router.put('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { title, description, ai_teacher_id, instruction_id } = req.body;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const updateData = { title, description, updated_at: db.fn.now() };
    // Allow setting ai_teacher_id (null = use default)
    if ('ai_teacher_id' in req.body) {
      updateData.ai_teacher_id = ai_teacher_id || null;
    }
    // Allow setting instruction_id (null = no instruction)
    if ('instruction_id' in req.body) {
      updateData.instruction_id = instruction_id || null;
    }
    if ('enable_quick_replies' in req.body) {
      updateData.enable_quick_replies = !!req.body.enable_quick_replies;
    }

    const [updated] = await db('courses')
      .where({ id })
      .update(updateData)
      .returning('*');

    return res.json(updated);
  } catch (err) {
    console.error('Update course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/:id - delete course (teacher owner only)
router.delete('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    await db('courses').where({ id }).delete();
    return res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('Delete course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/compile - manually compile course material
router.post('/:id/compile', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await compileCourseMaterial(id);
    // Reset teacher's test session so next test uses the new material
    await db('chat_sessions').where({ student_id: req.user.id, course_id: id }).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('Compile error:', err);
    res.status(500).json({ error: 'Kompilering misslyckades' });
  }
});

// GET /api/courses/:id/enrollments - list enrolled students + assigned classes
router.get('/:id/enrollments', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, teacher_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const students = await db('enrollments')
      .join('users', 'enrollments.student_id', 'users.id')
      .where('enrollments.course_id', id)
      .select('users.id', 'users.name', 'users.email', 'enrollments.created_at as enrolled_at')
      .orderBy('users.name');

    const classes = await db('course_classes')
      .join('classes', 'course_classes.class_id', 'classes.id')
      .where('course_classes.course_id', id)
      .select('classes.id', 'classes.name');

    res.json({ students, classes });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/:id/enrollments/:studentId - remove individual enrollment
router.delete('/:id/enrollments/:studentId', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id, studentId } = req.params;
  try {
    const course = await db('courses').where({ id, teacher_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await db('enrollments').where({ course_id: id, student_id: studentId }).delete();
    res.json({ message: 'Enrollment removed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/enroll - enroll a student by email or student_id
router.post('/:id/enroll', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { email, student_id } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Student email is required' });
  }

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    let student;
    if (student_id) {
      student = await db('users').where({ id: student_id, role: 'student' }).first();
    } else if (email) {
      student = await db('users').where({ email, role: 'student' }).first();
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const existing = await db('enrollments')
      .where({ student_id: student.id, course_id: id })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Student is already enrolled in this course' });
    }

    const [enrollment] = await db('enrollments')
      .insert({ student_id: student.id, course_id: id })
      .returning('*');

    return res.status(201).json({
      enrollment,
      student: { id: student.id, name: student.name, email: student.email },
    });
  } catch (err) {
    console.error('Enroll error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/:id/test-session – fetch teacher's own test chat messages
router.get('/:id/test-session', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, teacher_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const [session, aiSummary] = await Promise.all([
      db('chat_sessions').where({ student_id: req.user.id, course_id: id }).first(),
      db('ai_summaries').where({ student_id: req.user.id, course_id: id }).first(),
    ]);
    res.json({ messages: session ? session.messages : [], aiSummary: aiSummary || null });
  } catch (err) {
    console.error('Get test session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/:id/test-session – clear teacher's test chat session
router.delete('/:id/test-session', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, teacher_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await db('chat_sessions').where({ student_id: req.user.id, course_id: id }).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('Clear test session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
