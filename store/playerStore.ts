import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Player } from '../types';
import * as api from '../services/storageService';

export interface PlayerStore {
    players: Player[];
    loading: boolean;
    error: string | null;

    // Actions
    setPlayers: (players: Player[]) => void;
    fetchPlayers: () => Promise<void>;
    addPlayer: (player: Player) => Promise<void>;
    updatePlayer: (player: Player) => Promise<void>;
    deletePlayer: (id: string) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()(
    persist(
        (set, get) => ({
            players: [],
            loading: false,
            error: null,

            setPlayers: (players) => set({ players }),

            fetchPlayers: async () => {
                set({ loading: true, error: null });
                try {
                    const players = await api.getPlayers();
                    set({
                        players: players || [],
                        loading: false
                    });
                } catch (err: any) {
                    console.error("[playerStore] Failed to fetch players:", err);
                    set({
                        error: err.message || 'Failed to fetch players',
                        loading: false
                    });
                }
            },

            addPlayer: async (player) => {
                try {
                    const newPlayer = await api.addPlayer(player);
                    set((state) => ({
                        players: [newPlayer, ...state.players]
                    }));
                } catch (err: any) {
                    console.error("[playerStore] Failed to add player:", err);
                    throw err;
                }
            },

            updatePlayer: async (updatedPlayer) => {
                try {
                    await api.updatePlayer(updatedPlayer);
                    set((state) => ({
                        players: state.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
                    }));
                } catch (err: any) {
                    console.error("[playerStore] Failed to update player:", err);
                    throw err;
                }
            },

            deletePlayer: async (id) => {
                try {
                    await api.deletePlayer(id);
                    set((state) => ({
                        players: state.players.filter(p => p.id !== id)
                    }));
                } catch (err: any) {
                    console.error("[playerStore] Failed to delete player:", err);
                    throw err;
                }
            }
        }),
        {
            name: 'ins-player-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({}),
        }
    )
);