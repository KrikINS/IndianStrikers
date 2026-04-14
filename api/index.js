require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 4001;

const allowedOrigins = [
  process.env.FRONTEND_LOCAL || 'http://localhost:3000',
  process.env.FRONTEND_PROD || 'https://indianstrikers.club',
  'https://strikers-app-227875153596.us-central1.run.app'
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

app.use(express.json({ limit: '10mb' }));

const dbUrl = process.env.DATABASE_URL;
console.log(`[Database Config] URL: ${dbUrl ? 'Found' : 'MISSING'}`);
// Supabase is now replaced by 'db' utility using PostgreSQL pool
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage() });

function signToken(payload) { return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }); }
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
  console.log('[Login Attempt] Body:', req.body);
  const { mode, username, password } = req.body || {};
  if (mode === 'guest') return res.json({ ok: true, token: signToken({ username: 'guest', role: 'guest' }), role: 'guest' });
  const { data: row, error } = await db.getOne('SELECT id,username,email,password_hash,role,is_active,avatar_url,can_score,is_first_login FROM app_users WHERE username = $1 OR email = $1', [username]);
  if (error) {
    console.error(`[Login Error] Database error for user ${username}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
  if (!row) {
    console.warn(`[Login Error] User not found: ${username}`);
    return res.status(401).json({ error: 'Invalid user ID or password' });
  }
  if (!row.is_active) {
    console.warn(`[Login Error] User inactive: ${username}`);
    return res.status(401).json({ error: 'Account is disabled' });
  }
  
  if (mode !== 'auto' && row.role !== mode && row.role !== 'admin') {
    console.warn(`[Login Error] Role mismatch for ${username}. Expected ${mode}, but user role is ${row.role}`);
    return res.status(403).json({ error: 'Role mismatch' });
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  
  if (!ok) {
    console.warn(`[Login Error] Invalid password for: ${username}`);
    return res.status(401).json({ error: 'Invalid user ID or password' });
  }
  res.json({
    ok: true,
    token: signToken({ id: row.id, username: row.username, role: row.role, canScore: !!row.can_score }),
    role: row.role,
    user: { id: row.id, username: row.username, email: row.email, name: row.username, avatarUrl: row.avatar_url, canScore: !!row.can_score, isFirstLogin: !!row.is_first_login }
  });
});

// USERS (Admin only)
app.get('/api/users', authGuard(['admin', 'member']), async (req, res) => {
  console.log(`[GET /api/users] Request received from ${req.user?.username} (${req.user?.role})`);
  const { data, error } = await db.query('SELECT id,username,email,contact_number,role,avatar_url,player_id,can_score,created_at FROM app_users ORDER BY created_at DESC'); // Show all users
  if (error) {
    console.error('[GET /api/users] Database error:', error);
    return res.status(500).json({ error: error.message });
  }
  console.log(`[GET /api/users] Returning ${data.length} users`);
  res.json(data);
});
app.post('/api/users', authGuard(['admin']), async (req, res) => {
  const { username, email, password, role, name, avatar_url, player_id, can_score, contact_number } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await db.getOne(
    'INSERT INTO app_users (username, email, password_hash, role, name, avatar_url, player_id, can_score, contact_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
    [username, email || null, hash, role, name, avatar_url, player_id, can_score || false, contact_number || null]
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/users/:id', authGuard(['admin']), async (req, res) => {
  const { username, email, role, name, avatar_url, player_id, password, can_score, contact_number } = req.body;
  let query = 'UPDATE app_users SET username=$1, email=$2, role=$3, name=$4, avatar_url=$5, player_id=$6, can_score=$7, contact_number=$8, updated_at=NOW()';
  let params = [username, email || null, role, name, avatar_url, player_id, can_score || false, contact_number || null];
  
  if (password && password.trim().length > 0) {
    const hash = await bcrypt.hash(password, 10);
    query += ', password_hash=$8, is_first_login=true';
    params.push(hash);
  }

  query += ' WHERE id=$' + (params.length + 1) + ' RETURNING *';
  params.push(req.params.id);

  const { data, error } = await db.getOne(query, params);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete('/api/users/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM app_users WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// PASSWORD MANAGEMENT
app.post('/api/users/change_password', authGuard(['admin', 'member']), async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const username = req.user.username;
  const { data: row } = await db.getOne('SELECT password_hash FROM app_users WHERE username = $1', [username]);
  if (!row) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(oldPassword, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect old password' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  
  const hash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE app_users SET password_hash = $1, is_first_login = false, updated_at=NOW() WHERE username = $2', [hash, username]);
  res.json({ ok: true });
});

let resetTokens = {};
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { data: row } = await db.getOne('SELECT id FROM app_users WHERE email = $1', [email]);
  if (!row) {
    return res.json({ ok: true, message: 'If the email exists, a reset link has been generated.' });
  }
  const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit mock code
  resetTokens[email] = { token, expiry: Date.now() + 15*60*1000 };
  console.log(`[Mock Email] Password reset code for ${email} is: ${token}`);
  res.json({ ok: true, mock_token: token }); 
});

app.post('/api/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  const entry = resetTokens[email];
  if (!entry || entry.token !== token || entry.expiry < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const hash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE app_users SET password_hash = $1, is_first_login = false, updated_at=NOW() WHERE email = $2', [hash, email]);
  delete resetTokens[email];
  res.json({ ok: true });
});

// PLAYERS
app.get('/api/players', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM players ORDER BY name ASC');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/players', authGuard(['admin', 'member']), async (req, res) => {
  console.log('[POST /api/players] Body:', JSON.stringify(req.body));
  const { name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id } = req.body || {};
  const payload = {
    name, 
    role, 
    batting_style, 
    bowling_style, 
    avatar_url, 
    matches_played: (matches_played === '' || matches_played === undefined) ? 0 : Number(matches_played),
    runs_scored: (runs_scored === '' || runs_scored === undefined) ? 0 : Number(runs_scored),
    wickets_taken: (wickets_taken === '' || wickets_taken === undefined) ? 0 : Number(wickets_taken),
    average: (average === '' || average === undefined) ? 0 : Number(average),
    is_captain: !!is_captain, 
    is_vice_captain: !!is_vice_captain, 
    is_available: is_available !== false, 
    batting_stats: batting_stats || {}, 
    bowling_stats: bowling_stats || {}, 
    linked_user_id: (linked_user_id === '' || !linked_user_id) ? null : linked_user_id, 
    jersey_number: (jersey_number === '' || jersey_number === undefined) ? null : Number(jersey_number), 
    dob: (dob === '' || !dob) ? null : dob, 
    external_id
  };
  console.log('[POST /api/players] Sanitized Payload:', JSON.stringify(payload));

  const { data, error } = await db.getOne(
    `INSERT INTO players (name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
    [
      payload.name, payload.role, payload.batting_style, payload.bowling_style, payload.avatar_url, 
      payload.matches_played, payload.runs_scored, payload.wickets_taken, payload.average, 
      payload.is_captain, payload.is_vice_captain, payload.is_available, 
      payload.batting_stats, payload.bowling_stats, payload.linked_user_id, 
      payload.jersey_number, payload.dob, payload.external_id
    ]
  );

  if (error) {
    console.error('[POST /players error]', error);
    return res.status(400).json({ error: error.message });
  }

  console.log('[POST /api/players] Success:', JSON.stringify(data));
  res.json(data);
});

