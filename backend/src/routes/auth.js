const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { sendPasswordResetEmail } = require('../emailService');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  try {
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await db('users')
      .insert({ name, email, password_hash, role: 'parent' })
      .returning(['id', 'name', 'email', 'role']);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/username and password are required' });
  }

  try {
    // If input contains @, look up by email; otherwise by username
    const isEmail = email.includes('@');
    const user = isEmail
      ? await db('users').where({ email }).first()
      : await db('users').where({ username: email }).first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db('users').where({ email }).first();
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db('users').where({ id: user.id }).update({
        password_reset_token: tokenHash,
        reset_token_expiry: expiry,
      });

      const resetUrl = `http://49.12.195.247:5200/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
  } catch (err) {
    console.error('Forgot password error:', err);
  }
  // Always return 200 to avoid user enumeration
  return res.json({ message: 'Om e-postadressen finns i systemet har ett mejl skickats.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token och lösenord krävs' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await db('users')
      .where({ password_reset_token: tokenHash })
      .where('reset_token_expiry', '>', new Date())
      .first();

    if (!user) {
      return res.status(400).json({ error: 'Ogiltig eller utgången länk' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db('users').where({ id: user.id }).update({
      password_hash,
      password_reset_token: null,
      reset_token_expiry: null,
    });

    return res.json({ message: 'Lösenordet har uppdaterats' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
