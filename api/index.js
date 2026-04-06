require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 4001;

const allowedOrigins = [
  process.env.FRONTEND_LOCAL || 'http://localhost:3000',
  process.env.FRONTEND_PROD || 'https://indianstrikers.club'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`[CORS] Rejected Origin: ${origin}`);
      return callback(null, true); // Allow for now but log. Set to error for strict.
    }
    return callback(null, true);
  },
  credentials: true
}));

// Request Logger
app.use((req, _res, next) => {
  console.log(`[Incoming Request] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '2mb' }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`[Supabase Config] URL: ${supabaseUrl ? 'Found' : 'MISSING'}, Key: ${supabaseKey ? 'Found' : 'MISSING'}`);
const supabase = createClient(supabaseUrl, supabaseKey);
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage() });

function signToken(payload) { return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' }); }
function authGuard(roles = []) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    // console.log(`[AuthGuard] Checking ${req.method} ${req.path}, Token present: ${!!token}`);
    if (!token) {
      console.warn(`[AuthGuard] No token provided for ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'Missing token' });
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        console.warn(`[AuthGuard] Access Denied for ${payload.username}: role '${payload.role}' not in permitted list [${roles}]`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = payload; 
      next();
    } catch (e) {
      console.error(`[AuthGuard] Failed to verify token for ${req.method} ${req.url}: ${e.message}`);
      return res.status(401).json({ error: 'Auth session invalid' });
    }
  };
}

