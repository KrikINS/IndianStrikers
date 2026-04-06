import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ground, Tournament } from '../types';
import * as api from '../services/storageService';

interface ClubLegacy {
    winnersTrophies: number;
    runnersUp: number;
    matchesPlayed: number;
    totalRuns: number;
}

interface MasterDataState {
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

    syncMasterData: () => Promise<void>;
}

export const useMasterData = create<MasterDataState>()(
    persist(
        (set, get) => ({
            grounds: [],
            tournaments: [],
            legacy: {
                winnersTrophies: 7,
                runnersUp: 5,
                matchesPlayed: 142,
                totalRuns: 24500
            },

            addGround: async (g) => {
                const saved = await api.addGround(g);
                set((s) => ({ grounds: [...s.grounds, saved] }));
            },
            updateGround: async (updated) => {
                const saved = await api.updateGround(updated.id, updated);
                set((s) => ({
                    grounds: s.grounds.map(g => g.id === updated.id ? saved : g)
                }));
            },
            removeGround: async (id) => {
                await api.deleteGround(id);
                set((s) => ({ grounds: s.grounds.filter(g => g.id !== id) }));
            },

            addTournament: async (t) => {
                const saved = await api.addTournament(t);
                set((s) => ({ tournaments: [...s.tournaments, saved] }));
            },
            updateTournament: async (updated) => {
                const saved = await api.updateTournament(updated.id, updated);
                set((s) => ({
                    tournaments: s.tournaments.map(t => t.id === updated.id ? saved : t)
                }));
            },
            removeTournament: async (id) => {
                await api.deleteTournament(id);
                set((s) => ({ tournaments: s.tournaments.filter(t => t.id !== id) }));
            },

            updateLegacy: (updates) => set((s) => ({
                legacy: { ...s.legacy, ...updates }
            })),

            syncMasterData: async () => {
                try {
                    const grounds = await api.getGrounds();
                    const tournaments = await api.getTournaments();
                    set({ grounds, tournaments });
                } catch (e) {
                    console.error("Failed to sync master data:", e);
                }
            }
        }),
        {
            name: 'ins-master-data-storage',
            partialize: (state) => ({ legacy: state.legacy, grounds: state.grounds, tournaments: state.tournaments }),
        }
    )
);
