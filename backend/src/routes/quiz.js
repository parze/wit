const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const anthropic = new Anthropic();

const router = express.Router();

// GET /api/courses/:id/quiz - teacher sees all fields, student sees no correct_index
router.get('/:id/quiz', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user.role === 'student') {
      const enrollment = await db('enrollments')
        .where({ student_id: req.user.id, course_id: id })
        .first();
      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }

    const selectFields = req.user.role === 'teacher'
      ? ['id', 'question', 'options', 'correct_index', 'order']
      : ['id', 'question', 'options', 'order'];

    const questions = await db('quiz_questions')
      .where({ course_id: id })
      .orderBy('order', 'asc')
      .select(selectFields);

    return res.json(questions);
  } catch (err) {
    console.error('Get quiz error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/quiz/questions - add quiz question (teacher)
router.post('/:id/quiz/questions', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { question, options, correct_index } = req.body;

  if (!question || !Array.isArray(options) || options.length < 2 || correct_index == null) {
    return res.status(400).json({ error: 'question, options (array), and correct_index are required' });
  }

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const count = await db('quiz_questions').where({ course_id: id }).count('id as c').first();
    const order = parseInt(count.c) || 0;

    const [q] = await db('quiz_questions')
      .insert({ course_id: id, question, options: JSON.stringify(options), correct_index, order })
      .returning('*');

    return res.status(201).json(q);
  } catch (err) {
    console.error('Add quiz question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/quiz/generate - generate quiz questions with AI (teacher)
router.post('/:id/quiz/generate', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    let context = course.compiled_material;
    if (!context) {
      const docs = await db('section_documents').where({ course_id: id }).select('extracted_text');
      context = docs.map(d => d.extracted_text).filter(Boolean).join('\n\n');
    }
    if (!context) {
      return res.status(400).json({ error: 'No content available to generate questions from' });
    }

    const toc = Array.isArray(course.compiled_toc)
      ? course.compiled_toc
      : (course.compiled_toc ? JSON.parse(course.compiled_toc) : []);

    const momentList = toc.length > 0
      ? `\nMomenten är:\n${toc.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `Du är en pedagogisk assistent. Generera quiz-frågor baserade på kursmaterialet nedan.${momentList}\n\nRegler:\n- Täck alla Moment i ordning\n- Bestäm själv hur många frågor varje Moment behöver (1–5) baserat på innehållets komplexitet och djup\n- Täck de viktigaste kunskaperna i varje Moment\n- Svara BARA med en JSON-array i formatet: [{"question": "...", "options": ["alt1", "alt2", "alt3", "alt4"], "correct_index": 0}]. Inga andra kommentarer.`,
      messages: [{ role: 'user', content: context }],
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI returnerade ogiltigt format' });
    }
    const generated = JSON.parse(jsonMatch[0]);

    const countRow = await db('quiz_questions').where({ course_id: id }).count('id as c').first();
    let order = parseInt(countRow.c) || 0;

    const toInsert = generated.map(q => ({
      course_id: id,
      question: q.question,
      options: JSON.stringify(q.options),
      correct_index: q.correct_index,
      order: order++,
    }));

    const inserted = await db('quiz_questions').insert(toInsert).returning('*');
    return res.status(201).json(inserted);
  } catch (err) {
    console.error('Generate quiz error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/quiz/questions/:qid - delete quiz question (teacher)
router.delete('/questions/:qid', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { qid } = req.params;

  try {
    const q = await db('quiz_questions').where({ id: qid }).first();
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const course = await db('courses').where({ id: q.course_id }).first();
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    await db('quiz_questions').where({ id: qid }).delete();
    return res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Delete quiz question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses/:id/quiz - submit answers, calculate score, save result
router.post('/:id/quiz', authMiddleware, requireRole('student'), async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers must be an array' });
  }

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = await db('enrollments')
      .where({ student_id: req.user.id, course_id: id })
      .first();

    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    const questions = await db('quiz_questions')
      .where({ course_id: id })
      .orderBy('order', 'asc');

    let score = 0;
    const results = questions.map((q, index) => {
      const studentAnswer = answers[index] !== undefined ? answers[index] : null;
      const correct = studentAnswer === q.correct_index;
      if (correct) score++;
      return {
        question: q.question,
        options: q.options,
        correct: q.correct_index,
        studentAnswer,
        isCorrect: correct,
      };
    });

    const total = questions.length;

    // Save quiz result
    const [quizResult] = await db('quiz_results')
      .insert({
        student_id: req.user.id,
        course_id: id,
        score,
        total,
        answers: JSON.stringify(answers),
      })
      .returning('*');

    // Update section_progress to 'completed' if perfect score, else 'in_progress'
    const newStatus = score === total && total > 0 ? 'completed' : 'in_progress';

    const existingProgress = await db('section_progress')
      .where({ student_id: req.user.id, course_id: id })
      .first();

    if (existingProgress) {
      await db('section_progress')
        .where({ student_id: req.user.id, course_id: id })
        .update({ status: newStatus, updated_at: db.fn.now() });
    } else {
      await db('section_progress').insert({
        student_id: req.user.id,
        course_id: id,
        status: newStatus,
      });
    }

    return res.json({ score, total, results, quizResultId: quizResult.id });
  } catch (err) {
    console.error('Submit quiz error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
