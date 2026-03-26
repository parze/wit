const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { compileSectionMaterial } = require('../compileSection');

const router = express.Router();

// GET /api/sections/:id - get section with documents and quiz questions
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const section = await db('sections').where({ id }).first();
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const documents = await db('section_documents')
      .where({ section_id: id })
      .select('id', 'filename', 'original_name', 'created_at');

    const questions = await db('quiz_questions')
      .where({ section_id: id })
      .orderBy('order', 'asc')
      .select('id', 'question', 'options', 'order');

    return res.json({ ...section, documents, questions });
  } catch (err) {
    console.error('Get section error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sections/:id - update section
router.put('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { title, description, order } = req.body;

  try {
    const section = await db('sections').where({ id }).first();
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const course = await db('courses').where({ id: section.course_id }).first();
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (order !== undefined) updates.order = order;
    updates.updated_at = db.fn.now();

    const [updated] = await db('sections')
      .where({ id })
      .update(updates)
      .returning('*');

    return res.json(updated);
  } catch (err) {
    console.error('Update section error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sections/:id - delete section
router.delete('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;

  try {
    const section = await db('sections').where({ id }).first();
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const course = await db('courses').where({ id: section.course_id }).first();
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    await db('sections').where({ id }).delete();
    return res.json({ message: 'Section deleted' });
  } catch (err) {
    console.error('Delete section error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sections/:id/compile - manually compile section material
router.post('/:id/compile', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const section = await db('sections').where({ id }).first();
    if (!section) return res.status(404).json({ error: 'Section not found' });
    const course = await db('courses').where({ id: section.course_id }).first();
    if (course.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await compileSectionMaterial(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Compile error:', err);
    res.status(500).json({ error: 'Kompilering misslyckades' });
  }
});

module.exports = router;
