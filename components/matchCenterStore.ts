import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScheduledMatch, Performer, MatchStatus, MatchStage, FullScorecardData } from '../types';
import * as api from '../services/storageService';

export type { Performer, MatchStatus, MatchStage, FullScorecardData };

interface MatchStore {
  matches: ScheduledMatch[];
  setMatches: (matches: ScheduledMatch[]) => void;
  addMatch: (match: Omit<ScheduledMatch, 'id'>) => Promise<void>;
  updateMatch: (id: string, updates: Partial<ScheduledMatch>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  setPlayingXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => Promise<void>;
  updateMatchXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => Promise<void>;
  updateMatchStatus: (id: string, status: MatchStatus) => Promise<void>;
  finalizeMatch: (id: string, matchData: any, updatedPlayers: any[]) => Promise<void>;
  syncWithCloud: () => Promise<void>;
  getSortedMatches: () => ScheduledMatch[];
  resetZombieMatches: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useMatchCenter = create<MatchStore>()(
  persist(
    (set, get) => ({
      matches: [], 
      setMatches: (matches) => set({ matches }),
      
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
      
      addMatch: async (match) => {
        try {
          const savedMatch = await api.addMatch(match);
          set((state) => ({ matches: [...state.matches, savedMatch] }));
        } catch (e) {
          console.error("Failed to add match:", e);
          throw e;
        }
      },

      updateMatch: async (id, updates) => {
        try {
          const currentMatch = get().matches.find(m => m.id === id);
          if (!currentMatch) return;
          const merged = { ...currentMatch, ...updates };
          await api.updateMatch(id, merged);
          set((state) => ({
            matches: state.matches.map(m => m.id === id ? merged : m)
          }));
        } catch (e) {
          console.error("Failed to update match:", e);
          throw e;
        }
      },

      deleteMatch: async (id) => {
        try {
          await api.deleteMatch(id);
          set((state) => ({
            matches: state.matches.filter(m => m.id !== id)
          }));
        } catch (e) {
          console.error("Failed to delete match:", e);
          throw e;
        }
      },

      setPlayingXI: async (id, teamType, playerIds) => {
        const updates = { [teamType === 'home' ? 'homeTeamXI' : 'opponentTeamXI']: playerIds };
        await get().updateMatch(id, updates);
      },

      updateMatchXI: async (id, teamType, playerIds) => {
        const updates = { [teamType === 'home' ? 'homeTeamXI' : 'opponentTeamXI']: playerIds };
        await get().updateMatch(id, updates);
      },

      updateMatchStatus: async (id, status) => {
        await get().updateMatch(id, { status });
      },

      finalizeMatch: async (id, matchData, updatedPlayers) => {
        try {
          await api.finalizeMatch(id, matchData, updatedPlayers);
          set((state) => ({
            matches: state.matches.map(m => m.id === id ? { 
              ...m, 
              ...matchData, 
              status: 'completed' as MatchStatus,
              isCareerSynced: matchData.isCareerSynced ?? m.isCareerSynced
            } : m)
          }));
        } catch (e) {
          console.error("Failed to finalize match:", e);
          throw e;
        }
      },

      syncWithCloud: async () => {
        try {
          console.log("[Sync] Starting Cloud Check...");
          const rawDbMatches = await api.getMatches();
          // Filter out Ghost/Dummy data from DB
          const dbMatches = rawDbMatches.filter(m => 
            m.tournament !== "Dummy Tournament" && 
            m.opponentName !== "Unknown" &&
            !String(m.id).toLowerCase().includes("dummy")
          );

          const dbIds = new Set(dbMatches.map(m => m.id));
          const unsynced = get().matches.filter(m => !dbIds.has(m.id));
          
          if (unsynced.length > 0) {
            console.log(`[Sync] Pushing ${unsynced.length} unsynced matches...`);
            for (const m of unsynced) {
               await api.addMatch(m);
            }
            // Refresh after push
            const fresh = await api.getMatches();
            set({ matches: fresh });
          } else {
            console.log("[Sync] Pulling latest from cloud...");
            set({ matches: dbMatches });
          }
        } catch (e) {
          console.error("Cloud sync failed:", e);
          throw e;
        }
      },

      getSortedMatches: () => {
        const { matches } = get();
        // Automatic cleanup filter for Ghost/Dummy entries
        const cleanMatches = matches.filter(m => 
          m.tournament !== "Dummy Tournament" && 
          m.opponentName !== "Unknown" &&
          !String(m.id).toLowerCase().includes("dummy")
        );

        return [...cleanMatches].sort((a, b) => {
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