// AUTH
app.post('/api/login', async (req, res) => {
  const { mode, username, password } = req.body || {};
  if (mode === 'guest') return res.json({ ok: true, token: signToken({ username: 'guest', role: 'guest' }), role: 'guest' });
  const { data: row, error } = await supabase.from('app_users').select('id,username,password_hash,role,is_active,avatar_url').eq('username', username).single();
  if (error || !row || !row.is_active) return res.status(401).json({ error: 'Invalid user' });
  if (row.role !== mode && row.role !== 'admin') return res.status(403).json({ error: 'Role mismatch' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid password' });
  res.json({
    ok: true,
    token: signToken({ id: row.id, username: row.username, role: row.role }),
    role: row.role,
    user: { id: row.id, username: row.username, name: row.username, avatarUrl: row.avatar_url }
  });
});

// USERS (Admin only)
app.get('/api/users', authGuard(['admin', 'member']), async (req, res) => {
  console.log(`[GET /api/users] Request received from ${req.user?.username} (${req.user?.role})`);
  const { data, error } = await supabase.from('app_users').select('id,username,role,avatar_url,player_id,created_at'); // Show all users
  if (error) {
    console.error('[GET /api/users] Database error:', error);
    return res.status(500).json({ error: error.message });
  }
  console.log(`[GET /api/users] Returning ${data.length} users`);
  res.json(data);
});
app.post('/api/users', authGuard(['admin']), async (req, res) => {
  const { username, password, role, name, avatar_url, player_id } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('app_users').insert([{
    username,
    password_hash: hash,
    role,
    name,
    avatar_url,
    player_id
  }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/users/:id', authGuard(['admin']), async (req, res) => {
  const { username, password, role, name, avatar_url, player_id } = req.body;
  const updates = { username, role, name, avatar_url, player_id, updated_at: new Date() };
  
  if (password && password.trim().length > 0) {
    updates.password_hash = await bcrypt.hash(password, 10);
  }

  const { data, error } = await supabase.from('app_users')
    .update(updates)
    .eq('id', req.params.id)
    .select().single();

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
  console.log('[POST /api/players] Body:', JSON.stringify(req.body));
  const { name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const payload = {
    name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id
  };
  console.log('[POST /api/players] Payload:', JSON.stringify(payload));

  const { data, error } = await supabase.from('players').insert([payload]).select().single();

  if (error) {
    console.error('[POST /players error]', error);
    return res.status(400).json({ error: error.message });
  }

  if (!data) {
    console.error('[POST /players] DATA IS NULL! Check RLS policies.');
    // Return a mock object to prevent crash if RLS hides the return
    return res.status(200).json({ ...payload, id: 'temp-id-' + Date.now() });
  }

  console.log('[POST /api/players] Success:', JSON.stringify(data));
  res.json(data);
});

app.put('/api/players/:id', authGuard(['admin', 'member']), async (req, res) => {
  console.log(`[PUT /players/${req.params.id}]`, req.body);
  const { name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id } = req.body;
  const { error } = await supabase.from('players').update({
    name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id
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

// Helpers for mapping
const mapMatchToDB = (m) => {
  const mapped = { ...m };
  
  // Property mapping: camelCase -> snake_case
  const keyMap = {
    'opponentId': 'opponent_id',
    'groundId': 'ground_id',
    'homeTeamXI': 'home_team_xi',
    'opponentTeamXI': 'opponent_team_xi',
    'isLiveScored': 'is_live_scored',
    'isLocked': 'is_locked',
    'isHomeBattingFirst': 'is_home_batting_first',
    'matchFormat': 'match_format',
    'tournamentId': 'tournament_id',
    'tossWinnerId': 'toss_winner_id',
    'tossChoice': 'toss_choice',
    'tossDetails': 'toss_details',
    'maxOvers': 'max_overs',
    'resultSummary': 'result_summary',
    'resultNote': 'result_note',
    'resultType': 'result_type',
    'finalScoreHome': 'final_score_home',
    'finalScoreAway': 'final_score_away'
  };

  const dbReady = {};
  
  // List of all valid columns in 'matches' table
  const validColumns = [
    'id', 'date', 'opponent_id', 'ground_id', 'tournament', 'stage', 
    'status', 'match_format', 'home_team_xi', 'opponent_team_xi', 
    'is_locked', 'toss_winner_id', 'toss_choice', 'toss_details', 
    'max_overs', 'result_summary', 'result_note', 'result_type', 
    'final_score_home', 'final_score_away', 'is_live_scored', 
    'is_home_batting_first', 'tournament_id', 'performers'
  ];

  // 1. First, map camelCase to snake_case
  for (const [key, value] of Object.entries(mapped)) {
    const dbKey = keyMap[key] || key;
    dbReady[dbKey] = value;
  }

  // 2. Extra Mapping: toss object -> individual columns
  if (mapped.toss) {
    // Prioritize existing ID, then winner_id, then winner (only if it looks like a UUID)
    const potentialId = mapped.toss.winner_id || mapped.toss.winner;
    const isGuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    if (!dbReady.toss_winner_id && potentialId && isGuid(potentialId)) {
      dbReady.toss_winner_id = potentialId;
    }
    
    dbReady.toss_choice = mapped.toss.choice || dbReady.toss_choice;
    dbReady.toss_details = mapped.toss.details || dbReady.toss_details;
  }

  // 3. Handle 'ground' backwards compatibility
  if ('ground' in mapped && !dbReady.ground_id) {
    dbReady.ground_id = mapped.ground;
  }

  // 4. Final cleaning: keep ONLY valid columns and remove null IDs
  const final = {};
  validColumns.forEach(col => {
    if (col in dbReady) {
      final[col] = dbReady[col];
    }
  });

  // If ID starts with 'match_', remove it for inserts (let Supabase generate UUID)
  if (final.id && String(final.id).startsWith('match_')) {
    delete final.id;
  }

  return final;
};

// MATCHES
app.get('/api/matches', async (_req, res) => {
  const { data, error } = await supabase.from('matches').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/matches', authGuard(['admin', 'member']), async (req, res) => {
  const dbMatch = mapMatchToDB(req.body);
  const { data, error } = await supabase.from('matches').insert([dbMatch]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/matches/:id', authGuard(['admin', 'member']), async (req, res) => {
  const dbMatch = mapMatchToDB(req.body);
  const { error } = await supabase.from('matches').update(dbMatch).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// FINALIZE MATCH (Update results and player stats)
app.post('/api/matches/:id/finalize', authGuard(['admin', 'member']), async (req, res) => {
  const { id } = req.params;
  const { matchData, updatedPlayers } = req.body;

  try {
    const dbMatch = mapMatchToDB(matchData);
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        ...dbMatch,
        status: 'completed',
        updated_at: new Date()
      })
      .eq('id', id);

    if (matchError) throw matchError;

    // 2. Bulk Update Players (if provided)
    if (updatedPlayers && Array.isArray(updatedPlayers)) {
      console.log(`[Finalize] Updating career stats for ${updatedPlayers.length} players...`);
      
      // We perform updates in a loop. For higher performance, we could use a single UPSERT if we have PKs.
      // But since we have extra fields, individual updates are safer if we don't have the full object here.
      // However, the frontend is sending the full updated player objects.
      for (const p of updatedPlayers) {
        const { id: pid, ...stats } = p;
        
        // Ensure critical counters are numbers
        const cleanStats = {
          matches_played: Number(stats.matchesPlayed || 0),
          runs_scored: Number(stats.runsScored || 0),
          wickets_taken: Number(stats.wicketsTaken || 0),
          batting_stats: stats.battingStats,
          bowling_stats: stats.bowlingStats,
          updated_at: new Date()
        };

        const { error: pError } = await supabase
          .from('players')
          .update(cleanStats)
          .eq('id', pid);

        if (pError) console.error(`[Finalize] Failed to update player ${pid}:`, pError);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[Finalize Match Error]', e);
    res.status(500).json({ error: e.message });
  }
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

// GROUNDS
app.get('/api/grounds', async (_req, res) => {
  const { data, error } = await supabase.from('grounds').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/grounds', authGuard(['admin']), async (req, res) => {
  const { data, error } = await supabase.from('grounds').insert([req.body]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/grounds/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('grounds').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});
app.delete('/api/grounds/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('grounds').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// TOURNAMENTS
app.get('/api/tournaments', async (_req, res) => {
  const { data, error } = await supabase.from('tournaments').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/tournaments', authGuard(['admin']), async (req, res) => {
  const { data, error } = await supabase.from('tournaments').insert([req.body]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/tournaments/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('tournaments').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});
app.delete('/api/tournaments/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('tournaments').delete().eq('id', req.params.id);
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
app.get('/api/table', async (req, res) => {
  const { tournament } = req.query;
  let query = supabase.from('tournament_table').select('*');
  
  if (tournament) {
    query = query.eq('tournament_name', tournament);
  }
  
  const { data, error } = await query.order('points', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/table', authGuard(['admin']), async (req, res) => {
  const { id, team_id, team_name, tournament_name, matches, won, lost, nr, points, nrr } = req.body;
  const { data, error } = await supabase.from('tournament_table').upsert({
    id, team_id, team_name, tournament_name, matches, won, lost, nr, points, nrr
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete('/api/table/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('tournament_table').delete().eq('id', req.params.id);
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
  const { name, batter_hand, match_phase, bowler_id, batter_id, positions } = req.body;
  const { data, error } = await supabase.from('strategies').insert({
    name, batter_hand, match_phase, bowler_id, batter_id, positions
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete('/api/strategies/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('strategies').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// MEMBERSHIP REQUESTS
app.get('/api/membership_requests', authGuard(['admin']), async (req, res) => {
  const { data, error } = await supabase.from('membership_requests').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/membership_requests', async (req, res) => {
  const { name, email, contact_number, associated_before, association_year, status } = req.body;
  const { data, error } = await supabase.from('membership_requests').insert([{
    name, email, contact_number, associated_before, association_year, status: status || 'Pending'
  }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put('/api/membership_requests/:id', authGuard(['admin']), async (req, res) => {
  const { status } = req.body;
  const { error } = await supabase.from('membership_requests').update({ status }).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.delete('/api/membership_requests/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('membership_requests').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// MEMORIES
app.get('/api/memories', async (_req, res) => {
  const { data, error } = await supabase.from('memories').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/memories', authGuard(['admin', 'member']), async (req, res) => {
  const { type, url, caption, date, likes, width } = req.body;
  const { data, error } = await supabase.from('memories').insert([{
    type, url, caption, date, likes: likes || 0, width: width || 'col-span-1 row-span-1', comments: []
  }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete('/api/memories/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await supabase.from('memories').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.put('/api/memories/:id', authGuard(['admin', 'member']), async (req, res) => {
  const { comments, likes } = req.body;
  const updates = {};
  if (comments !== undefined) updates.comments = comments;
  if (likes !== undefined) updates.likes = likes;

  const { error } = await supabase.from('memories').update(updates).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// UPLOAD (Cloudinary)
app.post('/api/upload', authGuard(['admin', 'member']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(fileStr, { folder: 'indianstrikers' });
    res.json({ ok: true, url: result.secure_url });
  } catch (e) {
    console.error('[Upload Error]', e);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// HEALTH
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`CORS Allowed Origins:`, [process.env.FRONTEND_LOCAL, process.env.FRONTEND_PROD]);
});

