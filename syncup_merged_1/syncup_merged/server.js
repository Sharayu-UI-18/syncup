// server.js
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();

/* ── MIDDLEWARE ─────────────────────────────────────────── */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

/* ── API ROUTES ─────────────────────────────────────────── */
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/collabs',       require('./routes/collaborations'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/clubs',         require('./routes/clubs'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/certificates',  require('./routes/certificates'));
app.use('/api/notifications', require('./routes/notifications'));

/* ── HEALTH CHECK ───────────────────────────────────────── */
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

/* ── SERVE FRONTEND ─────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ── START ──────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀  CollegeLink running at http://localhost:${PORT}`));
