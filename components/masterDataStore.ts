import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ground, Tournament } from '../types';

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
    addGround: (ground: Ground) => void;
    updateGround: (ground: Ground) => void;
    removeGround: (id: string) => void;
    
    addTournament: (tournament: Tournament) => void;
    updateTournament: (tournament: Tournament) => void;
    removeTournament: (id: string) => void;
    
    updateLegacy: (legacy: Partial<ClubLegacy>) => void;
}

export const useMasterData = create<MasterDataState>()(
    persist(
        (set) => ({
            grounds: [],
            tournaments: [],
            legacy: {
                winnersTrophies: 7,
                runnersUp: 5,
                matchesPlayed: 142,
                totalRuns: 24500
            },

            addGround: (g) => set((s) => ({ grounds: [...s.grounds, g] })),
            updateGround: (updated) => set((s) => ({
                grounds: s.grounds.map(g => g.id === updated.id ? updated : g)
            })),
            removeGround: (id) => set((s) => ({ grounds: s.grounds.filter(g => g.id !== id) })),

            addTournament: (t) => set((s) => ({ tournaments: [...s.tournaments, t] })),
            updateTournament: (updated) => set((s) => ({
                tournaments: s.tournaments.map(t => t.id === updated.id ? updated : t)
            })),
            removeTournament: (id) => set((s) => ({ tournaments: s.tournaments.filter(t => t.id !== id) })),

            updateLegacy: (updates) => set((s) => ({
                legacy: { ...s.legacy, ...updates }
            })),
        }),
        {
            name: 'ins-master-data-storage',
        }
    )
);
