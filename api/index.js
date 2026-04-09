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

app.use(express.json({ limit: '10mb' }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`[Supabase Config] URL: ${supabaseUrl ? 'Found' : 'MISSING'}, Key: ${supabaseKey ? 'Found' : 'MISSING'}`);
const supabase = createClient(supabaseUrl, supabaseKey);
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
    'is_home_batting_first', 'tournament_id', 'performers', 'scorecard', 'is_career_synced'
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
  // Exclude legacy match from generic listing
  const filtered = (data || []).filter(m => m.id !== '00000000-0000-0000-0000-000000000001');
  res.json(filtered);
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
    // 1. Upsert Match Record to handle potential conflicts or new records
    const dbMatch = mapMatchToDB(matchData);
    const { error: matchError } = await supabase
      .from('matches')
      .upsert([{
        ...dbMatch,
        id: id,
        status: 'completed',
        is_career_synced: true,
        updated_at: new Date()
      }], { onConflict: 'id' });

    if (matchError) throw matchError;

    // 2. Summation Logic (Source of Truth: player_match_stats)
    let performers = (updatedPlayers && updatedPlayers.length > 0) ? updatedPlayers : (matchData.performers || []);
    
    if (performers.length > 0) {
      console.log(`[Sync] Starting Delta-Sync for match ${id}. Processing ${performers.length} records...`);
      
      for (let perf of performers) {
        if (!perf.playerId) continue;
        
        let { data: actualPlayer } = await supabase
          .from('players')
          .select('id, name')
          .eq('id', perf.playerId)
          .single();

        if (!actualPlayer && perf.playerName) {
          const { data: ps } = await supabase.from('players').select('*');
          actualPlayer = ps?.find(p => p.name.trim().toLowerCase() === perf.playerName.trim().toLowerCase());
        }

        if (!actualPlayer) {
          console.warn(`[Sync] ⚠️ Player not found: ${perf.playerName}`);
          continue;
        }

        const playerId = actualPlayer.id;

        const { error: upsertErr } = await supabase
          .from('player_match_stats')
          .upsert([{
            match_id: String(id),
            player_id: playerId,
            runs: Number(perf.runs || 0),
            balls: Number(perf.balls || 0),
            fours: Number(perf.fours || 0),
            sixes: Number(perf.sixes || 0),
            status: perf.outHow || (perf.isNotOut ? 'Not Out' : 'Out'),
            wickets: Number(perf.wickets || 0),
            runs_conceded: Number(perf.bowlingRuns || 0),
            overs_bowled: Number(perf.bowlingOvers || 0),
            maidens: Number(perf.maidens || 0),
            hundreds: Number(perf.runs) >= 100 ? 1 : 0,
            fifties: (Number(perf.runs) >= 50 && Number(perf.runs) < 100) ? 1 : 0,
            ducks: (Number(perf.runs || 0) === 0 && (perf.outHow && !['not out', 'did not bat', 'dnb', 'retired hurt', 'absent'].includes(perf.outHow.toLowerCase()))) ? 1 : 0,
            four_wickets: Number(perf.wickets) === 4 ? 1 : 0,
            five_wickets: Number(perf.wickets) >= 5 ? 1 : 0,
            wides: Number(perf.wides || 0),
            no_balls: Number(perf.no_balls || 0),
            is_hero: perf.is_hero || false,
            updated_at: new Date().toISOString()
          }], { onConflict: 'match_id, player_id' });

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

      await supabase.from('matches').update({ performers }).eq('id', id);
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
  console.log(`[/api/table] Rows found: ${data?.length}, Error: ${error?.message}`);
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


/**
 * SHARED CAREER SYNC ENGINE
 * Re-sums a player's full career by aggregating:
 * (All records in player_match_stats) + (Baseline in player_legacy_stats)
 */
async function recalculateCareerStats(playerId) {
    console.log(`[SyncEngine] Recalculating career for Player ID: ${playerId}...`);
    
    const { data: allMatchStats } = await supabase.from('player_match_stats').select('*').eq('player_id', playerId);
    const { data: legacyBaseline } = await supabase.from('player_legacy_stats').select('*').eq('player_id', playerId).single();
    
    const l = legacyBaseline || { 
        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, matches: 0, innings: 0, 
        not_outs: 0, highest_score: 0, bowling_innings: 0, overs_bowled: 0, 
        runs_conceded: 0, maidens: 0, hundreds: 0, fifties: 0, ducks: 0, 
        four_wickets: 0, five_wickets: 0, wides: 0, no_balls: 0, best_bowling: '0/0' 
    };
    const m = allMatchStats || [];

    const totalRuns = m.reduce((s, row) => s + (Number(row.runs) || 0), 0) + (Number(l.runs) || 0);
    const totalWickets = m.reduce((s, row) => s + (Number(row.wickets) || 0), 0) + (Number(l.wickets) || 0);
    const totalMatches = m.reduce((s, row) => s + (row.status?.startsWith('HISTORICAL:') ? (parseInt(row.status.split(':')[1]) || 1) : 1), 0) + (Number(l.matches) || 0);
    const totalInnings = m.filter(row => (Number(row.runs) > 0 || Number(row.balls) > 0)).length + (Number(l.innings) || 0);
    const totalNO = m.filter(row => row.is_not_out || row.status === 'Not Out' || row.status === 'not out').length + (Number(l.not_outs) || 0);
    const totalBalls = m.reduce((s, row) => s + (Number(row.balls) || 0), 0) + (Number(l.balls) || 0);
    const totalFours = m.reduce((s, row) => s + (Number(row.fours) || 0), 0) + (Number(l.fours) || 0);
    const totalSixes = m.reduce((s, row) => s + (Number(row.sixes) || 0), 0) + (Number(l.sixes) || 0);
    const total100s = m.reduce((s, row) => s + (Number(row.hundreds) || 0), 0) + (Number(l.hundreds) || 0);
    const total50s = m.reduce((s, row) => s + (Number(row.fifties) || 0), 0) + (Number(l.fifties) || 0);
    const totalDucks = m.reduce((s, row) => s + (Number(row.ducks) || 0), 0) + (Number(l.ducks) || 0);

    const totalBowlRuns = m.reduce((s, row) => s + (Number(row.runs_conceded) || 0), 0) + (Number(l.runs_conceded) || 0);
    const totalBowlOvers = m.reduce((s, row) => s + (Number(row.overs_bowled) || 0), 0) + (Number(l.overs_bowled) || 0);
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
    const bowlEco = totalBowlOvers > 0 ? totalBowlRuns / totalBowlOvers : 0;
    const bowlSR = totalWickets > 0 ? (totalBowlOvers * 6) / totalWickets : 0;
    
    const maxScore = Math.max(...m.map(row => Number(row.runs) || 0), Number(l.highest_score) || 0);

    // Update the players table profile
    const { error: upErr } = await supabase.from('players').update({
        runs_scored: totalRuns,
        wickets_taken: totalWickets,
        matches_played: totalMatches,
        batting_stats: {
            matches: totalMatches, innings: totalInnings, runs: totalRuns, balls: totalBalls,
            fours: totalFours, sixes: totalSixes, notOuts: totalNO, highestScore: String(maxScore),
            average: parseFloat(batAvg.toFixed(2)), strikeRate: parseFloat(batSR.toFixed(2)),
            hundreds: total100s, fifties: total50s, ducks: totalDucks
        },
        bowling_stats: {
            matches: totalMatches, innings: totalBowlInnings, overs: parseFloat(totalBowlOvers.toFixed(1)), runs: totalBowlRuns, 
            wickets: totalWickets, maidens: totalMaidens, average: parseFloat(bowlAvg.toFixed(2)),
            economy: parseFloat(bowlEco.toFixed(2)), strikeRate: parseFloat(bowlSR.toFixed(2)),
            bestBowling: bestBBI, fourWickets: total4W, fiveWickets: total5W,
            wides: totalWides, no_balls: totalNoBalls
        },
        updated_at: new Date()
    }).eq('id', playerId);

    if (upErr) throw upErr;
    console.log(`[SyncEngine] ✅ Career recalculated for ${playerId}`);
}

// LEGACY STATS MANAGEMENT
app.get('/api/legacy-stats', authGuard(['admin']), async (req, res) => {
  const { data, error } = await supabase.from('player_legacy_stats').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PLAYER DETAILED STATS
app.get('/api/players/:id/stats', async (req, res) => {
    const { id: playerId } = req.params;
    
    try {
        // 1. Fetch Legacy Baseline
        const { data: legacy } = await supabase
            .from('player_legacy_stats')
            .select('*')
            .eq('player_id', playerId)
            .single();

        // 2. Fetch Tournament/Match Data
        const { data: matchStats, error: matchError } = await supabase
            .from('player_match_stats')
            .select(`
                *,
                matches:match_id (
                    tournament_id,
                    tournaments:tournament_id (
                        name
                    )
                )
            `)
            .eq('player_id', playerId);

        if (matchError) throw matchError;

        // 3. Group by Tournament
        const tournamentGroups = {};
        
        matchStats.forEach(row => {
            const tournament = row.matches?.tournaments;
            const tId = row.matches?.tournament_id || 'unknown';
            const tName = tournament?.name || (tId === 'unknown' ? 'Other Matches' : 'Default Tournament');

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
            if (row.runs > 0 || row.balls > 0) group.batting.innings++;
            if (row.status === 'Not Out') group.batting.notOuts++;
            group.batting.runs += (Number(row.runs) || 0);
            group.batting.balls += (Number(row.balls) || 0);
            group.batting.fours += (Number(row.fours) || 0);
            group.batting.sixes += (Number(row.sixes) || 0);
            group.batting.hundreds += (Number(row.hundreds) || 0);
            group.batting.fifties += (Number(row.fifties) || 0);
            group.batting.ducks += (Number(row.ducks) || 0);
            const currentHS = parseInt(group.batting.highestScore) || 0;
            if (Number(row.runs) > currentHS) group.batting.highestScore = String(row.runs);

            // Bowling Aggregation
            if (Number(row.overs_bowled) > 0) {
                group.bowling.innings++;
                group.bowling.matches++; 
                group.bowling.overs += (Number(row.overs_bowled) || 0);
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
            tournaments: Object.values(tournamentGroups)
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
    const { error: legacyErr } = await supabase
      .from('player_legacy_stats')
      .upsert({ ...stats, player_id: playerId, updated_at: new Date() }, { onConflict: 'player_id' });

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

// TOURNAMENT PERFORMERS ENGINE (Hybrid Selection)
app.get('/api/tournament-performers', async (req, res) => {
  try {
    // 1. Get tournaments sorted by creation/date to find latest
    const { data: tournaments, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (tErr || !tournaments || tournaments.length === 0) return res.json({ performers: [], isSeasonOpener: true });

    const latestTournament = tournaments[0];
    const previousTournament = tournaments[1];

    // Helper to fetch and filter Top 7 Standout Performances
    const getPerformersForTournament = async (tId) => {
      let query = supabase
        .from('player_match_stats')
        .select(`
          *,
          matches:match_id!inner ( id, date, status, tournament_id ),
          players:player_id!inner ( id, name, role, avatar_url )
        `);

      if (tId) {
        query = query.eq('matches.tournament_id', tId);
      }
      
      query = query.eq('matches.status', 'completed');

      const { data, error } = await query;
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
        // Priority 1: Manual Hero Picks
        if (a.is_hero && !b.is_hero) return -1;
        if (!a.is_hero && b.is_hero) return 1;

        // Priority 2: Simple Performance Score
        const scoreA = (Number(a.runs || 0)) + (Number(a.wickets || 0) * 35);
        const scoreB = (Number(b.runs || 0)) + (Number(b.wickets || 0) * 35);
        return scoreB - scoreA;
      })
      .slice(0, 7)
      .map(row => ({
        id: row.id,
        playerId: row.player_id,
        name: row.players.name,
        role: row.players.role,
        avatarUrl: row.players.avatar_url,
        runs: Number(row.runs || 0),
        balls: Number(row.balls || 0),
        wickets: Number(row.wickets || 0),
        bowlingRuns: Number(row.runs_conceded || 0),
        bowlingOvers: Number(row.overs_bowled || 0),
        isHero: !!row.is_hero,
        matchDate: row.matches.date
      }));

      return results;
    };

    let performers = await getPerformersForTournament(latestTournament.id);
    let isSeasonOpener = false;

    // Fallback: If no performers found in current tournament, pull from most recent match
    if (performers.length === 0) {
      const { data: recentMatch } = await supabase
        .from('matches')
        .select('id, tournament_id')
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(1)
        .single();

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
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`CORS Allowed Origins:`, [process.env.FRONTEND_LOCAL, process.env.FRONTEND_PROD]);
});

