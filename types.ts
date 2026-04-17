
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

export type CommentaryEventType = 'FOUR' | 'SIX' | 'WICKET' | 'DOT' | 'MILESTONE';

export interface CommentaryTemplate {
  id: string;
  event_type: CommentaryEventType;
  text: string;
  is_active: boolean;
  created_at?: string;
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
  no_balls?: number;
  outHow?: string;
  is_hero?: boolean;
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
  is_hero?: boolean;
  index?: number;
}

export interface InningsBowlingEntry {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides?: number;
  no_balls?: number;
  is_hero?: boolean;
  index?: number;
}

export interface BallRecord {
  runs: number;
  type: 'legal' | 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'penalty';
  isWicket: boolean;
  wicketType?: string;
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  overNumber: number;
  ballNumber: number; // 1-6 for legal balls
  isLegal: boolean;
  timestamp: string;
  wagon_wheel_zone?: string;
  commentary?: string;
}

export interface InningsExtras {
  wide: number;
  no_ball: number;
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
  no_balls: number;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
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
  wides?: number;
  no_balls?: number;
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
  opponentId: string; // References the ID in OpponentTeam
  date: string;
  groundId: string;
  tournament: string;
  tournamentId?: string;
  stage: MatchStage;
  status: MatchStatus;
  homeTeamXI: string[]; // Array of Player IDs from Squad Roster
  opponentTeamXI: string[]; // Array of Names/IDs from OpponentTeam players
  toss?: {
    winner: string;
    choice: 'Bat' | 'Field';
  };
  tossDetails?: string;
  maxOvers?: number;
  resultSummary?: string; 
  finalScoreHome?: { runs: number; wickets: number; overs: number };
  finalScoreAway?: { runs: number; wickets: number; overs: number };
  resultNote?: string; 
  resultType?: string; 
  scorecard?: FullScorecardData;
  isLiveScored?: boolean;
  isLocked?: boolean;
  isHomeBattingFirst?: boolean;
  matchFormat?: 'T20' | 'One Day';
  opponentName?: string;
  homeLogo?: string;
  opponentLogo?: string;
  performers?: Performer[];
  toss_winner_id?: string;
  toss_choice?: 'Bat' | 'Field';
  is_test?: boolean;
  title?: string;
  time?: string;
  venue?: string;
  isCareerSynced?: boolean;
  live_data?: any;
  live_state?: any;
  last_updated?: string;
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

export interface TournamentTableEntry {
  id: string;
  teamId: string;
  teamName: string;
  tournamentName?: string;
  matches: number;
  won: number;
  lost: number;
  nr: number;
  points: number;
  nrr: string;
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
  no_balls?: number;
}