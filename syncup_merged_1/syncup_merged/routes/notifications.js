// routes/notifications.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const notifs = db.prepare(`
    SELECT n.*, u.name as from_name, u.avatar as from_avatar
    FROM notifications n
    LEFT JOIN users u ON n.from_user = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 30
  `).all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  res.json({ notifications: notifs, unread });
});

// PUT /api/notifications/read-all
router.put('/read-all', authRequired, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authRequired, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
