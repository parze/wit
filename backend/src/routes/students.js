const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/students - list all students
router.get('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  try {
    const students = await db('users')
      .where({ role: 'student' })
      .select('id', 'name', 'email', 'gender', 'created_at')
      .orderBy('name');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students - create a student account (teacher only)
router.post('/', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { name, email, password, gender } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Namn, e-post och lösenord krävs' });
  }
  try {
    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'E-postadressen används redan' });

    const password_hash = await bcrypt.hash(password, 10);
    const insertData = { name: name.trim(), email: email.trim(), password_hash, role: 'student' };
    if (gender) insertData.gender = gender;
    const [student] = await db('users')
      .insert(insertData)
      .returning(['id', 'name', 'email', 'gender', 'created_at']);

    res.status(201).json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id - delete a student
router.delete('/:id', authMiddleware, requireRole('teacher'), async (req, res) => {
  try {
    await db('users').where({ id: req.params.id, role: 'student' }).delete();
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
