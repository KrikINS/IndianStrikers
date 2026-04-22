import * as React from 'react';
import { createContext, useContext, useRef, useState, useEffect } from 'react';
import { useMatchCenter, useCricketScorer } from './matchStore';

import { useOpponentStore } from './opponentStore';
import { useTournamentStore } from './tournamentStore';

// Define the shape of our unified store state
import { UnifiedMatchStore } from './matchStore';

import { OpponentStore } from './opponentStore';
import { TournamentStore } from './tournamentStore';

interface RootStore extends UnifiedMatchStore {
  isHydrated: boolean;
  // Legacy accessors
  matchCenter: UnifiedMatchStore;

  opponents: OpponentStore;
  tournaments: TournamentStore;
}

const StoreContext = createContext<RootStore | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the individual hooks
  const matchCenter = useMatchCenter();

  const opponents = useOpponentStore();
  const tournaments = useTournamentStore();

  const value = {
    ...matchCenter,
    matchCenter,

    opponents,
    tournaments,
    isHydrated: true // Always true in stateless mode
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): RootStore => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
