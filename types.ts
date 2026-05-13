
export type UserRole = 'admin' | 'member' | 'guest';

export enum PlayerRole {
  BATSMAN = 'Batsman',
  BOWLER = 'Bowler',
  ALL_ROUNDER = 'All-Rounder',
  WICKET_KEEPER = 'Wicket Keeper'
}

export enum BattingStyle {
  RIGHT_HAND = 'Right Handed',
  LEFT_HAND = 'Left Handed'
}

export enum BowlingStyle {
  RIGHT_ARM_FAST = 'Right-Arm Fast',
  RIGHT_ARM_MEDIUM = 'Right-Arm Medium',
  RIGHT_ARM_SPIN = 'Right-Arm Spin',
  LEFT_ARM_FAST = 'Left-Arm Fast',
  LEFT_ARM_SPIN = 'Left-Arm Spin',
  NONE = 'None'
}

export interface AppUser {
  id: string;
  name: string;
  username: string; // The User ID used for login
  email?: string;
  contactNumber?: string;
  password?: string;
  role: UserRole;
  avatarUrl?: string;
  playerId?: string;
  canScore?: boolean;
  isFirstLogin?: boolean;
}

export type CommentaryEventType = 'FOUR' | 'SIX' | 'WICKET' | 'DOT' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'MILESTONE';

