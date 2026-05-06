import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/StoreProvider';
import { Shield, Users, Target, Activity } from 'lucide-react';
import './BroadcastOverlay.css';

const BroadcastOverlay = () => {
  const store = useStore();
  const [loading, setLoading] = useState(true);

  const fetchEverything = async () => {
    try {
      await Promise.all([
        store.syncWithCloud(),
        store.fetchPlayers(),
        store.opponents.fetchOpponents()
      ]);
    } catch (e) {
      console.error('Failed to fetch data for broadcast:', e);
    }
  };

  useEffect(() => {
    // Set background to transparent for broadcasting software (e.g. PRISM)
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    
    // Also target the root container if it has a background
    const root = document.getElementById('root');
    let originalRootBg = '';
    if (root) {
      originalRootBg = root.style.backgroundColor;
      root.style.backgroundColor = 'transparent';
    }

    const init = async () => {
      await fetchEverything();
      setLoading(false);
    };
    init();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      store.syncWithCloud();
    }, 5000);

    return () => {
      clearInterval(interval);
      // Revert to original background colors
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
      if (root) root.style.backgroundColor = originalRootBg;
    };
  }, []);

  const liveMatch = useMemo(() => {
    return store.matches.find(m => m.status === 'live');
  }, [store.matches]);

  const liveData = useMemo(() => {
    if (!liveMatch?.live_data) return null;
    try {
      return typeof liveMatch.live_data === 'string' 
        ? JSON.parse(liveMatch.live_data) 
        : liveMatch.live_data;
    } catch (e) {
      console.error('Failed to parse live_data', e);
      return null;
    }
  }, [liveMatch]);

  const getPlayerName = (id: string) => {
    const p = store.squadPlayers.find(p => String(p.id) === String(id)) || 
              store.opponents.opponents.flatMap(o => o.players || []).find(p => String(p.id) === String(id));
    return p ? p.name : 'Unknown';
  };

  if (loading) {
    return (
      <div className="broadcast-container flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!liveMatch || !liveData) {
    return (
      <div className="broadcast-container flex items-center justify-center">
        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-center scale-90">
          <Activity className="text-blue-500 mx-auto mb-4 animate-pulse" size={48} />
          <h2 className="text-white font-black uppercase tracking-widest text-xl italic">Waiting for Live Feed</h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2">The overlay will activate once a match starts scoring.</p>
        </div>
      </div>
    );
  }

  const currentInningsNum = liveData.currentInnings || 1;
  const currentInnings = currentInningsNum === 1 ? liveData.innings1 : liveData.innings2;
  const isHomeBatting = currentInnings?.battingTeamId === 'HOME';
  const battingTeamName = isHomeBatting ? (liveMatch.homeTeamName || 'Indian Strikers') : (liveMatch.opponentName || 'Opponent');
  
  const striker = liveData.strikerId ? getPlayerName(liveData.strikerId) : 'Waiting...';
  const nonStriker = liveData.nonStrikerId ? getPlayerName(liveData.nonStrikerId) : '';
  const bowler = liveData.currentBowlerId ? getPlayerName(liveData.currentBowlerId) : 'Waiting...';
  
  const totalBalls = currentInnings?.totalBalls || 0;
  const overs = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;

  return (
    <div className="broadcast-container">
      <div className="score-bug animate-in slide-in-from-left-8 duration-700">
        <div className="flex flex-col min-w-[120px]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Live</span>
          </div>
          <h2 className="text-xl leading-none">{battingTeamName}</h2>
        </div>
        
        <div className="divider" />
        
        <div className="flex flex-col items-center min-w-[80px]">
          <div className="text-3xl font-black text-blue-400 italic leading-none mb-1">
            {currentInnings?.totalRuns || 0}<span className="text-white/40 mx-1">/</span>{currentInnings?.wickets || 0}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/60">
            {overs} <span className="text-[8px] opacity-50">OVS</span>
          </div>
        </div>

        <div className="divider" />

        <div className="flex flex-col gap-1 min-w-[140px]">
          <div className="flex items-center gap-2">
            <Target size={12} className="text-blue-400" />
            <span className="text-xs font-black uppercase italic tracking-tight">{striker}*</span>
          </div>
          {nonStriker && (
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-3" />
              <span className="text-[10px] font-bold uppercase tracking-tight">{nonStriker}</span>
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Bowling</span>
          <div className="flex items-center gap-2">
            <Users size={12} className="text-emerald-400" />
            <span className="text-xs font-black uppercase italic text-emerald-400 tracking-tight">{bowler}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastOverlay;
