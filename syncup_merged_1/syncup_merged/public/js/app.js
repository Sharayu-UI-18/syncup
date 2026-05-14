// public/js/app.js

/* ── STATE ──────────────────────────────────────────────── */
let currentUser  = null;
let currentSection = 'feed';
let currentFeedTab = 'all';
let currentEventFilter = { status: 'all', type: null };
let currentCollabFilter = 'all';
let currentClubFilter   = 'all';
let pendingCollabId = null;
let notifOpen = false;

/* ── BOOT ───────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  const token = API.getToken();
  if (token) {
    try {
      currentUser = await API.me();
      showApp();
    } catch {
      API.clearToken();
      showAuth();
    }
  } else {
    showAuth();
  }
});

function showAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  updateSidebarProfile();
  loadSection('feed');
  loadSuggested();
  pollNotifications();
}

/* ── AUTH ───────────────────────────────────────────────── */
function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Please fill all fields.'; errEl.style.display = 'block'; return; }
  try {
    const res = await API.login(email, password);
    API.setToken(res.token);
    currentUser = res.user;
    showApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const dept     = document.getElementById('regDept').value.trim();
  const year     = document.getElementById('regYear').value;
  const errEl    = document.getElementById('regError');
  errEl.style.display = 'none';
  if (!name || !email || !password) { errEl.textContent = 'Name, email and password required.'; errEl.style.display='block'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display='block'; return; }
  try {
    const res = await API.register(name, email, password, 'PCCOE', dept, year ? Number(year) : null);
    API.setToken(res.token);
    currentUser = res.user;
    showApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

function logout() {
  API.clearToken();
  currentUser = null;
  showAuth();
}

/* ── SIDEBAR ────────────────────────────────────────────── */
function updateSidebarProfile() {
  if (!currentUser) return;
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarAvatar').src = currentUser.avatar || 'https://i.pravatar.cc/40';
}

/* ── SECTION SWITCHING ──────────────────────────────────── */
function switchSection(name, el) {
  currentSection = name;
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  loadSection(name);
}

function loadSection(name) {
  if (name === 'feed')   loadFeed(currentFeedTab);
  if (name === 'collab') loadCollabs(currentCollabFilter);
  if (name === 'events') { loadEvents(); loadCerts(); }
  if (name === 'clubs')  loadClubs(currentClubFilter);
}

/* ── FEED ───────────────────────────────────────────────── */
function switchFeedTab(el, type) {
  currentFeedTab = type;
  document.querySelectorAll('#feedTabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadFeed(type);
}

async function loadFeed(type) {
  const list = document.getElementById('feedList');
  list.innerHTML = '<div class="loading-spinner">Loading feed…</div>';
  try {
    const posts = await API.getFeed(type);
    if (!posts.length) {
      list.innerHTML = `<div class="empty-state"><div class="es-icon">📭</div><h3>No posts yet</h3><p>Be the first to share something!</p></div>`;
      return;
    }
    list.innerHTML = '';
    // Composer first
    list.insertAdjacentHTML('beforeend', renderComposer());
    posts.forEach(p => list.insertAdjacentHTML('beforeend', renderPost(p)));
    attachPostHandlers();
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`;
  }
}

function renderComposer() {
  const u = currentUser;
  return `
  <div class="card" style="padding:16px;">
    <div style="display:flex;gap:12px;align-items:center;">
      <img src="${u?.avatar||'https://i.pravatar.cc/40'}" style="width:40px;height:40px;border-radius:50%;">
      <div style="flex:1;background:#f3f8fb;border-radius:25px;padding:10px 16px;cursor:pointer;color:#9aa5b1;font-size:14px;"
           onclick="openModal('postModal')">Share an achievement, project or idea…</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #edf2f5;">
      <button onclick="openModal('postModal')" style="flex:1;background:none;border:1px solid #dbe9f1;border-radius:8px;padding:8px;cursor:pointer;font-size:13px;color:#6b8a9b;">🏆 Achievement</button>
      <button onclick="openModal('postModal')" style="flex:1;background:none;border:1px solid #dbe9f1;border-radius:8px;padding:8px;cursor:pointer;font-size:13px;color:#6b8a9b;">🚀 Project</button>
      <button onclick="openModal('postModal')" style="flex:1;background:none;border:1px solid #dbe9f1;border-radius:8px;padding:8px;cursor:pointer;font-size:13px;color:#6b8a9b;">🤝 Find Team</button>
    </div>
  </div>`;
}

function renderPost(p) {
  const badgeClass = p.post_type === 'achievement' ? 'badge-achievement' : p.post_type === 'project' ? 'badge-project' : 'badge-general';
  const badgeLabel = p.post_type === 'achievement' ? '🏆 Achievement' : p.post_type === 'project' ? '🚀 Project' : '💬 Post';
  const tags = (p.tags || []).map(t => `<span>${t}</span>`).join('');
  const timeAgo = formatTime(p.created_at);
  const isOwn = currentUser && p.user_id === currentUser.id;

  return `
  <div class="card" data-post-id="${p.id}">
    <div class="card-header">
      <img src="${p.author_avatar||'https://i.pravatar.cc/100'}" alt="${p.author_name}">
      <div>
        <h4>${esc(p.author_name)}</h4>
        <p class="meta">${esc(p.author_dept||'')}${p.author_dept ? ' • ' : ''}${esc(p.author_college||'')} • ${timeAgo}</p>
      </div>
      ${isOwn ? `<button onclick="deletePost(${p.id})" style="margin-left:auto;background:none;border:none;color:#c0392b;cursor:pointer;font-size:18px;" title="Delete">🗑</button>` : ''}
    </div>
    <span class="post-badge ${badgeClass}">${badgeLabel}</span>
    <p class="post-text">${esc(p.content)}</p>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
    <div class="card-actions">
      <span class="like-btn ${p.liked ? 'liked' : ''}" data-post-id="${p.id}">❤️ ${p.likes}</span>
      <span onclick="showToast('Comments coming soon!','info')">💬 Comment</span>
      <span onclick="showToast('Copied link! ✅','success')">↗️ Share</span>
    </div>
  </div>`;
}

function attachPostHandlers() {
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.postId;
      try {
        const res = await API.likePost(id);
        btn.classList.toggle('liked', res.liked);
        const count = parseInt(btn.textContent.replace(/\D/g,''));
        btn.textContent = '❤️ ' + (res.liked ? count + 1 : count - 1);
      } catch (e) { showToast(e.message, 'error'); }
    });
  });
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  try {
    await API.deletePost(id);
    document.querySelector(`[data-post-id="${id}"]`)?.remove();
    showToast('Post deleted','success');
  } catch (e) { showToast(e.message,'error'); }
}

async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) { showToast('Please write something first','error'); return; }
  const post_type = document.getElementById('postType').value;
  const rawTags   = document.getElementById('postTags').value;
  const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : '#'+t);
  try {
    await API.createPost({ content, post_type, tags });
    closeModal('postModal');
    document.getElementById('postContent').value = '';
    document.getElementById('postTags').value = '';
    showToast('Post published! 🎉','success');
    loadFeed(currentFeedTab);
  } catch (e) { showToast(e.message,'error'); }
}

/* ── COLLABS ─────────────────────────────────────────────── */
function filterCollabs(el, cat) {
  currentCollabFilter = cat;
  document.querySelectorAll('#collabFilters .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  loadCollabs(cat);
}

async function loadCollabs(cat) {
  const list = document.getElementById('collabList');
  list.innerHTML = '<div class="loading-spinner">Loading collaborations…</div>';
  try {
    const collabs = await API.getCollabs(cat);
    if (!collabs.length) {
      list.innerHTML = `<div class="empty-state"><div class="es-icon">🤝</div><h3>No projects yet</h3><p>Post one and find your team!</p></div>`;
      return;
    }
    list.innerHTML = collabs.map(renderCollab).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`;
  }
}

function renderCollab(c) {
  const roles = (c.roles_needed||[]).map(r => `<span class="role-pill">${esc(r)}</span>`).join('');
  const skills = (c.skills||[]).map(s => `<span class="skill-pill">${esc(s)}</span>`).join('');
  const avatars = (c.members||[]).slice(0,4).map(m => `<img src="${m.avatar||'https://i.pravatar.cc/40'}">`).join('');
  const isOwn = currentUser && c.owner_id === currentUser.id;
  const applied = c.my_application;

  let applyBtn = `<button class="apply-btn" onclick="openApply(${c.id},'${esc(c.title)}')">Apply Now</button>`;
  if (isOwn) applyBtn = `<button class="apply-btn" style="background:#f59e0b;" onclick="showToast('You own this project','info')">Your Project</button>`;
  else if (applied === 'pending')  applyBtn = `<button class="apply-btn applied">⏳ Pending</button>`;
  else if (applied === 'accepted') applyBtn = `<button class="apply-btn applied">✅ Accepted</button>`;

  return `
  <div class="collab-card">
    <div class="collab-head">
      <img src="${c.owner_avatar||'https://i.pravatar.cc/80'}" alt="${c.owner_name}">
      <div>
        <h4>${esc(c.owner_name)}</h4>
        <p class="collab-meta">${esc(c.owner_dept||'')} · ${esc(c.owner_college||'PCCOE')}</p>
      </div>
      <span class="urgency-badge urgency-${c.urgency}">${c.urgency === 'urgent' ? '🔥 Urgent' : '📢 Open'}</span>
    </div>
    <div class="collab-title">${esc(c.title)}</div>
    <div class="collab-desc">${esc(c.description)}</div>
    ${roles ? `<div class="looking-for"><h5>Looking for</h5>${roles}</div>` : ''}
    ${skills ? `<div class="skills-list">${skills}</div>` : ''}
    <div class="collab-footer">
      <div style="display:flex;align-items:center;">
        <div class="team-avatars">${avatars}</div>
        <span class="team-count">${c.member_count}/${c.team_size} members</span>
      </div>
      ${applyBtn}
    </div>
  </div>`;
}

function openApply(collabId, title) {
  pendingCollabId = collabId;
  document.getElementById('applyTitle').textContent = 'Apply to: ' + title;
  document.getElementById('applyMessage').value = '';
  openModal('applyModal');
}

async function submitApply() {
  const message = document.getElementById('applyMessage').value.trim();
  try {
    await API.applyCollab(pendingCollabId, message);
    closeModal('applyModal');
    showToast('Application sent! Good luck 🚀','success');
    loadCollabs(currentCollabFilter);
  } catch (e) { showToast(e.message,'error'); }
}

async function submitCollab() {
  const title    = document.getElementById('collabTitle').value.trim();
  const desc     = document.getElementById('collabDesc').value.trim();
  const category = document.getElementById('collabCat').value;
  const urgency  = document.getElementById('collabUrgency').value;
  const size     = Number(document.getElementById('collabSize').value);
  const roles    = document.getElementById('collabRoles').value.split(',').map(r=>r.trim()).filter(Boolean);
  const skills   = document.getElementById('collabSkills').value.split(',').map(s=>s.trim()).filter(Boolean);

  if (!title || !desc) { showToast('Title and description required','error'); return; }
  try {
    await API.createCollab({ title, description: desc, category, urgency, team_size: size, roles_needed: roles, skills });
    closeModal('collabModal');
    document.getElementById('collabTitle').value = '';
    document.getElementById('collabDesc').value  = '';
    showToast('Project posted! 🚀','success');
    loadCollabs(currentCollabFilter);
  } catch (e) { showToast(e.message,'error'); }
}

/* ── EVENTS ──────────────────────────────────────────────── */
function filterEvents(el, value, mode) {
  document.querySelectorAll('#eventFilters .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  if (mode === 'type') {
    currentEventFilter = { status: 'all', type: value };
  } else {
    currentEventFilter = { status: value, type: null };
  }
  loadEvents();
}

async function loadEvents() {
  const list = document.getElementById('eventList');
  list.innerHTML = '<div class="loading-spinner">Loading events…</div>';
  try {
    const { status, type } = currentEventFilter;
    const events = await API.getEvents(status, type);
    if (!events.length) {
      list.innerHTML = `<div class="empty-state"><div class="es-icon">📅</div><h3>No events found</h3></div>`;
      return;
    }
    list.innerHTML = events.map(renderEvent).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`;
  }
}

function renderEvent(e) {
  const statusClass = { upcoming:'status-upcoming', ongoing:'status-ongoing', done:'status-done' }[e.status] || 'status-upcoming';
  const statusLabel = { upcoming:'Upcoming', ongoing:'Ongoing', done:'Completed' }[e.status] || e.status;

  let actionBtn = '';
  if (e.status === 'done') {
    actionBtn = `<button class="reg-btn cert-btn" onclick="viewCert('${esc(e.title)}','Participant')">🏅 Certificate</button>`;
  } else if (e.registered) {
    actionBtn = `<button class="reg-btn registered" onclick="toggleRegister(${e.id},this)">✓ Registered</button>`;
  } else {
    actionBtn = `<button class="reg-btn" onclick="toggleRegister(${e.id},this)">Register</button>`;
  }

  return `
  <div class="event-card">
    <div class="event-banner" style="background:${e.banner_color||'linear-gradient(135deg,#1a1a3e,#0f3460)'}">
      ${e.banner_emoji||'🎓'}
      <span class="event-status-badge ${statusClass}">${statusLabel}</span>
    </div>
    <div class="event-body">
      <h4>${esc(e.title)}</h4>
      <p>${esc(e.description||'')}</p>
      <div class="event-meta">
        <span>📅 ${formatDate(e.event_date)}</span>
        <span>📍 ${esc(e.location||'TBD')}</span>
        <span>👥 ${e.registered_count||0}/${e.capacity} seats</span>
      </div>
      <div class="event-actions">
        ${actionBtn}
        <button class="btn-ghost" onclick="showToast('Added to calendar! 📅','success')" style="padding:8px 10px;">📅</button>
      </div>
    </div>
  </div>`;
}

async function toggleRegister(eventId, btn) {
  try {
    const res = await API.registerEvent(eventId);
    if (res.registered) {
      btn.classList.add('registered');
      btn.textContent = '✓ Registered';
      showToast('Registered! Check your email 🎉','success');
    } else {
      btn.classList.remove('registered');
      btn.textContent = 'Register';
      showToast('Unregistered','info');
    }
  } catch (e) { showToast(e.message,'error'); }
}

/* ── CERTIFICATES ─────────────────────────────────────────── */
async function loadCerts() {
  const section = document.getElementById('certsSection');
  const list    = document.getElementById('certsList');
  try {
    const certs = await API.getMyCerts();
    if (!certs.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    list.innerHTML = certs.map(renderCertCard).join('');
  } catch { section.style.display = 'none'; }
}

function renderCertCard(c) {
  const icons = { gold:'🥇', blue:'☁️', purple:'🎓', green:'🤖' };
  const icon  = icons[c.color] || '🏅';
  return `
  <div class="cert-card cert-${c.color}" onclick="viewCert('${esc(c.title)}','${esc(c.cert_type)}')">
    <div class="cert-icon">${icon}</div>
    <h5>${esc(c.title)}</h5>
    <p>${esc(c.cert_type)}</p>
    <div class="cert-date">${formatDate(c.issued_at)}</div>
    <button class="download-btn" onclick="event.stopPropagation();showToast('Downloaded ✅','success')">⬇ Download</button>
  </div>`;
}

function viewCert(title, type) {
  document.getElementById('certPreview').innerHTML = `
    <h4>PCCOE · PUNE</h4>
    <h2>Certificate of ${type === 'winner' ? 'Achievement' : 'Participation'}</h2>
    <p class="cert-awarded">This is proudly awarded to</p>
    <div class="cert-name">${esc(currentUser?.name || 'Student')}</div>
    <div class="cert-for">${esc(title)}</div>
    <div class="cert-type">${esc(type)}</div>
    <div class="cert-seal">🏅</div>
    <div class="cert-footer">Issued by PCCOE — ${new Date().getFullYear()}</div>
  `;
  openModal('certModal');
}

/* ── CLUBS ───────────────────────────────────────────────── */
function filterClubs(el, cat) {
  currentClubFilter = cat;
  document.querySelectorAll('#clubFilters .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  loadClubs(cat);
}

async function loadClubs(cat) {
  const list = document.getElementById('clubList');
  list.innerHTML = '<div class="loading-spinner">Loading clubs…</div>';
  try {
    const clubs = await API.getClubs(cat);
    if (!clubs.length) {
      list.innerHTML = `<div class="empty-state"><div class="es-icon">🏛️</div><h3>No clubs found</h3></div>`;
      return;
    }
    list.innerHTML = clubs.map(renderClub).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><h3>Failed to load</h3><p>${e.message}</p></div>`;
  }
}

function renderClub(c) {
  const tags = (c.tags||[]).map(t => `<span class="club-tag">${esc(t)}</span>`).join('');
  const joined = c.joined;
  return `
  <div class="club-card">
    <div class="club-head">
      <div class="club-logo" style="background:${c.logo_bg||'#1ea7e1'}">${c.logo_emoji||'🏛️'}</div>
      <div>
        <h4>${esc(c.name)}</h4>
        <div class="club-type">${esc(c.category)} · Club</div>
      </div>
    </div>
    <div class="club-desc">${esc(c.description||'')}</div>
    <div class="club-stats">
      <div class="club-stat"><strong>${c.member_count}</strong><span>Members</span></div>
      <div class="club-stat"><strong>${c.events_year}</strong><span>Events/yr</span></div>
      <div class="club-stat"><strong>⭐ ${c.rating}</strong><span>Rating</span></div>
    </div>
    ${tags ? `<div class="club-tags">${tags}</div>` : ''}
    <button class="join-btn ${joined ? 'joined' : 'not-joined'}" data-club-id="${c.id}" onclick="toggleJoinClub(${c.id},this)">
      ${joined ? '✓ Joined' : 'Join Club'}
    </button>
  </div>`;
}

async function toggleJoinClub(clubId, btn) {
  try {
    const res = await API.joinClub(clubId);
    btn.className = 'join-btn ' + (res.joined ? 'joined' : 'not-joined');
    btn.textContent = res.joined ? '✓ Joined' : 'Join Club';
    showToast(res.joined ? 'Joined! Welcome 🎉' : 'Left club', res.joined ? 'success' : 'info');
  } catch (e) { showToast(e.message,'error'); }
}

/* ── SUGGESTED CONNECTIONS ──────────────────────────────── */
async function loadSuggested() {
  const list = document.getElementById('suggestedList');
  try {
    const users = await API.getSuggested();
    if (!users.length) { list.innerHTML = '<p style="font-size:12px;color:#9aa5b1;">No suggestions right now.</p>'; return; }
    list.innerHTML = users.map(u => `
      <div class="suggest">
        <div class="user">
          <img src="${u.avatar||'https://i.pravatar.cc/40'}" alt="${u.name}">
          <div>
            <p>${esc(u.name)}</p>
            <small>${esc(u.department||u.college||'PCCOE')}</small>
          </div>
        </div>
        <button data-user-id="${u.id}" class="${u.connection_status === 'accepted' ? 'connected' : ''}"
                onclick="connectUser(${u.id},this)">
          ${u.connection_status === 'accepted' ? 'Connected' : 'Connect'}
        </button>
      </div>`).join('');
  } catch { list.innerHTML = ''; }
}

async function connectUser(userId, btn) {
  try {
    const res = await API.connectUser(userId);
    btn.textContent = res.connected ? 'Connected' : 'Connect';
    btn.className   = res.connected ? 'connected' : '';
    showToast(res.connected ? 'Connected! 🎉' : 'Disconnected','success');
  } catch (e) { showToast(e.message,'error'); }
}

/* ── NOTIFICATIONS ──────────────────────────────────────── */
async function pollNotifications() {
  try {
    const { notifications, unread } = await API.getNotifs();
    const badge = document.getElementById('notifBadge');
    if (unread > 0) { badge.textContent = unread; badge.style.display = 'block'; }
    else badge.style.display = 'none';

    const list = document.getElementById('notifList');
    if (!notifications.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:#9aa5b1;">No notifications yet.</div>';
    } else {
      list.innerHTML = notifications.slice(0,8).map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <img src="${n.from_avatar||'https://i.pravatar.cc/40'}" alt="">
          <div class="notif-content">
            <p>${esc(n.message)}</p>
            <time>${formatTime(n.created_at)}</time>
          </div>
          ${!n.read ? '<div class="notif-dot"></div>' : ''}
        </div>`).join('');
    }
  } catch { /* silent */ }
  setTimeout(pollNotifications, 30000);
}

function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  notifOpen = !notifOpen;
  panel.style.display = notifOpen ? 'block' : 'none';
}

async function markAllRead() {
  try {
    await API.readAllNotifs();
    document.getElementById('notifBadge').style.display = 'none';
    document.querySelectorAll('.notif-item.unread').forEach(i => i.classList.remove('unread'));
    document.querySelectorAll('.notif-dot').forEach(d => d.remove());
    showToast('All marked as read ✅','success');
  } catch { /* silent */ }
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  const bell  = document.getElementById('notifBell');
  if (notifOpen && !panel.contains(e.target) && !bell.contains(e.target)) {
    panel.style.display = 'none';
    notifOpen = false;
  }
});

/* ── THEME ───────────────────────────────────────────────── */
function toggleTheme() {
  document.body.classList.toggle('dark');
  document.getElementById('themeToggle').textContent = document.body.classList.contains('dark') ? '☀️' : '☀️';
}

/* ── SEARCH ──────────────────────────────────────────────── */
let searchTimer;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput')?.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const val = this.value.toLowerCase().trim();
      const active = document.querySelector('.section.active');
      if (!active) return;
      active.querySelectorAll('.card,.collab-card,.event-card,.club-card').forEach(card => {
        const match = !val || card.textContent.toLowerCase().includes(val);
        card.style.display = match ? '' : 'none';
      });
    }, 250);
  });
});

/* ── MODALS ──────────────────────────────────────────────── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }

/* ── FLOATING BUTTONS ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Add floating buttons after app div
  const floating = document.createElement('div');
  floating.className = 'floating';
  floating.id = 'floatingBtns';
  floating.innerHTML = `
    <button class="float-btn" onclick="openModal('postModal')">+ Post</button>
    <button class="float-btn" onclick="openModal('collabModal')">Collab</button>
  `;
  document.getElementById('app').appendChild(floating);
});

/* ── HELPERS ─────────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d   = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + ' mins ago';
  if (diff < 86400) return Math.floor(diff/3600) + ' hrs ago';
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

let _toastTimer;
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
