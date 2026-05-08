import React, { useState, useRef, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronDown,
  ArrowUp,
  Maximize2,
  Minimize2,
  Star,
  Clock,
  Zap,
  Target,
  Trophy,
  Award,
  Info,
  BarChart2,
  Save,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  MapPin,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useMatchCenter } from '../store/matchStore';
import { useMasterData } from '../store/tournamentStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from 'recharts';

// --- STYLED COMPONENTS (Ported from ScorerDashboard) ---

const PremiumModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PremiumModalContent = styled.div`
  background: #0F172A;
  background-image: linear-gradient(rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.95)), url('/assets/cricket_ground_bg.png');
  background-size: cover;
  background-position: center;
  color: #FFFFFF;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0;
  border: none;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: transparent;
  z-index: 100;
  min-height: 40px;
`;

const IconButton = styled.button`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #F1F5F9;
    color: #0F172A;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 20px;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(8px);
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 14px 0;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#38BDF8' : 'transparent'};
  color: ${props => props.$active ? '#38BDF8' : 'rgba(255, 255, 255, 0.4)'};
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? '#38BDF8' : 'rgba(255, 255, 255, 0.7)'};
  }
`;

const InningsAccordionHeader = styled.div<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: ${props => props.$active ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
`;

const FABContainer = styled.div`
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
`;

const FloatingButton = styled(motion.button)`
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #38BDF8;
  color: #FFFFFF;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.9;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }
`;


const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
`;

const MatchHeaderCard = styled.div`
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
`;

const TournamentLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 900;
  color: #38BDF8;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-align: center;
  opacity: 0.9;
  margin-bottom: 4px;
`;

const TeamsHorizontalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0;
`;

const TeamBlock = styled.div<{ $reverse?: boolean }>`
  display: flex;
  flex-direction: ${props => props.$reverse ? 'row-reverse' : 'row'};
  align-items: center;
  gap: 10px;
  flex: 0 1 auto;
`;

const TeamLogoFrame = styled.div`
  width: 108px;
  height: 108px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TeamInfo = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$align === 'right' ? 'flex-end' : 'flex-start'};
  min-width: 0;
`;

const TeamNameLabel = styled.div`
  font-size: clamp(0.7rem, 3.5vw, 0.9rem);
  font-weight: 900;
  color: #FFF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.1;
  max-width: 100%;
`;

const ScoreValue = styled.div`
  font-size: 1.6rem;
  font-weight: 900;
  color: #FFFFFF;
  display: flex;
  align-items: baseline;
  gap: 4px;
  letter-spacing: -1px;
  
  span {
    font-size: 1.6rem;
    opacity: 0.8;
    font-weight: 900;
    letter-spacing: -1px;
  }
`;

const VSBadgeHeader = styled.div`
  background: rgba(15, 23, 42, 0.8);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 900;
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.4);
  flex-shrink: 0;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
`;

const ResultHighlightBar = styled.div`
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.05) 100%);
  padding: 10px 16px;
  border-radius: 8px;
  text-align: center;
  color: #38BDF8;
  font-weight: 900;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  margin-top: 4px;
`;

const MetaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MetaItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  text-transform: uppercase;
`;

const ScoreSummaryCard = styled.div`
  background: #1E293B;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #FFFFFF;
`;

const TableTitle = styled.h3`
  font-size: 0.8rem;
  color: #FAB005;
  margin-bottom: 12px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ScoreCardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
  font-size: 0.8rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.6;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 1.5px;
  color: #38BDF8;
`;

const Td = styled.td`
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
  color: #FFFFFF;
`;

const ExtrasRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 14px 12px;
  background: #1E293B;
  border-radius: 10px;
  font-size: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #FFFFFF;
`;

// --- INTERFACES ---

interface BattingStat {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: 'batting' | 'out' | 'did-not-bat';
  outHow?: string;
  fielderId?: string;
  bowlerId?: string;
  index?: number;
}

interface BowlingStat {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  index?: number;
}

interface Innings {
  batting: BattingStat[];
  bowling: BowlingStat[];
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
  };
  totalRuns: number;
  wickets: number;
  totalBalls: number;
  history: any[];
  battingTeamId?: string;
}

interface UniversalScorecardProps {
  match: any;
  players: any[];
  opponents: any[];
  onClose: () => void;
  isEditable?: boolean;
  onSave?: (data: any) => Promise<void>;
  isLive?: boolean;
  activeInnings?: number;
}

// --- COMPONENT ---

