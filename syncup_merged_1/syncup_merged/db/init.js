// db/init.js  –  Run once: node db/init.js
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const DB_PATH = path.join(__dirname, '..', 'collegelink.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ── SCHEMA ─────────────────────────────────────────────── */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    college     TEXT    DEFAULT 'PCCOE',
    department  TEXT,
    year        INTEGER,
    bio         TEXT,
    skills      TEXT    DEFAULT '[]',
    avatar      TEXT    DEFAULT '/img/default-avatar.png',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL DEFAULT 'post',  -- post | collab
    post_type   TEXT    DEFAULT 'general',        -- achievement | project | general
    content     TEXT    NOT NULL,
    tags        TEXT    DEFAULT '[]',
    image       TEXT,
    likes       INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id  INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS connections (
    from_user  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    to_user    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT DEFAULT 'pending',   -- pending | accepted
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (from_user, to_user)
  );

  CREATE TABLE IF NOT EXISTS collaborations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    category     TEXT    NOT NULL,        -- web | ml | mobile | design | other
    roles_needed TEXT    DEFAULT '[]',
    skills       TEXT    DEFAULT '[]',
    team_size    INTEGER DEFAULT 4,
    urgency      TEXT    DEFAULT 'open',  -- urgent | open
    status       TEXT    DEFAULT 'open',  -- open | closed
    created_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS collab_members (
    collab_id  INTEGER REFERENCES collaborations(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT DEFAULT 'member',
    joined_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (collab_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS collab_applications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    collab_id  INTEGER REFERENCES collaborations(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message    TEXT,
    status     TEXT DEFAULT 'pending',   -- pending | accepted | rejected
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (collab_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT,
    type         TEXT DEFAULT 'general',   -- hackathon | workshop | seminar | general
    status       TEXT DEFAULT 'upcoming',  -- upcoming | ongoing | done
    event_date   TEXT,
    location     TEXT,
    capacity     INTEGER DEFAULT 100,
    banner_emoji TEXT DEFAULT '🎓',
    banner_color TEXT DEFAULT 'linear-gradient(135deg,#1a1a3e,#0f3460)',
    organiser    TEXT DEFAULT 'PCCOE',
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_registrations (
    event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id   INTEGER REFERENCES events(id) ON DELETE SET NULL,
    title      TEXT NOT NULL,
    issuer     TEXT DEFAULT 'PCCOE',
    cert_type  TEXT DEFAULT 'participation',  -- participation | winner | completion
    issued_at  TEXT DEFAULT (datetime('now')),
    color      TEXT DEFAULT 'blue'            -- gold | blue | purple | green
  );

  CREATE TABLE IF NOT EXISTS clubs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    description  TEXT,
    category     TEXT DEFAULT 'tech',   -- tech | cultural | sports | social
    logo_emoji   TEXT DEFAULT '🏛️',
    logo_bg      TEXT DEFAULT 'linear-gradient(135deg,#58a6ff,#d2a8ff)',
    member_count INTEGER DEFAULT 0,
    events_year  INTEGER DEFAULT 0,
    rating       REAL    DEFAULT 4.5,
    tags         TEXT    DEFAULT '[]',
    created_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS club_members (
    club_id    INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT DEFAULT 'member',
    joined_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (club_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type       TEXT NOT NULL,   -- like | comment | connect | event | collab
    message    TEXT NOT NULL,
    read       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ── SEED DATA ──────────────────────────────────────────── */
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount > 0) {
  console.log('Database already seeded.');
  process.exit(0);
}

const hash = (p) => bcrypt.hashSync(p, 10);

// Users
const insertUser = db.prepare(`
  INSERT INTO users (name,email,password,college,department,year,bio,skills,avatar)
  VALUES (?,?,?,?,?,?,?,?,?)
`);

const users = [
  ['Alex Johnson',      'alex@pccoe.edu',    hash('password123'), 'PCCOE', 'Computer Engineering', 3, 'Full-stack dev, hackathon enthusiast', '["React","Node.js","Python","MongoDB"]', 'https://i.pravatar.cc/80?img=3'],
  ['Sarah Chen',        'sarah@stanford.edu', hash('password123'), 'Stanford University', 'Data Science', 4, 'AI researcher, HackMIT winner', '["Python","TensorFlow","Pandas","SQL"]', 'https://i.pravatar.cc/80?img=5'],
  ['Michael Rodriguez', 'michael@cmu.edu',    hash('password123'), 'Carnegie Mellon', 'Product Design', 3, 'Product designer building social impact tools', '["Figma","React","User Research"]', 'https://i.pravatar.cc/80?img=12'],
  ['Priya Mehta',       'priya@pccoe.edu',    hash('password123'), 'PCCOE', 'Computer Engineering', 3, 'GSoC 2024 contributor, open source lover', '["TensorFlow","Python","C++","Linux"]', 'https://i.pravatar.cc/80?img=45'],
  ['Rahul Desai',       'rahul@pccoe.edu',    hash('password123'), 'PCCOE', 'AI & ML',              3, 'Building AI products. Loves fintech.', '["LSTM","FastAPI","React","Docker"]', 'https://i.pravatar.cc/80?img=68'],
  ['Jamie Liu',         'jamie@pccoe.edu',    hash('password123'), 'PCCOE', 'Computer Engineering', 4, 'ML engineer, loves competitive coding', '["PyTorch","Scikit-learn","Spark"]', 'https://i.pravatar.cc/80?img=32'],
  ['Lisa Park',         'lisa@pccoe.edu',     hash('password123'), 'PCCOE', 'Information Technology',3, 'UI/UX designer who codes', '["Figma","Vue.js","CSS","Illustrator"]', 'https://i.pravatar.cc/80?img=20'],
  ['Aditya Kulkarni',   'aditya@pccoe.edu',   hash('password123'), 'PCCOE', 'Computer Engineering', 4, 'AR/VR dev, final year', '["ARCore","Unity","Android","OpenCV"]', 'https://i.pravatar.cc/80?img=22'],
];

users.forEach(u => insertUser.run(...u));

// Posts
const insertPost = db.prepare(`
  INSERT INTO posts (user_id,type,post_type,content,tags,created_at)
  VALUES (?,?,?,?,?,?)
`);
insertPost.run(2,'post','achievement','🎉 Excited to share that I just won first place at the HackMIT competition! Our team built an AI-powered study assistant that helps students learn more efficiently.','["#hackathon","#AI","#achievement"]','2024-03-11 10:00:00');
insertPost.run(3,'post','post','Looking for passionate developers to join our startup idea! We\'re building a platform to connect college students with local volunteering opportunities.','["#startup","#collaboration","#webdev"]','2024-03-11 07:00:00');
insertPost.run(4,'post','achievement','Got my Google Summer of Code 2024 acceptance! 🎊 Will be contributing to the TensorFlow ecosystem for the next 12 weeks. Grateful for PCCOE\'s coding culture!','["#GSoC","#Google","#TensorFlow","#opensource"]','2024-03-10 14:00:00');
insertPost.run(5,'post','post','Building a real-time stock prediction system using LSTM networks + live market feeds. Looking for 2 more developers. Tech: Python, TensorFlow, FastAPI, React.','["#LSTM","#FinTech","#Python","#lookingforteam"]','2024-03-10 09:00:00');

// Collaborations
const insertCollab = db.prepare(`
  INSERT INTO collaborations (owner_id,title,description,category,roles_needed,skills,team_size,urgency)
  VALUES (?,?,?,?,?,?,?,?)
`);
insertCollab.run(5,'AI Stock Prediction Dashboard','Real-time stock prediction using LSTM networks. Core ML pipeline ready. Need frontend + backend engineers.','ml','["React Developer","Python/FastAPI","Data Visualisation"]','["LSTM","TensorFlow","React","FastAPI"]',4,'urgent');
insertCollab.run(2,'Campus Event Discovery App','A unified app for discovering, registering and tracking all campus events with calendar sync and personalised recommendations.','web','["Flutter Dev","UI/UX Designer","Firebase Expert"]','["Flutter","Firebase","Figma"]',5,'open');
insertCollab.run(8,'AR Campus Navigation','Using ARCore to overlay navigation guides on the PCCOE campus in real-time.','mobile','["ARCore Dev","Maps API Expert"]','["ARCore","Unity","Android","OpenCV"]',4,'open');

// Events
const insertEvent = db.prepare(`
  INSERT INTO events (title,description,type,status,event_date,location,capacity,banner_emoji,banner_color,organiser)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);
insertEvent.run('CodeStorm 2025','Annual 36-hour national level hackathon','hackathon','upcoming','2025-03-22','PCCOE Main Hall',200,'💻','linear-gradient(135deg,#1a1a3e,#0f3460)','CSI PCCOE');
insertEvent.run('AI/ML Bootcamp','10-week intensive ML workshop series — every Saturday','workshop','ongoing','2025-03-15','Lab 302',45,'🤖','linear-gradient(135deg,#1a3e1a,#0f4020)','Google DSC PCCOE');
insertEvent.run('UI/UX Design Sprint','3-day intensive design workshop with industry mentors','workshop','upcoming','2025-04-05','Design Lab',30,'🎨','linear-gradient(135deg,#3e1a2e,#600f40)','ACM PCCOE');
insertEvent.run('HackPCCOE 2024','Internal college hackathon — January 2024','hackathon','done','2024-01-15','Auditorium',180,'🏆','linear-gradient(135deg,#2a2a2a,#1a1a1a)','PCCOE');
insertEvent.run('AWS Cloud Workshop','Cloud fundamentals with hands-on labs — February 2024','workshop','done','2024-02-10','Seminar Hall',120,'☁️','linear-gradient(135deg,#1e2a3e,#0a1a2e)','AWS Student Community');
insertEvent.run('Smart India Hackathon 2025','Internal college selection round for SIH 2025','hackathon','upcoming','2025-04-18','Multiple Venues',500,'🇮🇳','linear-gradient(135deg,#3e2a0a,#60400f)','PCCOE');

// Certificates for demo user (Alex, id=1)
const insertCert = db.prepare(`
  INSERT INTO certificates (user_id,event_id,title,issuer,cert_type,issued_at,color)
  VALUES (?,?,?,?,?,?,?)
`);
insertCert.run(1,4,'HackPCCOE 2024','PCCOE','winner','2024-01-16','gold');
insertCert.run(1,5,'AWS Cloud Workshop','AWS Student Community','participation','2024-02-10','blue');
insertCert.run(1,null,'Google DSC Core Member 2023-24','Google','completion','2023-12-01','purple');

// Clubs
const insertClub = db.prepare(`
  INSERT INTO clubs (name,description,category,logo_emoji,logo_bg,member_count,events_year,rating,tags)
  VALUES (?,?,?,?,?,?,?,?,?)
`);
insertClub.run('Google DSC PCCOE','Developer Student Club powered by Google. Learn, build and grow.','tech','🔥','linear-gradient(135deg,#4285f4,#34a853)',420,28,4.9,'["Android","Web","Cloud","ML"]');
insertClub.run('Robotics Club','Build robots, compete in Robocon and national competitions.','tech','🤖','linear-gradient(135deg,#f59e0b,#ef4444)',180,12,4.8,'["Arduino","ROS","3D Printing"]');
insertClub.run('Dramatics Club','Express yourself on stage — from street plays to full productions.','cultural','🎭','linear-gradient(135deg,#8b5cf6,#6366f1)',95,8,4.7,'["Theatre","Street Play","Mime"]');
insertClub.run('E-Cell PCCOE','Entrepreneurship cell nurturing startup ideas and connecting founders.','social','💡','linear-gradient(135deg,#06b6d4,#0ea5e9)',240,18,4.6,'["Startup","Pitch","Funding"]');
insertClub.run('Photography Club','Capture the world — photowalks, editing workshops, exhibitions.','cultural','📸','linear-gradient(135deg,#10b981,#059669)',130,15,4.8,'["DSLR","Lightroom","Street"]');
insertClub.run('Sports Committee','Inter-college and intra-college tournaments across all sports.','sports','⚽','linear-gradient(135deg,#f43f5e,#e11d48)',350,22,4.7,'["Cricket","Football","Chess"]');

// Pre-joined clubs for Alex
db.prepare('INSERT INTO club_members (club_id,user_id,role) VALUES (?,?,?)').run(2,1,'member');
db.prepare('INSERT INTO club_members (club_id,user_id,role) VALUES (?,?,?)').run(6,1,'member');

// Event registrations for Alex
db.prepare('INSERT INTO event_registrations (event_id,user_id) VALUES (?,?)').run(2,1);

console.log('✅ Database initialised and seeded successfully!');
db.close();
