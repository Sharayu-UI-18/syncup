// public/js/api.js  –  thin wrapper around fetch

const API = {
  _token: null,

  setToken(t) { this._token = t; localStorage.setItem('cl_token', t); },
  getToken() { return this._token || localStorage.getItem('cl_token'); },
  clearToken() { this._token = null; localStorage.removeItem('cl_token'); },

  headers() {
    const h = { 'Content-Type': 'application/json' };
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  },

  async request(method, path, body) {
    const BASE = "http://localhost:3000";


    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + '/api' + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  /* Auth */
  login(email, password) { return this.post('/auth/login', { email, password }); },
  register(name, email, password, college, department, year) {
    return this.post('/auth/register', { name, email, password, college, department, year });
  },
  me() { return this.get('/auth/me'); },

  /* Posts */
  getFeed(type) { return this.get('/posts' + (type && type !== 'all' ? '?type=' + type : '')); },
  createPost(data) { return this.post('/posts', data); },
  likePost(id) { return this.post('/posts/' + id + '/like'); },
  deletePost(id) { return this.del('/posts/' + id); },
  getComments(id) { return this.get('/posts/' + id + '/comments'); },
  addComment(id, content) { return this.post('/posts/' + id + '/comments', { content }); },

  /* Collabs */
  getCollabs(cat) { return this.get('/collabs' + (cat && cat !== 'all' ? '?category=' + cat : '')); },
  createCollab(data) { return this.post('/collabs', data); },
  applyCollab(id, message) { return this.post('/collabs/' + id + '/apply', { message }); },

  /* Events */
  getEvents(status, type) {
    const p = new URLSearchParams();
    if (status && status !== 'all') p.set('status', status);
    if (type) p.set('type', type);
    return this.get('/events' + (p.toString() ? '?' + p : ''));
  },
  registerEvent(id) { return this.post('/events/' + id + '/register'); },

  /* Clubs */
  getClubs(cat) { return this.get('/clubs' + (cat && cat !== 'all' ? '?category=' + cat : '')); },
  joinClub(id) { return this.post('/clubs/' + id + '/join'); },

  /* Certs */
  getMyCerts() { return this.get('/certificates/my'); },

  /* Users */
  getSuggested() { return this.get('/users?limit=4'); },
  connectUser(id) { return this.post('/users/' + id + '/connect'); },

  /* Notifications */
  getNotifs() { return this.get('/notifications'); },
  readAllNotifs() { return this.put('/notifications/read-all'); },
};
