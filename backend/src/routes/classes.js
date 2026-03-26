const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/classes - list teacher's classes
router.get('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  try {
    const classes = await db('classes')
      .where({ teacher_id: req.user.id })
      .orderBy('name');

    const withMembers = await Promise.all(classes.map(async cls => {
      const members = await db('class_members')
        .join('users', 'class_members.student_id', 'users.id')
        .where('class_members.class_id', cls.id)
        .select('users.id', 'users.name', 'users.email', 'users.gender')
        .orderBy('users.name');
      const courses = await db('course_classes')
        .join('courses', 'course_classes.course_id', 'courses.id')
        .where('course_classes.class_id', cls.id)
        .select('courses.id', 'courses.title')
        .orderBy('courses.title');
      return { ...cls, members, courses };
    }));

    res.json(withMembers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes - create class
router.post('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { name, birth_year } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const insertData = { name: name.trim(), teacher_id: req.user.id };
    if (birth_year) insertData.birth_year = parseInt(birth_year);
    const [cls] = await db('classes')
      .insert(insertData)
      .returning('*');
    res.status(201).json({ ...cls, members: [], courses: [] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/classes/:id - rename class / update birth_year
router.put('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { name, birth_year } = req.body;
  try {
    const cls = await db('classes').where({ id, teacher_id: req.user.id }).first();
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const updateData = { updated_at: db.fn.now() };
    if (name !== undefined) updateData.name = name;
    if (birth_year !== undefined) updateData.birth_year = birth_year ? parseInt(birth_year) : null;
    const [updated] = await db('classes').where({ id }).update(updateData).returning('*');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const cls = await db('classes').where({ id, teacher_id: req.user.id }).first();
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    await db('classes').where({ id }).delete();
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes/:id/members - add student to class (by student id or email)
router.post('/:id/members', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { student_id, email } = req.body;
  try {
    const cls = await db('classes').where({ id, teacher_id: req.user.id }).first();
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    let student;
    if (student_id) {
      student = await db('users').where({ id: student_id, role: 'student' }).first();
    } else if (email) {
      student = await db('users').where({ email, role: 'student' }).first();
    }
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const existing = await db('class_members').where({ class_id: id, student_id: student.id }).first();
    if (existing) return res.status(409).json({ error: 'Student already in class' });

    await db('class_members').insert({ class_id: id, student_id: student.id });

    // Auto-enroll in all courses assigned to this class
    const courseClasses = await db('course_classes').where({ class_id: id });
    for (const cc of courseClasses) {
      const alreadyEnrolled = await db('enrollments')
        .where({ student_id: student.id, course_id: cc.course_id }).first();
      if (!alreadyEnrolled) {
        await db('enrollments').insert({ student_id: student.id, course_id: cc.course_id });
      }
    }

    res.status(201).json({ id: student.id, name: student.name, email: student.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/:id/members/:studentId - remove student from class
router.delete('/:id/members/:studentId', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id, studentId } = req.params;
  try {
    const cls = await db('classes').where({ id, teacher_id: req.user.id }).first();
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    await db('class_members').where({ class_id: id, student_id: studentId }).delete();
    res.json({ message: 'Student removed from class' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes/:id/courses - assign course to class (auto-enrolls all members)
router.post('/:id/courses', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { course_id } = req.body;
  try {
    const cls = await db('classes').where({ id, teacher_id: req.user.id }).first();
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const course = await db('courses').where({ id: course_id, teacher_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = await db('course_classes').where({ class_id: id, course_id }).first();
    if (!existing) {
      await db('course_classes').insert({ class_id: id, course_id });
    }

    // Auto-enroll all class members in the course
    const members = await db('class_members').where({ class_id: id });
    for (const m of members) {
      const alreadyEnrolled = await db('enrollments')
        .where({ student_id: m.student_id, course_id }).first();
      if (!alreadyEnrolled) {
        await db('enrollments').insert({ student_id: m.student_id, course_id });
      }
    }

    res.status(201).json({ message: 'Course assigned to class' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/:id/courses/:courseId - remove course from class
router.delete('/:id/courses/:courseId', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id, courseId } = req.params;
  try {
    const cls = await db('classes').where({ id, teacher_id: req.user.id }).first();
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    await db('course_classes').where({ class_id: id, course_id: courseId }).delete();
    res.json({ message: 'Course removed from class' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
