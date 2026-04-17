import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScheduledMatch, Performer, MatchStatus, MatchStage, FullScorecardData } from '../types';
import * as api from '../services/storageService';

export type { Performer, MatchStatus, MatchStage, FullScorecardData };

interface MatchStore {
  matches: ScheduledMatch[];
  setMatches: (matches: ScheduledMatch[]) => void;
  addMatch: (match: Omit<ScheduledMatch, 'id'>) => Promise<string>;
  updateMatch: (id: string, updates: Partial<ScheduledMatch>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  setPlayingXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => Promise<void>;
  updateMatchXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => Promise<void>;
  updateMatchStatus: (id: string, status: MatchStatus) => Promise<void>;
  finalizeMatch: (id: string, matchData: any, updatedPlayers: any[]) => Promise<void>;
  syncWithCloud: () => Promise<void>;
  getSortedMatches: () => ScheduledMatch[];
  resetZombieMatches: () => void;
  purgeTestData: () => Promise<void>;
  wipeLocalMatches: () => void;
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
          if (match.status === 'live' && matchDate < today) {
            return { ...match, status: 'upcoming' as MatchStatus };
          }
          return match;
        });
        return { matches: updatedMatches };
      }),
      
      addMatch: async (match) => {
        const tempId = match.id || crypto.randomUUID();
        const localMatch = { ...match, id: tempId, status: match.status || 'upcoming' };
        set((state) => ({ matches: [...state.matches, localMatch as ScheduledMatch] }));
        try {
          const savedMatch = await api.addMatch(match);
          set((state) => ({
            matches: state.matches.map(m => m.id === tempId ? savedMatch : m)
          }));
          return savedMatch.id;
        } catch (e) {
          console.error("Cloud save failed, match remains in local storage:", e);
          return tempId;
        }
      },

      updateMatch: async (id, updates) => {
        set((state) => ({
          matches: state.matches.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
        try {
          const currentMatch = get().matches.find(m => m.id === id);
          if (!currentMatch) return;
          const response = await api.updateMatch(id, { ...currentMatch, ...updates });
          return response;
        } catch (e) {
          console.error("Failed to sync update to cloud, kept local version:", e);
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
        } catch (e: any) {
          console.error("Failed to finalize match on cloud, but preserved locally:", e);
          set((state) => ({
            matches: state.matches.map(m => m.id === id ? { 
              ...m, 
              ...matchData, 
              status: 'completed' as MatchStatus,
              is_local_only_override: true 
            } : m)
          }));
          throw new Error(`Sync Failed: Your data is saved LOCALLY but couldn't reach the server. (Error: ${e.message})`);
        }
      },

      syncWithCloud: async () => {
        try {
          console.log("[Sync] Starting Cloud Check...");
          const rawDbMatches = (await api.getMatches()) || [];
          const dbMatches = rawDbMatches.filter(m => 
            !m.is_test && 
            m.id !== '00000000-0000-0000-0000-000000000001'
          );

          const localMatches = get().matches;
          const merged = [...localMatches];

          dbMatches.forEach(dbMatch => {
            const existingIdx = merged.findIndex(m => m.id === dbMatch.id);
            if (existingIdx !== -1) {
              const local = merged[existingIdx];
              if (local.status === 'completed' && dbMatch.status !== 'completed') {
                console.warn(`[Sync] Conflict detected for ${dbMatch.id}. Prioritizing local COMPLETED state.`);
              } else {
                merged[existingIdx] = { ...dbMatch, ...local, status: dbMatch.status }; 
                if (dbMatch.status === 'completed') {
                   merged[existingIdx] = dbMatch;
                }
              }
            } else {
              merged.push(dbMatch);
            }
          });

          set({ matches: merged, _hasHydrated: true });
        } catch (e: any) {
          console.error("Cloud sync failed:", e);
        }
      },

      getSortedMatches: () => {
        const { matches } = get();
        const cleanMatches = matches.filter(m => 
          !m.is_test && 
          m.id !== '00000000-0000-0000-0000-000000000001'
        );

        return [...cleanMatches].sort((a, b) => {
          const statusOrder = { 'live': 0, 'upcoming': 1, 'completed': 2 };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }

          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();

          if (a.status === 'upcoming') {
            return timeA - timeB; 
          } else {
            return timeB - timeA; 
          }
        });
      },

      purgeTestData: async () => {
        try {
          const testMatches = get().matches.filter(m => 
            m.is_test || 
            m.opponentName === 'Sandbox XI' || 
            (m.opponentId && String(m.opponentId).includes('sandbox'))
          );
          if (testMatches.length === 0) {
            console.log("[Admin] No test/sandbox data found to purge.");
            return;
          }

          console.log(`[Admin] Purging ${testMatches.length} test/sandbox matches...`);
          for (const m of testMatches) {
            await api.deleteMatchStats(m.id);
            await api.deleteMatch(m.id);
          }

          set((state) => ({
            matches: state.matches.filter(m => !testMatches.some(tm => tm.id === m.id))
          }));
        } catch (e) {
          console.error("Purge failed:", e);
          throw e;
        }
      },
      
      wipeLocalMatches: () => {
        set({ matches: [] });
        console.log("[Admin] Local match cache wiped.");
      }
    }),
    {
      name: 'ins-match-center-storage',
    }
  )
);
