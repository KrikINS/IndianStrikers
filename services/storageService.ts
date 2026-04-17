/// <reference types="vite/client" />
import { Player, PlayerRole, BattingStyle, BowlingStyle, OpponentTeam, FieldingStrategy, TournamentTableEntry, AppUser, MembershipRequest, Ground, Tournament, ScheduledMatch, PlayerLegacyStats, BattingStats, BowlingStats } from '../types';

// const API_URL = 'https://strikers-app-227875153596.us-central1.run.app/api';
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');
const getHeaders = () => {
  const token = sessionStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('authToken');
      window.location.reload(); // Force reload to show login screen
      throw new Error("Session expired. Please login again.");
    }
    
    // TRAP: Prevent app crash on DB Timeout or Server Error
    if (res.status >= 500) {
      console.warn(`[API] Server/DB Error ${res.status}. Falling back to empty/cached results.`);
      return null; // Return null so callers can handle gracefully
    }

    const text = await res.text();
    console.error(`API Error (${res.status}):`, text);
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || `Request failed: ${res.status} ${res.statusText}`);
    } catch (e) {
      throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text.substring(0, 100)}`);
    }
  }
  return res.json();
};

// AUTH
export const login = async (username: string, password: string, mode: string) => {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, mode })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
};

export const changePassword = async (oldPassword: string, newPassword: string) => {
  const res = await fetch(`${API_URL}/users/change_password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ oldPassword, newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to change password');
  return data;
};

export const forgotPassword = async (email: string) => {
  const res = await fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
  return data;
};

export const resetPassword = async (email: string, token: string, newPassword: string) => {
  const res = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset password');
  return data;
};

// USERS
export const getAppUsers = async (): Promise<AppUser[]> => {
  const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
  const data = await handleResponse(res);
  return (data || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    name: u.name || u.username,
    email: u.email,
    contactNumber: u.contact_number,
    role: u.role,
    avatarUrl: u.avatar_url,
    playerId: u.player_id,
    canScore: u.can_score,
    password: ''
  }));
};

export const updateAppUser = async (id: string, user: Partial<AppUser>) => {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      username: user.username,
      email: user.email,
      contact_number: user.contactNumber,
      password: user.password,
      role: user.role,
      name: user.name,
      avatar_url: user.avatarUrl,
      player_id: user.playerId,
      can_score: user.canScore
    })
  });
  return handleResponse(res);
};

export const addAppUser = async (user: Partial<AppUser>) => {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      username: user.username,
      email: user.email,
      contact_number: user.contactNumber,
      password: user.password,
      role: user.role,
      name: user.name,
      avatar_url: user.avatarUrl,
      player_id: user.playerId,
      can_score: user.canScore
    })
  });
  return handleResponse(res);
};

