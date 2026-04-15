import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OpponentTeam } from '../types';
import * as api from '../services/storageService';

interface OpponentState {
    opponents: OpponentTeam[];
    loading: boolean;
    error: string | null;

    // Actions
    setOpponents: (opponents: OpponentTeam[]) => void;
    fetchOpponents: () => Promise<void>;
    addOpponent: (team: OpponentTeam) => Promise<OpponentTeam>;
    updateOpponent: (team: OpponentTeam) => Promise<void>;
    deleteOpponent: (id: string) => Promise<void>;
}

export const useOpponentStore = create<OpponentState>()(
    persist(
        (set, get) => ({
            opponents: [],
            loading: false,
            error: null,

            setOpponents: (opponents) => set({ opponents }),

            fetchOpponents: async () => {
                set({ loading: true, error: null });
                try {
                    const data = await api.getOpponents();
                    set({ 
                        opponents: data || [], 
                        loading: false 
                    });
                } catch (err: any) {
                    console.error("[opponentStore] Failed to fetch opponents:", err);
                    set({ 
                        error: err.message || 'Failed to fetch opponents', 
                        loading: false 
                    });
                }
            },

            addOpponent: async (team) => {
                try {
                    const newTeam = await api.addOpponent(team);
                    set((state) => ({ 
                        opponents: [...state.opponents, newTeam] 
                    }));
                    return newTeam;
                } catch (err: any) {
                    console.error("[opponentStore] Failed to add opponent:", err);
                    throw err;
                }
            },

            updateOpponent: async (updatedTeam) => {
                try {
                    await api.updateOpponent(updatedTeam);
                    set((state) => ({
                        opponents: state.opponents.map(t => t.id === updatedTeam.id ? updatedTeam : t)
                    }));
                } catch (err: any) {
                    console.error("[opponentStore] Failed to update opponent:", err);
                    throw err;
                }
            },

            deleteOpponent: async (id) => {
                try {
                    await api.deleteOpponent(id);
                    set((state) => ({
                        opponents: state.opponents.filter(t => t.id !== id)
                    }));
                } catch (err: any) {
                    console.error("[opponentStore] Failed to delete opponent:", err);
                    throw err;
                }
            }
        }),
        {
            name: 'ins-opponent-storage',
            partialize: (state) => ({ opponents: state.opponents }),
        }
    )
);
