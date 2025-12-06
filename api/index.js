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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage() });

function signToken(payload) { return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' }); }
function authGuard(roles = []) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = payload; next();
    } catch { return res.status(401).json({ error: 'Invalid token' }); }
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

// PLAYERS
app.get('/api/players', async (_req, res) => {
  const { data, error } = await supabase.from('players').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/players', authGuard(['admin','member']), async (req, res) => {
  const { name, role, avatar_url } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { data, error } = await supabase.from('players').insert([{ name, role, avatar_url }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// UPLOAD (Cloudinary)
app.post('/api/upload', authGuard(['admin','member']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(fileStr, { folder: 'indianstrikers' });
  res.json({ ok: true, url: result.secure_url });
});

// HEALTH
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