app.put('/api/players/:id', authGuard(['admin', 'member']), async (req, res) => {
  console.log(`[PUT /players/${req.params.id}]`, req.body);
  const { name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id } = req.body || {};
  
  const payload = {
    name, 
    role, 
    batting_style, 
    bowling_style, 
    avatar_url, 
    matches_played: (matches_played === '' || matches_played === undefined) ? 0 : Number(matches_played),
    runs_scored: (runs_scored === '' || runs_scored === undefined) ? 0 : Number(runs_scored),
    wickets_taken: (wickets_taken === '' || wickets_taken === undefined) ? 0 : Number(wickets_taken),
    average: (average === '' || average === undefined) ? 0 : Number(average),
    is_captain: !!is_captain, 
    is_vice_captain: !!is_vice_captain, 
    is_available: is_available !== false, 
    batting_stats: batting_stats || {}, 
    bowling_stats: bowling_stats || {}, 
    linked_user_id: (linked_user_id === '' || !linked_user_id) ? null : linked_user_id, 
    jersey_number: (jersey_number === '' || jersey_number === undefined) ? null : Number(jersey_number), 
    dob: (dob === '' || !dob) ? null : dob, 
    external_id
  };

  const { error } = await db.query(
    `UPDATE players SET name=$1, role=$2, batting_style=$3, bowling_style=$4, avatar_url=$5, matches_played=$6, runs_scored=$7, wickets_taken=$8, average=$9, is_captain=$10, is_vice_captain=$11, is_available=$12, batting_stats=$13, bowling_stats=$14, linked_user_id=$15, jersey_number=$16, dob=$17, external_id=$18, updated_at=NOW() WHERE id=$19`,
    [
      payload.name, payload.role, payload.batting_style, payload.bowling_style, payload.avatar_url, 
      payload.matches_played, payload.runs_scored, payload.wickets_taken, payload.average, 
      payload.is_captain, payload.is_vice_captain, payload.is_available, 
      payload.batting_stats, payload.bowling_stats, payload.linked_user_id, 
      payload.jersey_number, payload.dob, payload.external_id, req.params.id
    ]
  );
  if (error) {
    console.error('[PUT /players error]', error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ ok: true });
});