export const deleteAppUser = async (id: string) => {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

export const saveAppUsers = (users: AppUser[]) => console.warn("saveAppUsers is deprecated");

// PLAYERS
const INITIAL_BATTING_STATS: BattingStats = { matches: 142, innings: 140, notOuts: 15, runs: 24500, balls: 18000, average: 196, strikeRate: 136, highestScore: '185*', hundreds: 7, fifties: 12, ducks: 2, fours: 450, sixes: 120 };
const INITIAL_BOWLING_STATS: BowlingStats = { matches: 142, innings: 120, overs: 480, maidens: 45, runs: 3200, wickets: 180, average: 17.7, economy: 6.6, strikeRate: 16, bestBowling: '5/12', fourWickets: 8, fiveWickets: 3, wides: 120, no_balls: 45 };


export const getPlayers = async (): Promise<Player[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s for 5MB+ payloads

  try {
    console.log(`[storageService] Fetching players from ${API_URL}/players...`);
    const res = await fetch(`${API_URL}/players`, { 
      signal: controller.signal 
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
        console.warn(`[storageService] API returned status ${res.status}`);
        return [];
    }

    const data = await handleResponse(res);
    
    // If handleResponse returned null (500 error), use cache
    if (!data) {
      const cached = localStorage.getItem('ins_offline_players');
      return cached ? JSON.parse(cached) : [];
    }

    if (Array.isArray(data)) {
      console.log(`[storageService] Success! Received ${data.length} players.`);
    }

    const players = (Array.isArray(data) ? data : [])
      .filter((p: any) => p !== null && p !== undefined)
      .map((p: any) => ({
        ...p,
        avatarUrl: p.avatar_url,
        matchesPlayed: p.matches_played,
        runsScored: p.runs_scored,
        wicketsTaken: p.wickets_taken,
        isCaptain: p.is_captain,
        isViceCaptain: p.is_vice_captain,
        isActive: (p.is_active !== false && p.is_active !== 0 && p.is_active !== 'false') && p.status !== 'inactive',
        isAvailable: p.is_available,
        battingStats: p.batting_stats,
        bowlingStats: p.bowling_stats,
        battingStyle: p.batting_style,
        bowlingStyle: p.bowling_style,
        linkedUserId: p.linked_user_id,
        jerseyNumber: p.jersey_number,
        dob: p.dob,
        externalId: p.external_id
      }));

    if (players.length > 0) {
        console.table(players.slice(0, 5).map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
    }

    // Update offline cache safely to prevent QuotaExceededError on large payloads
    try {
        localStorage.setItem('ins_offline_players', JSON.stringify(players));
    } catch (cacheError) {
        console.warn("[storageService] Local storage is full. Players will not be available offline.");
        // Try clearing old cache to make room for new data if needed
        try { localStorage.removeItem('ins_offline_players'); } catch(e) {}
    }

    return players;
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error(`[storageService] Error fetching players:`, e);
    console.warn("[storageService] Tunnel is slow or API failed, attempting to use cache...");
    
    try {
        const cached = localStorage.getItem('ins_offline_players');
        return cached ? JSON.parse(cached) : []; 
    } catch (parseError) {
        return [];
    }
  }
};

export const addPlayer = async (player: Partial<Player>) => {
  const dbPlayer = {
    name: player.name,
    role: player.role,
    batting_style: player.battingStyle,
    bowling_style: player.bowlingStyle,
    avatar_url: player.avatarUrl,
    matches_played: player.matchesPlayed,
    runs_scored: player.runsScored,
    wickets_taken: player.wicketsTaken,
    average: player.average,
    is_captain: player.isCaptain,
    is_vice_captain: player.isViceCaptain,
    is_available: player.isAvailable,
    batting_stats: player.battingStats,
    bowling_stats: player.bowlingStats,
    linked_user_id: player.linkedUserId,
    jersey_number: player.jerseyNumber,
    dob: player.dob || null,
    external_id: player.externalId,
    is_active: player.isActive,
    status: player.status
  };
  const res = await fetch(`${API_URL}/players`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbPlayer)
  });
  const p = await handleResponse(res);
  if (!p) throw new Error("Server returned empty response");
  return {
    ...p,
    avatarUrl: p.avatar_url,
    matchesPlayed: p.matches_played,
    runsScored: p.runs_scored,
    wicketsTaken: p.wickets_taken,
    isCaptain: p.is_captain,
    isViceCaptain: p.is_vice_captain,
    isAvailable: p.is_available,
    battingStats: p.batting_stats,
    bowlingStats: p.bowling_stats,
    linkedUserId: p.linked_user_id,
    jerseyNumber: p.jersey_number,
    battingStyle: p.batting_style,
    bowlingStyle: p.bowling_style,
    dob: p.dob,
    externalId: p.external_id
  };
};

export const updatePlayer = async (player: Player) => {
  const dbPlayer = {
    name: player.name,
    role: player.role,
    batting_style: player.battingStyle,
    bowling_style: player.bowlingStyle,
    avatar_url: player.avatarUrl,
    matches_played: player.matchesPlayed,
    runs_scored: player.runsScored,
    wickets_taken: player.wicketsTaken,
    average: player.average,
    is_captain: player.isCaptain,
    is_vice_captain: player.isViceCaptain,
    is_available: player.isAvailable,
    batting_stats: player.battingStats,
    bowling_stats: player.bowlingStats,
    linked_user_id: player.linkedUserId,
    jersey_number: player.jerseyNumber,
    dob: player.dob || null,
    external_id: player.externalId,
    is_active: player.isActive,
    status: player.status
  };
  const res = await fetch(`${API_URL}/players/${player.id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(dbPlayer)
  });
  return handleResponse(res);
};

export const deletePlayer = async (id: string) => {
  const res = await fetch(`${API_URL}/players/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};


// MATCHES
export const getMatches = async (): Promise<ScheduledMatch[]> => {
  const res = await fetch(`${API_URL}/matches`);
  const data = await handleResponse(res);
  return (data || []).map((m: any) => ({
    ...m,
    homeTeamXI: Array.isArray(m.home_team_xi) ? m.home_team_xi : (Array.isArray(m.homeTeamXI) ? m.homeTeamXI : []),
    opponentTeamXI: Array.isArray(m.opponent_team_xi) ? m.opponent_team_xi : (Array.isArray(m.opponentTeamXI) ? m.opponentTeamXI : []),
    opponentId: m.opponentId || m.opponent_id,
    groundId: m.groundId || m.ground_id,
    isLiveScored: m.isLiveScored ?? m.is_live_scored ?? false,
    isLocked: m.isLocked ?? m.is_locked ?? false,
    isHomeBattingFirst: m.isHomeBattingFirst ?? m.is_home_batting_first ?? true,
    matchFormat: m.matchFormat || m.match_format,
    opponentName: m.opponent_name || m.opponentName,
    opponentLogo: m.opponent_logo || m.opponentLogo,
    homeLogo: m.homeLogo || m.home_logo,
    venue: m.ground_name || m.venue,
    resultSummary: m.resultSummary || m.result_summary,
    resultNote: m.resultNote || m.result_note,
    resultType: m.resultType || m.result_type,
    finalScoreHome: m.finalScoreHome || m.final_score_home,
    finalScoreAway: m.finalScoreAway || m.final_score_away,
    tournamentId: m.tournamentId || m.tournament_id,
    is_test: m.is_test ?? false
  }));
};

export const getMatch = async (id: string): Promise<ScheduledMatch | null> => {
  const res = await fetch(`${API_URL}/matches/${id}`);
  const m = await handleResponse(res);
  if (!m) return null;
  return {
    ...m,
    homeTeamXI: Array.isArray(m.home_team_xi) ? m.home_team_xi : (Array.isArray(m.homeTeamXI) ? m.homeTeamXI : []),
    opponentTeamXI: Array.isArray(m.opponent_team_xi) ? m.opponent_team_xi : (Array.isArray(m.opponentTeamXI) ? m.opponentTeamXI : []),
    opponentId: m.opponentId || m.opponent_id,
    groundId: m.groundId || m.ground_id,
    isLiveScored: m.isLiveScored ?? m.is_live_scored ?? false,
    isLocked: m.isLocked ?? m.is_locked ?? false,
    isHomeBattingFirst: m.isHomeBattingFirst ?? m.is_home_batting_first ?? true,
    matchFormat: m.matchFormat || m.match_format,
    opponentName: m.opponent_name || m.opponentName,
    opponentLogo: m.opponent_logo || m.opponentLogo,
    homeLogo: m.homeLogo || m.home_logo,
    venue: m.ground_name || m.venue,
    resultSummary: m.resultSummary || m.result_summary,
    resultNote: m.resultNote || m.result_note,
    resultType: m.resultType || m.result_type,
    finalScoreHome: m.finalScoreHome || m.final_score_home,
    finalScoreAway: m.finalScoreAway || m.final_score_away,
    tournamentId: m.tournamentId || m.tournament_id,
    is_test: m.is_test ?? false
  };
};

export const addMatch = async (match: Partial<ScheduledMatch>) => {
  const res = await fetch(`${API_URL}/matches`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(match)
  });
  return handleResponse(res);
};

export const updateMatch = async (id: string, match: Partial<ScheduledMatch>) => {
  const res = await fetch(`${API_URL}/matches/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(match)
  });
  return handleResponse(res);
};

export const finalizeMatch = async (id: string, matchData: any, updatedPlayers: any[]) => {
  const res = await fetch(`${API_URL}/matches/${id}/finalize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ matchData, updatedPlayers })
  });
  return handleResponse(res);
};