export const UniversalScorecard: React.FC<UniversalScorecardProps> = ({ 
  match: initialMatch, 
  players, 
  opponents, 
  onClose, 
  isEditable = false, 
  onSave,
  isLive = false,
  activeInnings = 1
}) => {
  const [tab, setTab] = useState<'info' | 'scorecard' | 'commentary' | 'analytics'>('scorecard');
  const [selectedInnings, setSelectedInnings] = useState<number>(activeInnings || 1);
  const [openInnings, setOpenInnings] = useState<Set<number>>(new Set([1]));
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editState, setEditState] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const grounds = useMasterData(state => (state as any).grounds || []);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      // Normalize editState to remove temporary IDs
      const finalState = JSON.parse(JSON.stringify(editState));
      const cleanBatting = (inn: any) => {
        if (!inn.batting) return;
        inn.batting = inn.batting.map((b: any) => ({
          ...b,
          playerId: (b.playerId && String(b.playerId).startsWith('new-')) ? undefined : b.playerId
        }));
      };
      cleanBatting(finalState.innings1);
      cleanBatting(finalState.innings2);

      await onSave(finalState);
      
      // If we are here, save was successful
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose(); // Only close on success
      }, 2000);
    } catch (err) {
      console.error("Failed to save scorecard:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateFOW = (history: any[]) => {
    const fow: any[] = [];
    let runs = 0;
    let wickets = 0;
    let balls = 0;

    history.forEach(ball => {
      runs += (ball.runs || 0) + (ball.extras || 0);
      balls++;
      if (ball.isWicket) {
        wickets++;
        const overs = Math.floor(balls / 6) + (balls % 6) / 10;
        fow.push({ wicket: wickets, runs, overs, batterName: ball.batterName });
      }
    });
    return fow;
  };

  const getPlayerNameResolved = (id: any, fallbackName?: string) => {
    const p = players.find(p => p.id === id || p.player_id === id);
    if (p) return p.name;
    const opp = opponents.find(o => o.id === initialMatch.opponentId);
    const oppP = opp?.players?.find((p: any) => p.id === id);
    if (oppP) return oppP.name;
    return fallbackName || 'Unknown Player';
  };

  const formatOvers = (balls: number, maxOvers?: number): string => {
    const fullOvers = Math.floor(balls / 6);
    const rem = balls % 6;
    if (maxOvers && fullOvers >= maxOvers) return `${fullOvers} Overs`;
    if (rem === 0 && fullOvers > 0) return `${fullOvers} Overs`;
    return `${fullOvers}.${rem}`;
  };

  const renderInningsTable = (data: any, innNo: number) => {
    if (!data) return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>No data for this innings</div>;
    
    const fowData = calculateFOW(data.history || []);
    const isCurrentInningsEditable = isEditable && editState;
    const innKey = `innings${innNo}` as 'innings1' | 'innings2';
    
    const isHomeInnings = (innNo === 1 && initialMatch.isHomeBattingFirst) || (innNo === 2 && !initialMatch.isHomeBattingFirst);
    const battingSquadIds = isHomeInnings ? initialMatch.homeTeamXI : initialMatch.opponentTeamXI;
    const bowlingSquadIds = isHomeInnings ? initialMatch.opponentTeamXI : initialMatch.homeTeamXI;

    const battingSquad = (battingSquadIds || []).map((id: string) => ({ id, name: getPlayerNameResolved(id) }));
    const bowlingSquad = (bowlingSquadIds || []).map((id: string) => ({ id, name: getPlayerNameResolved(id) }));

    return (
      <div style={{ paddingBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <TableTitle style={{ marginBottom: 0 }}><Zap size={14} /> BATTING</TableTitle>
          {isCurrentInningsEditable && (
            <button
              onClick={() => {
                const newBatting = [...editState[innKey].batting, {
                  playerId: `new-${Date.now()}`,
                  name: '',
                  runs: 0,
                  balls: 0,
                  fours: 0,
                  sixes: 0,
                  status: 'batting',
                  index: editState[innKey].batting.length
                }];
                setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
              }}
              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> ADD BATTER
            </button>
          )}
        </div>
        
        <ScoreCardTable>
          <thead>
            <tr>
              <Th>Batter</Th>
              <Th>Status</Th>
              <Th>Fielder</Th>
              <Th>Bowler</Th>
              <Th style={{ textAlign: 'center' }}>R</Th>
              <Th style={{ textAlign: 'center' }}>B</Th>
              <Th style={{ textAlign: 'center' }}>4s</Th>
              <Th style={{ textAlign: 'center' }}>6s</Th>
              <Th style={{ textAlign: 'right' }}>{isCurrentInningsEditable ? 'Action' : 'SR'}</Th>
            </tr>
          </thead>
          <tbody>
            {(data.batting || []).map((stat: any, idx: number) => (
              <tr key={stat.playerId || idx}>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.playerId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newBatting = [...editState[innKey].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = battingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          playerId: selectedId, 
                          name: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Select Batter"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Batter</option>
                      {battingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                      {/* Fallback for players not in initial XI */}
                      {stat.playerId && !battingSquad.find((p: any) => p.id === stat.playerId) && (
                        <option value={stat.playerId} style={{ background: '#FFF', color: '#000' }}>{stat.name} (Other)</option>
                      )}
                    </select>
                  ) : (
                    <div style={{ fontWeight: 700 }}>{getPlayerNameResolved(stat.playerId, stat.name)}</div>
                  )}
                </Td>
                <Td style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600 }}>
                  {isCurrentInningsEditable ? (
                    <select
                      value={stat.status === 'batting' ? 'not out' : (stat.outHow || 'out')}
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        const val = e.target.value;
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          status: val === 'not out' ? 'batting' : 'out', 
                          outHow: val === 'not out' ? undefined : val 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Dismissal Type"
                      title="Select dismissal type"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 4px', borderRadius: '4px', width: '100%', fontSize: '0.7rem' }}
                    >
                      <option value="not out" style={{ background: '#FFF', color: '#000' }}>Not Out</option>
                      <option value="bowled" style={{ background: '#FFF', color: '#000' }}>Bowled</option>
                      <option value="caught" style={{ background: '#FFF', color: '#000' }}>Caught</option>
                      <option value="lbw" style={{ background: '#FFF', color: '#000' }}>LBW</option>
                      <option value="run out" style={{ background: '#FFF', color: '#000' }}>Run Out</option>
                      <option value="stumped" style={{ background: '#FFF', color: '#000' }}>Stumped</option>
                      <option value="hit wicket" style={{ background: '#FFF', color: '#000' }}>Hit Wicket</option>
                      <option value="retired" style={{ background: '#FFF', color: '#000' }}>Retired</option>
                    </select>
                  ) : (
                    <span style={{ color: stat.status === 'batting' ? '#38BDF8' : '#FFF' }}>
                      {stat.status === 'batting' ? 'not out' : (stat.outHow || 'out')}
                    </span>
                  )}
                </Td>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.fielderId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newBatting = [...editState[innKey].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          fielderId: selectedId, 
                          fielderName: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Select Fielder"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Fielder</option>
                      {bowlingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ opacity: 0.8 }}>{getPlayerNameResolved(stat.fielderId, stat.fielderName)}</div>
                  )}
                </Td>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.bowlerId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newBatting = [...editState[innKey].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          bowlerId: selectedId, 
                          bowlerName: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Select Bowler"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Bowler</option>
                      {bowlingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ opacity: 0.8 }}>{getPlayerNameResolved(stat.bowlerId, stat.bowlerName)}</div>
                  )}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.runs} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], runs: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Runs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FAB005', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  ) : <span style={{ color: '#FAB005', fontWeight: 700 }}>{stat.runs}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                   {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.balls} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], balls: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Balls"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.8 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.balls}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.fours || 0} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], fours: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Fours"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.7rem', opacity: 0.6 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.fours || 0}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.sixes || 0} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], sixes: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Sixes"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.7rem', opacity: 0.6 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.sixes || 0}</span>}
                </Td>
                <Td style={{ textAlign: 'right' }}>
                  {isCurrentInningsEditable ? (
                    <IconButton 
                      onClick={() => {
                        const newBatting = editState[innKey].batting.filter((_: any, i: number) => i !== idx);
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      style={{ color: '#ef4444', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  ) : (
                    <span style={{ opacity: 0.8 }}>
                      {stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </ScoreCardTable>

        <ExtrasRow>
          <span style={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>EXTRAS</span>
          {isCurrentInningsEditable ? (
             <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
               {/* Read-only auto-calculated extras */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>WD</span>
                 <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                   {data.extras?.wides || data.extras?.wide || 0}
                 </span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>NB</span>
                 <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                   {data.extras?.noBalls || data.extras?.noBall || 0}
                 </span>
               </div>
               {/* Manual input extras */}
               {['bye', 'legBye'].map(exKey => (
                 <div key={exKey} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{exKey === 'bye' ? 'BYE' : 'LB'}</span>
                   <input 
                     type="number"
                     value={(data.extras as any)[exKey] || 0}
                     onChange={(e) => {
                        const newExtras = { ...editState[innKey].extras, [exKey]: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], extras: newExtras } });
                     }}
                     aria-label={`Extra ${exKey}`}
                     style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', width: '30px', fontSize: '0.7rem' }}
                   />
                 </div>
               ))}
               <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800 }}>TEAM TOTAL</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38BDF8' }}>
                      {editState && editState[innKey].batting.reduce((s: number, b: any) => s + (Number(b.runs) || 0), 0) + 
                       Object.values(editState[innKey].extras).reduce((s: number, e: any) => s + (Number(e) || 0), 0)}
                    </div>
                 </div>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   style={{ 
                     background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                     color: '#FFF', 
                     padding: '8px 24px', 
                     borderRadius: '12px', 
                     fontWeight: 900, 
                     fontSize: '0.8rem', 
                     cursor: isSaving ? 'wait' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: 8,
                     opacity: isSaving ? 0.7 : 1,
                     boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                   }}
                 >
                   {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                   {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                 </button>
               </div>
             </div>
          ) : (
            <span style={{ fontWeight: 900 }}>
              {Object.values(data.extras || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)}{' '}
              <span style={{ opacity: 0.4, fontSize: '0.65rem', marginLeft: 4 }}>
                (wd {data.extras?.wides ?? 0}, nb {data.extras?.noBalls ?? 0}, b {data.extras?.byes ?? 0}, lb {data.extras?.legByes ?? 0})
              </span>
            </span>
          )}
        </ExtrasRow>

        {!isCurrentInningsEditable && fowData.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>Fall of Wickets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {fowData.map((f: any) => (
                <div key={f.wicket} style={{ fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 800, color: '#38BDF8' }}>{f.runs}-{f.wicket}</span>
                  <span style={{ opacity: 0.5, marginLeft: '4px' }}>({f.batterName}, {f.overs} ov)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Did Not Bat Section */}
        {(() => {
          const battingIds = new Set((data.batting || []).map((b: any) => b.playerId).filter(Boolean));
          const didNotBat = battingSquad.filter((p: any) => p.id && !battingIds.has(p.id));
          if (didNotBat.length === 0) return null;
          return (
            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.4, marginBottom: '6px', textTransform: 'uppercase' }}>Did Not Bat</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {didNotBat.map((p: any, i: number) => (
                  <span key={p.id}>{p.name}{i < didNotBat.length - 1 ? ',' : ''}</span>
                ))}
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '12px' }}>
          <TableTitle style={{ marginBottom: 0 }}><Target size={14} /> BOWLING</TableTitle>
          {isCurrentInningsEditable && (
            <button
              onClick={() => {
                const newBowling = [...editState[innKey].bowling, {
                  playerId: `new-bowler-${Date.now()}`,
                  name: '',
                  overs: 0,
                  maidens: 0,
                  runs: 0,
                  wickets: 0,
                  wides: 0,
                  noBalls: 0,
                  index: editState[innKey].bowling.length
                }];
                setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
              }}
              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> ADD BOWLER
            </button>
          )}
        </div>

        <ScoreCardTable>
          <thead>
            <tr>
               <Th>Bowler</Th>
               <Th style={{ textAlign: 'center' }}>O</Th>
               <Th style={{ textAlign: 'center' }}>M</Th>
               <Th style={{ textAlign: 'center' }}>R</Th>
               <Th style={{ textAlign: 'center' }}>W</Th>
               <Th style={{ textAlign: 'center' }}>WD</Th>
               <Th style={{ textAlign: 'center' }}>NB</Th>
               <Th style={{ textAlign: 'right' }}>{isCurrentInningsEditable ? 'Action' : 'Econ'}</Th>
            </tr>
          </thead>
          <tbody>
            {(data.bowling || []).map((stat: any, idx: number) => (
              <tr key={stat.playerId || idx}>
                <Td>
                  {isCurrentInningsEditable ? (
                    <input 
                      value={stat.name} 
                      list="player-names-list"
                      onChange={(e) => {
                        const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], name: e.target.value };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Bowler Name"
                      placeholder="Bowler Name"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    />
                  ) : (
                    getPlayerNameResolved(stat.playerId, stat.name)
                  )}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number" step="0.1"
                      value={stat.overs} 
                      onChange={(e) => {
                        const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], overs: parseFloat(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Overs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem' }}
                    />
                  ) : stat.overs}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.maidens || 0} 
                      onChange={(e) => {
                        const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], maidens: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Maidens"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.maidens}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.runs} 
                      onChange={(e) => {
                                const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], runs: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Runs Conceded"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem' }}
                    />
                  ) : stat.runs}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.wickets} 
                      onChange={(e) => {
                                const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], wickets: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Wickets"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#38BDF8', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  ) : <span style={{ color: '#38BDF8', fontWeight: 700 }}>{stat.wickets}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                   {isCurrentInningsEditable ? (
                     <input 
                       type="number"
                       value={stat.wides || 0} 
                       onChange={(e) => {
                                  const newBowling = [...editState[innKey].bowling];
                         newBowling[idx] = { ...newBowling[idx], wides: parseInt(e.target.value) || 0 };
                         
                         // Auto-calculate team extras for wides
                         const totalWides = newBowling.reduce((sum: number, b: any) => sum + (b.wides || 0), 0);
                         const newExtras = { ...editState[innKey].extras, wide: totalWides, wides: totalWides };
                         
                         setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling, extras: newExtras } });
                       }}
                       aria-label="Wides"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                     />
                   ) : <span style={{ opacity: 0.6 }}>{stat.wides || 0}</span>}
                 </Td>
                 <Td style={{ textAlign: 'center' }}>
                   {isCurrentInningsEditable ? (
                     <input 
                       type="number"
                       value={stat.noBalls || 0} 
                       onChange={(e) => {
                                  const newBowling = [...editState[innKey].bowling];
                         newBowling[idx] = { ...newBowling[idx], noBalls: parseInt(e.target.value) || 0 };
                         
                         // Auto-calculate team extras for no balls
                         const totalNoBalls = newBowling.reduce((sum: number, b: any) => sum + (b.noBalls || 0), 0);
                         const newExtras = { ...editState[innKey].extras, noBall: totalNoBalls, noBalls: totalNoBalls };
                         
                         setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling, extras: newExtras } });
                       }}
                       aria-label="No Balls"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                     />
                   ) : <span style={{ opacity: 0.6 }}>{stat.noBalls || 0}</span>}
                 </Td>
                <Td style={{ textAlign: 'right' }}>
                  {isCurrentInningsEditable ? (
                    <IconButton 
                      onClick={() => {
                                const newBowling = editState[innKey].bowling.filter((_: any, i: number) => i !== idx);
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      style={{ color: '#ef4444', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  ) : (
                    <span style={{ opacity: 0.8 }}>
                      {stat.overs > 0 ? (stat.runs / stat.overs).toFixed(2) : '0.00'}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 800 }}>
              <Td style={{ fontSize: '0.7rem', opacity: 0.6 }}>TOTAL</Td>
              <Td style={{ textAlign: 'center' }}>
                {(() => {
                  const totalBalls = (data.bowling || []).reduce((s: number, b: any) => {
                    const parts = String(b.overs || 0).split('.');
                    return s + (parseInt(parts[0]) * 6) + (parseInt(parts[1]) || 0);
                  }, 0);
                  return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
                })()}
              </Td>
              <Td style={{ textAlign: 'center' }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.maidens) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center' }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.runs) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center', color: '#38BDF8' }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.wickets) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center', opacity: 0.6 }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.wides) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center', opacity: 0.6 }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.noBalls) || 0), 0)}</Td>
              <Td></Td>
            </tr>
          </tfoot>
        </ScoreCardTable>
      </div>
    );
  };


  // Real-time data subscription
  const storeMatches = useMatchCenter(state => state.matches);
  const liveMatch = storeMatches.find(m => m.id === initialMatch.id);
  const match = isLive && liveMatch ? liveMatch : initialMatch;

  // Helper: Normalize data from different formats
  const normalizedData = useMemo(() => {
    const transform = (inn: any): Innings | null => {
      if (!inn || (!inn.battingStats && !inn.batting && !inn.bowlingStats && !inn.bowling && !inn.extras && !inn.history)) return null;

      // Handle Store format (Map)
      let batting: BattingStat[] = [];
      if (inn.battingStats && typeof inn.battingStats === 'object') {
        batting = Object.entries(inn.battingStats).map(([id, stat]: [string, any]) => ({
          playerId: id,
          name: stat.name || 'Unknown',
          runs: stat.runs || 0,
          balls: stat.balls || 0,
          fours: stat.fours || 0,
          sixes: stat.sixes || 0,
          status: stat.status || 'out',
          outHow: stat.outHow,
          fielderId: stat.fielderId,
          bowlerId: stat.bowlerId,
          index: stat.index
        }));
      } else if (Array.isArray(inn.batting)) {
        // Handle API format (Array)
        batting = inn.batting.map((b: any) => ({
          playerId: b.playerId,
          name: b.name,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          status: b.outHow === 'Not Out' ? 'batting' : 'out',
          outHow: b.outHow,
          fielderId: b.fielderId,
          bowlerId: b.bowlerId,
          index: b.index
        }));
      }

      let bowling: BowlingStat[] = [];
      const history = inn.history || [];
      if (history.length > 0) {
        const allBowlers = [...new Set(history.map((b: any) => b.bowlerId || b.bowler_id).filter(Boolean))];
        bowling = allBowlers.map((bowlerId: any) => {
          const bBalls = history.filter((b: any) => (b.bowlerId === bowlerId || b.bowler_id === bowlerId));
          const legalBalls = bBalls.filter((b: any) => b.isLegal || b.is_legal).length;
          const oversStr = `${Math.floor(legalBalls / 6)}${legalBalls % 6 > 0 ? '.' + (legalBalls % 6) : ''}`;
          const oversNum = parseFloat(oversStr) || 0;
          const runs = bBalls.reduce((s: number, b: any) => s + (Number(b.runs) || 0) + (b.isWide || b.isNoBall || b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
          const wickets = bBalls.filter((b: any) => b.isWicket).length;
          const wides = bBalls.filter((b: any) => b.isWide || b.type === 'wide').length;
          const noBalls = bBalls.filter((b: any) => b.isNoBall || b.type === 'no-ball').length;

          return {
            playerId: bowlerId,
            name: bBalls[0].bowlerName || bBalls[0].bowler_name || 'Bowler',
            overs: oversNum,
            maidens: 0,
            runs,
            wickets,
            wides,
            noBalls,
            index: 0
          };
        });
      } else if (inn.bowlingStats && typeof inn.bowlingStats === 'object') {
        bowling = Object.entries(inn.bowlingStats).map(([id, stat]: [string, any]) => ({
          playerId: id,
          name: stat.name,
          overs: stat.overs || 0,
          maidens: stat.maidens || 0,
          runs: stat.runs || 0,
          wickets: stat.wickets || 0,
          wides: stat.wides || 0,
          noBalls: stat.noBalls || 0,
          index: stat.index
        }));
      } else if (Array.isArray(inn.bowling)) {
        bowling = inn.bowling.map((b: any) => ({
          playerId: b.playerId,
          name: b.name,
          overs: b.overs,
          maidens: b.maidens || 0,
          runs: b.runsConceded || b.runs,
          wickets: b.wickets,
          wides: b.wides || 0,
          noBalls: b.noBalls || 0,
          index: b.index
        }));
      }

      const extras = {
        wides: inn.extras?.wides || inn.extras?.wide || 0,
        noBalls: inn.extras?.noBalls || inn.extras?.no_ball || 0,
        byes: inn.extras?.byes || 0,
        legByes: inn.extras?.legByes || 0,
        penalty: inn.extras?.penalty || 0
      };

      return {
        batting: (batting || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        bowling: (bowling || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        extras,
        totalRuns: inn.totalRuns || 0,
        wickets: inn.wickets || inn.totalWickets || 0,
        totalBalls: inn.totalBalls || (inn.totalOvers ? Math.floor(inn.totalOvers) * 6 + Math.round((inn.totalOvers % 1) * 10) : 0),
        history: inn.history || [],
        battingTeamId: inn.battingTeamId || inn.batting_team_id
      };
    };

    const ld = isLive && match.liveData ? (typeof match.liveData === 'string' ? JSON.parse(match.liveData) : match.liveData) : null;
    const source = ld || match.scorecard || {};

    return {
      innings1: transform(source.innings1),
      innings2: transform(source.innings2)
    };
  }, [match, isLive]);

  useEffect(() => {
    if (isEditable && !editState) {
      setEditState({
        venue: initialMatch.venue || match.venue || '',
        matchFormat: initialMatch.matchFormat || match.matchFormat || 'T20',
        maxOvers: initialMatch.maxOvers || match.maxOvers || 20,
        toss: initialMatch.toss || match.toss || { winnerId: '', decision: 'bat' },
        innings1: normalizedData.innings1 || {
          batting: [],
          bowling: [],
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
          totalRuns: 0,
          wickets: 0,
          totalBalls: 0
        },
        innings2: normalizedData.innings2 || {
          batting: [],
          bowling: [],
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
          totalRuns: 0,
          wickets: 0,
          totalBalls: 0
        }
      });
    }
  }, [isEditable, editState, normalizedData, initialMatch, match]);


  // Capture functionality
  const downloadScorecard = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        backgroundColor: '#0F172A',
        style: {
          transform: 'scale(1)',
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `scorecard-${match.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error capturing scorecard:', err);
    }
  };

  const getTeamName = (teamId: string) => {
    const normalizedId = teamId === '00000000-0000-0000-0000-000000000000' || !teamId ? 'IND_STRIKERS' : teamId;
    const homeId = initialMatch.homeTeamId === '00000000-0000-0000-0000-000000000000' || !initialMatch.homeTeamId ? 'IND_STRIKERS' : initialMatch.homeTeamId;
    
    if (normalizedId === homeId) return initialMatch.homeTeamName;
    return initialMatch.opponentName;
  };

  const getTeamLogo = (teamId: string) => {
    const normalizedId = teamId === '00000000-0000-0000-0000-000000000000' || !teamId ? 'IND_STRIKERS' : teamId;
    const homeId = initialMatch.homeTeamId === '00000000-0000-0000-0000-000000000000' || !initialMatch.homeTeamId ? 'IND_STRIKERS' : initialMatch.homeTeamId;

    if (normalizedId === homeId) return initialMatch.homeTeamLogo || initialMatch.homeLogo;
    return initialMatch.opponentLogo;
  };

  return (
    <PremiumModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <PremiumModalContent ref={containerRef}>
        <ModalHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconButton onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF' }}>
              <ChevronLeft size={18} />
            </IconButton>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
              Match Center
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton onClick={downloadScorecard} style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF' }}>
              <Share2 size={16} />
            </IconButton>
            <IconButton onClick={onClose} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <X size={16} />
            </IconButton>
          </div>
        </ModalHeader>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 20 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 20,
                zIndex: 6000,
                background: '#10B981',
                color: '#FFF',
                padding: '12px 24px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                fontWeight: 800
              }}
            >
              <CheckCircle2 size={20} />
              Scorecard Saved Successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <ScrollContent ref={scrollContentRef}>
          <MatchHeaderCard>
            <TournamentLabel>{initialMatch.tournamentName || 'Match Details'}</TournamentLabel>
            
            <TeamsHorizontalRow>
              <TeamBlock>
                <TeamLogoFrame>
                  <img 
                    src={getTeamLogo(initialMatch.homeTeamId) || '/assets/default_team.png'} 
                    alt="Home" 
                    style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                  />
                </TeamLogoFrame>
                <TeamInfo>
                  <TeamNameLabel>{getTeamName(initialMatch.homeTeamId)}</TeamNameLabel>
                  <ScoreValue>
                    {normalizedData.innings1?.battingTeamId === initialMatch.homeTeamId ? (
                      <>
                        {normalizedData.innings1?.totalRuns}
                        <span>/{normalizedData.innings1?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings1?.totalBalls || 0)})
                        </div>
                      </>
                    ) : normalizedData.innings2?.battingTeamId === initialMatch.homeTeamId ? (
                      <>
                        {normalizedData.innings2?.totalRuns}
                        <span>/{normalizedData.innings2?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings2?.totalBalls || 0)})
                        </div>
                      </>
                    ) : '-'}
                  </ScoreValue>
                </TeamInfo>
              </TeamBlock>

              <VSBadgeHeader>VS</VSBadgeHeader>

              <TeamBlock $reverse>
                <TeamLogoFrame>
                  <img 
                    src={getTeamLogo(initialMatch.opponentId) || '/assets/default_team.png'} 
                    alt="Away" 
                    style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                  />
                </TeamLogoFrame>
                <TeamInfo $align="right">
                  <TeamNameLabel>{getTeamName(initialMatch.opponentId)}</TeamNameLabel>
                  <ScoreValue>
                    {normalizedData.innings1?.battingTeamId === initialMatch.opponentId ? (
                      <>
                        {normalizedData.innings1?.totalRuns}
                        <span>/{normalizedData.innings1?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings1?.totalBalls || 0)})
                        </div>
                      </>
                    ) : normalizedData.innings2?.battingTeamId === initialMatch.opponentId ? (
                      <>
                        {normalizedData.innings2?.totalRuns}
                        <span>/{normalizedData.innings2?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings2?.totalBalls || 0)})
                        </div>
                      </>
                    ) : '-'}
                  </ScoreValue>
                </TeamInfo>
              </TeamBlock>
            </TeamsHorizontalRow>

            <ResultHighlightBar>
              {match.status === 'live' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}
                  />
                  LIVE MATCH
                </div>
              ) : match.matchResult || 'Match in progress'}
            </ResultHighlightBar>

            <MetaGrid>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <MetaItemHeader><MapPin size={10} /> Venue</MetaItemHeader>
                <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  {grounds.find((g: any) => g.id === match.venue)?.name || match.venue || 'TBD'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <MetaItemHeader><Clock size={10} /> Date</MetaItemHeader>
                <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'TBD'}
                </div>
              </div>
            </MetaGrid>
          </MatchHeaderCard>

          <TabContainer>
            <TabButton $active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>Scorecard</TabButton>
            <TabButton $active={tab === 'info'} onClick={() => setTab('info')}>Match Info</TabButton>
            <TabButton $active={tab === 'commentary'} onClick={() => setTab('commentary')}>Commentary</TabButton>
            <TabButton $active={tab === 'analytics'} onClick={() => setTab('analytics')}>Analytics</TabButton>
          </TabContainer>

          <div style={{ marginTop: 24 }}>
            {tab === 'scorecard' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <InningsAccordionHeader 
                    $active={selectedInnings === 1}
                    onClick={() => setSelectedInnings(1)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: '#38BDF8', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900 }}>1st INN</div>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{getTeamName(normalizedData.innings1?.battingTeamId || '')}</div>
                    </div>
                    <div style={{ fontWeight: 900 }}>
                      {normalizedData.innings1?.totalRuns}/{normalizedData.innings1?.wickets} 
                      <span style={{ opacity: 0.5, fontSize: '0.7rem', marginLeft: 8 }}>({formatOvers(normalizedData.innings1?.totalBalls || 0)})</span>
                    </div>
                  </InningsAccordionHeader>
                  {selectedInnings === 1 && renderInningsTable(editState?.innings1 || normalizedData.innings1, 1)}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <InningsAccordionHeader 
                    $active={selectedInnings === 2}
                    onClick={() => setSelectedInnings(2)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: '#38BDF8', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900 }}>2nd INN</div>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{getTeamName(normalizedData.innings2?.battingTeamId || '')}</div>
                    </div>
                    <div style={{ fontWeight: 900 }}>
                      {normalizedData.innings2?.totalRuns}/{normalizedData.innings2?.wickets} 
                      <span style={{ opacity: 0.5, fontSize: '0.7rem', marginLeft: 8 }}>({formatOvers(normalizedData.innings2?.totalBalls || 0)})</span>
                    </div>
                  </InningsAccordionHeader>
                  {selectedInnings === 2 && renderInningsTable(editState?.innings2 || normalizedData.innings2, 2)}
                </div>
              </>
            )}

            {tab === 'info' && (
              <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                <TableTitle><Info size={14} /> Match Information</TableTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Series</div>
                    <div style={{ fontWeight: 700 }}>{initialMatch.tournamentName}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Match Type</div>
                    <div style={{ fontWeight: 700 }}>{match.matchFormat}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Venue</div>
                    <div style={{ fontWeight: 700 }}>{grounds.find((g: any) => g.id === match.venue)?.name || match.venue}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Toss</div>
                    <div style={{ fontWeight: 700 }}>
                      {getTeamName(match.toss?.winnerId || '')} won and chose to {match.toss?.decision}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'commentary' && (
              <div style={{ padding: 10 }}>
                 <TableTitle><Clock size={14} /> LIVE COMMENTARY</TableTitle>
                 {(match.history || []).slice().reverse().map((ball: any, i: number) => (
                   <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ minWidth: 40, fontWeight: 900, color: '#38BDF8' }}>{(ball.overs || (ball.over_no + '.' + ball.ball_no))}</div>
                     <div>
                       <div style={{ fontWeight: 800 }}>{ball.commentary || `${ball.bowlerName} to ${ball.batterName}, ${ball.runs} run(s)`}</div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </ScrollContent>

        <datalist id="player-names-list">
          {players.map(p => <option key={p.id} value={p.name} />)}
          {opponents.flatMap(o => o.players || []).map((p: any) => <option key={p.id} value={p.name} />)}
        </datalist>
      </PremiumModalContent>
    </PremiumModalOverlay>
  );
};
