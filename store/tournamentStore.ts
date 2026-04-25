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
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s patience per attempt

            try {
                console.log(`[tournamentStore] Syncing master data (attempt ${attempt}/${maxAttempts})...`);

                const [grounds, tournaments] = await Promise.all([
                    api.getGrounds(),
                    api.getTournaments()
                ]);

                clearTimeout(timeoutId);

                set({
                    grounds: grounds || [],
                    tournaments: tournaments || [],
                    isOffline: false
                });

                if (Array.isArray(grounds)) {
                    localStorage.removeItem('ins_offline_players');
                    console.log(`[tournamentStore] Master data sync successful. Found ${grounds.length} grounds.`);
                }
                return; // Success, exit function
            } catch (e: any) {
                clearTimeout(timeoutId);
                const isTimeout = e.name === 'AbortError';
                console.warn(`[tournamentStore] Master sync attempt ${attempt} failed (${isTimeout ? 'Timeout' : e.message})`);
                
                if (attempt === maxAttempts) {
                    set({ isOffline: true });
                } else {
                    const delay = attempt * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }
}));

// Alias for backward compatibility during migration
export const useMasterData = useTournamentStore;
