
import { Player, Match, OpponentTeam, FieldingStrategy, TournamentTableEntry, AppUser } from '../types';

const API_URL = 'http://localhost:4001/api';

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
  return handleResponse(res);
};

// USERS
export const getAppUsers = async (): Promise<AppUser[]> => {
  const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
  const data = await handleResponse(res);
  return data.map((u: any) => ({
    id: u.id,
    username: u.username,
    name: u.username,
    role: u.role,
    avatarUrl: u.avatar_url,
    password: ''
  }));
};

export const addAppUser = async (user: Partial<AppUser>) => {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user)
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
export const getPlayers = async (): Promise<Player[]> => {
  const res = await fetch(`${API_URL}/players`);
  const data = await handleResponse(res);
  return data.map((p: any) => ({
    ...p,
    avatarUrl: p.avatar_url,
    matchesPlayed: p.matches_played,
    runsScored: p.runs_scored,
    wicketsTaken: p.wickets_taken,
    isCaptain: p.is_captain,
    isViceCaptain: p.is_vice_captain,
    isAvailable: p.is_available,
    battingStats: p.batting_stats,
    bowlingStats: p.bowling_stats
  }));
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
    bowling_stats: player.bowlingStats
  };
  const res = await fetch(`${API_URL}/players`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbPlayer)
  });
  return handleResponse(res);
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
    bowling_stats: player.bowlingStats
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
export const getMatches = async (): Promise<Match[]> => {
  const res = await fetch(`${API_URL}/matches`);
  const data = await handleResponse(res);
  return data.map((m: any) => ({
    ...m,
    isUpcoming: m.is_upcoming,
    tossTime: m.toss_time
  }));
};

export const addMatch = async (match: Partial<Match>) => {
  const dbMatch = {
    opponent: match.opponent,
    date: match.date,
    venue: match.venue,
    result: match.result,
    score_for: match.scoreFor,
    score_against: match.scoreAgainst,
    is_upcoming: match.isUpcoming,
    tournament: match.tournament,
    toss_time: match.tossTime
  };
  const res = await fetch(`${API_URL}/matches`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbMatch)
  });
  return handleResponse(res);
};

export const updateMatch = async (match: Match) => {
  const dbMatch = {
    opponent: match.opponent,
    date: match.date,
    venue: match.venue,
    result: match.result,
    score_for: match.scoreFor,
    score_against: match.scoreAgainst,
    is_upcoming: match.isUpcoming,
    tournament: match.tournament,
    toss_time: match.tossTime
  };
  const res = await fetch(`${API_URL}/matches/${match.id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(dbMatch)
  });
  return handleResponse(res);
};

// OPPONENTS
export const getOpponents = async (): Promise<OpponentTeam[]> => {
  const res = await fetch(`${API_URL}/opponents`);
  const data = await handleResponse(res);
  return data.map((t: any) => ({
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
  return data.map((s: any) => ({
    ...s,
    batterHand: s.batter_hand,
    matchPhase: s.match_phase,
    bowlerId: s.bowler_id,
    batterId: s.batter_id
  }));
};

export const addStrategy = async (strategy: FieldingStrategy) => {
  const dbStrategy = {
    name: strategy.name,
    batter_hand: strategy.batterHand,
    match_phase: strategy.matchPhase,
    bowler_id: strategy.bowlerId,
    batter_id: strategy.batterId,
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
  const data = await await res.json().catch(() => ({}));
  return data.value || '';
};

export const saveTeamLogo = async (url: string) => {
  await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ key: 'team_logo', value: url })
  });
};

// TOURNAMENT TABLE
export const getTournamentTable = async (): Promise<TournamentTableEntry[]> => {
  const res = await fetch(`${API_URL}/table`);
  const data = await handleResponse(res);
  return data.map((t: any) => ({
    id: t.id,
    teamId: t.team_id,
    teamName: t.team_name,
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

/* DEPRECATED / STUBS */
export const savePlayers = (p: Player[]) => console.warn("savePlayers deprecated");
export const saveMatches = (m: Match[]) => console.warn("saveMatches deprecated");
export const saveOpponents = (o: OpponentTeam[]) => console.warn("saveOpponents deprecated");