export const deleteMatchStats = async (matchId: string) => {
  const res = await fetch(`${API_URL}/matches/${matchId}/stats`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

export const deleteMatch = async (id: string) => {
  const res = await fetch(`${API_URL}/matches/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};


// OPPONENTS
export const getOpponents = async (): Promise<OpponentTeam[]> => {
  const res = await fetch(`${API_URL}/opponents`);
  const data = await handleResponse(res);
  return (data || []).map((t: any) => ({
    ...t,
    logoUrl: t.logo_url,
    players: t.players || []
  }));
};

export const addOpponent = async (team: OpponentTeam) => {
  const { id, logoUrl, players, ...rest } = team;
  const dbTeam = {
    ...rest,
    logo_url: logoUrl,
    players: players || [] // Ensure array
  };
  const res = await fetch(`${API_URL}/opponents`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbTeam)
  });
  return handleResponse(res);
};

export const updateOpponent = async (team: OpponentTeam) => {
  const { id, logoUrl, players, ...rest } = team;
  const dbTeam = {
    ...rest,
    logo_url: logoUrl,
    players: players || []
  };
  const res = await fetch(`${API_URL}/opponents/${team.id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(dbTeam)
  });
  return handleResponse(res);
};

export const deleteOpponent = async (id: string) => {
  const res = await fetch(`${API_URL}/opponents/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

// STRATEGIES
export const getStrategies = async (): Promise<FieldingStrategy[]> => {
  const res = await fetch(`${API_URL}/strategies`);
  const data = await handleResponse(res);
  return (data || []).map((s: any) => ({
    ...s,
    batterHand: s.batter_hand,
    matchPhase: s.match_phase,
    bowlerId: s.bowler_id,
    batterId: s.batter_id,
    positions: typeof s.positions === 'string' ? JSON.parse(s.positions) : (s.positions || [])
  }));
};

export const addStrategy = async (strategy: FieldingStrategy) => {
  const dbStrategy = {
    name: strategy.name,
    batter_hand: strategy.batterHand,
    match_phase: strategy.matchPhase,
    bowler_id: strategy.bowlerId || null,
    batter_id: strategy.batterId || null,
    positions: strategy.positions
  };
  const res = await fetch(`${API_URL}/strategies`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbStrategy)
  });
  return handleResponse(res);
};

export const deleteStrategy = async (id: string) => {
  const res = await fetch(`${API_URL}/strategies/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

export const saveStrategies = async (strategies: FieldingStrategy[]) => {
  console.warn("saveStrategies (bulk) is deprecated. Use addStrategy/deleteStrategy.");
};


// TEAM LOGO
export const getTeamLogo = async (): Promise<string> => {
  const res = await fetch(`${API_URL}/settings/team_logo`);
  const data = await res.json().catch(() => ({}));
  return data?.value || '/INS LOGO.PNG';
};

export const saveTeamLogo = async (url: string) => {
  await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ key: 'team_logo', value: url })
  });
};

