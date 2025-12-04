
import { Player, Match, PlayerRole, BattingStyle, BowlingStyle, OpponentTeam, FieldingStrategy, TournamentTableEntry } from '../types';

const PLAYERS_KEY = 'indian_strikers_players';
const MATCHES_KEY = 'indian_strikers_matches';
const OPPONENTS_KEY = 'indian_strikers_opponents';
const STRATEGIES_KEY = 'indian_strikers_strategies';
const TEAM_LOGO_KEY = 'indian_strikers_logo';
const TOURNAMENT_TABLE_KEY = 'indian_strikers_tournament_table';

const SEED_PLAYERS: Player[] = [
  {
    id: '2259634984',
    name: 'Anees Abdul Ahad',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_FAST,
    matchesPlayed: 45,
    runsScored: 1250,
    wicketsTaken: 32,
    average: 35.5,
    isCaptain: true,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Anees+Abdul+Ahad&background=0D8ABC&color=fff',
    battingStats: { matches: 45, innings: 42, notOuts: 7, runs: 1250, balls: 980, average: 35.71, strikeRate: 127.55, highestScore: '89*', hundreds: 0, fifties: 8, ducks: 2, fours: 120, sixes: 35 },
    bowlingStats: { matches: 45, innings: 38, overs: 140, maidens: 5, runs: 980, wickets: 32, average: 30.62, economy: 7.00, strikeRate: 26.25, bestBowling: '4/25', fourWickets: 1, fiveWickets: 0 }
  },
  {
    id: '2142162607',
    name: 'Shaik Faizullah',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_SPIN,
    matchesPlayed: 38,
    runsScored: 980,
    wicketsTaken: 25,
    average: 28.4,
    isViceCaptain: false,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Shaik+Faizullah&background=0D8ABC&color=fff',
    battingStats: { matches: 38, innings: 35, notOuts: 5, runs: 980, balls: 750, average: 32.66, strikeRate: 130.66, highestScore: '75', hundreds: 0, fifties: 4, ducks: 3, fours: 85, sixes: 22 },
    bowlingStats: { matches: 38, innings: 30, overs: 110, maidens: 2, runs: 750, wickets: 25, average: 30.00, economy: 6.81, strikeRate: 26.40, bestBowling: '3/30', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2005292374',
    name: 'Akhil Raju',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_FAST,
    matchesPlayed: 12,
    runsScored: 150,
    wicketsTaken: 5,
    average: 15.2,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Akhil+Raju&background=1e293b&color=fff',
    battingStats: { matches: 12, innings: 10, notOuts: 1, runs: 150, balls: 140, average: 16.66, strikeRate: 107.14, highestScore: '35', hundreds: 0, fifties: 0, ducks: 1, fours: 12, sixes: 2 },
    bowlingStats: { matches: 12, innings: 8, overs: 24, maidens: 0, runs: 180, wickets: 5, average: 36.00, economy: 7.50, strikeRate: 28.80, bestBowling: '2/22', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2480491766',
    name: 'Amal G Pillai',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM,
    matchesPlayed: 8,
    runsScored: 85,
    wicketsTaken: 2,
    average: 12.1,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Amal+G+Pillai&background=1e293b&color=fff',
    battingStats: { matches: 8, innings: 6, notOuts: 0, runs: 85, balls: 90, average: 14.16, strikeRate: 94.44, highestScore: '28', hundreds: 0, fifties: 0, ducks: 0, fours: 8, sixes: 1 },
    bowlingStats: { matches: 8, innings: 4, overs: 12, maidens: 0, runs: 95, wickets: 2, average: 47.50, economy: 7.91, strikeRate: 36.00, bestBowling: '1/15', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2273034187',
    name: 'Anas Ummer',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_SPIN,
    matchesPlayed: 22,
    runsScored: 450,
    wicketsTaken: 12,
    average: 24.5,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Anas+Ummer&background=1e293b&color=fff',
    battingStats: { matches: 22, innings: 20, notOuts: 3, runs: 450, balls: 380, average: 26.47, strikeRate: 118.42, highestScore: '55*', hundreds: 0, fifties: 1, ducks: 2, fours: 40, sixes: 8 },
    bowlingStats: { matches: 22, innings: 15, overs: 50, maidens: 1, runs: 320, wickets: 12, average: 26.66, economy: 6.40, strikeRate: 25.00, bestBowling: '3/28', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2338785203',
    name: 'Aneesh Ashokan',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_FAST,
    matchesPlayed: 15,
    runsScored: 210,
    wicketsTaken: 8,
    average: 18.2,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Aneesh+Ashokan&background=1e293b&color=fff',
    battingStats: { matches: 15, innings: 13, notOuts: 2, runs: 210, balls: 190, average: 19.09, strikeRate: 110.52, highestScore: '42', hundreds: 0, fifties: 0, ducks: 1, fours: 18, sixes: 4 },
    bowlingStats: { matches: 15, innings: 10, overs: 35, maidens: 0, runs: 240, wickets: 8, average: 30.00, economy: 6.85, strikeRate: 26.25, bestBowling: '2/18', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2536396514',
    name: 'Asif Habdulla',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.LEFT_HAND,
    bowlingStyle: BowlingStyle.LEFT_ARM_SPIN,
    matchesPlayed: 30,
    runsScored: 620,
    wicketsTaken: 18,
    average: 26.8,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Asif+Habdulla&background=1e293b&color=fff',
    battingStats: { matches: 30, innings: 28, notOuts: 4, runs: 620, balls: 500, average: 25.83, strikeRate: 124.00, highestScore: '68', hundreds: 0, fifties: 3, ducks: 2, fours: 55, sixes: 12 },
    bowlingStats: { matches: 30, innings: 25, overs: 90, maidens: 3, runs: 540, wickets: 18, average: 30.00, economy: 6.00, strikeRate: 30.00, bestBowling: '3/22', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2565227588',
    name: 'Bibin Punnurpilly',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM,
    matchesPlayed: 5,
    runsScored: 45,
    wicketsTaken: 1,
    average: 9.0,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Bibin+Punnurpilly&background=1e293b&color=fff',
    battingStats: { matches: 5, innings: 4, notOuts: 0, runs: 45, balls: 50, average: 11.25, strikeRate: 90.00, highestScore: '18', hundreds: 0, fifties: 0, ducks: 0, fours: 4, sixes: 0 },
    bowlingStats: { matches: 5, innings: 2, overs: 6, maidens: 0, runs: 40, wickets: 1, average: 40.00, economy: 6.66, strikeRate: 36.00, bestBowling: '1/18', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2591055542',
    name: 'Bibish Mohanan',
    role: PlayerRole.BOWLER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_FAST,
    matchesPlayed: 55,
    runsScored: 120,
    wicketsTaken: 89,
    average: 8.5,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Bibish+Mohanan&background=1e293b&color=fff',
    battingStats: { matches: 55, innings: 30, notOuts: 15, runs: 120, balls: 150, average: 8.00, strikeRate: 80.00, highestScore: '15*', hundreds: 0, fifties: 0, ducks: 5, fours: 8, sixes: 2 },
    bowlingStats: { matches: 55, innings: 54, overs: 210, maidens: 12, runs: 1250, wickets: 89, average: 14.04, economy: 5.95, strikeRate: 14.15, bestBowling: '5/22', fourWickets: 4, fiveWickets: 2 }
  },
  {
    id: '2539624680',
    name: 'Mohammad Salman',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_SPIN,
    matchesPlayed: 18,
    runsScored: 310,
    wicketsTaken: 6,
    average: 21.4,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Mohammad+Salman&background=1e293b&color=fff',
    battingStats: { matches: 18, innings: 16, notOuts: 2, runs: 310, balls: 280, average: 22.14, strikeRate: 110.71, highestScore: '48', hundreds: 0, fifties: 0, ducks: 1, fours: 25, sixes: 6 },
    bowlingStats: { matches: 18, innings: 8, overs: 24, maidens: 0, runs: 160, wickets: 6, average: 26.66, economy: 6.66, strikeRate: 24.00, bestBowling: '2/18', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2532063027',
    name: 'Mohammed Khalander',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM,
    matchesPlayed: 10,
    runsScored: 180,
    wicketsTaken: 4,
    average: 19.5,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Mohammed+Khalander&background=1e293b&color=fff',
    battingStats: { matches: 10, innings: 9, notOuts: 1, runs: 180, balls: 160, average: 22.50, strikeRate: 112.50, highestScore: '45', hundreds: 0, fifties: 0, ducks: 0, fours: 15, sixes: 3 },
    bowlingStats: { matches: 10, innings: 5, overs: 15, maidens: 0, runs: 110, wickets: 4, average: 27.50, economy: 7.33, strikeRate: 22.50, bestBowling: '2/20', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2259417273',
    name: 'Nastar Puthen Purayil',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_FAST,
    matchesPlayed: 25,
    runsScored: 410,
    wicketsTaken: 15,
    average: 22.1,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Nastar+Puthen+Purayil&background=1e293b&color=fff',
    battingStats: { matches: 25, innings: 22, notOuts: 3, runs: 410, balls: 350, average: 21.57, strikeRate: 117.14, highestScore: '58', hundreds: 0, fifties: 1, ducks: 2, fours: 35, sixes: 8 },
    bowlingStats: { matches: 25, innings: 18, overs: 60, maidens: 1, runs: 420, wickets: 15, average: 28.00, economy: 7.00, strikeRate: 24.00, bestBowling: '3/35', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2469993741',
    name: 'Prasanth Padmanabhan',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_SPIN,
    matchesPlayed: 40,
    runsScored: 890,
    wicketsTaken: 22,
    average: 31.2,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Prasanth+Padmanabhan&background=1e293b&color=fff',
    battingStats: { matches: 40, innings: 36, notOuts: 6, runs: 890, balls: 720, average: 29.66, strikeRate: 123.61, highestScore: '72*', hundreds: 0, fifties: 4, ducks: 1, fours: 80, sixes: 15 },
    bowlingStats: { matches: 40, innings: 25, overs: 90, maidens: 2, runs: 580, wickets: 22, average: 26.36, economy: 6.44, strikeRate: 24.54, bestBowling: '3/15', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2572967242',
    name: 'Qamruddin Ansari',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM,
    matchesPlayed: 14,
    runsScored: 195,
    wicketsTaken: 7,
    average: 16.8,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Qamruddin+Ansari&background=1e293b&color=fff',
    battingStats: { matches: 14, innings: 12, notOuts: 1, runs: 195, balls: 180, average: 17.72, strikeRate: 108.33, highestScore: '38', hundreds: 0, fifties: 0, ducks: 2, fours: 15, sixes: 3 },
    bowlingStats: { matches: 14, innings: 8, overs: 24, maidens: 0, runs: 180, wickets: 7, average: 25.71, economy: 7.50, strikeRate: 20.57, bestBowling: '2/25', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2468269531',
    name: 'Sebin Baby',
    role: PlayerRole.WICKET_KEEPER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.NONE,
    matchesPlayed: 65,
    runsScored: 1850,
    wicketsTaken: 0,
    average: 38.6,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Sebin+Baby&background=1e293b&color=fff',
    battingStats: { matches: 65, innings: 60, notOuts: 10, runs: 1850, balls: 1400, average: 37.00, strikeRate: 132.14, highestScore: '105*', hundreds: 2, fifties: 12, ducks: 3, fours: 180, sixes: 45 },
    bowlingStats: { matches: 65, innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestBowling: '-', fourWickets: 0, fiveWickets: 0 }
  },
  {
    id: '2487676161',
    name: 'Shymon Shihabudeen',
    role: PlayerRole.ALL_ROUNDER,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.RIGHT_ARM_FAST,
    matchesPlayed: 28,
    runsScored: 520,
    wicketsTaken: 19,
    average: 24.1,
    isAvailable: true,
    avatarUrl: 'https://ui-avatars.com/api/?name=Shymon+Shihabudeen&background=1e293b&color=fff',
    battingStats: { matches: 28, innings: 25, notOuts: 4, runs: 520, balls: 450, average: 24.76, strikeRate: 115.55, highestScore: '62', hundreds: 0, fifties: 2, ducks: 1, fours: 45, sixes: 10 },
    bowlingStats: { matches: 28, innings: 20, overs: 70, maidens: 2, runs: 450, wickets: 19, average: 23.68, economy: 6.42, strikeRate: 22.10, bestBowling: '3/25', fourWickets: 0, fiveWickets: 0 }
  }
];

const SEED_MATCHES: Match[] = [];

const SEED_OPPONENTS: OpponentTeam[] = [
  { 
    id: '1', 
    name: 'ATSS CC', 
    rank: 1, 
    strength: 'Unknown', 
    weakness: 'Unknown', 
    players: [],
    color: 'bg-blue-600' 
  },
  { 
    id: '2', 
    name: 'Battagram Shaheen', 
    rank: 2, 
    strength: 'Unknown', 
    weakness: 'Unknown', 
    players: [],
    color: 'bg-green-600' 
  },
  { 
    id: '3', 
    name: 'Jillah Stars', 
    rank: 3, 
    strength: 'Unknown', 
    weakness: 'Unknown', 
    players: [],
    color: 'bg-yellow-500' 
  },
  { 
    id: '4', 
    name: 'Royal CC', 
    rank: 4, 
    strength: 'Unknown', 
    weakness: 'Unknown', 
    players: [],
    color: 'bg-purple-600' 
  },
  { 
    id: '5', 
    name: 'Yaran CC', 
    rank: 5, 
    strength: 'Unknown', 
    weakness: 'Unknown', 
    players: [],
    color: 'bg-red-600' 
  },
];

const SEED_STRATEGIES: FieldingStrategy[] = [
  {
    id: '1',
    name: 'Powerplay (Aggressive)',
    batterHand: 'RHB',
    matchPhase: 'Powerplay',
    bowlerId: '3',
    batterId: '1',
    positions: [
       { playerId: '5', left: 48, top: 15 }, // WK
       { playerId: '3', left: 52, top: 65 }, // Bowler
    ]
  }
];

const SEED_TABLE: TournamentTableEntry[] = [];

export const getPlayers = (): Player[] => {
  const stored = localStorage.getItem(PLAYERS_KEY);
  if (!stored) {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(SEED_PLAYERS));
    return SEED_PLAYERS;
  }
  return JSON.parse(stored);
};

export const savePlayers = (players: Player[]) => {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
};

export const getMatches = (): Match[] => {
  const stored = localStorage.getItem(MATCHES_KEY);
  if (!stored) {
    localStorage.setItem(MATCHES_KEY, JSON.stringify(SEED_MATCHES));
    return SEED_MATCHES;
  }
  return JSON.parse(stored);
};

export const saveMatches = (matches: Match[]) => {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
};

export const getOpponents = (): OpponentTeam[] => {
  const stored = localStorage.getItem(OPPONENTS_KEY);
  if (!stored) {
    localStorage.setItem(OPPONENTS_KEY, JSON.stringify(SEED_OPPONENTS));
    return SEED_OPPONENTS;
  }
  return JSON.parse(stored);
};

export const saveOpponents = (teams: OpponentTeam[]) => {
  localStorage.setItem(OPPONENTS_KEY, JSON.stringify(teams));
};

export const getStrategies = (): FieldingStrategy[] => {
  const stored = localStorage.getItem(STRATEGIES_KEY);
  if (!stored) {
    localStorage.setItem(STRATEGIES_KEY, JSON.stringify(SEED_STRATEGIES));
    return SEED_STRATEGIES;
  }
  return JSON.parse(stored);
};

export const saveStrategies = (strategies: FieldingStrategy[]) => {
  localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
};

export const getTeamLogo = (): string => {
  // Return stored logo or empty string (which will trigger placeholder in UI)
  return localStorage.getItem(TEAM_LOGO_KEY) || '';
};

export const saveTeamLogo = (url: string) => {
  try {
    localStorage.setItem(TEAM_LOGO_KEY, url);
  } catch (error) {
    console.error("Failed to save logo to storage (likely too large):", error);
    alert("Logo file is too large to save permanently, but it will be used for this session.");
  }
};

export const getTournamentTable = (): TournamentTableEntry[] => {
  const stored = localStorage.getItem(TOURNAMENT_TABLE_KEY);
  return stored ? JSON.parse(stored) : SEED_TABLE;
};

export const saveTournamentTable = (table: TournamentTableEntry[]) => {
  localStorage.setItem(TOURNAMENT_TABLE_KEY, JSON.stringify(table));
};
