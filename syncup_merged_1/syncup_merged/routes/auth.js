// routes/auth.js
const express = require('express');
const router = express.Router();

const { getDb } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { authRequired } = require('../middleware/auth');

// 🔐 Helper for JWT secret
const SECRET = () => process.env.JWT_SECRET || 'dev_secret';

/* ================= REGISTER ================= */
router.post('/register', (req, res) => {
  try {
    const { name, email, password, college, department, year } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password required' });
    }

    const db = getDb();

    // Check existing user
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hash = bcrypt.hashSync(password, 10);

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (name,email,password,college,department,year)
      VALUES (?,?,?,?,?,?)
    `).run(name, email, hash, college || 'PCCOE', department || null, year || null);

    // Get user
    const user = db.prepare(`
      SELECT id,name,email,college,department,year,avatar
      FROM users WHERE id=?
    `).get(result.lastInsertRowid);

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      SECRET(),
      { expiresIn: '7d' }
    );

    res.json({ token, user });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= LOGIN ================= */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const db = getDb();

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      SECRET(),
      { expiresIn: '7d' }
    );

    // Send user (without password)
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      college: user.college,
      department: user.department,
      year: user.year,
      avatar: user.avatar
    };

    res.json({ token, user: safeUser });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= GET CURRENT USER ================= */
router.get('/me', authRequired, (req, res) => {
  try {
    const db = getDb();

    const user = db.prepare(`
      SELECT id,name,email,college,department,year,avatar
      FROM users WHERE id=?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;