// TOURNAMENT TABLE
export const getTournamentTable = async (tournament?: string): Promise<TournamentTableEntry[]> => {
  const url = tournament ? `${API_URL}/table?tournament=${encodeURIComponent(tournament)}` : `${API_URL}/table`;
  const res = await fetch(url);
  const data = await handleResponse(res);
  return (data || []).map((t: any) => ({
    id: t.id,
    teamId: t.team_id,
    teamName: t.team_name,
    tournamentName: t.tournament_name,
    matches: t.matches,
    won: t.won,
    lost: t.lost,
    nr: t.nr,
    points: t.points,
    nrr: t.nrr
  }));
};

export const saveTournamentTableEntry = async (entry: TournamentTableEntry) => {
  const dbEntry = {
    id: entry.id,
    team_id: entry.teamId,
    team_name: entry.teamName,
    tournament_name: entry.tournamentName,
    matches: entry.matches,
    won: entry.won,
    lost: entry.lost,
    nr: entry.nr,
    points: entry.points,
    nrr: entry.nrr
  };
  const res = await fetch(`${API_URL}/table`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbEntry)
  });
  return handleResponse(res);
};

export const deleteTournamentTableEntry = async (id: string) => {
  const res = await fetch(`${API_URL}/table/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

export const saveTournamentTable = (table: TournamentTableEntry[]) => console.warn("saveTournamentTable deprecated. Use individual entry save.");

// MEMBERSHIP REQUESTS
export const getMembershipRequests = async (): Promise<MembershipRequest[]> => {
  const res = await fetch(`${API_URL}/membership_requests`, { headers: getHeaders() });
  const data = await handleResponse(res);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    contactNumber: r.contact_number,
    associatedBefore: r.associated_before,
    associationYear: r.association_year,
    status: r.status,
    date: r.created_at
  }));
};

export const addMembershipRequest = async (request: Partial<MembershipRequest>) => {
  const dbRequest = {
    name: request.name,
    email: request.email,
    contact_number: request.contactNumber,
    associated_before: request.associatedBefore,
    association_year: request.associationYear,
    status: 'Pending'
  };
  const res = await fetch(`${API_URL}/membership_requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // Public endpoint, no auth usually? Or guest auth? Assuming public for now or same headers
    body: JSON.stringify(dbRequest)
  });
  return handleResponse(res);
};

