const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/child/courses - get all enrolled courses for child
router.get('/courses', authMiddleware, requireRole('child'), async (req, res) => {
  try {
    const enrollments = await db('enrollments')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .join('users', 'courses.parent_id', 'users.id')
      .where('enrollments.child_id', req.user.id)
      .select(
        'courses.id',
        'courses.title',
        'courses.description',
        'courses.parent_id',
        'courses.created_at',
        'users.name as parent_name',
        'enrollments.created_at as enrolled_at'
      )
      .orderBy('enrollments.created_at', 'desc');

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (course) => {
        const [aiSummary, starsCount] = await Promise.all([
          db('ai_summaries').where({ child_id: req.user.id, course_id: course.id }).first(),
          db('section_stars').where({ child_id: req.user.id, course_id: course.id }).count('id as count').first(),
        ]);

        return {
          ...course,
          goal_achievement: aiSummary?.goal_achievement ?? 0,
          stars: parseInt(starsCount?.count ?? 0),
        };
      })
    );

    return res.json(coursesWithProgress);
  } catch (err) {
    console.error('Get child courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/child/courses/:id - get course detail for child
router.get('/courses/:id', authMiddleware, requireRole('child'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses')
      .join('users', 'courses.parent_id', 'users.id')
      .where('courses.id', id)
      .select('courses.*', 'users.name as parent_name')
      .first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = await db('enrollments')
      .where({ child_id: req.user.id, course_id: id })
      .first();

    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    const [documents, progress, chatSession, aiSummary, starsCount] = await Promise.all([
      db('section_documents').where({ course_id: id }).select('id', 'filename', 'original_name', 'created_at').orderBy('created_at', 'asc'),
      db('section_progress').where({ child_id: req.user.id, course_id: id }).first(),
      db('chat_sessions').where({ child_id: req.user.id, course_id: id }).first(),
      db('ai_summaries').where({ child_id: req.user.id, course_id: id }).first(),
      db('section_stars').where({ child_id: req.user.id, course_id: id }).count('id as count').first(),
    ]);

    return res.json({
      ...course,
      documents,
      status: progress ? progress.status : 'not_started',
      messages: chatSession ? chatSession.messages : [],
      quizMessages: chatSession ? (chatSession.quiz_messages || []).filter(m => m.role !== 'meta') : [],
      aiSummary: aiSummary || null,
      quizAnsweredSections: aiSummary?.quiz_answered_sections || [],
      quizScore: aiSummary?.quiz_score ?? null,
      stars: parseInt(starsCount?.count ?? 0),
    });
  } catch (err) {
    console.error('Get child course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/child/courses/:id/complete - award star and reset progress
router.post('/courses/:id/complete', authMiddleware, requireRole('child'), async (req, res) => {
  const { id } = req.params;
  const childId = req.user.id;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrollment = await db('enrollments')
      .where({ child_id: childId, course_id: id })
      .first();
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled' });

    const aiSummary = await db('ai_summaries').where({ child_id: childId, course_id: id }).first();
    const achievement = aiSummary?.goal_achievement ?? 0;

    // Record star
    await db('section_stars').insert({ child_id: childId, course_id: id, goal_achievement: achievement });

    // Reset chat and ai summary
    await db('chat_sessions').where({ child_id: childId, course_id: id }).delete();
    await db('ai_summaries').where({ child_id: childId, course_id: id }).delete();
    await db('section_progress').where({ child_id: childId, course_id: id }).delete();

    const newStarsCount = await db('section_stars')
      .where({ child_id: childId, course_id: id })
      .count('id as count')
      .first();

    return res.json({ stars: parseInt(newStarsCount.count) });
  } catch (err) {
    console.error('Complete course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
