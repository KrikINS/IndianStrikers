
import React, { useState, useEffect, useRef } from 'react';
import { Player, FieldingStrategy, PlayerRole, FieldPosition, UserRole } from '../types';
import { getPlayers, getStrategies, addStrategy, deleteStrategy } from '../services/storageService';
import { Save, RefreshCcw, Target, GripVertical, Plus, Zap, Flame, Clock, Trash2, Users, ChevronRight, CornerUpLeft, Activity, X } from 'lucide-react';
import './FieldingMap.css';

interface FieldingMapProps {
  userRole?: UserRole;
}

const FieldingBoard: React.FC<FieldingMapProps> = ({ userRole = 'guest' }) => {
  const isReadOnly = userRole === 'guest';
  const [players, setPlayers] = useState<Player[]>([]);
  const [strategies, setStrategies] = useState<FieldingStrategy[]>([]);
  const [currentPositions, setCurrentPositions] = useState<Map<string, FieldPosition>>(new Map());

  // Strategy State
  const [strategyName, setStrategyName] = useState('');
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);

  // Context State
  const [batterHand, setBatterHand] = useState<'RHB' | 'LHB'>('RHB');
  const [matchPhase, setMatchPhase] = useState<'Powerplay' | 'Middle' | 'Death'>('Powerplay');
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');
  const [selectedKeeperId, setSelectedKeeperId] = useState<string>('');
  const [showGuides, setShowGuides] = useState(true);

  // Interaction State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([getPlayers(), getStrategies()]);
        setPlayers(p);
        setStrategies(s);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  // --- Helpers ---
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const isInnerCircle = (left: number, top: number) => {
    const dx = left - 50;
    const dy = top - 50;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Radius is 27.5% visually, we use 28% as threshold
    return distance <= 28;
  };

  // --- Interaction Logic ---

  const handleRemovePosition = (id: string) => {
    if (isReadOnly) return;
    setCurrentPositions(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    if (selectedBowlerId === id) setSelectedBowlerId('');
    if (selectedKeeperId === id) setSelectedKeeperId('');
    if (selectedMarkerId === id) setSelectedMarkerId(null);
  };

  const handlePointerDown = (e: React.PointerEvent, playerId: string) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (boardRef.current) {
      setDraggedId(playerId);
      setSelectedMarkerId(null); // Clear selection on drag start
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleMarkerClick = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    // Toggle selection
    setSelectedMarkerId(prev => prev === playerId ? null : playerId);
  };

  const handleBackgroundClick = () => {
    setSelectedMarkerId(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedId || !boardRef.current) return;

    e.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();

    // Calculate percentage coordinates relative to board
    // Allow going outside 0-100 to visualize "drag out"
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;

    setCurrentPositions(prev => new Map(prev).set(draggedId, { playerId: draggedId, left, top }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggedId && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const left = ((e.clientX - rect.left) / rect.width) * 100;
      const top = ((e.clientY - rect.top) / rect.height) * 100;

      // Threshold for removal: if dropped > 5% outside the box
      if (left < -5 || left > 105 || top < -5 || top > 105) {
        handleRemovePosition(draggedId);
      } else {
        // Snap back to bounds if slightly out but not enough to remove
        const clampedLeft = Math.max(0, Math.min(100, left));
        const clampedTop = Math.max(0, Math.min(100, top));
        setCurrentPositions(prev => new Map(prev).set(draggedId, { playerId: draggedId, left: clampedLeft, top: clampedTop }));
      }
    }
    setDraggedId(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDugoutDragStart = (e: React.DragEvent, playerId: string) => {
    if (isReadOnly) return;
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBoardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const playerId = e.dataTransfer.getData('text/plain');
    if (!boardRef.current || !playerId) return;

    const rect = boardRef.current.getBoundingClientRect();

    // Fix: Ensure we use the clientX/Y from the drop event relative to the board rect
    const clientX = e.clientX;
    const clientY = e.clientY;

    let left = ((clientX - rect.left) / rect.width) * 100;
    let top = ((clientY - rect.top) / rect.height) * 100;

    // Clamp drops to ensure they land on board initially
    left = Math.max(5, Math.min(95, left));
    top = Math.max(5, Math.min(95, top));

    setCurrentPositions(prev => new Map(prev).set(playerId, { playerId, left, top }));
  };

  // --- Strategy Management ---

  const handleSaveStrategy = async () => {
    if (isReadOnly) return;
    if (!strategyName.trim()) return;

    // If no bowler selected and no fielders placed, prevent save
    if (!selectedBowlerId && currentPositions.size === 0) {
      alert("Please select a bowler or place at least one fielder.");
      return;
    }

    // Omit ID to let backend generate it
    const newStrategy: FieldingStrategy = {
      id: '', // Placeholder
      name: strategyName,
      batterHand,
      matchPhase,
      bowlerId: selectedBowlerId,
      positions: Array.from(currentPositions.values())
    };

    try {
      const saved = await addStrategy(newStrategy);
      const strategyWithId = { ...newStrategy, id: saved.id };

      setStrategies(prev => [...prev, strategyWithId]);
      setStrategyName('');
      setActiveStrategyId(strategyWithId.id);
    } catch (e) {
      console.error(e);
      alert("Failed to save strategy");
    }
  };

  const handleLoadStrategy = (id: string) => {
    const strategy = strategies.find(s => s.id === id);
    if (strategy) {
      const posMap = new Map<string, FieldPosition>();
      strategy.positions.forEach((p: FieldPosition) => posMap.set(p.playerId, p));
      setCurrentPositions(posMap);
      setBatterHand(strategy.batterHand);
      if (strategy.matchPhase && (strategy.matchPhase === 'Powerplay' || strategy.matchPhase === 'Middle' || strategy.matchPhase === 'Death')) {
        setMatchPhase(strategy.matchPhase);
      }
      if (strategy.bowlerId) setSelectedBowlerId(strategy.bowlerId);
      // Try to infer keeper from position 50,32 or role? Strategy doesn't save keeperID explicitly.
      // We can iterate positions to find who is at 50,32?
      // Or just leave it empty. The user didn't ask to save Keeper ID, just place them.
      // But if we want color, we need selectedKeeperId.
      // I'll leave it for now or check if any player at 50,32 is a keeper.
      const keeperPos = strategy.positions.find(p => Math.abs(p.left - 50) < 2 && Math.abs(p.top - 32) < 2);
      if (keeperPos) setSelectedKeeperId(keeperPos.playerId);

      setActiveStrategyId(strategy.id);
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    if (isReadOnly) return;
    if (window.confirm('Delete this strategy?')) {
      try {
        await deleteStrategy(id);
        setStrategies(prev => prev.filter(s => s.id !== id));
        if (activeStrategyId === id) setActiveStrategyId(null);
      } catch (e) {
        console.error(e);
        alert("Failed to delete strategy");
      }
    }
  };

  // Auto Deploy: Top=Striker, Bottom=Bowler. Pitch center is 50,50. 
  // Stumps at Top ~39%, Bottom ~61%.
  const handleAutoDeploy = () => {
    if (isReadOnly) return;
    const newMap = new Map<string, FieldPosition>();
    const availablePlayers = [...players].filter(p => p.isAvailable).slice(0, 11);

    // 1. Wicket Keeper: Behind Striker (Top)
    let wkIdToUse = selectedKeeperId;
    if (!wkIdToUse) {
      const wk = availablePlayers.find(p => p.role === PlayerRole.WICKET_KEEPER) || availablePlayers[0];
      wkIdToUse = wk ? wk.id : '';
    }

    if (wkIdToUse) {
      newMap.set(wkIdToUse, { playerId: wkIdToUse, left: 50, top: 32 }); // Close behind stumps (Top)
      if (selectedKeeperId !== wkIdToUse) setSelectedKeeperId(wkIdToUse);
    }

    // 2. Bowler
    let bowlerIdToUse = selectedBowlerId;
    if (!bowlerIdToUse) {
      const autoBowler = availablePlayers.find(p => p.role === PlayerRole.BOWLER && p.id !== wkIdToUse);
      bowlerIdToUse = autoBowler ? autoBowler.id : '';
    }

    if (bowlerIdToUse) {
      newMap.set(bowlerIdToUse, { playerId: bowlerIdToUse, left: 50, top: 68 }); // Behind wickets (Bottom)
      if (selectedBowlerId !== bowlerIdToUse) setSelectedBowlerId(bowlerIdToUse);
    } // Removed extra brace that was ending the if block early

    // 3. Fielders
    const fielders = availablePlayers.filter(p => p.id !== wkIdToUse && p.id !== bowlerIdToUse);

    // Standard Field (RHB default coordinates)
    // Inner Circle Radius is ~28% from 50,50.
    const positions = [
      { l: 56, t: 30, n: 'Slip 1' },        // Off side slip
      { l: 68, t: 34, n: 'Gully' },         // Off side, behind square (Right, Top) - Inner
      { l: 75, t: 42, n: 'Point' },         // Off side, square (Right) - Inner/Edge
      { l: 72, t: 55, n: 'Cover' },         // Off side, forward (Right, Bottom) - Inner
      { l: 58, t: 72, n: 'Mid Off' },       // Off side, straight (Right, Bottom) - Inner
      { l: 42, t: 72, n: 'Mid On' },        // Leg side, straight (Left, Bottom) - Inner
      { l: 28, t: 55, n: 'Mid Wicket' },    // Leg side, forward (Left, Bottom) - Inner
      { l: 24, t: 42, n: 'Square Leg' },    // Leg side, square (Left) - Inner
      { l: 38, t: 28, n: 'Short Fine Leg' }, // Leg side, fine (Left, Top) - Inner
    ];

    const isLHB = batterHand === 'LHB';

    fielders.forEach((p, i) => {
      if (positions[i]) {
        let { l, t } = positions[i];
        // REVERSED: User requested flipping. Now RHB gets '100-l' (Left) and LHB gets 'l' (Right).
        if (!isLHB) {
          l = 100 - l;
        }
        newMap.set(p.id, { playerId: p.id, left: l, top: t });
      }
    });

    setCurrentPositions(newMap);
  };

  const handleSelectBowler = (id: string) => {
    setSelectedBowlerId(id);
    if (id) {
      // Auto-place bowler if not already on field (or move them if they are)
      setCurrentPositions(prev => new Map(prev).set(id, { playerId: id, left: 50, top: 68 }));
    }
  };

  const handleSelectKeeper = (id: string) => {
    setSelectedKeeperId(id);
    if (id) {
      // Auto-place keeper if not already on field
      setCurrentPositions(prev => new Map(prev).set(id, { playerId: id, left: 50, top: 32 }));
    }
  };

  // Guide Markers: Updated to be more accurate around the pitch
  const baseGuidePositions = [
    { left: 50, top: 32, label: 'WK' },
    { left: 56, top: 30, label: 'Slip' },
    { left: 68, top: 34, label: 'Gully' },
    { left: 75, top: 42, label: 'Point' },
    { left: 72, top: 55, label: 'Cover' },
    { left: 58, top: 72, label: 'Mid Off' },
    { left: 50, top: 65, label: 'Bowler' },
    { left: 42, top: 72, label: 'Mid On' },
    { left: 28, top: 55, label: 'Mid Wkt' },
    { left: 24, top: 42, label: 'Sq Leg' },
    { left: 38, top: 28, label: 'Fine Leg' },
    { left: 15, top: 42, label: 'Deep Sq' },
    { left: 80, top: 15, label: '3rd Man' },
    { left: 45, top: 88, label: 'Long On' },
    { left: 55, top: 88, label: 'Long Off' },
  ];

  // Dynamically mirror for LHB
  const guidePositions = baseGuidePositions.map(pos => {
    // WK and Bowler (center X=50) remain same
    if (pos.left === 50) return pos;

    return {
      ...pos,
      left: batterHand === 'RHB' ? 100 - pos.left : pos.left
    };
  });

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-6rem)] gap-4 overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0">

      {/* LEFT: THE GROUND CONTAINER */}
      <div
        className="w-full lg:flex-1 relative bg-slate-800 rounded-3xl shadow-inner border-4 border-slate-900 flex items-center justify-center overflow-hidden shrink-0 aspect-square lg:aspect-auto min-h-[300px]"
        onClick={handleBackgroundClick}
      >

        {/* Ground Wrapper - Enforce Square Aspect Ratio */}
        <div className="relative shadow-2xl rounded-full aspect-square w-full lg:w-auto lg:h-full lg:max-w-full">

          {/* LAYER 1: VISUALS (SVG) */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden shadow-2xl pointer-events-none fielding-ground-gradient"
          >
            {/* Mowing Stripes Overlay */}
            <div className="absolute inset-0 opacity-10 mowing-stripes">
            </div>

            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {/* Boundary Rope */}
              <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.9" />

              {/* 30 Yard Circle (Radius 28 to match logic) */}
              <circle cx="50" cy="50" r="28" fill="none" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" strokeOpacity="0.6" />

              {/* Pitch Area */}
              <rect x="46" y="39" width="8" height="22" fill="#d4b996" rx="0.5" opacity="0.9" />

              {/* Stumps */}
              <g fill="#1e293b">
                {/* Top Stumps */}
                <rect x="48.5" y="40" width="0.8" height="1" />
                <rect x="49.6" y="40" width="0.8" height="1" />
                <rect x="50.7" y="40" width="0.8" height="1" />

                {/* Bottom Stumps */}
                <rect x="48.5" y="60" width="0.8" height="1" />
                <rect x="49.6" y="60" width="0.8" height="1" />
                <rect x="50.7" y="60" width="0.8" height="1" />
              </g>

              {/* Creases */}
              <line x1="46" y1="42" x2="54" y2="42" stroke="white" strokeWidth="0.2" opacity="0.8" />
              <line x1="46" y1="58" x2="54" y2="58" stroke="white" strokeWidth="0.2" opacity="0.8" />
            </svg>

            {/* Batter Marker */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 transition-all duration-300 z-10 flex flex-col items-center pointer-events-none">
              <div className="w-3 h-3 bg-slate-900 rounded-full border-2 border-white shadow-md mb-0.5"></div>
              <div className="bg-black/70 text-white text-[8px] px-1.5 rounded font-bold whitespace-nowrap backdrop-blur-sm">
                {batterHand}
              </div>
            </div>

            {/* Ghost Guide Markers */}
            {showGuides && guidePositions.map((pos, idx) => (
              // eslint-disable-next-line react/forbid-component-props
              <div
                key={`guide-${idx}`}
                className="guide-marker"
                style={{ '--marker-left': `${pos.left}%`, '--marker-top': `${pos.top}%` } as React.CSSProperties}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-5 bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap transition-opacity z-10 border border-white/10">
                  {pos.label}
                </div>
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute w-3 h-[1px] bg-white/30"></div>
                  <div className="absolute w-[1px] h-3 bg-white/30"></div>
                </div>
              </div>
            ))}
          </div>

          {/* LAYER 2: INTERACTION (UNCLIPPED) */}
          <div
            ref={boardRef}
            className="absolute inset-0 z-20"
            onDragOver={handleBoardDragOver}
            onDrop={handleBoardDrop}
          >
            {/* Note: Inline styles are used below for CSS custom properties (--marker-left, --marker-top) 
                which enable dynamic positioning while keeping styling logic in external CSS */}
            {Array.from(currentPositions.values()).map((pos: FieldPosition) => {
              const player = players.find(p => p.id === pos.playerId);
              if (!player) return null;

              const isInner = isInnerCircle(pos.left, pos.top);
              const isWK = player.role === PlayerRole.WICKET_KEEPER || player.id === selectedKeeperId;
              const isBowler = player.id === selectedBowlerId;
              const isSelected = selectedMarkerId === pos.playerId;

              let bgColor = isInner ? 'bg-emerald-500' : 'bg-blue-600';
              if (isWK) bgColor = 'bg-yellow-500';
              if (isBowler) bgColor = 'bg-red-500';

              // Visual warning if being dragged out
              const isDraggingOut = draggedId === pos.playerId && (pos.left < 0 || pos.left > 100 || pos.top < 0 || pos.top > 100);

              // eslint-disable-next-line react/forbid-component-props
              return (
                <button
                  type="button"
                  key={pos.playerId}
                  className={`player-marker animate-zoom-in ${isDraggingOut ? 'opacity-50 scale-90 grayscale' : 'scale-100'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  style={{ '--marker-left': `${pos.left}%`, '--marker-top': `${pos.top}%` } as React.CSSProperties}
                  onPointerDown={(e) => handlePointerDown(e, pos.playerId)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onClick={(e) => handleMarkerClick(e, pos.playerId)}
                >
                  {/* Interactive Tooltip Card (On Click) */}
                  {isSelected && (
                    // eslint-disable-next-line react/forbid-component-props
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-40 z-50 animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                      style={{ transform: 'translate(-50%, 0)' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <img src={player.avatarUrl} alt={`${player.name} avatar`} className="w-8 h-8 rounded-full border border-slate-100 object-cover" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-none">{player.name.split(' ')[0]}</p>
                            <p className="text-[10px] text-slate-400">{player.role}</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedMarkerId(null)} className="text-slate-300 hover:text-slate-500" aria-label="Close player information"><X size={12} /></button>
                      </div>

                      <div className="grid grid-cols-2 gap-1 mb-2">
                        <div className="bg-slate-50 p-1 rounded text-center">
                          <p className="text-[8px] text-slate-400 uppercase">Mat</p>
                          <p className="text-xs font-bold text-slate-700">{player.matchesPlayed}</p>
                        </div>
                        <div className="bg-slate-50 p-1 rounded text-center">
                          <p className="text-[8px] text-slate-400 uppercase">Wkt</p>
                          <p className="text-xs font-bold text-slate-700">{player.wicketsTaken}</p>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <button
                          onClick={() => handleRemovePosition(player.id)}
                          className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors"
                        >
                          <Trash2 size={10} /> Remove
                        </button>
                      )}

                      {/* Triangle Pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45"></div>
                    </div>
                  )}

                  {/* The Marker */}
                  <div className={`
                        relative w-8 h-8 rounded-full border-2 shadow-md flex items-center justify-center transition-all duration-200
                        ${bgColor}
                        ${isSelected ? 'border-white scale-110 ring-4 ring-white/30 z-40' : 'border-white hover:scale-105'}
                      `}>
                    <span className="text-[10px] font-bold text-white tracking-tighter leading-none select-none">
                      {getInitials(player.name)}
                    </span>

                    {/* Outer Glow */}
                    <div className={`absolute inset-0 rounded-full opacity-20 ${isBowler ? 'animate-ping bg-white' : ''}`}></div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instruction Tip */}
          {!isReadOnly && (
            <div className="absolute top-4 right-4 pointer-events-none bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20 text-white text-[10px] font-medium z-10 animate-fade-in opacity-80">
              Click for options or Drag out to remove
            </div>
          )}

        </div>
      </div>

      {/* RIGHT/BOTTOM: TOOLBAR */}
      <div className="w-full lg:w-80 flex flex-col gap-4 overflow-hidden shrink-0">

        {/* Card 1: Match Context */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Target size={14} /> Match Context
          </h3>

          <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {['Powerplay', 'Middle', 'Death'].map((phase) => (
              <button
                key={phase}
                onClick={() => setMatchPhase(phase as any)}
                className={`py-1.5 rounded-md text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5
                  ${matchPhase === phase ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                {phase === 'Powerplay' && <Zap size={10} />}
                {phase === 'Middle' && <Clock size={10} />}
                {phase === 'Death' && <Flame size={10} />}
                {phase}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="wicket-keeper-select" className="text-[10px] font-bold text-slate-500 uppercase">Wicket Keeper</label>
              <select
                id="wicket-keeper-select"
                value={selectedKeeperId}
                onChange={(e) => handleSelectKeeper(e.target.value)}
                disabled={isReadOnly}
                className={`w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Keeper...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="bowler-select" className="text-[10px] font-bold text-slate-500 uppercase">Bowler</label>
              <select
                id="bowler-select"
                value={selectedBowlerId}
                onChange={(e) => handleSelectBowler(e.target.value)}
                disabled={isReadOnly}
                className={`w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Bowler...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-600">Batter Hand</span>
              <button
                onClick={() => setBatterHand(prev => prev === 'RHB' ? 'LHB' : 'RHB')}
                className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${batterHand === 'RHB' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-300'}`}
              >
                {batterHand}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Strategy Tools - Only for Members/Admins */}
        {userRole !== 'guest' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Save size={14} /> Strategy
            </h3>

            <select
              id="strategy-preset-select"
              aria-label="Load strategy preset"
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => handleLoadStrategy(e.target.value)}
              value={activeStrategyId || ''}
            >
              <option value="">Load Preset...</option>
              {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none placeholder-slate-400"
                placeholder="Save as..."
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
              />
              <button
                onClick={handleSaveStrategy}
                disabled={!strategyName}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                aria-label="Save strategy"
              >
                <Save size={14} />
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-50">
              <button
                onClick={handleAutoDeploy}
                className="flex-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-2"
              >
                <RefreshCcw size={12} /> Auto Field
              </button>
              {activeStrategyId && (
                <button
                  onClick={() => handleDeleteStrategy(activeStrategyId)}
                  className="p-2 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                  aria-label="Delete strategy"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Card 3: Dugout */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 flex flex-col overflow-hidden flex-1 min-h-[200px] lg:min-h-0">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <GripVertical size={14} className="text-slate-400" /> Dugout
            </h3>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-700">
              {players.length - currentPositions.size}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {players.filter(p => !currentPositions.has(p.id) && p.isAvailable).map(player => (
              <div
                key={player.id}
                draggable={!isReadOnly}
                onDragStart={(e) => handleDugoutDragStart(e, player.id)}
                onDoubleClick={() => !isReadOnly && setCurrentPositions(prev => new Map(prev).set(player.id, { playerId: player.id, left: 50, top: 40 }))}
                className={`flex items-center gap-3 p-2 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500 rounded-lg group transition-all duration-200 ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-9 h-9 rounded-full border border-slate-600 object-cover shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-bold text-slate-200 truncate leading-tight">{player.name}</p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate leading-tight">{player.role}</p>
                </div>
                {!isReadOnly && <GripVertical size={16} className="text-slate-700 group-hover:text-blue-500 transition-colors" />}
              </div>
            ))}
            {players.filter(p => !currentPositions.has(p.id) && p.isAvailable).length === 0 && (
              <div className="p-4 text-center text-slate-500 text-xs flex flex-col items-center gap-2 mt-8">
                <Users size={24} className="opacity-30" />
                All players fielded
              </div>
            )}
          </div>
        </div>

      </div>
    </div >
  );
};

export default FieldingBoard;
