const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { compileCourseMaterial } = require('../compileCourse');

const anthropic = new Anthropic();

const router = express.Router();

// GET /api/courses - list all courses (authenticated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = db('courses')
      .join('users', 'courses.parent_id', 'users.id')
      .select(
        'courses.id',
        'courses.title',
        'courses.description',
        'courses.parent_id',
        'courses.created_at',
        'users.name as parent_name',
        db.raw('courses.compiled_material IS NOT NULL as has_compiled_material')
      );

    query = query.where('courses.parent_id', req.user.id)
      .where('courses.title', '!=', '');

    const courses = await query.orderBy('courses.created_at', 'desc');
    return res.json(courses);
  } catch (err) {
    console.error('Get courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses - create course (parent only)
router.post('/', authMiddleware, requireRole('parent'), async (req, res) => {
  const { title, description } = req.body;

  try {
    const [course] = await db('courses')
      .insert({ title: title || '', description, parent_id: req.user.id })
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
      .join('users', 'courses.parent_id', 'users.id')
      .select(
        'courses.*',
        'users.name as parent_name'
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

// PUT /api/courses/:id - update course (parent owner only)
router.put('/:id', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  const { title, description, learning_mode } = req.body;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const updateData = { title, description, updated_at: db.fn.now() };
    if ('enable_quick_replies' in req.body) {
      updateData.enable_quick_replies = !!req.body.enable_quick_replies;
    }
    if ('enable_tts' in req.body) {
      updateData.enable_tts = !!req.body.enable_tts;
    }
    if ('learning_mode' in req.body) {
      const VALID_MODES = ['procedural', 'conceptual', 'discussion', 'narrative', 'exploratory'];
      updateData.learning_mode = VALID_MODES.includes(learning_mode) ? learning_mode : null;
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

// DELETE /api/courses/:id - delete course (parent owner only)
router.delete('/:id', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.parent_id !== req.user.id) {
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
router.post('/:id/compile', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await compileCourseMaterial(id);
    // Reset parent's test session so next test uses the new material
    await db('chat_sessions').where({ child_id: req.user.id, course_id: id }).delete();

    // Generate title suggestion using Haiku
    let suggested_title = '';
    try {
      const updated = await db('courses').where({ id }).first();
      const toc = Array.isArray(updated.compiled_toc) ? updated.compiled_toc : [];
      if (toc.length > 0) {
        const resp = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 60,
          messages: [{ role: 'user', content: `Föreslå ett kort och beskrivande namn (max 6 ord, på svenska) för ett arbetsområde med dessa moment:\n${toc.join('\n')}\n\nSvara med ENBART namnet, inget annat.` }],
        });
        suggested_title = resp.content[0]?.text?.trim() || '';
      }
    } catch (e) {
      console.error('Title suggestion failed:', e.message);
    }

    res.json({ ok: true, suggested_title });
  } catch (err) {
    console.error('Compile error:', err);
    res.status(500).json({ error: 'Kompilering misslyckades' });
  }
});

// GET /api/courses/:id/enrollments - list enrolled children
router.get('/:id/enrollments', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, parent_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const children = await db('enrollments')
      .join('users', 'enrollments.child_id', 'users.id')
      .where('enrollments.course_id', id)
      .select('users.id', 'users.name', 'users.username', 'enrollments.created_at as enrolled_at')
      .orderBy('users.name');

    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/:id/enrollments/:childId - remove individual enrollment
router.delete('/:id/enrollments/:childId', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id, childId } = req.params;
  try {
    const course = await db('courses').where({ id, parent_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await db('enrollments').where({ course_id: id, child_id: childId }).delete();
    res.json({ message: 'Enrollment removed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/enroll - enroll a child by child_id
router.post('/:id/enroll', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  const { child_id } = req.body;

  if (!child_id) {
    return res.status(400).json({ error: 'child_id is required' });
  }

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const child = await db('users').where({ id: child_id, role: 'child', parent_id: req.user.id }).first();
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const existing = await db('enrollments')
      .where({ child_id: child.id, course_id: id })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Child is already enrolled in this course' });
    }

    const [enrollment] = await db('enrollments')
      .insert({ child_id: child.id, course_id: id })
      .returning('*');

    return res.status(201).json({
      enrollment,
      child: { id: child.id, name: child.name, username: child.username },
    });
  } catch (err) {
    console.error('Enroll error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/:id/test-session – fetch parent's own test chat messages
router.get('/:id/test-session', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, parent_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const [session, aiSummary] = await Promise.all([
      db('chat_sessions').where({ child_id: req.user.id, course_id: id }).first(),
      db('ai_summaries').where({ child_id: req.user.id, course_id: id }).first(),
    ]);
    res.json({ messages: session ? session.messages : [], aiSummary: aiSummary || null });
  } catch (err) {
    console.error('Get test session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/:id/test-session – clear parent's test chat session
router.delete('/:id/test-session', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, parent_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await db('chat_sessions').where({ child_id: req.user.id, course_id: id }).delete();
    await db('ai_summaries').where({ child_id: req.user.id, course_id: id }).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('Clear test session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/:id/quiz-session – fetch parent's quiz session
router.get('/:id/quiz-session', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, parent_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const [session, aiSummary] = await Promise.all([
      db('chat_sessions').where({ child_id: req.user.id, course_id: id }).first(),
      db('ai_summaries').where({ child_id: req.user.id, course_id: id }).first(),
    ]);
    res.json({
      quizMessages: (session?.quiz_messages || []).filter(m => m.role !== 'meta'),
      quizAnsweredSections: aiSummary?.quiz_answered_sections || [],
      quizScore: aiSummary?.quiz_score ?? null,
    });
  } catch (err) {
    console.error('Get quiz session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/:id/quiz-session – clear parent's quiz session
router.delete('/:id/quiz-session', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;
  try {
    const course = await db('courses').where({ id, parent_id: req.user.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await db('chat_sessions')
      .where({ child_id: req.user.id, course_id: id })
      .update({ quiz_messages: JSON.stringify([]) });
    await db('ai_summaries')
      .where({ child_id: req.user.id, course_id: id })
      .update({ quiz_score: null, quiz_answered_sections: JSON.stringify([]) });
    res.json({ ok: true });
  } catch (err) {
    console.error('Clear quiz session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