export const updateMembershipRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
  const res = await fetch(`${API_URL}/membership_requests/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
};

export const deleteMembershipRequest = async (id: string) => {
  const res = await fetch(`${API_URL}/membership_requests/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

/* DEPRECATED / STUBS */
export const savePlayers = (p: Player[]) => console.warn("savePlayers deprecated");
export const saveOpponents = (o: OpponentTeam[]) => console.warn("saveOpponents deprecated");

// MEMORIES
export interface Memory {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  date: string;
  likes: number;
  width?: string;
  comments: any[];
}

export const getMemories = async (): Promise<Memory[]> => {
  const res = await fetch(`${API_URL}/memories`, { headers: getHeaders() });
  return (await handleResponse(res)) || [];
};

export const addMemory = async (memory: Partial<Memory>) => {
  const res = await fetch(`${API_URL}/memories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(memory)
  });
  return handleResponse(res);
}

export const deleteMemory = async (id: string): Promise<void> => {
  const token = sessionStorage.getItem('authToken');
  const res = await fetch(`${API_URL}/memories/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete memory');
};

export const updateMemory = async (id: string, updates: Partial<Memory>): Promise<void> => {
  const token = sessionStorage.getItem('authToken');
  const res = await fetch(`${API_URL}/memories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update memory');
};

// GROUNDS
export const getGrounds = async (): Promise<Ground[]> => {
  const res = await fetch(`${API_URL}/grounds`);
  return (await handleResponse(res)) || [];
};

export const addGround = async (ground: Partial<Ground>) => {
  const res = await fetch(`${API_URL}/grounds`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(ground)
  });
  return handleResponse(res);
};

export const updateGround = async (id: string, ground: Partial<Ground>) => {
  const res = await fetch(`${API_URL}/grounds/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(ground)
  });
  return handleResponse(res);
};

export const deleteGround = async (id: string) => {
  const res = await fetch(`${API_URL}/grounds/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

// TOURNAMENTS
export const getTournaments = async (): Promise<Tournament[]> => {
  const res = await fetch(`${API_URL}/tournaments`);
  return (await handleResponse(res)) || [];
};

export const addTournament = async (tournament: Partial<Tournament>) => {
  const res = await fetch(`${API_URL}/tournaments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(tournament)
  });
  return handleResponse(res);
};

export const updateTournament = async (id: string, tournament: Partial<Tournament>) => {
  const res = await fetch(`${API_URL}/tournaments/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(tournament)
  });
  return handleResponse(res);
};

export const deleteTournament = async (id: string) => {
  const res = await fetch(`${API_URL}/tournaments/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

// LEGACY STATS
export const getLegacyStats = async (): Promise<PlayerLegacyStats[]> => {
  const res = await fetch(`${API_URL}/legacy-stats`, { headers: getHeaders() });
  return (await handleResponse(res)) || [];
};

export interface TournamentStat {
  tournamentId: string;
  tournamentName: string;
  batting: BattingStats;
  bowling: BowlingStats;
}

export interface PlayerDetailedStats {
  legacy: any | null; // Changed to any to support enriched rates
  tournaments: TournamentStat[];
  total: {
    batting: BattingStats;
    bowling: BowlingStats;
  };
}

export const getPlayerDetailedStats = async (playerId: string): Promise<PlayerDetailedStats> => {
  const res = await fetch(`${API_URL}/players/${playerId}/stats`);
  return handleResponse(res);
};

export const updateLegacyStats = async (playerId: string, stats: Partial<PlayerLegacyStats>) => {
  const res = await fetch(`${API_URL}/legacy-stats/${playerId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(stats)
  });
  return handleResponse(res);
};
export const getTournamentPerformers = async (): Promise<any> => {
  const res = await fetch(`${API_URL}/tournament-performers`);
  const data = await handleResponse(res);
  
  if (!data) return data;

  return {
    ...data,
    tournamentName: data.tournament_name || data.tournamentName,
    performers: (data.performers || []).map((p: any) => ({
      ...p,
      playerId: p.player_id || p.playerId,
      avatarUrl: p.avatar_url || p.avatarUrl,
      opponentId: p.opponent_id || p.opponentId,
      groundId: p.ground_id || p.groundId,
      opponentName: p.opponent_name || p.opponentName,
      groundName: p.ground_name || p.groundName,
      matchTime: p.match_time || p.matchTime,
      matchDate: p.match_date || p.matchDate,
      bowlingRuns: p.bowling_runs || p.bowlingRuns,
      bowlingOvers: p.bowling_overs || p.bowlingOvers
    }))
  };
};
