const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_COMPILE_PROMPT = `Du är en pedagogisk redaktör. Sammanställ och strukturera läromedel för ett arbetsområde till ett välstrukturerat Markdown-dokument uppdelat i tydliga Moment.

Regler:
- Skriv på samma språk som källtexten
- Varje Moment ska vara en ## rubrik (exakt nivå 2)
- Varje Moment ska innehålla det eleven behöver lära sig och göra för att bemästra den delen
- Lägg till en kort introduktion i början (utan ## rubrik)
- Undvik onödiga upprepningar, behåll allt viktigt innehåll
- Returnera ENDAST Markdown-text, inga förklaringar

Pedagogisk approach:
- Strukturera med tydlig progression – Moment för Moment
- Lyft fram nyckelbegrepp och vad eleven ska kunna efter varje Moment
- Inkludera praktiska uppgifter eller exempel per Moment
- Gör varje Moment avgränsat och hanterbart`;

const DEFAULT_CHAT_PROMPT = `Du är en engagerad AI-lärare som undervisar ett Moment i taget. Svara ENBART baserat på kursmaterialet nedan.

Hur du undervisar:
- Fokusera på det aktuella Momentet tills eleven visar förståelse – gå inte vidare i förtid
- Formulera uppgifter som uppdrag eller utmaningar snarare än prov
- Ge omedelbar, konkret feedback på elevens svar
- Vid felaktiga svar: ge ledtrådar snarare än direkta svar, använd fraser som "Nästan! Tänk på..." och "Bra försök! Vad händer om..."
- Ställ nyfikenhetsväckande följdfrågor och koppla nytt material till elevens tidigare kunskaper
- Håll svaren kortfattade och dialogbaserade – undvik långa monologer
- När ett Moment är avklarat: bekräfta det tydligt och introducera nästa Moment
- Om eleven frågar om något utanför kursmaterialet: vägled dem tillbaka till ämnet på ett vänligt sätt`;

async function getOrCreateDefault(teacherId) {
  let def = await db('course_instructions').where({ teacher_id: teacherId, is_default: true }).first();
  if (!def) {
    [def] = await db('course_instructions')
      .insert({
        teacher_id: teacherId,
        title: 'Standard',
        compile_prompt: DEFAULT_COMPILE_PROMPT,
        chat_prompt: DEFAULT_CHAT_PROMPT,
        is_default: true,
      })
      .returning('*');
  }
  return def;
}

// GET /api/instructions
router.get('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  try {
    await getOrCreateDefault(req.user.id);
    const instructions = await db('course_instructions')
      .where({ teacher_id: req.user.id })
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'asc');
    res.json(instructions);
  } catch (err) {
    console.error('Get instructions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/instructions
router.post('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { title, compile_prompt, chat_prompt } = req.body;
  if (!title || !compile_prompt || !chat_prompt) {
    return res.status(400).json({ error: 'title, compile_prompt and chat_prompt are required' });
  }
  try {
    const [created] = await db('course_instructions')
      .insert({ teacher_id: req.user.id, title, compile_prompt, chat_prompt, is_default: false })
      .returning('*');
    res.status(201).json(created);
  } catch (err) {
    console.error('Create instruction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/instructions/:id
router.put('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  const { title, compile_prompt, chat_prompt } = req.body;
  try {
    const instruction = await db('course_instructions').where({ id, teacher_id: req.user.id }).first();
    if (!instruction) return res.status(404).json({ error: 'Instruction not found' });

    const [updated] = await db('course_instructions')
      .where({ id })
      .update({ title, compile_prompt, chat_prompt, updated_at: db.fn.now() })
      .returning('*');
    res.json(updated);
  } catch (err) {
    console.error('Update instruction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/instructions/:id
router.delete('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  try {
    const instruction = await db('course_instructions').where({ id, teacher_id: req.user.id }).first();
    if (!instruction) return res.status(404).json({ error: 'Instruction not found' });
    if (instruction.is_default) return res.status(403).json({ error: 'Cannot delete the default instruction' });

    await db('course_instructions').where({ id }).delete();
    res.json({ message: 'Instruction deleted' });
  } catch (err) {
    console.error('Delete instruction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
