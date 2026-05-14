// routes/events.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

// GET /api/events
router.get('/', authOptional, (req, res) => {
  const db = getDb();
  const { status, type } = req.query;
  let sql = 'SELECT * FROM events WHERE 1=1';
  const params = [];
  if (status && status !== 'all') { sql += ' AND status=?'; params.push(status); }
  if (type)   { sql += ' AND type=?'; params.push(type); }
  sql += ' ORDER BY event_date ASC';

  const events = db.prepare(sql).all(...params).map(e => {
    e.registered_count = db.prepare('SELECT COUNT(*) as c FROM event_registrations WHERE event_id=?').get(e.id).c;
    if (req.user) {
      e.registered = !!db.prepare('SELECT 1 FROM event_registrations WHERE event_id=? AND user_id=?').get(e.id, req.user.id);
    }
    return e;
  });
  res.json(events);
});

// GET /api/events/:id
router.get('/:id', authOptional, (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  event.registered_count = db.prepare('SELECT COUNT(*) as c FROM event_registrations WHERE event_id=?').get(event.id).c;
  if (req.user) {
    event.registered = !!db.prepare('SELECT 1 FROM event_registrations WHERE event_id=? AND user_id=?').get(event.id, req.user.id);
  }
  res.json(event);
});

// POST /api/events/:id/register  (toggle)
router.post('/:id/register', authRequired, (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.status === 'done') return res.status(400).json({ error: 'Event is over' });

  const existing = db.prepare('SELECT 1 FROM event_registrations WHERE event_id=? AND user_id=?').get(event.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM event_registrations WHERE event_id=? AND user_id=?').run(event.id, req.user.id);
    return res.json({ registered: false });
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM event_registrations WHERE event_id=?').get(event.id).c;
  if (count >= event.capacity) return res.status(400).json({ error: 'Event is full' });

  db.prepare('INSERT INTO event_registrations (event_id,user_id) VALUES (?,?)').run(event.id, req.user.id);
  res.json({ registered: true });
});

// GET /api/events/my/registrations  — user's registered events
router.get('/my/registrations', authRequired, (req, res) => {
  const db = getDb();
  const events = db.prepare(`
    SELECT e.* FROM events e
    JOIN event_registrations er ON e.id=er.event_id
    WHERE er.user_id=? ORDER BY e.event_date ASC
  `).all(req.user.id);
  res.json(events);
});

module.exports = router;
