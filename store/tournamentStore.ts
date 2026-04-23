import { create } from 'zustand';
import { Ground, Tournament } from '../types';
import * as api from '../services/storageService';

interface ClubLegacy {
    winnersTrophies: number;
    runnersUp: number;
    matchesPlayed: number;
    totalRuns: number;
}

export interface TournamentStore {
    grounds: Ground[];
    tournaments: Tournament[];
    legacy: ClubLegacy;

    // Actions
    addGround: (ground: Omit<Ground, 'id'>) => Promise<void>;
    updateGround: (ground: Ground) => Promise<void>;
    removeGround: (id: string) => Promise<void>;

    addTournament: (tournament: Omit<Tournament, 'id'>) => Promise<void>;
    updateTournament: (tournament: Tournament) => Promise<void>;
    removeTournament: (id: string) => Promise<void>;

    updateLegacy: (legacy: Partial<ClubLegacy>) => void;

    isOffline: boolean;
    setOffline: (status: boolean) => void;

    syncMasterData: () => Promise<void>;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
    // Initialize with empty arrays to prevent .map() crashes
    grounds: [],
    tournaments: [],
    legacy: {
        winnersTrophies: 7,
        runnersUp: 5,
        matchesPlayed: 142,
        totalRuns: 24500
    },
    isOffline: false,
    setOffline: (status) => set({ isOffline: status }),

    addGround: async (g) => {
        const saved = await api.addGround(g);
        set((s) => ({ grounds: [...(s.grounds || []), saved] }));
    },
    updateGround: async (updated) => {
        const saved = await api.updateGround(updated.id, updated);
        set((s) => ({
            grounds: (s.grounds || []).map(g => g.id === updated.id ? saved : g)
        }));
    },
    removeGround: async (id) => {
        await api.deleteGround(id);
        set((s) => ({ grounds: (s.grounds || []).filter(g => g.id !== id) }));
    },

    addTournament: async (t) => {
        const saved = await api.addTournament(t);
        set((s) => ({ tournaments: [...(s.tournaments || []), saved] }));
    },
    updateTournament: async (updated) => {
        const saved = await api.updateTournament(updated.id, updated);
        set((s) => ({
            tournaments: (s.tournaments || []).map(t => t.id === updated.id ? saved : t)
        }));
    },
    removeTournament: async (id) => {
        await api.deleteTournament(id);
        set((s) => ({ tournaments: (s.tournaments || []).filter(t => t.id !== id) }));
    },

    updateLegacy: (updates) => set((s) => ({
        legacy: { ...s.legacy, ...updates }
    })),

    syncMasterData: async () => {
        const controller = new AbortController();
        // Increased patience for Cloud SQL Auth Proxy latency
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            console.log("[tournamentStore] Syncing grounds and tournaments (15s patience)...");

            const [grounds, tournaments] = await Promise.all([
                api.getGrounds(),
                api.getTournaments()
            ]);

            clearTimeout(timeoutId);

            // Critical Fix: Ensure we never set state to null
            set({
                grounds: grounds || [],
                tournaments: tournaments || [],
                isOffline: false
            });

            // Clear the offline player cache only if we have a successful connection
            if (Array.isArray(grounds)) {
                localStorage.removeItem('ins_offline_players');
                console.log(`[tournamentStore] Sync successful. Found ${grounds.length} grounds.`);
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                console.warn("[tournamentStore] Sync timed out. Keeping current state.");
            } else {
                console.error("[tournamentStore] Sync error:", e);
            }

            // Enter offline mode but keep existing data to avoid crashing the UI
            set({ isOffline: true });
        }
    }
}));

// Alias for backward compatibility during migration
export const useMasterData = useTournamentStore;
