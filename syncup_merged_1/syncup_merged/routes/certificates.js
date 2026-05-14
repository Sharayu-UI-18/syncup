// routes/certificates.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/certificates/my
router.get('/my', authRequired, (req, res) => {
  const db = getDb();
  const certs = db.prepare(`
    SELECT c.*, e.title as event_title
    FROM certificates c
    LEFT JOIN events e ON c.event_id = e.id
    WHERE c.user_id = ?
    ORDER BY c.issued_at DESC
  `).all(req.user.id);
  res.json(certs);
});

// GET /api/certificates/:id
router.get('/:id', authRequired, (req, res) => {
  const db = getDb();
  const cert = db.prepare(`
    SELECT c.*, u.name as user_name, u.college, e.title as event_title
    FROM certificates c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN events e ON c.event_id = e.id
    WHERE c.id = ? AND c.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!cert) return res.status(404).json({ error: 'Not found' });
  res.json(cert);
});

module.exports = router;
