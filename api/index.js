require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: [process.env.FRONTEND_LOCAL, process.env.FRONTEND_PROD], credentials: true }));

app.use((req, res, next) => {
  console.log(`[Incoming Request] ${req.method} ${req.path}`);
  next();
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage() });

function signToken(payload) { return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' }); }
function authGuard(roles = []) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    // console.log(`[AuthGuard] Checking ${req.method} ${req.path}, Token present: ${!!token}`);
    if (!token) {
      console.warn(`[AuthGuard] Missing token for ${req.path}`);
      return res.status(401).json({ error: 'Missing token' });
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        console.warn(`[AuthGuard] Role mismatch for ${payload.username}: has ${payload.role}, needs ${roles}`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = payload; next();
    } catch (e) {
      console.error(`[AuthGuard] Invalid token: ${e.message}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// AUTH
app.post('/api/login', async (req, res) => {
  const { mode, username, password } = req.body || {};
  if (mode === 'guest') return res.json({ ok: true, token: signToken({ username: 'guest', role: 'guest' }), role: 'guest' });
  const { data: row, error } = await supabase.from('app_users').select('username,password_hash,role,is_active').eq('username', username).single();
  if (error || !row || !row.is_active) return res.status(401).json({ error: 'Invalid user' });
  if (row.role !== mode && row.role !== 'admin') return res.status(403).json({ error: 'Role mismatch' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid password' });
  res.json({ ok: true, token: signToken({ username: row.username, role: row.role }), role: row.role });
});

// USERS (Admin only)
app.get('/api/users', authGuard(['admin']), async (_req, res) => {
  const { data, error } = await supabase.from('app_users').select('id,username,role,avatar_url,created_at').neq('username', 'admin'); // Hide super admin if needed, or show all
  if (error) return res.status(500).json({ error: error.message });
  // Map snake_case to frontend expected shape if needed, or handle in frontend
  res.json(data);
});
app.post('/api/users', authGuard(['admin']), async (req, res) => {
  const { username, password, role, name, avatar_url } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('app_users').insert([{
    username,
    password_hash: hash,
    role,
    avatar_url
    // name is not in schema? schema has username. 
    // Wait, schema.sql says: create table app_users (..., username text unique, ...). It DOES NOT have 'name'. 
    // Frontend UserManagement expects 'name'. I might need to alter schema or just use username as name.
  }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete('/api/users/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('app_users').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// PLAYERS
app.get('/api/players', async (_req, res) => {
  const { data, error } = await supabase.from('players').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/players', authGuard(['admin', 'member']), async (req, res) => {
  const { name, role, avatar_url } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { data, error } = await supabase.from('players').insert([{ name, role, avatar_url }]).select().single();
  res.json(data);
});

app.put('/api/players/:id', authGuard(['admin']), async (req, res) => {
  console.log(`[PUT /players/${req.params.id}]`, req.body);
  const { name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats } = req.body;
  const { error } = await supabase.from('players').update({
    name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats
  }).eq('id', req.params.id);
  if (error) {
    console.error('[PUT /players error]', error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ ok: true });
});

app.delete('/api/players/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('players').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// MATCHES
app.get('/api/matches', async (_req, res) => {
  const { data, error } = await supabase.from('matches').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/matches', authGuard(['admin']), async (req, res) => {
  const { data, error } = await supabase.from('matches').insert([req.body]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/matches/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('matches').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// OPPONENTS
app.get('/api/opponents', async (_req, res) => {
  const { data, error } = await supabase.from('opponents').select('*').order('rank');
  if (error) {
    console.error('[GET /opponents error]', error);
    return res.status(500).json({ error: error.message });
  }
  console.log('[GET /opponents] count:', data?.length);
  res.json(data);
});
app.post('/api/opponents', authGuard(['admin']), async (req, res) => {
  console.log('[POST /opponents]', req.body);
  const { data, error } = await supabase.from('opponents').insert([req.body]).select().single();
  if (error) {
    console.error('[POST /opponents error]', error);
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});
app.put('/api/opponents/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('opponents').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});
app.delete('/api/opponents/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('opponents').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// STRATEGIES
app.get('/api/strategies', async (_req, res) => {
  const { data, error } = await supabase.from('strategies').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/strategies', authGuard(['admin', 'member']), async (req, res) => {
  const { data, error } = await supabase.from('strategies').insert([req.body]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete('/api/strategies/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('strategies').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});


// SETTINGS (Logo)
app.get('/api/settings/:key', async (req, res) => {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', req.params.key).single();
  if (error) return res.json({ value: null });
  res.json(data);
});
app.post('/api/settings', authGuard(['admin']), async (req, res) => {
  const { key, value } = req.body;
  const { error } = await supabase.from('app_settings').upsert({ key, value });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// TOURNAMENT TABLE
app.get('/api/table', async (_req, res) => {
  const { data, error } = await supabase.from('tournament_table').select('*').order('points', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/table', authGuard(['admin']), async (req, res) => {
  const { id, team_id, team_name, matches, won, lost, nr, points, nrr } = req.body;
  const { data, error } = await supabase.from('tournament_table').upsert({
    id, team_id, team_name, matches, won, lost, nr, points, nrr
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete('/api/table/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('tournament_table').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// UPLOAD (Cloudinary)
app.post('/api/upload', authGuard(['admin', 'member']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(fileStr, { folder: 'indianstrikers' });
  res.json({ ok: true, url: result.secure_url });
});

// HEALTH
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`CORS Allowed Origins:`, [process.env.FRONTEND_LOCAL, process.env.FRONTEND_PROD]);
});

