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
        const tempId = match.id || crypto.randomUUID();
        const localMatch = { ...match, id: tempId, status: match.status || 'upcoming' };
        
        // 1. Optimistically add to local state immediately
        set((state) => ({ matches: [...state.matches, localMatch as ScheduledMatch] }));
        
        try {
          // 2. Attempt to save to cloud
          const savedMatch = await api.addMatch(match);
          
          // 3. Update the local state with the confirmed server ID and data
          set((state) => ({
            matches: state.matches.map(m => m.id === tempId ? savedMatch : m)
          }));
          return savedMatch.id;
        } catch (e) {
          console.error("Cloud save failed, match remains in local storage:", e);
          // We keep the localMatch in the list so the user doesn't lose their work!
          return tempId;
        }
      },

      updateMatch: async (id, updates) => {
        // Optimistic update
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
          // We don't throw here to prevent UI crashes, the local state is already updated
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
          const rawDbMatches = (await api.getMatches()) || [];
          // Filter out Ghost/Dummy data from DB
          // Automatic cleanup filter for Ghost/Synthetic data from DB
          const dbMatches = rawDbMatches.filter(m => 
            !m.is_test && 
            m.id !== '00000000-0000-0000-0000-000000000001'
          );

          const dbIds = new Set(dbMatches.map(m => m.id));
          const unsynced = get().matches.filter(m => !dbIds.has(m.id));
          
          if (unsynced.length > 0) {
            console.log(`[Sync] Found ${unsynced.length} local-only matches. Preserving them during sync.`);
          }
          
          console.log("[Sync] Pulling latest from cloud and merging...");
          
          // CRITICAL: Merge DB matches with local-only matches to prevent data loss!
          // Filtered list should include ALL cloud matches and ONLY local matches that haven't hit DB yet
          const mergedMatches = [...dbMatches, ...unsynced];
          
          set({ matches: mergedMatches });
        } catch (e) {
          console.error("Cloud sync failed:", e);
          throw e;
        }
      },

      getSortedMatches: () => {
        const { matches } = get();
        // Automatic cleanup filter for Ghost/Dummy entries
        // Automatic cleanup filter for Ghost/Synthetic entries
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
            return timeA - timeB; // Earliest first
          } else {
            return timeB - timeA; // Most recent first
          }
        });
      },

      purgeTestData: async () => {
        try {
          // Include matches marked is_test OR matches with Sandbox XI as opponent
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
            // Delete stats first (ledger entries)
            await api.deleteMatchStats(m.id);
            
            // Delete match
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

/**
 * Standalone helper to bridge ScorerDashboard and MatchCenterStore.
 * Returns the underlying fetch promise so callers can await a confirmed 200 OK.
 */
export const updateMatchInStore = async (id: string, updates: Partial<ScheduledMatch>): Promise<any> => {
  const store = useMatchCenter.getState();
  try {
    const response = await store.updateMatch(id, updates);
    return response;
  } catch (error) {
    throw error; // Propagate to UI for error handling
  }
};
