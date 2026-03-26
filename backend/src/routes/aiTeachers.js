const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_SYSTEM_PROMPT = `Du är en AI-lärare. Håll dig STRIKT till nedanstående kursmaterial.
Svara inte på frågor som inte rör detta material.
Hjälp eleven förstå steg för steg och ställ motfrågor.
Du får gärna använda Markdown i dina svar: rubriker, fetstil, kursiv, punktlistor, numrerade listor och kodblock där det passar.`;

async function getOrCreateDefault(teacherId) {
  let def = await db('ai_teachers').where({ teacher_id: teacherId, is_default: true }).first();
  if (!def) {
    [def] = await db('ai_teachers')
      .insert({
        teacher_id: teacherId,
        name: 'Standard-lärare',
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        is_default: true,
      })
      .returning('*');
  }
  return def;
}

// GET /api/ai-teachers
router.get('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  try {
    await getOrCreateDefault(req.user.id);
    const teachers = await db('ai_teachers')
      .where({ teacher_id: req.user.id })
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'asc');
    res.json(teachers);
  } catch (err) {
    console.error('Get ai-teachers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ai-teachers
router.post('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { name, system_prompt } = req.body;
  if (!name || !system_prompt) {
    return res.status(400).json({ error: 'name and system_prompt are required' });
  }
  try {
    const [created] = await db('ai_teachers')
      .insert({ teacher_id: req.user.id, name, system_prompt, is_default: false })
      .returning('*');
    res.status(201).json(created);
  } catch (err) {
    console.error('Create ai-teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/ai-teachers/:id
router.put('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { name, system_prompt } = req.body;
  try {
    const teacher = await db('ai_teachers').where({ id, teacher_id: req.user.id }).first();
    if (!teacher) return res.status(404).json({ error: 'AI teacher not found' });
    if (teacher.is_default) return res.status(403).json({ error: 'Cannot edit the default teacher' });

    const [updated] = await db('ai_teachers')
      .where({ id })
      .update({ name, system_prompt, updated_at: db.fn.now() })
      .returning('*');
    res.json(updated);
  } catch (err) {
    console.error('Update ai-teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ai-teachers/:id
router.delete('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await db('ai_teachers').where({ id, teacher_id: req.user.id }).first();
    if (!teacher) return res.status(404).json({ error: 'AI teacher not found' });
    if (teacher.is_default) return res.status(403).json({ error: 'Cannot delete the default teacher' });

    await db('ai_teachers').where({ id }).delete();
    res.json({ message: 'AI teacher deleted' });
  } catch (err) {
    console.error('Delete ai-teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.getOrCreateDefault = getOrCreateDefault;
