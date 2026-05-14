// routes/users.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

// GET /api/users  — suggested (exclude self + existing connections)
router.get('/', authOptional, (req, res) => {
  const db = getDb();
  const { q, limit = 10 } = req.query;
  let sql = `
    SELECT id, name, email, college, department, year, avatar, skills
    FROM users WHERE 1=1
  `;
  const params = [];
  if (req.user) { sql += ' AND id != ?'; params.push(req.user.id); }
  if (q) { sql += ' AND (name LIKE ? OR department LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' LIMIT ?';
  params.push(Number(limit));

  const users = db.prepare(sql).all(...params).map(u => {
    u.skills = JSON.parse(u.skills || '[]');
    if (req.user) {
      const conn = db.prepare('SELECT status FROM connections WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)').get(req.user.id, u.id, u.id, req.user.id);
      u.connection_status = conn ? conn.status : null;
    }
    return u;
  });
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', authOptional, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id,name,email,college,department,year,bio,skills,avatar,created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.skills = JSON.parse(user.skills || '[]');
  if (req.user) {
    const conn = db.prepare('SELECT status FROM connections WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)').get(req.user.id, user.id, user.id, req.user.id);
    user.connection_status = conn ? conn.status : null;
    user.post_count = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id=?').get(user.id).c;
    user.connection_count = db.prepare("SELECT COUNT(*) as c FROM connections WHERE (from_user=? OR to_user=?) AND status='accepted'").get(user.id, user.id).c;
  }
  res.json(user);
});

// POST /api/users/:id/connect
router.post('/:id/connect', authRequired, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot connect to yourself' });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM connections WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)').get(req.user.id, targetId, targetId, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM connections WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)').run(req.user.id, targetId, targetId, req.user.id);
    return res.json({ connected: false });
  }

  db.prepare('INSERT INTO connections (from_user,to_user,status) VALUES (?,?,?)').run(req.user.id, targetId, 'accepted');
  // Notify
  const target = db.prepare('SELECT name FROM users WHERE id=?').get(targetId);
  db.prepare('INSERT INTO notifications (user_id,from_user,type,message) VALUES (?,?,?,?)')
    .run(targetId, req.user.id, 'connect', `${req.user.name} connected with you`);
  res.json({ connected: true });
});

module.exports = router;
