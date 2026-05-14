// routes/posts.js
const express = require('express');
const { getDb } = require('../db/database');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

function enrichPost(post, userId) {
  post.tags = JSON.parse(post.tags || '[]');
  post.liked = false;
  if (userId) {
    const db = getDb();
    const like = db.prepare('SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?').get(userId, post.id);
    post.liked = !!like;
  }
  return post;
}

// GET /api/posts  — feed (all posts, newest first)
router.get('/', authOptional, (req, res) => {
  try {
    const db = getDb();
    const { type, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT p.*, u.name as author_name, u.avatar as author_avatar,
             u.college as author_college, u.department as author_dept
      FROM posts p JOIN users u ON p.user_id = u.id
    `;

    const params = [];

    if (type && type !== 'all') {
      sql += ' WHERE p.post_type = ?';   // ✅ CORRECT
      params.push(type);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(sql).all(...params);

    const posts = rows.map(p => enrichPost(p, req.user ? req.user.id : null));

    res.json(posts);

  } catch (err) {
    console.error("POST FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// GET /api/posts/:id
router.get('/:id', authOptional, (req, res) => {
  const db = getDb();
  const post = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar,
           u.college as author_college, u.department as author_dept
    FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id=?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(enrichPost(post, req.user?.id));
});

// POST /api/posts
router.post('/', authRequired, (req, res) => {
  const { content, post_type = 'general', tags = [], image } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO posts (user_id,type,post_type,content,tags,image) VALUES (?,?,?,?,?,?)'
  ).run(req.user.id, 'post', post_type, content, JSON.stringify(tags), image || null);

  const post = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar,
           u.college as author_college, u.department as author_dept
    FROM posts p JOIN users u ON p.user_id=u.id WHERE p.id=?
  `).get(result.lastInsertRowid);
  res.status(201).json(enrichPost(post, req.user.id));
});

// DELETE /api/posts/:id
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/posts/:id/like  (toggle)
router.post('/:id/like', authRequired, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE user_id=? AND post_id=?').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes = likes - 1 WHERE id=?').run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT OR IGNORE INTO post_likes (user_id,post_id) VALUES (?,?)').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes = likes + 1 WHERE id=?').run(req.params.id);
    // Notify post author
    const post = db.prepare('SELECT user_id FROM posts WHERE id=?').get(req.params.id);
    if (post && post.user_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (user_id,from_user,type,message) VALUES (?,?,?,?)')
        .run(post.user_id, req.user.id, 'like', `${req.user.name} liked your post`);
    }
    res.json({ liked: true });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', (req, res) => {
  const db = getDb();
  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id=u.id
    WHERE c.post_id=? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authRequired, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const db = getDb();
  const result = db.prepare('INSERT INTO comments (post_id,user_id,content) VALUES (?,?,?)').run(req.params.id, req.user.id, content);
  const comment = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?
  `).get(result.lastInsertRowid);
  res.status(201).json(comment);
});

module.exports = router;
