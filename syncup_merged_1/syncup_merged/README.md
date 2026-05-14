# 🎓 CollegeLink — PCCOE Student Network

A LinkedIn-style social platform for college students to share achievements, find project teammates, discover events, and join clubs.

---

## ✨ Features

| Section | What it does |
|---------|-------------|
| **Feed** | Post achievements & projects, like, share, filter by type |
| **Collaborations** | Post projects, browse by tech stack, apply to join teams |
| **Events** | View upcoming/ongoing/completed events, register, view certificates |
| **Clubs** | Browse all college clubs, join/leave, see member stats |
| **Auth** | JWT-based login & registration |
| **Notifications** | Real-time bell with unread count |

---

## 🗂 Project Structure

```
collegelink/
├── server.js              # Express entry point
├── package.json
├── .env.example           # Copy to .env before running
├── db/
│   ├── init.js            # Run once to create + seed DB
│   └── database.js        # SQLite connection singleton
├── middleware/
│   └── auth.js            # JWT middleware
├── routes/
│   ├── auth.js            # /api/auth/*
│   ├── posts.js           # /api/posts/*
│   ├── collaborations.js  # /api/collabs/*
│   ├── events.js          # /api/events/*
│   ├── clubs.js           # /api/clubs/*
│   ├── users.js           # /api/users/*
│   ├── certificates.js    # /api/certificates/*
│   └── notifications.js   # /api/notifications/*
└── public/
    ├── index.html
    ├── css/style.css
    ├── js/
    │   ├── api.js          # Fetch wrapper + all API calls
    │   └── app.js          # All UI logic
    └── uploads/            # User-uploaded images
```

---

## 🚀 Local Setup

### 1. Prerequisites
- Node.js 18+
- npm

### 2. Install
```bash
git clone <your-repo>
cd collegelink
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

### 4. Initialise database
```bash
node db/init.js
```
This creates `db/collegelink.db` and seeds demo users + data.

### 5. Run
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Open **http://localhost:3000**

### Demo Login
```
Email:    alex@pccoe.edu
Password: password123
```

---

## 🌐 Deploy on Render (Free)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Build Command:** `npm install && node db/init.js`
   - **Start Command:** `npm start`
   - **Environment Variables:** Add `JWT_SECRET` and `NODE_ENV=production`
5. Deploy!

> Render's free tier spins down after inactivity. For persistent SQLite, mount a disk or switch to Railway.

---

## 🚂 Deploy on Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables: `JWT_SECRET`, `PORT=3000`
4. Railway auto-detects Node and runs `npm start`
5. Run `node db/init.js` once via Railway's shell tab

---

## 🖥 Deploy on VPS (Ubuntu)

```bash
# Install Node
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone + install
git clone <your-repo> /var/www/collegelink
cd /var/www/collegelink
npm install
node db/init.js

# Setup PM2 (process manager)
sudo npm install -g pm2
pm2 start server.js --name collegelink
pm2 startup
pm2 save

# Nginx reverse proxy (optional, for port 80)
sudo apt install nginx
# In /etc/nginx/sites-available/collegelink:
# location / { proxy_pass http://localhost:3000; }
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📡 API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| GET  | `/api/auth/me` | Get current user |
| PUT  | `/api/auth/me` | Update profile |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/posts?type=achievement` | Get feed (filter by type) |
| POST | `/api/posts` | Create post |
| DELETE | `/api/posts/:id` | Delete own post |
| POST | `/api/posts/:id/like` | Toggle like |
| GET  | `/api/posts/:id/comments` | Get comments |
| POST | `/api/posts/:id/comments` | Add comment |

### Collaborations
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/collabs?category=ml` | List open projects |
| POST | `/api/collabs` | Create project |
| POST | `/api/collabs/:id/apply` | Apply to join |
| GET  | `/api/collabs/:id/applications` | Get applicants (owner) |
| PUT  | `/api/collabs/:id/applications/:appId` | Accept/reject applicant |

### Events
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/events?status=upcoming` | List events |
| POST | `/api/events/:id/register` | Toggle registration |
| GET  | `/api/events/my/registrations` | My registered events |

### Clubs
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/clubs?category=tech` | List clubs |
| POST | `/api/clubs/:id/join` | Toggle membership |
| GET  | `/api/clubs/my` | My clubs |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/users?q=search` | Search users |
| POST | `/api/users/:id/connect` | Toggle connection |
| GET  | `/api/certificates/my` | My certificates |
| GET  | `/api/notifications` | Get notifications |
| PUT  | `/api/notifications/read-all` | Mark all read |

---

## 🔧 Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via better-sqlite3 (zero-config, file-based)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Fonts:** Inter (Google Fonts)

---

## 📌 Notes

- The database file (`db/collegelink.db`) is created locally and excluded from git
- For production with multiple instances, migrate to PostgreSQL (swap `better-sqlite3` for `pg`)
- Uploaded images stored in `public/uploads/` — use cloud storage (S3/Cloudinary) for production
