
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
  battingStats?: BattingStats;
  bowlingStats?: BowlingStats;
}

export interface Match {
  id: string;
  opponent: string;
  date: string;
  venue: string; // Ground
  result?: 'Won' | 'Lost' | 'Draw' | 'Pending';
  scoreFor?: string;
  scoreAgainst?: string;
  isUpcoming: boolean;
  tournament?: string;
  tossTime?: string;
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
