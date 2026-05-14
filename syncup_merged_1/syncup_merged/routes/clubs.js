// routes/clubs.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

// GET /api/clubs
router.get('/', authOptional, (req, res) => {
  const db = getDb();
  const { category } = req.query;
  let sql = 'SELECT * FROM clubs WHERE 1=1';
  const params = [];
  if (category && category !== 'all') { sql += ' AND category=?'; params.push(category); }
  sql += ' ORDER BY member_count DESC';

  const clubs = db.prepare(sql).all(...params).map(c => {
    c.tags = JSON.parse(c.tags || '[]');
    if (req.user) {
      c.joined = !!db.prepare('SELECT 1 FROM club_members WHERE club_id=? AND user_id=?').get(c.id, req.user.id);
    }
    return c;
  });
  res.json(clubs);
});

// POST /api/clubs/:id/join  (toggle)
router.post('/:id/join', authRequired, (req, res) => {
  const db = getDb();
  const club = db.prepare('SELECT * FROM clubs WHERE id=?').get(req.params.id);
  if (!club) return res.status(404).json({ error: 'Not found' });

  const existing = db.prepare('SELECT 1 FROM club_members WHERE club_id=? AND user_id=?').get(club.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM club_members WHERE club_id=? AND user_id=?').run(club.id, req.user.id);
    db.prepare('UPDATE clubs SET member_count = member_count - 1 WHERE id=?').run(club.id);
    return res.json({ joined: false });
  }
  db.prepare('INSERT INTO club_members (club_id,user_id) VALUES (?,?)').run(club.id, req.user.id);
  db.prepare('UPDATE clubs SET member_count = member_count + 1 WHERE id=?').run(club.id);
  res.json({ joined: true });
});

// GET /api/clubs/my  — clubs the logged-in user has joined
router.get('/my', authRequired, (req, res) => {
  const db = getDb();
  const clubs = db.prepare(`
    SELECT c.* FROM clubs c
    JOIN club_members cm ON c.id=cm.club_id
    WHERE cm.user_id=? ORDER BY cm.joined_at DESC
  `).all(req.user.id);
  clubs.forEach(c => c.tags = JSON.parse(c.tags || '[]'));
  res.json(clubs);
});

module.exports = router;
