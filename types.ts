
export type UserRole = 'admin' | 'member' | 'scorer' | 'guest';

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
  password: string;
  role: UserRole;
  avatarUrl?: string;
  playerId?: string;
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
  outHow?: string;
}

export interface InningsBattingEntry {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outHow: string;
}

export interface InningsBowlingEntry {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
}

export interface InningsExtras {
  wide: number;
  noBall: number;
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
  avatarUrl?: string;
  dob?: string;
  externalId?: string;
  jerseyNumber?: number;
  battingStats?: BattingStats;
  bowlingStats?: BowlingStats;
  linkedUserId?: string;
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
  city: string;
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