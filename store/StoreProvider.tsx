import * as React from 'react';
import { createContext, useContext, useRef, useState, useEffect } from 'react';
import { useMatchCenter } from './matchStore';
import { usePlayerStore } from './playerStore';
import { useOpponentStore } from './opponentStore';
import { useMasterData } from '../components/masterDataStore';
import { useCricketScorer } from '../components/matchStore';

// Define the shape of our unified store state
import { MatchStore } from './matchStore';
import { PlayerStore } from './playerStore';
import { OpponentStore } from './opponentStore';
import { MasterDataStore } from '../components/masterDataStore';
import { ScorerStore } from '../components/matchStore';

interface RootStore {
  matchCenter: MatchStore;
  players: PlayerStore;
  opponents: OpponentStore;
  masterData: MasterDataStore;
  scorer: ScorerStore;
  isHydrated: boolean;
}

const StoreContext = createContext<RootStore | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the individual hooks
  const matchCenter = useMatchCenter();
  const players = usePlayerStore();
  const opponents = useOpponentStore();
  const masterData = useMasterData();
  const scorer = useCricketScorer();

  // Track hydration status for persisted stores
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check hydration status of persisted stores
    const checkHydration = () => {
      const hydrated = 
        usePlayerStore.persist.hasHydrated() && 
        useOpponentStore.persist.hasHydrated() && 
        useMatchCenter.persist.hasHydrated() &&
        useCricketScorer.persist.hasHydrated();

      if (hydrated) {
        setIsHydrated(true);
      } else {
        // Retry if not yet hydrated
        setTimeout(checkHydration, 50);
      }
    };

    checkHydration();
  }, []);

  const value = {
    matchCenter,
    players,
    opponents,
    masterData,
    scorer,
    isHydrated
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