app.delete('/api/players/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM players WHERE id=$1', [req.params.id]);
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
    'is_test': 'is_test',
    'tournamentId': 'tournament_id',
    'tossWinnerId': 'toss_winner_id',
    'tossChoice': 'toss_choice',
    'tossDetails': 'toss_details',
    'maxOvers': 'max_overs',
    'resultSummary': 'result_summary',
    'resultNote': 'result_note',
    'resultType': 'result_type',
    'finalScoreHome': 'final_score_home',
    'finalScoreAway': 'final_score_away',
    'isCareerSynced': 'is_career_synced',
    'targetScore': 'target_score'
  };

  const dbReady = {};
  
  // List of all valid columns in 'matches' table
  const validColumns = [
    'id', 'date', 'opponent_id', 'ground_id', 'tournament', 'stage', 
    'status', 'match_format', 'home_team_xi', 'opponent_team_xi', 
    'is_locked', 'toss_winner_id', 'toss_choice', 'toss_details', 
    'max_overs', 'result_summary', 'result_note', 'result_type', 
    'final_score_home', 'final_score_away', 'is_live_scored', 
    'is_home_batting_first', 'tournament_id', 'performers', 'scorecard', 'is_career_synced', 'is_test',
    'live_data', 'target_score', 'live_state', 'total_runs', 'total_wickets', 'total_balls'
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
  const jsonColumns = ['home_team_xi', 'opponent_team_xi', 'performers', 'scorecard', 'final_score_home', 'final_score_away', 'live_data'];
  
  validColumns.forEach(col => {
    if (col in dbReady) {
      let val = dbReady[col];
      // Stringify JSON columns for Postgres
      if (jsonColumns.includes(col) && val !== null && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      final[col] = val;
    }
  });

  // If ID starts with 'match_', remove it for inserts (let Database generate UUID)
  if (final.id && String(final.id).startsWith('match_')) {
    delete final.id;
  }

  return final;
};

// MATCHES
app.get('/api/matches', async (_req, res) => {
  const { data, error } = await db.query(`
    SELECT 
      m.*,
      o.name AS opponent_name,
      o.logo_url AS opponent_logo,
      g.name AS ground_name
    FROM matches m
    LEFT JOIN opponents o ON o.id::text = m.opponent_id::text
    LEFT JOIN grounds g ON g.id::text = m.ground_id::text
    ORDER BY m.date DESC
  `);
  if (error) return res.status(500).json({ error: error.message });
  // Exclude legacy match from generic listing
  const filtered = (data || []).filter(m => m.id !== '00000000-0000-0000-0000-000000000001');
  res.json(filtered);
});

app.get('/api/matches/:id', async (req, res) => {
  const { data, error } = await db.getOne(`
    SELECT 
      m.*,
      o.name AS opponent_name,
      o.logo_url AS opponent_logo,
      g.name AS ground_name
    FROM matches m
    LEFT JOIN opponents o ON o.id::text = m.opponent_id::text
    LEFT JOIN grounds g ON g.id::text = m.ground_id::text
    WHERE m.id = $1
  `, [req.params.id]);
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Match not found" });
  res.json(data);
});

app.post('/api/matches', authGuard(['admin', 'member']), async (req, res) => {
  const dbMatch = mapMatchToDB(req.body);
  const keys = Object.keys(dbMatch);
  const values = Object.values(dbMatch);
  const placeholders = keys.map((_, i) => '$' + (i + 1)).join(', ');
  const query = `INSERT INTO matches (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  
  const { data, error } = await db.getOne(query, values);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put('/api/matches/:id', authGuard(['admin', 'member']), async (req, res) => {
  console.log('[PUT matches/:id] Incoming date:', req.body.date);
  const dbMatch = mapMatchToDB(req.body);
  console.log('[PUT matches/:id] mapped date:', dbMatch.date);
  const keys = Object.keys(dbMatch);
  const values = Object.values(dbMatch);
  const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(', ');
  const query = `UPDATE matches SET ${setClause}, updated_at=NOW() WHERE id=$${keys.length + 1} RETURNING *`;
  
  const { data, error } = await db.query(query, [...values, req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  console.log('[PUT matches/:id] DB saved date:', data?.[0]?.date);
  res.json({ ok: true, data: data?.[0] });
});

// FINALIZE MATCH (Update results and player stats)
app.post('/api/matches/:id/finalize', authGuard(['admin', 'member']), async (req, res) => {
  const { id } = req.params;
  const { matchData, updatedPlayers, is_test } = req.body;
  console.log(`[POST /api/finalize-match] Match ID: ${id}, is_test: ${is_test}`);

  try {
    // 1. Update match status/data
    const { error: matchError } = await db.query(
      `INSERT INTO matches (id, status, is_hero_synced, is_career_synced, updated_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       ON CONFLICT (id) DO UPDATE SET 
         status=EXCLUDED.status, is_hero_synced=EXCLUDED.is_hero_synced, 
         is_career_synced=EXCLUDED.is_career_synced, updated_at=EXCLUDED.updated_at`,
      [id, 'completed', !is_test, !is_test]
    );

    if (matchError) throw matchError;

    if (is_test) {
      console.log(`[Sync] Match ${id} is a TEST match. Skipping career stats update.`);
      return res.json({ ok: true, message: "Match finalized (Sandbox Mode)" });
    }

    // 2. Summation Logic (Source of Truth: player_match_stats)
    let performers = (updatedPlayers && updatedPlayers.length > 0) ? updatedPlayers : (matchData.performers || []);
    
    if (performers.length > 0) {
      console.log(`[Sync] Starting Delta-Sync for match ${id}. Processing ${performers.length} records...`);
      
      for (let perf of performers) {
        if (!perf.playerId) continue;
        
        let { data: actualPlayer } = await db.getOne('SELECT id, name FROM players WHERE id = $1', [perf.playerId]);

        if (!actualPlayer && perf.playerName) {
          const { data: ps } = await db.query('SELECT * FROM players');
          actualPlayer = ps?.find(p => p.name.trim().toLowerCase() === perf.playerName.trim().toLowerCase());
        }

        if (!actualPlayer) {
          console.warn(`[Sync] ⚠️ Player not found: ${perf.playerName}`);
          continue;
        }

        const playerId = actualPlayer.id;

        const { error: upsertErr } = await db.query(
          `INSERT INTO player_match_stats (
            match_id, player_id, runs, balls, fours, sixes, status, wickets, 
            runs_conceded, overs_bowled, maidens, hundreds, fifties, ducks, 
            four_wickets, five_wickets, wides, no_balls, is_hero, updated_at, dismissal_type
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), $20)
           ON CONFLICT (match_id, player_id) DO UPDATE SET
            runs=EXCLUDED.runs, balls=EXCLUDED.balls, fours=EXCLUDED.fours, sixes=EXCLUDED.sixes, 
            status=EXCLUDED.status, wickets=EXCLUDED.wickets, runs_conceded=EXCLUDED.runs_conceded, 
            overs_bowled=EXCLUDED.overs_bowled, maidens=EXCLUDED.maidens, hundreds=EXCLUDED.hundreds, 
            fifties=EXCLUDED.fifties, ducks=EXCLUDED.ducks, four_wickets=EXCLUDED.four_wickets, 
            five_wickets=EXCLUDED.five_wickets, wides=EXCLUDED.wides, no_balls=EXCLUDED.no_balls, 
            is_hero=EXCLUDED.is_hero, updated_at=EXCLUDED.updated_at, dismissal_type=EXCLUDED.dismissal_type`,
          [
            String(id), playerId, Number(perf.runs || 0), Number(perf.balls || 0), Number(perf.fours || 0), Number(perf.sixes || 0), 
            perf.outHow || (perf.isNotOut ? 'Not Out' : 'Out'), Number(perf.wickets || 0), 
            Number(perf.bowlingRuns || 0), Number(perf.bowlingOvers || 0), Number(perf.maidens || 0), 
            Number(perf.runs) >= 100 ? 1 : 0, (Number(perf.runs) >= 50 && Number(perf.runs) < 100) ? 1 : 0,
            (Number(perf.runs || 0) === 0 && (perf.outHow && !['not out', 'did not bat', 'dnb', 'retired hurt', 'absent'].includes(perf.outHow.toLowerCase()))) ? 1 : 0,
            Number(perf.wickets) === 4 ? 1 : 0, Number(perf.wickets) >= 5 ? 1 : 0, 
            Number(perf.wides || 0), Number(perf.no_balls || 0), perf.is_hero || false,
            perf.outHow || null
          ]
        );

        if (upsertErr) {
          console.error(`[Sync] ❌ Ledger upsert error:`, upsertErr.message);
          continue;
        }

        try {
            await recalculateCareerStats(playerId);
        } catch (syncErr) {
            console.error(`[Sync] ❌ Career update failed for ${perf.playerName}:`, syncErr.message);
        }
      }

      await db.query('UPDATE matches SET performers = $1 WHERE id = $2', [JSON.stringify(performers), id]);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[Finalize Match Error]', e);
    res.status(500).json({ error: e.message });
  }
});


// LIVE SCORING: Recorded Ball
app.post('/api/score/ball', authGuard(['admin', 'member']), async (req, res) => {
  // Manual check for 'can_score' feature if member
  if (req.user.role === 'member' && !req.user.canScore) {
    return res.status(403).json({ error: 'Forbidden: Scoring access required' });
  }
  const { 
    match_id, striker_id, non_striker_id, bowler_id, 
    over_number, ball_number, runs_scored, extras_runs, 
    extras_type, event_type, innings_number, is_legal_ball,
    wicket_type, fielder_id, shot_zone, penalty_runs, is_penalty,
    is_not_out, fifty_notified, tournament_id
  } = req.body;

  const { data, error } = await db.getOne(
    `INSERT INTO ball_by_ball (
      match_id, striker_id, non_striker_id, bowler_id, 
      over_number, ball_number, runs_scored, extras_runs, 
      extras_type, event_type, innings_number, is_legal_ball,
      wicket_type, fielder_id, shot_zone, penalty_runs, is_penalty
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
    [
      match_id, striker_id, non_striker_id, bowler_id, 
      over_number, ball_number, runs_scored || 0, extras_runs || 0, 
      extras_type, event_type, innings_number || 1, is_legal_ball ?? true,
      wicket_type, fielder_id, shot_zone, penalty_runs || 0, is_penalty || false
    ]
  );

  if (error) {
    console.error('[POST /api/score/ball] Error:', error);
    return res.status(400).json({ error: error.message });
  }

  // Atomically update live_state in matches table for handoff consistency
  if (match_id) {
    const liveState = {
      striker_id: striker_id || null,
      non_striker_id: non_striker_id || null,
      bowler_id: bowler_id || null,
      current_innings: innings_number || 1
    };
    
    await db.query(
      'UPDATE matches SET live_state = $1 WHERE id = $2',
      [JSON.stringify(liveState), match_id]
    ).catch(err => console.error('[POST /api/score/ball] Match live_state update failed:', err));
  }

  res.json(data);
});

// GET Match History (Balls)
app.get('/api/matches/:id/balls', async (req, res) => {
  const { data, error } = await db.query(
    'SELECT * FROM ball_by_ball WHERE match_id = $1 ORDER BY innings_number ASC, over_number ASC, ball_number ASC',
    [req.params.id]
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// OPPONENTS

app.get('/api/opponents', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM opponents ORDER BY rank ASC');
  if (error) {
    console.error('[GET /opponents error]', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});
app.post('/api/opponents', authGuard(['admin']), async (req, res) => {
  const { name, rank, logo_url, strength, weakness, players, color } = req.body;
  const { data, error } = await db.getOne(
    'INSERT INTO opponents (name, rank, logo_url, strength, weakness, players, color) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
    [name, rank, logo_url, strength || '', weakness || '', JSON.stringify(players || []), color || 'bg-slate-500']
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/opponents/:id', authGuard(['admin', 'member']), async (req, res) => {
  const { name, rank, logo_url, strength, weakness, players, color } = req.body;
  const { error } = await db.query(
    'UPDATE opponents SET name=$1, rank=$2, logo_url=$3, strength=$4, weakness=$5, players=$6, color=$7 WHERE id=$8', 
    [name, rank, logo_url, strength || '', weakness || '', JSON.stringify(players || []), color || 'bg-slate-500', req.params.id]
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});
app.delete('/api/opponents/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM opponents WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// GROUNDS
app.get('/api/grounds', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM grounds ORDER BY name ASC');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/grounds', authGuard(['admin']), async (req, res) => {
  const { name, location } = req.body;
  const { data, error } = await db.getOne('INSERT INTO grounds (name, location) VALUES ($1, $2) RETURNING *', [name, location]);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/grounds/:id', authGuard(['admin']), async (req, res) => {
  const { name, location } = req.body;
  const { error } = await db.query('UPDATE grounds SET name=$1, location=$2 WHERE id=$3', [name, location, req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});
app.delete('/api/grounds/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM grounds WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// TOURNAMENTS
app.get('/api/tournaments', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM tournaments ORDER BY created_at DESC');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/tournaments', authGuard(['admin']), async (req, res) => {
  const { name, status, year, format, winner, is_test } = req.body;
  const { data, error } = await db.getOne('INSERT INTO tournaments (name, status, year, format, winner, is_test) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, status, year, format, winner, is_test]);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/tournaments/:id', authGuard(['admin']), async (req, res) => {
  const { name, status, year, format, winner, is_test } = req.body;
  const { error } = await db.query('UPDATE tournaments SET name=$1, status=$2, year=$3, format=$4, winner=$5, is_test=$6 WHERE id=$7', [name, status, year, format, winner, is_test, req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});
app.delete('/api/tournaments/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM tournaments WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// SETTINGS (Logo)
app.get('/api/settings/:key', async (req, res) => {
  const { data, error } = await db.getOne('SELECT value FROM app_settings WHERE key = $1', [req.params.key]);
  if (error || !data) return res.json({ value: null });
  res.json(data);
});
app.post('/api/settings', authGuard(['admin']), async (req, res) => {
  const { key, value } = req.body;
  const { error } = await db.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// TOURNAMENT TABLE
app.get('/api/table', async (req, res) => {
  const { tournament } = req.query;
  let q = 'SELECT * FROM tournament_table';
  let params = [];
  
  if (tournament) {
    q += ' WHERE tournament_name = $1';
    params.push(tournament);
  }
  
  const { data, error } = await db.query(q + ' ORDER BY points DESC, nrr DESC', params);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/table', authGuard(['admin']), async (req, res) => {
  const { id, team_id, team_name, tournament_name, matches, won, lost, nr, points, nrr } = req.body;
  const { data, error } = await db.getOne(
    `INSERT INTO tournament_table (id, team_id, team_name, tournament_name, matches, won, lost, nr, points, nrr) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
     ON CONFLICT (id) DO UPDATE SET 
        team_id=EXCLUDED.team_id, team_name=EXCLUDED.team_name, tournament_name=EXCLUDED.tournament_name, 
        matches=EXCLUDED.matches, won=EXCLUDED.won, lost=EXCLUDED.lost, nr=EXCLUDED.nr, points=EXCLUDED.points, nrr=EXCLUDED.nrr 
     RETURNING *`,
    [id, team_id, team_name, tournament_name, matches, won, lost, nr, points, nrr]
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete('/api/table/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM tournament_table WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// STRATEGIES
app.get('/api/strategies', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM strategies');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/strategies', authGuard(['admin', 'member']), async (req, res) => {
  const { name, batter_hand, match_phase, bowler_id, batter_id, positions } = req.body;
  if (!name || !positions) return res.status(400).json({ error: 'Missing name or positions' });
  
  console.log(`[POST /api/strategies] Name: "${name}", Positions Type: ${typeof positions}`);
  
  let positionsJson;
  try {
    positionsJson = typeof positions === 'string' ? positions : JSON.stringify(positions);
    if (typeof positions === 'string') JSON.parse(positions);
  } catch (e) {
    console.error('[POST /api/strategies] Invalid JSON provided for positions:', e.message);
    return res.status(400).json({ error: 'Invalid JSON syntax for positions' });
  }

  const { data, error } = await db.getOne(
    'INSERT INTO strategies (name, batter_hand, match_phase, bowler_id, batter_id, positions) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *',
    [
      name, 
      batter_hand || 'RHB', 
      match_phase || 'Powerplay', 
      bowler_id || null, 
      batter_id || null, 
      positionsJson
    ]
  );
  if (error) {
    console.error('[POST /api/strategies] DB INSERT Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to save strategy' });
  }
  res.status(201).json(data);
});
app.delete('/api/strategies/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM strategies WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// MEMBERSHIP REQUESTS
app.get('/api/membership_requests', authGuard(['admin']), async (req, res) => {
  const { data, error } = await db.query('SELECT * FROM membership_requests ORDER BY created_at DESC');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/membership_requests', async (req, res) => {
  const { name, email, contact_number, associated_before, association_year, status } = req.body;
  const { data, error } = await db.getOne(
    'INSERT INTO membership_requests (name, email, contact_number, associated_before, association_year, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, email, contact_number, associated_before, association_year, status || 'Pending']
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put('/api/membership_requests/:id', authGuard(['admin']), async (req, res) => {
  const { status } = req.body;
  const { error } = await db.query('UPDATE membership_requests SET status=$1 WHERE id=$2', [status, req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.delete('/api/membership_requests/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM membership_requests WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// MEMORIES
app.get('/api/memories', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM memories ORDER BY date DESC');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


/**
 * SHARED CAREER SYNC ENGINE
 * Re-sums a player's full career by aggregating:
 * (All records in player_match_stats) + (Baseline in player_legacy_stats)
 */
async function recalculateCareerStats(playerId) {
    console.log(`[SyncEngine] Recalculating career for Player ID: ${playerId}...`);
    
    // Join matches to check is_test
    const { data: allMatchStats } = await db.query(
        `SELECT pms.* FROM player_match_stats pms 
         JOIN matches m ON pms.match_id = m.id 
         WHERE pms.player_id = $1 AND m.is_test = false`,
        [playerId]
    );

    const { data: legacyBaseline } = await db.getOne('SELECT * FROM player_legacy_stats WHERE player_id = $1', [playerId]);
    
    const l = legacyBaseline || { 
        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, matches: 0, innings: 0, 
        not_outs: 0, highest_score: 0, bowling_innings: 0, overs_bowled: 0, 
        runs_conceded: 0, maidens: 0, hundreds: 0, fifties: 0, ducks: 0, 
        four_wickets: 0, five_wickets: 0, wides: 0, no_balls: 0, best_bowling: '0/0' 
    };
    const m = allMatchStats || [];

    // Helper to add overs (base-6) correctly
    const toBalls = (ov) => {
        const floatOv = parseFloat(ov) || 0;
        const completeOvers = Math.floor(floatOv);
        const extraBalls = Math.round((floatOv % 1) * 10);
        return (completeOvers * 6) + extraBalls;
    };
    const fromBalls = (balls) => {
        const ov = Math.floor(balls / 6);
        const rem = balls % 6;
        return parseFloat(`${ov}.${rem}`);
    };

    const totalRuns = m.reduce((s, row) => s + (Number(row.runs) || 0), 0) + (Number(l.runs) || 0);
    const totalWickets = m.reduce((s, row) => s + (Number(row.wickets) || 0), 0) + (Number(l.wickets) || 0);
    const totalMatches = m.reduce((s, row) => s + (row.status?.startsWith('HISTORICAL:') ? (parseInt(row.status.split(':')[1]) || 1) : 1), 0) + (Number(l.matches) || 0);
        const totalInnings = m.filter(row => {
        const status = (row.status || '').toLowerCase();
        const runs = Number(row.runs) || 0;
        const balls = Number(row.balls) || 0;
        // MUST have faced a ball, scored a run, or been out to count as an inning
        // Exclude DNB, Did Not Bat, Absent, null/empty status
        if (runs === 0 && balls === 0 && (['did not bat', 'dnb', 'absent', ''].includes(status) || !row.status)) {
            return false;
        }
        return true;
    }).length + (Number(l.innings) || 0);

    const totalNO = m.filter(row => row.is_not_out || row.status === 'Not Out' || row.status === 'not out').length + (Number(l.not_outs) || 0);
    const totalBalls = m.reduce((s, row) => s + (Number(row.balls) || 0), 0) + (Number(l.balls) || 0);
    const totalFours = m.reduce((s, row) => s + (Number(row.fours) || 0), 0) + (Number(l.fours) || 0);
    const totalSixes = m.reduce((s, row) => s + (Number(row.sixes) || 0), 0) + (Number(l.sixes) || 0);
    const total100s = m.reduce((s, row) => s + (Number(row.hundreds) || 0), 0) + (Number(l.hundreds) || 0);
    const total50s = m.reduce((s, row) => s + (Number(row.fifties) || 0), 0) + (Number(l.fifties) || 0);
    const totalDucks = m.reduce((s, row) => s + (Number(row.ducks) || 0), 0) + (Number(l.ducks) || 0);

    const totalBowlRuns = m.reduce((s, row) => s + (Number(row.runs_conceded) || 0), 0) + (Number(l.runs_conceded) || 0);
    
    // Proper Over Summation (Delta + Legacy)
    const matchBallsBowled = m.reduce((s, row) => s + toBalls(row.overs_bowled), 0);
    const legacyBallsBowled = toBalls(l.overs_bowled);
    const totalBallsBowled = matchBallsBowled + legacyBallsBowled;
    const totalBowlOvers = fromBalls(totalBallsBowled);

    const totalMaidens = m.reduce((s, row) => s + (Number(row.maidens) || 0), 0) + (Number(l.maidens) || 0);
    const total4W = m.reduce((s, row) => s + (Number(row.four_wickets) || 0), 0) + (Number(l.four_wickets) || 0);
    const total5W = m.reduce((s, row) => s + (Number(row.five_wickets) || 0), 0) + (Number(l.five_wickets) || 0);
    const totalBowlInnings = m.filter(row => (Number(row.overs_bowled) > 0)).length + (Number(l.bowling_innings) || 0);
    const totalWides = m.reduce((s, row) => s + (Number(row.wides) || 0), 0) + (Number(l.wides) || 0);
    const totalNoBalls = m.reduce((s, row) => s + (Number(row.no_balls) || 0), 0) + (Number(l.no_balls) || 0);

    // BBI Comparison logic (Derived from raw data)
    const allBBI = m.map(row => (Number(row.wickets) > 0 || Number(row.runs_conceded) > 0) ? `${row.wickets}/${row.runs_conceded}` : null).filter(Boolean);
    if (l.best_bowling && l.best_bowling !== '0/0') allBBI.push(l.best_bowling);
    let bestBBI = '0/0';
    if (allBBI.length > 0) {
        allBBI.sort((a,b) => {
            const [wA, rA] = a.split('/').map(Number);
            const [wB, rB] = b.split('/').map(Number);
            if (wB !== wA) return wB - wA;
            return rA - rB;
        });
        bestBBI = allBBI[0];
    }

        const dismissals = totalInnings - totalNO;
    const batAvg = dismissals > 0 ? (totalRuns / dismissals) : totalRuns;

    const batSR = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    const bowlAvg = totalWickets > 0 ? totalBowlRuns / totalWickets : 0;
    const bowlEco = totalBallsBowled > 0 ? (totalBowlRuns * 6) / totalBallsBowled : 0;
    const bowlSR = totalWickets > 0 ? totalBallsBowled / totalWickets : 0;
    
    const maxScore = Math.max(...m.map(row => Number(row.runs) || 0), Number(l.highest_score) || 0);

    // Update the players table profile
    const { error: upErr } = await db.query(
        `UPDATE players SET 
            runs_scored=$1, 
            wickets_taken=$2, 
            matches_played=$3, 
            batting_stats=$4, 
            bowling_stats=$5, 
            updated_at=NOW() 
         WHERE id=$6`,
        [
            totalRuns, totalWickets, totalMatches,
            JSON.stringify({
                matches: totalMatches, innings: totalInnings, runs: totalRuns, balls: totalBalls,
                fours: totalFours, sixes: totalSixes, notOuts: totalNO, highestScore: String(maxScore),
                average: parseFloat(batAvg.toFixed(2)), strikeRate: parseFloat(batSR.toFixed(2)),
                hundreds: total100s, fifties: total50s, ducks: totalDucks
            }),
            JSON.stringify({
                matches: totalMatches, innings: totalBowlInnings, overs: parseFloat(totalBowlOvers.toFixed(1)), runs: totalBowlRuns, 
                wickets: totalWickets, maidens: totalMaidens, average: parseFloat(bowlAvg.toFixed(2)),
                economy: parseFloat(bowlEco.toFixed(2)), strikeRate: parseFloat(bowlSR.toFixed(2)),
                bestBowling: bestBBI, fourWickets: total4W, fiveWickets: total5W,
                wides: totalWides, no_balls: totalNoBalls
            }),
            playerId
        ]
    );

    if (upErr) throw upErr;
    console.log(`[SyncEngine] ✅ Career recalculated for ${playerId}`);
}

// LEGACY STATS MANAGEMENT
app.get('/api/legacy-stats', authGuard(['admin']), async (req, res) => {
  const { data, error } = await db.query('SELECT * FROM player_legacy_stats');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PLAYER DETAILED STATS
app.get('/api/players/:id/stats', async (req, res) => {
    const { id: playerId } = req.params;
    
    try {
        // 1. Fetch Legacy Baseline
        const { data: legacy } = await db.getOne('SELECT * FROM player_legacy_stats WHERE player_id = $1', [playerId]);

        // 2. Max-Inclusion Query: Find ALL matches via performance record OR squad participation
        // We use numeric array for JSONB search as IDs are stored as Numbers.
        const { data: participationStats, error: partError } = await db.query(
            `SELECT 
                m.id as match_id, m.status as match_status, m.is_test, m.tournament_id, m.date, m.live_data,
                t.name as tournament_name,
                pms.runs, pms.balls, pms.fours, pms.sixes, pms.status as player_record_status,
                pms.wickets, pms.runs_conceded, pms.overs_bowled, pms.maidens,
                pms.wides, pms.no_balls
             FROM matches m
             LEFT JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN player_match_stats pms ON (m.id = pms.match_id AND pms.player_id = $1::BIGINT)
             WHERE (
                pms.player_id IS NOT NULL 
                OR m.home_team_xi @> jsonb_build_array($1::text)
                OR m.home_team_xi @> jsonb_build_array($1::int)
                OR m.opponent_team_xi @> jsonb_build_array($1::text)
                OR m.opponent_team_xi @> jsonb_build_array($1::int)
             )
             AND (m.is_test IS NOT TRUE)
             AND (m.status != 'upcoming' AND m.status != 'Upcoming')
             ORDER BY m.date DESC`,
            [playerId]
        );

        if (partError) throw partError;

        const tournamentGroups = {};

        participationStats.forEach(row => {
            const tId = row.tournament_id || 'unknown';
            const tName = row.tournament_name || (tId === 'unknown' ? 'Other Matches' : 'Default Tournament');

            if (!tournamentGroups[tId]) {
                tournamentGroups[tId] = {
                    tournamentId: tId,
                    tournamentName: tName,
                    batting: { matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, highestScore: '0', hundreds: 0, fifties: 0, ducks: 0, fours: 0, sixes: 0, average: 0, strikeRate: 0 },
                    bowling: { matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0, fourWickets: 0, fiveWickets: 0, bestBowling: '0/0', average: 0, economy: 0, strikeRate: 0, wides: 0, no_balls: 0 }
                };
            }

            const group = tournamentGroups[tId];
            
            // Matches count: If they are in the query result, they were in the XI.
            group.batting.matches++;
            group.bowling.matches++;

            // Data source priority: Live Data > Database Performance Row
            let runs = Number(row.runs) || 0;
            let balls = Number(row.balls) || 0;
            let fours = Number(row.fours) || 0;
            let sixes = Number(row.sixes) || 0;
            let pStatus = row.player_record_status?.toString().toLowerCase() || '';
            let bOvers = Number(row.overs_bowled) || 0;
            let bMaidens = Number(row.maidens) || 0;
            let bRuns = Number(row.runs_conceded) || 0;
            let bWickets = Number(row.wickets) || 0;
            let bWides = Number(row.wides) || 0;
            let bNB = Number(row.no_balls) || 0;

            if (row.match_status === 'live' && row.live_data) {
                try {
                    const ld = typeof row.live_data === 'string' ? JSON.parse(row.live_data) : row.live_data;
                    const bat = (ld.innings1?.battingStats || {})[playerId] || (ld.innings2?.battingStats || {})[playerId];
                    const bowl = (ld.innings1?.bowlingStats || {})[playerId] || (ld.innings2?.bowlingStats || {})[playerId];
                    
                    if (bat) {
                        runs = Number(bat.runs) || 0;
                        balls = Number(bat.balls) || 0;
                        fours = Number(bat.fours) || 0;
                        sixes = Number(bat.sixes) || 0;
                        pStatus = bat.outHow || (bat.isNotOut ? 'not out' : (bat.isOut ? 'out' : 'batting'));
                    }
                    if (bowl) {
                        bOvers = Number(bowl.overs) || 0;
                        bMaidens = Number(bowl.maidens) || 0;
                        bRuns = Number(bowl.runs) || 0;
                        bWickets = Number(bowl.wickets) || 0;
                        bWides = Number(bowl.wides) || 0;
                        bNB = Number(bowl.no_balls) || 0;
                    }
                } catch(e) {}
            }

            // Batting Aggregation
            const isDismissed = pStatus && !['not out', 'retired hurt', 'absent', 'batting', 'dnb', 'did not bat'].includes(pStatus);
            const isDNB = ['dnb', 'did not bat'].includes(pStatus);
            const hasActuallyBatted = !isDNB && (runs > 0 || balls > 0 || isDismissed || pStatus === 'batting');
            
            if (hasActuallyBatted) {
                group.batting.innings++;
                // A player is 'Not Out' if they are not dismissed AND not currently batting (because live batting is an active state, not a finished not-out record)
                if (!isDismissed && pStatus !== 'batting' && pStatus !== 'dnb') group.batting.notOuts++;
                group.batting.runs += runs;
                group.batting.balls += balls;
                group.batting.fours += fours;
                group.batting.sixes += sixes;
                
                // Dynamic Milestones
                if (runs >= 100) group.batting.hundreds++;
                else if (runs >= 50) group.batting.fifties++;
                if (runs === 0 && isDismissed) group.batting.ducks++;
            }
            
            const currentHS = parseInt(group.batting.highestScore.replace('*', '')) || 0;
            if (runs > currentHS) {
                group.batting.highestScore = `${runs}${!isDismissed && pStatus !== 'dnb' ? '*' : ''}`;
            } else if (runs === currentHS && !isDismissed && pStatus !== 'dnb' && !group.batting.highestScore.includes('*')) {
                group.batting.highestScore = `${runs}*`;
            }

            // Bowling Aggregation
            if (bOvers > 0) {
                group.bowling.innings++;
                const currentBalls = (Math.floor(group.bowling.overs) * 6) + Math.round((group.bowling.overs % 1) * 10);
                const newBallsToAdd = (Math.floor(bOvers) * 6) + Math.round((bOvers % 1) * 10);
                const updatedTotalBalls = currentBalls + newBallsToAdd;
                group.bowling.overs = Math.floor(updatedTotalBalls / 6) + ((updatedTotalBalls % 6) / 10);
                group.bowling.maidens += bMaidens;
                group.bowling.runs += bRuns;
                group.bowling.wickets += bWickets;
                // Note: we'd benefit from four_wickets and five_wickets columns in player_match_stats if they exist,
                // but for now we prioritize bWickets.
                if (bWickets === 4) group.bowling.fourWickets++;
                if (bWickets >= 5) group.bowling.fiveWickets++;
                group.bowling.wides += bWides;
                group.bowling.no_balls += bNB;
                
                const currentBBI = group.bowling.bestBowling;
                const [curW, curR] = currentBBI.split('/').map(Number);
                if (bWickets > curW || (bWickets === curW && bRuns < curR)) {
                    group.bowling.bestBowling = `${bWickets}/${bRuns}`;
                }
            }
        });

        Object.values(tournamentGroups).forEach(group => {
            const batInns = group.batting.innings - group.batting.notOuts;
            group.batting.average = batInns > 0 ? parseFloat((group.batting.runs / batInns).toFixed(2)) : group.batting.runs;
            group.batting.strikeRate = group.batting.balls > 0 ? parseFloat(((group.batting.runs / group.batting.balls) * 100).toFixed(2)) : 0;
            group.bowling.average = group.bowling.wickets > 0 ? parseFloat((group.bowling.runs / group.bowling.wickets).toFixed(2)) : 0;
            group.bowling.economy = group.bowling.overs > 0 ? parseFloat((group.bowling.runs / group.bowling.overs).toFixed(2)) : 0;
            group.bowling.strikeRate = group.bowling.wickets > 0 ? parseFloat(((group.bowling.overs * 6) / group.bowling.wickets).toFixed(2)) : 0;
            group.bowling.overs = parseFloat(group.bowling.overs.toFixed(1));
        });

        // Calculate Totals and Enrich Legacy
        const grandTotal = {
            batting: { matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, average: 0, strikeRate: 0, highestScore: '0' },
            bowling: { matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0, fourWickets: 0, fiveWickets: 0, average: 0, economy: 0, strikeRate: 0, bestBowling: '0/0' }
        };

        if (legacy) {
            // Enrich legacy with rates
            const batInns = (legacy.innings || 0) - (legacy.not_outs || 0);
            legacy.average = batInns > 0 ? parseFloat((legacy.runs / batInns).toFixed(2)) : legacy.runs;
            legacy.strikeRate = legacy.balls > 0 ? parseFloat(((legacy.runs / legacy.balls) * 100).toFixed(2)) : 0;
            legacy.bowling_average = legacy.wickets > 0 ? parseFloat((legacy.runs_conceded / legacy.wickets).toFixed(2)) : 0;
            legacy.economy = legacy.overs_bowled > 0 ? parseFloat((legacy.runs_conceded / legacy.overs_bowled).toFixed(2)) : 0;
            legacy.bowling_strikeRate = legacy.wickets > 0 ? parseFloat(((legacy.overs_bowled * 6) / legacy.wickets).toFixed(2)) : 0;

            // Add to total
            grandTotal.batting.matches += (legacy.matches || 0);
            grandTotal.batting.innings += (legacy.innings || 0);
            grandTotal.batting.notOuts += (legacy.not_outs || 0);
            grandTotal.batting.runs += (legacy.runs || 0);
            grandTotal.batting.balls += (legacy.balls || 0);
            grandTotal.batting.fours += (legacy.fours || 0);
            grandTotal.batting.sixes += (legacy.sixes || 0);
            grandTotal.batting.hundreds += (legacy.hundreds || 0);
            grandTotal.batting.fifties += (legacy.fifties || 0);
            grandTotal.batting.ducks += (legacy.ducks || 0);
            grandTotal.batting.highestScore = legacy.highest_score?.toString() || '0';

            grandTotal.bowling.matches += (legacy.matches || 0);
            grandTotal.bowling.innings += (legacy.bowling_innings || legacy.innings || 0);
            grandTotal.bowling.overs += Number(legacy.overs_bowled || 0);
            grandTotal.bowling.maidens += (legacy.maidens || 0);
            grandTotal.bowling.runs += (legacy.runs_conceded || 0);
            grandTotal.bowling.wickets += (legacy.wickets || 0);
            grandTotal.bowling.fourWickets += (legacy.four_wickets || 0);
            grandTotal.bowling.fiveWickets += (legacy.five_wickets || 0);
            grandTotal.bowling.bestBowling = legacy.best_bowling || '0/0';
        }

        Object.values(tournamentGroups).forEach(t => {
            grandTotal.batting.matches += t.batting.matches;
            grandTotal.batting.innings += t.batting.innings;
            grandTotal.batting.notOuts += t.batting.notOuts;
            grandTotal.batting.runs += t.batting.runs;
            grandTotal.batting.balls += t.batting.balls;
            grandTotal.batting.fours += t.batting.fours;
            grandTotal.batting.sixes += t.batting.sixes;
            grandTotal.batting.hundreds += t.batting.hundreds;
            grandTotal.batting.fifties += t.batting.fifties;
            grandTotal.batting.ducks += t.batting.ducks;
            const hs = parseInt(t.batting.highestScore.replace('*', ''));
            if (hs > parseInt(grandTotal.batting.highestScore.replace('*', ''))) grandTotal.batting.highestScore = t.batting.highestScore;

            grandTotal.bowling.matches += t.bowling.matches;
            grandTotal.bowling.innings += t.bowling.innings;
            const currentTotalBalls = (Math.floor(grandTotal.bowling.overs) * 6) + Math.round((grandTotal.bowling.overs % 1) * 10);
            const newTotalBalls = (Math.floor(t.bowling.overs) * 6) + Math.round((t.bowling.overs % 1) * 10);
            const combinedBalls = currentTotalBalls + newTotalBalls;
            grandTotal.bowling.overs = Math.floor(combinedBalls / 6) + ((combinedBalls % 6) / 10);
            grandTotal.bowling.maidens += t.bowling.maidens;
            grandTotal.bowling.runs += t.bowling.runs;
            grandTotal.bowling.wickets += t.bowling.wickets;
            grandTotal.bowling.fourWickets += t.bowling.fourWickets;
            grandTotal.bowling.fiveWickets += t.bowling.fiveWickets;
            const [w, r] = t.bowling.bestBowling.split('/').map(Number);
            const [tw, tr] = grandTotal.bowling.bestBowling.split('/').map(Number);
            if (w > tw || (w === tw && r < tr)) grandTotal.bowling.bestBowling = t.bowling.bestBowling;
        });

        // Final Rate Calcs for Grand Total
        const totalBatInns = grandTotal.batting.innings - grandTotal.batting.notOuts;
        grandTotal.batting.average = totalBatInns > 0 ? parseFloat((grandTotal.batting.runs / totalBatInns).toFixed(2)) : grandTotal.batting.runs;
        grandTotal.batting.strikeRate = grandTotal.batting.balls > 0 ? parseFloat(((grandTotal.batting.runs / grandTotal.batting.balls) * 100).toFixed(2)) : 0;
        grandTotal.bowling.average = grandTotal.bowling.wickets > 0 ? parseFloat((grandTotal.bowling.runs / grandTotal.bowling.wickets).toFixed(2)) : 0;
        grandTotal.bowling.economy = grandTotal.bowling.overs > 0 ? parseFloat((grandTotal.bowling.runs / grandTotal.bowling.overs).toFixed(2)) : 0;
        grandTotal.bowling.strikeRate = grandTotal.bowling.wickets > 0 ? parseFloat(((grandTotal.bowling.overs * 6) / grandTotal.bowling.wickets).toFixed(2)) : 0;

        res.json({
            legacy: legacy || null,
            tournaments: Object.values(tournamentGroups),
            total: grandTotal,
            recentForm: participationStats
                .filter(row => (Number(row.runs) > 0 || Number(row.balls) > 0 || (row.player_record_status && !['not out', 'retired hurt', 'absent', 'batting', 'dnb', 'did not bat'].includes(row.player_record_status?.toLowerCase()))))
                .sort((a, b) => new Date(b.date || Date.now()) - new Date(a.date || Date.now()))
                .slice(0, 5)
                .map(row => ({
                    runs: row.runs || 0,
                    isNotOut: row.player_record_status && ['not out', 'retired hurt', 'absent', 'batting'].includes(row.player_record_status?.toLowerCase()),
                    isLive: row.match_status === 'live'
                }))
        });

    } catch (e) {
        console.error(`[GET /api/players/${playerId}/stats] Error:`, e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/legacy-stats/:playerId', authGuard(['admin']), async (req, res) => {
  const { playerId } = req.params;
  const stats = req.body;

  try {
    // 1. Update the legacy table
    const keys = Object.keys(stats);
    const values = Object.values(stats);
    const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(', ');
    const query = `INSERT INTO player_legacy_stats (${keys.join(', ')}, player_id, updated_at) 
                   VALUES (${keys.map((_, i) => '$' + (i + 1)).join(', ')}, $${keys.length + 1}, NOW()) 
                   ON CONFLICT (player_id) DO UPDATE SET ${setClause}, updated_at=NOW()`;
    const { error: legacyErr } = await db.query(query, [...values, playerId]);

    if (legacyErr) throw legacyErr;

    // 2. Trigger Full Career Recalculation (Shared logic)
    await recalculateCareerStats(playerId);

    res.json({ ok: true });
  } catch (e) {
    console.error(`[PUT /legacy-stats/${playerId}] Error:`, e);
    res.status(500).json({ error: e.message });
  }
});

// MEMORIES
// MEMORIES
app.get('/api/memories', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM memories ORDER BY date DESC');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/memories', authGuard(['admin', 'member']), async (req, res) => {
  const { type, url, caption, date, likes, width } = req.body;
  const { data, error } = await db.getOne('INSERT INTO memories (type, url, caption, date, likes, width, comments) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [
    type, url, caption, date, likes || 0, width || 'col-span-1 row-span-1', JSON.stringify([])
  ]);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete('/api/memories/:id', authGuard(['admin']), async (req, res) => {
  const { error } = await db.query('DELETE FROM memories WHERE id = $1', [req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.put('/api/memories/:id', authGuard(['admin', 'member']), async (req, res) => {
  const { comments, likes } = req.body;
  let q = 'UPDATE memories SET updated_at = NOW()';
  let params = [];
  
  if (comments !== undefined) {
    q += ', comments = $' + (params.length + 1);
    params.push(JSON.stringify(comments));
  }
  if (likes !== undefined) {
    q += ', likes = $' + (params.length + 1);
    params.push(likes);
  }

  q += ' WHERE id = $' + (params.length + 1);
  params.push(req.params.id);

  const { error } = await db.query(q, params);
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

// TOURNAMENT PERFORMERS ENGINE (Hybrid Selection)
app.get('/api/tournament-performers', async (req, res) => {
  try {
    // 1. Get tournaments sorted by creation/date to find latest
    const { data: tournaments, error: tErr } = await db.query('SELECT * FROM tournaments ORDER BY created_at DESC');

    if (tErr || !tournaments || tournaments.length === 0) return res.json({ performers: [], isSeasonOpener: true });

    const latestTournament = tournaments[0];

    // Helper to fetch and filter Top 7 Standout Performances
    const getPerformersForTournament = async (tId) => {
      let q = `
        SELECT pms.*, m.id as m_id, m.date as m_date, m.status as m_status, m.tournament_id as m_t_id, m.ground_id as m_g_id, m.opponent_id as m_o_id,
               p.name as p_name, p.role as p_role, p.avatar_url as p_avatar_url
        FROM player_match_stats pms
        JOIN matches m ON pms.match_id = m.id
        JOIN players p ON pms.player_id = p.id
        WHERE m.is_test = false AND m.status = 'completed'
      `;
      let params = [];
      if (tId) {
        q += ' AND m.tournament_id = $1';
        params.push(tId);
      }

      const { data, error } = await db.query(q, params);
      if (error) return [];

      const rawData = data || [];
      
      // Calculate Super Striker (Highest SR, Min 10 balls)
      let superStrikerId = null;
      let maxSR = -1;

      rawData.forEach(row => {
        const runs = Number(row.runs || 0);
        const balls = Number(row.balls || 0);
        if (balls >= 10) {
          const sr = (runs / balls) * 100;
          if (sr > maxSR) {
            maxSR = sr;
            superStrikerId = row.player_id;
          }
        }
      });

      const results = rawData.filter(row => {
        const isHero = !!row.is_hero;
        const runs = Number(row.runs || 0);
        const wkts = Number(row.wickets || 0);
        const overs = Number(row.overs_bowled || 0);
        const runsC = Number(row.runs_conceded || 0);
        const econ = (overs > 0) ? (runsC / overs) : 99;
        const isSuperStrikerMatch = row.player_id === superStrikerId;
        
        if (isHero || isSuperStrikerMatch) return true;
        
        // Auto-Criteria: 40+ runs OR 2+ wickets OR <=7.0 econ (min 2 ov) OR All-rounder (30+ / 1+)
        return (runs >= 40) || (wkts >= 2) || (overs >= 2 && econ <= 7.0) || (runs >= 30 && wkts >= 1);
      })
      .sort((a,b) => {
        if (a.is_hero && !b.is_hero) return -1;
        if (!a.is_hero && b.is_hero) return 1;
        const scoreA = (Number(a.runs || 0)) + (Number(a.wickets || 0) * 35);
        const scoreB = (Number(b.runs || 0)) + (Number(b.wickets || 0) * 35);
        return scoreB - scoreA;
      })
      .slice(0, 7)
      .map(row => ({
        id: row.id,
        playerId: row.player_id,
        name: row.p_name,
        role: row.p_role,
        avatarUrl: row.p_avatar_url,
        runs: Number(row.runs || 0),
        balls: Number(row.balls || 0),
        wickets: Number(row.wickets || 0),
        bowlingRuns: Number(row.runs_conceded || 0),
        bowlingOvers: Number(row.overs_bowled || 0),
        isHero: !!row.is_hero,
        isSuperStriker: row.player_id === superStrikerId,
        matchDate: row.m_date,
        matchId: row.m_id,
        opponentId: row.m_o_id,
        groundId: row.m_g_id
      }));

      return results;
    };

    let performers = await getPerformersForTournament(latestTournament.id);
    let isSeasonOpener = false;

    // Fallback: If no performers found in current tournament, pull from most recent match
    if (performers.length === 0) {
      const { data: recentMatch } = await db.getOne('SELECT id, tournament_id FROM matches WHERE status = \'completed\' ORDER BY date DESC LIMIT 1');

      if (recentMatch) {
         performers = await getPerformersForTournament(recentMatch.tournament_id);
      }
      isSeasonOpener = true;
    }

    res.json({
      tournamentName: latestTournament.name,
      performers,
      isSeasonOpener
    });
  } catch (e) {
    console.error('[GET /api/tournament-performers] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// HEALTH
// Serve static Frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// SPA Fallback: Redirect all non-API paths to index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API Not Found' });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`CORS Allowed Origins:`, [process.env.FRONTEND_LOCAL, process.env.FRONTEND_PROD]);
});

