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
  const { mode, username, password } = req.body || {};
  if (mode === 'guest') return res.json({ ok: true, token: signToken({ username: 'guest', role: 'guest' }), role: 'guest' });
  const { data: row, error } = await db.getOne('SELECT id,username,password_hash,role,is_active,avatar_url FROM app_users WHERE username = $1', [username]);
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
  const { data, error } = await db.query('SELECT id,username,role,avatar_url,player_id,created_at FROM app_users ORDER BY created_at DESC'); // Show all users
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
  const { data, error } = await db.getOne(
    'INSERT INTO app_users (username, password_hash, role, name, avatar_url, player_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [username, hash, role, name, avatar_url, player_id]
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/users/:id', authGuard(['admin']), async (req, res) => {
  const { username, role, name, avatar_url, player_id, password } = req.body;
  let query = 'UPDATE app_users SET username=$1, role=$2, name=$3, avatar_url=$4, player_id=$5, updated_at=NOW()';
  let params = [username, role, name, avatar_url, player_id];
  
  if (password && password.trim().length > 0) {
    const hash = await bcrypt.hash(password, 10);
    query += ', password_hash=$6';
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

// PLAYERS
app.get('/api/players', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM players ORDER BY name ASC');
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

  const { data, error } = await db.getOne(
    `INSERT INTO players (name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
    [name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id]
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
  const { name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id } = req.body;
  const { error } = await db.query(
    `UPDATE players SET name=$1, role=$2, batting_style=$3, bowling_style=$4, avatar_url=$5, matches_played=$6, runs_scored=$7, wickets_taken=$8, average=$9, is_captain=$10, is_vice_captain=$11, is_available=$12, batting_stats=$13, bowling_stats=$14, linked_user_id=$15, jersey_number=$16, dob=$17, external_id=$18, updated_at=NOW() WHERE id=$19`,
    [name, role, batting_style, bowling_style, avatar_url, matches_played, runs_scored, wickets_taken, average, is_captain, is_vice_captain, is_available, batting_stats, bowling_stats, linked_user_id, jersey_number, dob, external_id, req.params.id]
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
    'isCareerSynced': 'is_career_synced'
  };

  const dbReady = {};
  
  // List of all valid columns in 'matches' table
  const validColumns = [
    'id', 'date', 'opponent_id', 'ground_id', 'tournament', 'stage', 
    'status', 'match_format', 'home_team_xi', 'opponent_team_xi', 
    'is_locked', 'toss_winner_id', 'toss_choice', 'toss_details', 
    'max_overs', 'result_summary', 'result_note', 'result_type', 
    'final_score_home', 'final_score_away', 'is_live_scored', 
    'is_home_batting_first', 'tournament_id', 'performers', 'scorecard', 'is_career_synced', 'is_test'
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

  // If ID starts with 'match_', remove it for inserts (let Database generate UUID)
  if (final.id && String(final.id).startsWith('match_')) {
    delete final.id;
  }

  return final;
};

// MATCHES
app.get('/api/matches', async (_req, res) => {
  const { data, error } = await db.query('SELECT * FROM matches ORDER BY date DESC');
  if (error) return res.status(500).json({ error: error.message });
  // Exclude legacy match from generic listing
  const filtered = (data || []).filter(m => m.id !== '00000000-0000-0000-0000-000000000001');
  res.json(filtered);
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
  const dbMatch = mapMatchToDB(req.body);
  const keys = Object.keys(dbMatch);
  const values = Object.values(dbMatch);
  const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(', ');
  const query = `UPDATE matches SET ${setClause}, updated_at=NOW() WHERE id=$${keys.length + 1}`;
  
  const { error } = await db.query(query, [...values, req.params.id]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
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
            four_wickets, five_wickets, wides, no_balls, is_hero, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
           ON CONFLICT (match_id, player_id) DO UPDATE SET
            runs=EXCLUDED.runs, balls=EXCLUDED.balls, fours=EXCLUDED.fours, sixes=EXCLUDED.sixes, 
            status=EXCLUDED.status, wickets=EXCLUDED.wickets, runs_conceded=EXCLUDED.runs_conceded, 
            overs_bowled=EXCLUDED.overs_bowled, maidens=EXCLUDED.maidens, hundreds=EXCLUDED.hundreds, 
            fifties=EXCLUDED.fifties, ducks=EXCLUDED.ducks, four_wickets=EXCLUDED.four_wickets, 
            five_wickets=EXCLUDED.five_wickets, wides=EXCLUDED.wides, no_balls=EXCLUDED.no_balls, 
            is_hero=EXCLUDED.is_hero, updated_at=EXCLUDED.updated_at`,
          [
            String(id), playerId, Number(perf.runs || 0), Number(perf.balls || 0), Number(perf.fours || 0), Number(perf.sixes || 0), 
            perf.outHow || (perf.isNotOut ? 'Not Out' : 'Out'), Number(perf.wickets || 0), 
            Number(perf.bowlingRuns || 0), Number(perf.bowlingOvers || 0), Number(perf.maidens || 0), 
            Number(perf.runs) >= 100 ? 1 : 0, (Number(perf.runs) >= 50 && Number(perf.runs) < 100) ? 1 : 0,
            (Number(perf.runs || 0) === 0 && (perf.outHow && !['not out', 'did not bat', 'dnb', 'retired hurt', 'absent'].includes(perf.outHow.toLowerCase()))) ? 1 : 0,
            Number(perf.wickets) === 4 ? 1 : 0, Number(perf.wickets) >= 5 ? 1 : 0, 
            Number(perf.wides || 0), Number(perf.no_balls || 0), perf.is_hero || false
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
  const { name, rank, logo_url } = req.body;
  const { data, error } = await db.getOne('INSERT INTO opponents (name, rank, logo_url) VALUES ($1, $2, $3) RETURNING *', [name, rank, logo_url]);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.put('/api/opponents/:id', authGuard(['admin']), async (req, res) => {
  const { name, rank, logo_url } = req.body;
  const { error } = await db.query('UPDATE opponents SET name=$1, rank=$2, logo_url=$3 WHERE id=$4', [name, rank, logo_url, req.params.id]);
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
  const { data, error } = await db.getOne(
    'INSERT INTO strategies (name, batter_hand, match_phase, bowler_id, batter_id, positions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, batter_hand, match_phase, bowler_id, batter_id, positions]
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
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
    const totalInnings = m.filter(row => (Number(row.runs) > 0 || Number(row.balls) > 0 || (row.status && !['not out', 'did not bat', 'dnb', 'absent'].includes(row.status.toLowerCase())))).length + (Number(l.innings) || 0);
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

    const batAvg = (totalInnings - totalNO) > 0 ? (totalRuns / (totalInnings - totalNO)) : totalRuns;
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

        // 2. Fetch Tournament/Match Data
        const { data: matchStats, error: matchError } = await db.query(
            `SELECT pms.*, m.status, m.is_test, m.tournament_id, m.date, t.name as tournament_name 
             FROM player_match_stats pms 
             JOIN matches m ON pms.match_id = m.id 
             LEFT JOIN tournaments t ON m.tournament_id = t.id 
             WHERE pms.player_id = $1 AND m.is_test = false AND m.status = 'completed'`,
            [playerId]
        );

        if (matchError) throw matchError;

        // 3. Group by Tournament
        const tournamentGroups = {};
        
        matchStats.forEach(row => {
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
            
            // Batting Aggregation
            group.batting.matches++;
            const isDismissed = !['not out', 'retired hurt', 'absent'].includes(row.status?.toLowerCase());
            if (row.runs > 0 || row.balls > 0 || isDismissed) group.batting.innings++;
            if (!isDismissed) group.batting.notOuts++;
            group.batting.runs += (Number(row.runs) || 0);
            group.batting.balls += (Number(row.balls) || 0);
            group.batting.fours += (Number(row.fours) || 0);
            group.batting.sixes += (Number(row.sixes) || 0);
            group.batting.hundreds += (Number(row.hundreds) || 0);
            group.batting.fifties += (Number(row.fifties) || 0);
            group.batting.ducks += (Number(row.ducks) || 0);
            
            const runs = Number(row.runs) || 0;
            const currentHS = parseInt(group.batting.highestScore.replace('*', '')) || 0;
            if (runs > currentHS) {
                group.batting.highestScore = `${runs}${!isDismissed ? '*' : ''}`;
            } else if (runs === currentHS && !isDismissed && !group.batting.highestScore.includes('*')) {
                // If equal but this one is not out, prefer the not out one
                group.batting.highestScore = `${runs}*`;
            }

            // Bowling Aggregation
            if (Number(row.overs_bowled) > 0) {
                group.bowling.innings++;
                group.bowling.matches++; 
                const currentBalls = (Math.floor(group.bowling.overs) * 6) + Math.round((group.bowling.overs % 1) * 10);
                const newBallsToAdd = (Math.floor(Number(row.overs_bowled)) * 6) + Math.round((Number(row.overs_bowled) % 1) * 10);
                const updatedTotalBalls = currentBalls + newBallsToAdd;
                group.bowling.overs = Math.floor(updatedTotalBalls / 6) + ((updatedTotalBalls % 6) / 10);
                group.bowling.maidens += (Number(row.maidens) || 0);
                group.bowling.runs += (Number(row.runs_conceded) || 0);
                group.bowling.wickets += (Number(row.wickets) || 0);
                group.bowling.fourWickets += (Number(row.four_wickets) || 0);
                group.bowling.fiveWickets += (Number(row.five_wickets) || 0);
                group.bowling.wides += (Number(row.wides) || 0);
                group.bowling.no_balls += (Number(row.no_balls) || 0);
                
                const currentBBI = group.bowling.bestBowling;
                const [curW, curR] = currentBBI.split('/').map(Number);
                if (row.wickets > curW || (row.wickets === curW && row.runs_conceded < curR)) {
                    group.bowling.bestBowling = `${row.wickets}/${row.runs_conceded}`;
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

        res.json({
            legacy: legacy || null,
            tournaments: Object.values(tournamentGroups),
            recentForm: matchStats
                .filter(row => row.runs > 0 || row.balls > 0 || !['not out', 'retired hurt', 'absent'].includes(row.status?.toLowerCase()))
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map(row => ({
                    runs: row.runs || 0,
                    isNotOut: ['not out', 'retired hurt', 'absent'].includes(row.status?.toLowerCase())
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

      const results = (data || []).filter(row => {
        const isHero = !!row.is_hero;
        const runs = Number(row.runs || 0);
        const wkts = Number(row.wickets || 0);
        const overs = Number(row.overs_bowled || 0);
        const runsC = Number(row.runs_conceded || 0);
        const econ = (overs > 0) ? (runsC / overs) : 99;
        
        if (isHero) return true;
        
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