export interface CommentaryTemplate {
  id: string;
  eventType: CommentaryEventType;
  text: string;
  wagonWheelZone?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface SystemCommentary {
  id: string;
  timestamp: string;
  text: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed';
export type MatchStage = 'League' | 'Quarter-Final' | 'Semi-Final' | 'Final';

export interface Performer {
  playerId: string;
  playerName?: string; // Cache the name for scorecard display
  runs: number;
  balls: number;
  wickets: number;
  bowlingRuns: number;
  bowlingOvers: number;
  isNotOut: boolean;
  fours?: number;
  sixes?: number;
  maidens?: number;
  wides?: number;
  noBalls?: number;
  outHow?: string;
  isHero?: boolean;
}



export interface InningsBattingEntry {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outHow: string;
  bowlerId?: string;
  fielderId?: string;
  isHero?: boolean;
  index?: number;
}

export interface InningsBowlingEntry {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides?: number;
  noBalls?: number;
  isHero?: boolean;
  index?: number;
}

export interface BallRecord {
  runs: number;
  extraRuns: number;
  type: 'legal' | 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'penalty';
  isWicket: boolean;
  wicketType?: string;
  bowlerId?: string;
  strikerId?: string;
  nonStrikerId?: string;
  outPlayerId?: string;
  batterName?: string;
  bowlerName?: string;
  overNumber: number;
  ballNumber: number; // 1-6 for the over display
  ballIndex: number;  // 1-indexed cumulative balls in innings
  isLegal: boolean;
  timestamp: string;
  wagonWheelZone?: string;
  commentary?: string;
}

export type Ball = BallRecord;

export interface InningsExtras {
  wides: number;
  noBalls: number;
  legByes: number;
  byes: number;
}

export interface InningsData {
  batting: InningsBattingEntry[];
  bowling: InningsBowlingEntry[];
  extras: InningsExtras;
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  fallOfWickets?: string;
  history: BallRecord[];
}

export interface FullScorecardData {
  innings1: InningsData;
  innings2: InningsData;
}

export interface BattingStats {
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  average: number;
  strikeRate: number;
  highestScore: string;
  hundreds: number;
  fifties: number;
  ducks: number;
  fours: number;
  sixes: number;
}

export interface BowlingStats {
  matches: number;
  innings: number;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  average: number;
  economy: number;
  strikeRate: number;
  bestBowling: string;
  fourWickets: number;
  fiveWickets: number;
  wides: number;
  noBalls: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  teamId: string; // Mandatory: 'IND_STRIKERS' for our squad
  matchesPlayed: number;
  runsScored: number;
  wicketsTaken: number;
  average: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isAvailable?: boolean;
  isActive?: boolean;
  avatarUrl?: string;
  dob?: string;
  externalId?: string;
  jerseyNumber?: number;
  status?: string;
  battingStats?: BattingStats;
  bowlingStats?: BowlingStats;
  linkedUserId?: string;
  isClubPlayer?: boolean; // Default true for Indian Strikers members
  primaryTeamId?: string; // Link to the opponent team if isClubPlayer is false
  avatarHistory?: string[];
  wides?: number;
  noBalls?: number;
}

export interface OpponentPlayer {
  id: string;
  name: string;
  role?: string;
}

export interface OpponentTeam {
  id: string;
  name: string;
  logoUrl?: string;
  rank?: number;
  strength?: string;
  weakness?: string;
  players: OpponentPlayer[];
  color?: string;
}

export interface ScheduledMatch {
  id: string;
  isNeutral?: boolean;
  team1Id?: string | null;    // formerly homeTeamId
  team2Id: string | null;     // formerly opponentId
  date: string;
  groundId: string | null;
  tournament: string;
  tournamentId?: string | null;
  stage: MatchStage;
  status: MatchStatus;
  team1XI: string[];           // formerly homeTeamXI
  team2XI: string[];           // formerly opponentTeamXI
  toss?: {
    winner: string;
    choice: 'Bat' | 'Field';
  };
  tossWinnerId?: string | null;
  tossChoice?: 'Bat' | 'Bowl' | null;
  tossDetails?: string;
  maxOvers?: number;
  resultSummary?: string;
  team1Score?: { runs: number; wickets: number; overs: number }; // formerly finalScoreHome
  team2Score?: { runs: number; wickets: number; overs: number }; // formerly finalScoreAway
  resultNote?: string;
  resultType?: string;
  scorecard?: FullScorecardData;
  isLiveScored?: boolean;
  isLocked?: boolean;
  isTeam1BattingFirst?: boolean; // formerly isHomeBattingFirst
  isCareerSynced?: boolean;
  isTest?: boolean;
  matchFormat?: 'T20' | 'One Day';
  team2Name?: string;            // formerly opponentName
  team1Name?: string;            // formerly homeTeamName
  team1Logo?: string;            // formerly homeLogo
  team2Logo?: string;            // formerly opponentLogo
  performers?: Performer[];
  title?: string;
  time?: string;
  venue?: string;
  lastUpdated?: string;
  liveData?: any;
  liveState?: any;
  matchResult?: string | null;
  forceUpsert?: boolean;
  systemCommentary?: SystemCommentary[];
  targetScore?: number;
  // Innings extras (read from flat DB columns)
  innings1Extras?: { wides: number; noBalls: number; byes: number; legByes: number };
  innings2Extras?: { wides: number; noBalls: number; byes: number; legByes: number };

  // Legacy Properties (Deprecated)
  homeTeamId?: string | null;
  opponentId?: string | null;
  homeTeamXI?: string[];
  opponentTeamXI?: string[];
  finalScoreHome?: { runs: number; wickets: number; overs: number };
  finalScoreAway?: { runs: number; wickets: number; overs: number };
  opponentName?: string;
  homeTeamName?: string;
  homeLogo?: string;
  opponentLogo?: string;
  isHomeBattingFirst?: boolean;
}

export interface FieldPosition {
  playerId: string;
  left: number; // Percentage 0-100
  top: number; // Percentage 0-100
}

export interface FieldingStrategy {
  id: string;
  name: string;
  batterHand: 'RHB' | 'LHB';
  matchPhase?: 'Powerplay' | 'Middle' | 'Death';
  bowlerId?: string;
  batterId?: string;
  positions: FieldPosition[];
}



export interface MembershipRequest {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  associatedBefore: 'Yes' | 'No';
  associationYear?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
}

export interface Ground {
  id: string;
  name: string;
  location: string;
  capacity?: number;
  coordinates?: { lat: number; lng: number };
}

export interface Tournament {
  id: string;
  name: string;
  year: number;
  status: 'active' | 'completed' | 'upcoming';
  logoUrl?: string;
  logo_url?: string;
}

export interface PlayerLegacyStats {
  player_id: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  hundreds: number;
  fifties: number;
  ducks: number;
  matches: number;
  innings: number;
  not_outs: number;
  highest_score: number;
  overs_bowled: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  bowling_innings?: number;
  four_wickets: number;
  five_wickets: number;
  best_bowling: string;
  wides?: number;
  noBalls?: number;
}

export interface TMTournament {
  id: string;
  name: string;
  format: string; // T20, One Day, etc.
  type: 'League' | 'Groups';
  is_home_away: boolean;
  status: 'upcoming' | 'active' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface TMGroup {
  id: string;
  tournament_id: string;
  name: string;
  top_q_count?: number; // Configurable qualification count for this group
  created_at?: string;
}


export interface TMTeam {
  id: string;
  tournament_id: string;
  group_id?: string;
  name: string;
  logo_url?: string;
}

export interface TMFixture {
  id: string;
  tournament_id: string;
  group_id?: string;
  team1_id: string;
  team2_id: string;
  date: string;
  venue: string;
  status: 'upcoming' | 'live' | 'completed';
  result?: any;
  team1_name?: string;
  team1_logo?: string;
  team2_name?: string;
  team2_logo?: string;
  group_name?: string;
}

export interface TMStanding {
  team_id: string;
  team_name: string;
  logo_url?: string;
  p: number;
  w: number;
  l: number;
  nr: number;
  pts: number;
  nrr: number;
  tournament_id: string;
  group_id?: string;
}

// standalone League Center types
export interface LeagueTournament {
  id: string;
  name: string;
  year: number;
  format: 'T20' | 'One Day' | 'T10';
  type: 'League' | 'Groups';
  is_home_away: boolean;
  status: 'upcoming' | 'ongoing' | 'completed';
  logo_url?: string;
  created_at?: string;
}

export interface LeagueGroup {
  id: string;
  tournament_id: string;
  name: string;
  top_q_count?: number;
  created_at?: string;
}

export interface LeagueTeam {
  id: string;
  tournament_id: string;
  group_id?: string;
  team_name: string;
  logo_url?: string;
  created_at?: string;
}

export interface LeagueFixture {
  id: string;
  tournament_id: string;
  group_id?: string;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  team1_logo?: string;
  team2_logo?: string;
  date: string;
  venue: string;
  status: 'scheduled' | 'live' | 'completed' | 'abandoned';
  group_name?: string;
  created_at?: string;
}

export interface LeagueStanding {
  team_id: string;
  team_name: string;
  logo_url?: string;
  p: number;
  w: number;
  l: number;
  nr: number;
  pts: number;
  nrr: number;
  tournament_id: string;
  group_id?: string;
}