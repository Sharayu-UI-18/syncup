// routes/collaborations.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

function enrich(c) {
  c.roles_needed = JSON.parse(c.roles_needed || '[]');
  c.skills = JSON.parse(c.skills || '[]');
  return c;
}

// GET /api/collabs
router.get('/', authOptional, (req, res) => {
  const db = getDb();
  const { category, status = 'open' } = req.query;
  let sql = `
    SELECT c.*, u.name as owner_name, u.avatar as owner_avatar,
           u.department as owner_dept, u.college as owner_college,
           u.year as owner_year,
           (SELECT COUNT(*) FROM collab_members WHERE collab_id=c.id) as member_count
    FROM collaborations c JOIN users u ON c.owner_id=u.id
    WHERE c.status=?
  `;
  const params = [status];
  if (category && category !== 'all') { sql += ' AND c.category=?'; params.push(category); }
  sql += ' ORDER BY c.created_at DESC';

  const collabs = db.prepare(sql).all(...params).map(c => {
    enrich(c);
    // Attach member avatars
    c.members = db.prepare(`
      SELECT u.avatar FROM collab_members cm JOIN users u ON cm.user_id=u.id WHERE cm.collab_id=?
    `).all(c.id);
    // Check if current user applied
    if (req.user) {
      const app = db.prepare('SELECT status FROM collab_applications WHERE collab_id=? AND user_id=?').get(c.id, req.user.id);
      c.my_application = app ? app.status : null;
    }
    return c;
  });
  res.json(collabs);
});

// GET /api/collabs/:id
router.get('/:id', authOptional, (req, res) => {
  const db = getDb();
  const c = db.prepare(`
    SELECT c.*, u.name as owner_name, u.avatar as owner_avatar,
           u.department as owner_dept, u.college as owner_college
    FROM collaborations c JOIN users u ON c.owner_id=u.id WHERE c.id=?
  `).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  enrich(c);
  c.members = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.department, cm.role
    FROM collab_members cm JOIN users u ON cm.user_id=u.id WHERE cm.collab_id=?
  `).all(c.id);
  res.json(c);
});

// POST /api/collabs
router.post('/', authRequired, (req, res) => {
  const { title, description, category, roles_needed = [], skills = [], team_size = 4, urgency = 'open' } = req.body;
  if (!title || !description || !category) return res.status(400).json({ error: 'title, description, category required' });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO collaborations (owner_id,title,description,category,roles_needed,skills,team_size,urgency) VALUES (?,?,?,?,?,?,?,?)'
  ).run(req.user.id, title, description, category, JSON.stringify(roles_needed), JSON.stringify(skills), team_size, urgency);

  // Owner auto-joins as lead
  db.prepare('INSERT INTO collab_members (collab_id,user_id,role) VALUES (?,?,?)').run(result.lastInsertRowid, req.user.id, 'lead');
  res.status(201).json({ id: result.lastInsertRowid });
});

// POST /api/collabs/:id/apply
router.post('/:id/apply', authRequired, (req, res) => {
  const { message = '' } = req.body;
  const db = getDb();
  const collab = db.prepare('SELECT * FROM collaborations WHERE id=?').get(req.params.id);
  if (!collab) return res.status(404).json({ error: 'Not found' });
  if (collab.owner_id === req.user.id) return res.status(400).json({ error: 'You own this project' });

  try {
    db.prepare('INSERT INTO collab_applications (collab_id,user_id,message) VALUES (?,?,?)').run(req.params.id, req.user.id, message);
    // Notify owner
    db.prepare('INSERT INTO notifications (user_id,from_user,type,message) VALUES (?,?,?,?)')
      .run(collab.owner_id, req.user.id, 'collab', `${req.user.name} applied to join "${collab.title}"`);
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'Already applied' });
  }
});

// GET /api/collabs/:id/applications  (owner only)
router.get('/:id/applications', authRequired, (req, res) => {
  const db = getDb();
  const collab = db.prepare('SELECT * FROM collaborations WHERE id=?').get(req.params.id);
  if (!collab) return res.status(404).json({ error: 'Not found' });
  if (collab.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const apps = db.prepare(`
    SELECT a.*, u.name, u.avatar, u.department, u.skills
    FROM collab_applications a JOIN users u ON a.user_id=u.id WHERE a.collab_id=?
  `).all(req.params.id);
  res.json(apps);
});

// PUT /api/collabs/:id/applications/:appId  (accept/reject)
router.put('/:id/applications/:appId', authRequired, (req, res) => {
  const { status } = req.body;  // accepted | rejected
  if (!['accepted','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const db = getDb();
  const collab = db.prepare('SELECT * FROM collaborations WHERE id=?').get(req.params.id);
  if (!collab || collab.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const app = db.prepare('SELECT * FROM collab_applications WHERE id=?').get(req.params.appId);
  if (!app) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE collab_applications SET status=? WHERE id=?').run(status, req.params.appId);

  if (status === 'accepted') {
    db.prepare('INSERT OR IGNORE INTO collab_members (collab_id,user_id) VALUES (?,?)').run(req.params.id, app.user_id);
  }
  db.prepare('INSERT INTO notifications (user_id,from_user,type,message) VALUES (?,?,?,?)')
    .run(app.user_id, req.user.id, 'collab', `Your application to "${collab.title}" was ${status}`);
  res.json({ ok: true });
});

module.exports = router;
