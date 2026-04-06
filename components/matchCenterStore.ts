import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Performer, MatchStatus, MatchStage, FullScorecardData } from '../types';
export type { Performer, MatchStatus, MatchStage, FullScorecardData };

export const isPastMatch = (matchDateStr: string): boolean => {
  const now = new Date();
  const matchDate = new Date(matchDateStr);
  
  // Set match day to midnight for accurate day comparison
  const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return matchDay.getTime() < today.getTime();
};


export interface ScheduledMatch {
  id: string;
  opponentId: string; // References the ID in OpponentTeam
  date: string;
  ground: string;
  tournament: string;
  stage: MatchStage;
  status: MatchStatus;
  homeTeamXI: string[]; // Array of Player IDs from Squad Roster
  opponentTeamXI: string[]; // Array of Names/IDs from OpponentTeam players
  toss?: {
    winner: string;
    choice: 'Bat' | 'Field';
  };
  maxOvers?: number;
  resultSummary?: string; // e.g., "Indian Strikers won by 4 wickets"
  finalScoreHome?: { runs: number; wickets: number; overs: number };
  finalScoreAway?: { runs: number; wickets: number; overs: number };
  resultNote?: string; 
  resultType?: string; // e.g., "Normal Result", "Abandoned"
  scorecard?: FullScorecardData;
  isLiveScored?: boolean;
  isLocked?: boolean;
  isHomeBattingFirst?: boolean;
  matchFormat?: 'T20' | 'One Day';
  opponentName?: string;
  homeLogo?: string;
  opponentLogo?: string;
  performers?: Performer[];
}

interface MatchStore {
  matches: ScheduledMatch[];
  addMatch: (match: Omit<ScheduledMatch, 'id'>) => void;
  updateMatch: (id: string, updates: Partial<ScheduledMatch>) => void;
  deleteMatch: (id: string) => void;
  setPlayingXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => void;
  updateMatchXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => void;
  updateMatchStatus: (id: string, status: MatchStatus) => void;
  getSortedMatches: () => ScheduledMatch[];
  resetZombieMatches: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useMatchCenter = create<MatchStore>()(
  persist(
    (set, get) => ({
      matches: [], // Initially empty, will load from storage via persist
      
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      resetZombieMatches: () => set((state: MatchStore) => {
        const today = new Date().setHours(0,0,0,0);
        const updatedMatches: ScheduledMatch[] = state.matches.map(match => {
          const matchDate = new Date(match.date).setHours(0,0,0,0);
          // If it's still marked 'Live' but the day has passed, 
          // change it back to 'upcoming' so we can see the "Add Summary" buttons
          if (match.status === 'live' && matchDate < today) {
            return { ...match, status: 'upcoming' as MatchStatus };
          }
          return match;
        });
        return { matches: updatedMatches };
      }),
      
      addMatch: (match) => set((state) => ({
        matches: [...state.matches, { ...match, id: crypto.randomUUID() }]
      })),

      updateMatch: (id, updates) => set((state) => ({
        matches: state.matches.map(m => m.id === id ? { ...m, ...updates } : m)
      })),

      deleteMatch: (id) => set((state) => ({
        matches: state.matches.filter(m => m.id !== id)
      })),

      setPlayingXI: (id, teamType, playerIds) => set((state) => ({
        matches: state.matches.map(m => m.id === id ? { 
          ...m, 
          [teamType === 'home' ? 'homeTeamXI' : 'opponentTeamXI']: playerIds 
        } : m)
      })),

      updateMatchXI: (id, teamType, playerIds) => set((state) => ({
        matches: state.matches.map(m => m.id === id ? { 
          ...m, 
          [teamType === 'home' ? 'homeTeamXI' : 'opponentTeamXI']: playerIds 
        } : m)
      })),


      updateMatchStatus: (id, status) => set((state) => ({
        matches: state.matches.map(m => m.id === id ? { ...m, status } : m)
      })),

      getSortedMatches: () => {
        const { matches } = get();
        return [...matches].sort((a, b) => {
          const statusOrder = { 'live': 0, 'upcoming': 1, 'completed': 2 };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }

          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();

          if (a.status === 'upcoming') {
            return timeA - timeB; // Earliest first
          } else {
            return timeB - timeA; // Most recent first
          }
        });
      },
    }),
    {
      name: 'ins-match-center-storage', // Key for localStorage
    }
  )
);
