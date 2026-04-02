const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/student/courses - get all enrolled courses for student
router.get('/courses', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const enrollments = await db('enrollments')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .join('users', 'courses.teacher_id', 'users.id')
      .where('enrollments.student_id', req.user.id)
      .select(
        'courses.id',
        'courses.title',
        'courses.description',
        'courses.teacher_id',
        'courses.created_at',
        'users.name as teacher_name',
        'enrollments.created_at as enrolled_at'
      )
      .orderBy('enrollments.created_at', 'desc');

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (course) => {
        const [aiSummary, starsCount] = await Promise.all([
          db('ai_summaries').where({ student_id: req.user.id, course_id: course.id }).first(),
          db('section_stars').where({ student_id: req.user.id, course_id: course.id }).count('id as count').first(),
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
    console.error('Get student courses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/courses/:id - get course detail for student
router.get('/courses/:id', authMiddleware, requireRole('student'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses')
      .join('users', 'courses.teacher_id', 'users.id')
      .where('courses.id', id)
      .select('courses.*', 'users.name as teacher_name')
      .first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = await db('enrollments')
      .where({ student_id: req.user.id, course_id: id })
      .first();

    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    const [documents, questions, progress, chatSession, quizResult, aiSummary, starsCount] = await Promise.all([
      db('section_documents').where({ course_id: id }).select('id', 'filename', 'original_name', 'created_at').orderBy('created_at', 'asc'),
      db('quiz_questions').where({ course_id: id }).orderBy('order', 'asc').select('id', 'question', 'options', 'order'),
      db('section_progress').where({ student_id: req.user.id, course_id: id }).first(),
      db('chat_sessions').where({ student_id: req.user.id, course_id: id }).first(),
      db('quiz_results').where({ student_id: req.user.id, course_id: id }).orderBy('created_at', 'desc').first(),
      db('ai_summaries').where({ student_id: req.user.id, course_id: id }).first(),
      db('section_stars').where({ student_id: req.user.id, course_id: id }).count('id as count').first(),
    ]);

    return res.json({
      ...course,
      documents,
      questions,
      status: progress ? progress.status : 'not_started',
      messages: chatSession ? chatSession.messages : [],
      quizMessages: chatSession ? (chatSession.quiz_messages || []) : [],
      quizResult: quizResult || null,
      aiSummary: aiSummary || null,
      quizAnsweredSections: aiSummary?.quiz_answered_sections || [],
      quizScore: aiSummary?.quiz_score ?? null,
      stars: parseInt(starsCount?.count ?? 0),
    });
  } catch (err) {
    console.error('Get student course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student/courses/:id/complete - award star and reset progress
router.post('/courses/:id/complete', authMiddleware, requireRole('student'), async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrollment = await db('enrollments')
      .where({ student_id: studentId, course_id: id })
      .first();
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled' });

    const aiSummary = await db('ai_summaries').where({ student_id: studentId, course_id: id }).first();
    const achievement = aiSummary?.goal_achievement ?? 0;

    // Record star
    await db('section_stars').insert({ student_id: studentId, course_id: id, goal_achievement: achievement });

    // Reset chat and ai summary
    await db('chat_sessions').where({ student_id: studentId, course_id: id }).delete();
    await db('ai_summaries').where({ student_id: studentId, course_id: id }).delete();
    await db('section_progress').where({ student_id: studentId, course_id: id }).delete();

    const newStarsCount = await db('section_stars')
      .where({ student_id: studentId, course_id: id })
      .count('id as count')
      .first();

    return res.json({ stars: parseInt(newStarsCount.count) });
  } catch (err) {
    console.error('Complete course error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/courses/:courseId/quiz - get all quiz questions for course
router.get('/courses/:courseId/quiz', authMiddleware, requireRole('student'), async (req, res) => {
  const { courseId } = req.params;
  try {
    const enrollment = await db('enrollments')
      .where({ student_id: req.user.id, course_id: courseId })
      .first();
    if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

    const questions = await db('quiz_questions')
      .where({ course_id: courseId })
      .orderBy('order', 'asc')
      .select('id', 'question', 'options', 'order');

    return res.json(questions);
  } catch (err) {
    console.error('Get course quiz error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student/courses/:courseId/quiz - submit answers
router.post('/courses/:courseId/quiz', authMiddleware, requireRole('student'), async (req, res) => {
  const { courseId } = req.params;
  const { answers } = req.body;
  try {
    const enrollment = await db('enrollments')
      .where({ student_id: req.user.id, course_id: courseId })
      .first();
    if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

    // Verify course has ≥1 star
    const starsCount = await db('section_stars')
      .where({ student_id: req.user.id, course_id: courseId })
      .count('id as count')
      .first();
    if (parseInt(starsCount.count) === 0) {
      return res.status(403).json({ error: 'Du måste avsluta kursen minst en gång innan du kan göra kursets quiz' });
    }

    const questions = await db('quiz_questions')
      .where({ course_id: courseId })
      .orderBy('order', 'asc')
      .select('id', 'question', 'options', 'correct_index', 'order');

    let score = 0;
    const results = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct_index;
      if (isCorrect) score++;
      return {
        question: q.question,
        options: q.options,
        yourAnswer: answers[i],
        correct: q.correct_index,
        isCorrect,
      };
    });

    return res.json({ score, total: questions.length, results });
  } catch (err) {
    console.error('Submit course quiz error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
