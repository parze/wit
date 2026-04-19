const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/children - list parent's children
router.get('/', authMiddleware, requireRole('parent'), async (req, res) => {
  try {
    const children = await db('users')
      .where({ role: 'child', parent_id: req.user.id })
      .select('id', 'name', 'username', 'gender', 'birth_year', 'created_at')
      .orderBy('name');
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/children - create a child account (parent only)
router.post('/', authMiddleware, requireRole('parent'), async (req, res) => {
  const { name, username, password, gender, birth_year } = req.body;
  if (!name?.trim() || !username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Namn, användarnamn och lösenord krävs' });
  }
  try {
    const existing = await db('users').where({ username }).first();
    if (existing) return res.status(409).json({ error: 'Användarnamnet är redan taget' });

    const password_hash = await bcrypt.hash(password, 10);
    const insertData = {
      name: name.trim(),
      username: username.trim(),
      password_hash,
      role: 'child',
      parent_id: req.user.id,
    };
    if (gender) insertData.gender = gender;
    if (birth_year) insertData.birth_year = birth_year;

    const [child] = await db('users')
      .insert(insertData)
      .returning(['id', 'name', 'username', 'gender', 'birth_year', 'created_at']);

    res.status(201).json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/children/:id - delete a child (must be owned by parent)
router.delete('/:id', authMiddleware, requireRole('parent'), async (req, res) => {
  try {
    await db('users').where({ id: req.params.id, role: 'child', parent_id: req.user.id }).delete();
    res.json({ message: 'Child deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
