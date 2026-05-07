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
                const key = `innings${innNo}` as 'innings1' | 'innings2';
                const newBatting = [...editState[key].batting, {
                  playerId: `new-${Date.now()}`,
                  name: '',
                  runs: 0,
                  balls: 0,
                  fours: 0,
                  sixes: 0,
                  status: 'batting',
                  index: editState[key].batting.length
                }];
                setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
              <Th>Bowler</Th>
              <Th>Fielder</Th>
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = battingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          playerId: selectedId, 
                          name: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        const val = e.target.value;
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          status: val === 'not out' ? 'batting' : 'out', 
                          outHow: val === 'not out' ? undefined : val 
                        };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                      value={stat.bowlerId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          bowlerId: selectedId, 
                          bowlerName: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.fielderId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          fielderId: selectedId, 
                          fielderName: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.runs} 
                      onChange={(e) => {
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        newBatting[idx] = { ...newBatting[idx], runs: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        newBatting[idx] = { ...newBatting[idx], balls: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        newBatting[idx] = { ...newBatting[idx], fours: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = [...editState[key].batting];
                        newBatting[idx] = { ...newBatting[idx], sixes: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBatting = editState[key].batting.filter((_: any, i: number) => i !== idx);
                        setEditState({ ...editState, [key]: { ...editState[key], batting: newBatting } });
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {['wide', 'noBall', 'bye', 'legBye'].map(exKey => (
                <div key={exKey} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{exKey.substring(0, 2).toUpperCase()}</span>
                  <input 
                    type="number"
                    value={(data.extras as any)[exKey] || 0}
                    onChange={(e) => {
                      const key = `innings${innNo}` as 'innings1' | 'innings2';
                      const newExtras = { ...editState[key].extras, [exKey]: parseInt(e.target.value) || 0 };
                      setEditState({ ...editState, [key]: { ...editState[key], extras: newExtras } });
                    }}
                    aria-label={`Extra ${exKey}`}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', width: '30px', fontSize: '0.7rem' }}
                  />
                </div>
              ))}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '12px' }}>
          <TableTitle style={{ marginBottom: 0 }}><Target size={14} /> BOWLING</TableTitle>
          {isCurrentInningsEditable && (
            <button
              onClick={() => {
                const key = `innings${innNo}` as 'innings1' | 'innings2';
                const newBowling = [...editState[key].bowling, {
                  playerId: `new-bowler-${Date.now()}`,
                  name: '',
                  overs: 0,
                  maidens: 0,
                  runs: 0,
                  wickets: 0,
                  wides: 0,
                  noBalls: 0,
                  index: editState[key].bowling.length
                }];
                setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBowling = [...editState[key].bowling];
                        newBowling[idx] = { ...newBowling[idx], name: e.target.value };
                        setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBowling = [...editState[key].bowling];
                        newBowling[idx] = { ...newBowling[idx], overs: parseFloat(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBowling = [...editState[key].bowling];
                        newBowling[idx] = { ...newBowling[idx], maidens: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBowling = [...editState[key].bowling];
                        newBowling[idx] = { ...newBowling[idx], runs: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
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
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBowling = [...editState[key].bowling];
                        newBowling[idx] = { ...newBowling[idx], wickets: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
                      }}
                      aria-label="Wickets"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#38BDF8', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  ) : <span style={{ color: '#38BDF8', fontWeight: 700 }}>{stat.wickets}</span>}
                </Td>
                <Td style={{ textAlign: 'right' }}>
                  {isCurrentInningsEditable ? (
                    <IconButton 
                      onClick={() => {
                        const key = `innings${innNo}` as 'innings1' | 'innings2';
                        const newBowling = editState[key].bowling.filter((_: any, i: number) => i !== idx);
                        setEditState({ ...editState, [key]: { ...editState[key], bowling: newBowling } });
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
  }, [isEditable, normalizedData, initialMatch, editState]);

  // Resolve ground name from match
  const resolvedGround = (() => {
    if (match.groundId && grounds.length > 0) {
      const g = grounds.find((g: any) => g.id === match.groundId);
      if (g) return g.name;
    }
    if (typeof match.venue === 'string' && match.venue) return match.venue;
    if (typeof match.venue === 'object' && (match as any).venue?.name) return (match as any).venue.name;
    return match.venue || 'TBD';
  })();

  // Resolve toss string
  const tossString = (() => {
    const winnerId = match.toss?.winnerId || match.tossWinnerId || match.toss_winner_id;
    const choice = match.toss?.choice || match.tossChoice || match.toss_choice || '';
    
    let winnerName = match.toss?.winner || match.toss_winner_name || match.tossWinner || match.toss_winner || '';
    
    // Check if the toss winner string already matches a team name
    if (!winnerName && winnerId) {
        if (winnerId === '00000000-0000-0000-0000-000000000000' || winnerId === 'IND_STRIKERS') winnerName = 'Indian Strikers';
        else if (winnerId === (match.opponentId || match.opponent_id)) winnerName = match.opponentName || 'Opponent';
    }

    if (!winnerName && (match.tossDetails || match.toss_result || match.toss_summary)) {
        return match.tossDetails || match.toss_result || match.toss_summary;
    }

    if (winnerName && choice) return `${winnerName} won the toss and elected to ${choice}`;
    if (winnerName) return `${winnerName} won the toss`;
    return null;
  })();

  // Resolve team logos and names
  // Resolve team logos and names - Enhanced for robust identity resolution
  const isInsHome = 
    match.homeTeamId === '00000000-0000-0000-0000-000000000000' || 
    match.homeTeamId === 'IND_STRIKERS' ||
    match.homeTeamName?.toUpperCase()?.includes('INDIAN STRIKERS') ||
    (!match.homeTeamId && !match.homeTeamName); // Fallback for legacy data where Indian Strikers is implicit

  const isInsAway = 
    match.opponentId === '00000000-0000-0000-0000-000000000000' || 
    match.opponentId === 'IND_STRIKERS' ||
    match.opponentName?.toUpperCase()?.includes('INDIAN STRIKERS');

  const teamAName = isInsHome ? 'INDIAN STRIKERS' : (match.homeTeamName || match.teamA || 'TEAM A');
  const teamBName = isInsAway ? 'INDIAN STRIKERS' : (match.opponentName || match.teamB || 'TEAM B');

  const teamALogoUrl = isInsHome ? '/INS%20LOGO.PNG' : (opponents.find((o: any) => o.id === match.homeTeamId)?.logoUrl || '/INS%20LOGO.PNG');
  const teamBLogoUrl = isInsAway ? '/INS%20LOGO.PNG' : (opponents.find((o: any) => o.id === (match.opponentId || match.opponent_id))?.logoUrl || '/INS%20LOGO.PNG');

  const teamAScore = match.isHomeBattingFirst ? normalizedData.innings1 : normalizedData.innings2;
  const teamBScore = match.isHomeBattingFirst ? normalizedData.innings2 : normalizedData.innings1;

  const innings1Name = match.isHomeBattingFirst ? teamAName : teamBName;
  const innings2Name = match.isHomeBattingFirst ? teamBName : teamAName;
  const innings1Logo = match.isHomeBattingFirst ? teamALogoUrl : teamBLogoUrl;
  const innings2Logo = match.isHomeBattingFirst ? teamBLogoUrl : teamALogoUrl;
  
  const score1 = match.isHomeBattingFirst ? normalizedData.innings1 : normalizedData.innings2;
  const score2 = match.isHomeBattingFirst ? normalizedData.innings2 : normalizedData.innings1;

  const handleDownloadImage = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        backgroundColor: '#111',
        pixelRatio: 2,
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `Scorecard_${match.opponentName || 'Match'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${teamAName} Match Scorecard`,
      text: `Checkout the scorecard for ${teamAName} vs ${teamBName}: ${match.finalScoreHome?.runs}/${match.finalScoreHome?.wickets} vs ${match.finalScoreAway?.runs}/${match.finalScoreAway?.wickets}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  return (
    <PremiumModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <PremiumModalContent onClick={e => e.stopPropagation()} ref={containerRef}>
        {!isEditable && (
          <ModalHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconButton onClick={onClose}><ChevronLeft size={24} /></IconButton>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', margin: 0 }}>MATCH CENTER</h2>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>{match.match_id || match.id}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <IconButton onClick={handleDownloadImage} title="Download Scorecard"><ImageIcon size={20} /></IconButton>
              <IconButton onClick={handleShare} title="Share Scorecard"><Share2 size={20} /></IconButton>
              <IconButton onClick={onClose} title="Close"><X size={20} /></IconButton>
            </div>
          </ModalHeader>
        )}

        {isEditable && (
          <ModalHeader style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconButton onClick={onClose} style={{ color: '#FFF' }}><ChevronLeft size={24} /></IconButton>
              <div style={{ color: '#FFF' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>EDIT SCORECARD</h2>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Update historical match data</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={async () => {
                  if (!onSave || !editState) return;
                  setIsSaving(true);
                  try {
                    await onSave(editState);
                    onClose();
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                style={{ 
                  background: '#38BDF8', 
                  color: '#000', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontWeight: 900, 
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                <Save size={16} /> {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
              <IconButton onClick={onClose} style={{ color: '#FFF' }}><X size={20} /></IconButton>
            </div>
          </ModalHeader>
        )}

        <ScrollContent ref={scrollContentRef}>
          {!isEditable && (
            <MatchHeaderCard>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)', zIndex: 0 }} />
              
              <TournamentLabel>
                {match.tournament || match.tournamentName || match.leagueName || 'RCA T20 Tournament'}
                {(match.matchType || match.stage) && (
                  <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 4, letterSpacing: 1 }}>
                    {`${match.matchType || match.stage}${ (match.matchType || match.stage).toLowerCase().includes('match') ? '' : ' Match' }`}
                  </div>
                )}
              </TournamentLabel>
              
              <TeamsHorizontalRow>
                <TeamBlock>
                  <TeamLogoFrame>
                    <img src={teamALogoUrl || '/INS%20LOGO.PNG'} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.3))' }} onError={(e) => (e.currentTarget.src = '/INS%20LOGO.PNG')} />
                  </TeamLogoFrame>
                  <TeamInfo>
                    <TeamNameLabel>{teamAName}</TeamNameLabel>
                    <ScoreValue>
                      {teamAScore?.totalRuns || 0}/<span style={{ fontSize: '1.6rem', opacity: 1, fontWeight: 900 }}>{teamAScore?.wickets || 0}</span>
                    </ScoreValue>
                  </TeamInfo>
                </TeamBlock>

                <VSBadgeHeader>VS</VSBadgeHeader>

                <TeamBlock $reverse>
                  <TeamLogoFrame>
                    <img src={teamBLogoUrl || '/INS%20LOGO.PNG'} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(251, 176, 5, 0.3))' }} onError={(e) => (e.currentTarget.src = '/INS%20LOGO.PNG')} />
                  </TeamLogoFrame>
                  <TeamInfo $align="right">
                    <TeamNameLabel>{teamBName}</TeamNameLabel>
                    <ScoreValue>
                      {teamBScore?.totalRuns || 0}/<span style={{ fontSize: '1.6rem', opacity: 1, fontWeight: 900 }}>{teamBScore?.wickets || 0}</span>
                    </ScoreValue>
                  </TeamInfo>
                </TeamBlock>
              </TeamsHorizontalRow>

              <ResultHighlightBar>
                {match.resultSummary || match.resultNote || 'Match in Progress'}
              </ResultHighlightBar>

              <MetaGrid>
                <MetaItemHeader><MapPin size={12} /> {resolvedGround}</MetaItemHeader>
                <MetaItemHeader><Zap size={12} /> {match.overs || match.maxOvers || 20} OVERS</MetaItemHeader>
                {(match.date || match.matchDate) && (
                  <MetaItemHeader>
                    <Clock size={12} /> {(() => {
                      const d = new Date(match.date || match.matchDate);
                      const day = d.getDate().toString().padStart(2, '0');
                      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                      const month = months[d.getMonth()];
                      const year = d.getFullYear();
                      return `${day} ${month} ${year}`;
                    })()}
                  </MetaItemHeader>
                )}
                {tossString && <MetaItemHeader><Target size={12} /> {tossString}</MetaItemHeader>}
              </MetaGrid>
            </MatchHeaderCard>
          )}

          <TabContainer>
            <TabButton $active={tab === 'info'} onClick={() => setTab('info')}>MATCH INFO</TabButton>
            <TabButton $active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>SCOREBOARD</TabButton>
            <TabButton $active={tab === 'commentary'} onClick={() => setTab('commentary')}>COMMENTARY</TabButton>
            <TabButton $active={tab === 'analytics'} onClick={() => setTab('analytics')}>ANALYTICS</TabButton>
          </TabContainer>

          <div style={{ marginTop: '24px' }}>
            {tab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 800, marginBottom: '4px' }}>VENUE</div>
                    <div style={{ fontWeight: 700 }}>{resolvedGround}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 800, marginBottom: '4px' }}>FORMAT</div>
                    <div style={{ fontWeight: 700 }}>{match.matchFormat || 'T20'} ({match.maxOvers || 20} Ov)</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <TableTitle style={{ color: isInsHome ? '#38BDF8' : '#FFF' }}>{teamAName} XI</TableTitle>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      {(match.homeTeamXI || []).map((id: string) => (
                        <div key={id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: 600 }}>
                          {getPlayerNameResolved(id)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <TableTitle style={{ color: isInsAway ? '#38BDF8' : '#FFF' }}>{teamBName} XI</TableTitle>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      {(match.opponentTeamXI || []).map((id: string) => (
                        <div key={id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: 600 }}>
                          {getPlayerNameResolved(id)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'scorecard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <InningsAccordionHeader 
                  $active={openInnings.has(1)}
                  onClick={() => {
                    const newOpen = new Set(openInnings);
                    if (newOpen.has(1)) newOpen.delete(1); else newOpen.add(1);
                    setOpenInnings(newOpen);
                    setSelectedInnings(1);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={innings1Logo || '/INS%20LOGO.PNG'} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => (e.currentTarget.src = '/INS%20LOGO.PNG')} />
                    <span style={{ fontWeight: 600 }}>{innings1Name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {(isEditable && editState ? editState.innings1 : normalizedData.innings1)?.totalRuns || 0}/{(isEditable && editState ? editState.innings1 : normalizedData.innings1)?.wickets || 0}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                        ({formatOvers((isEditable && editState ? editState.innings1 : normalizedData.innings1)?.totalBalls || 0)})
                      </div>
                    </div>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        transform: openInnings.has(1) ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.3s'
                      }} 
                    />
                  </div>
                </InningsAccordionHeader>

                <AnimatePresence>
                  {openInnings.has(1) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      {renderInningsTable(isEditable && editState ? editState.innings1 : normalizedData.innings1, 1)}
                    </motion.div>
                  )}
                </AnimatePresence>

                {(isEditable && editState ? editState.innings2 : normalizedData.innings2) && (
                  <>
                    <InningsAccordionHeader 
                      $active={openInnings.has(2)}
                      onClick={() => {
                        const newOpen = new Set(openInnings);
                        if (newOpen.has(2)) newOpen.delete(2); else newOpen.add(2);
                        setOpenInnings(newOpen);
                        setSelectedInnings(2);
                      }}
                      style={{ marginTop: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={innings2Logo || '/INS%20LOGO.PNG'} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => (e.currentTarget.src = '/INS%20LOGO.PNG')} />
                        <span style={{ fontWeight: 600 }}>{innings2Name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                            {(isEditable && editState ? editState.innings2 : normalizedData.innings2)?.totalRuns || 0}/{(isEditable && editState ? editState.innings2 : normalizedData.innings2)?.wickets || 0}
                          </div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                            ({formatOvers((isEditable && editState ? editState.innings2 : normalizedData.innings2)?.totalBalls || 0)})
                          </div>
                        </div>
                        <ChevronDown 
                          size={18} 
                          style={{ 
                            transform: openInnings.has(2) ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.3s'
                          }} 
                        />
                      </div>
                    </InningsAccordionHeader>

                    <AnimatePresence>
                      {openInnings.has(2) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {renderInningsTable(isEditable && editState ? editState.innings2 : normalizedData.innings2, 2)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            )}

            {tab === 'commentary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(() => {
                  const currentData = selectedInnings === 1 ? normalizedData.innings1 : normalizedData.innings2;
                  const historyData = currentData?.history;
                  const historyFiltered = (Array.isArray(historyData) ? historyData : [])
                    .filter(b => b && typeof b === 'object')
                    .reverse();

                  if (historyFiltered.length === 0) {
                    return <div key="no-comm" style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>NO COMMENTARY AVAILABLE FOR THIS MATCH</div>;
                  }

                  const overGroups: Record<number, any[]> = {};
                  historyFiltered.forEach(ball => {
                    const ov = ball.overNumber ?? ball.over_number ?? 0;
                    if (!overGroups[ov]) overGroups[ov] = [];
                    overGroups[ov].push(ball);
                  });
                  const sortedOvers = Object.keys(overGroups).map(Number).sort((a, b) => b - a);

                  return (
                    <>
                      {sortedOvers.map(overNum => {
                        const balls = overGroups[overNum];
                        if (!balls || balls.length === 0) return null;
                        const overRuns = balls.reduce((s, b) => s + (Number(b.runs) || 0) + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                        const lastBall = balls[0];
                        const bName = getPlayerNameResolved(lastBall?.bowlerId || lastBall?.bowler_id);

                        return (
                          <div key={overNum}>
                            <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderRadius: 12, overflow: 'hidden', display: 'flex', color: '#FFF', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', marginBottom: 16, fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)', position: 'sticky', top: 0, zIndex: 10 }}>
                              <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(56, 189, 248, 0.2)', minWidth: 90 }}>
                                <div style={{ color: '#38BDF8', fontSize: '0.65rem', letterSpacing: 2 }}>OVER {overNum + 1}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{overRuns} RUNS</div>
                              </div>
                              <div style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
                                <span style={{ opacity: 0.8, fontSize: '0.65rem' }}>BOWLER: {bName.toUpperCase()}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
                              {balls.map((ball, i) => (
                                <div key={i} style={{ display: 'flex', gap: 14, padding: '12px', background: '#111827', borderRadius: 10, borderLeft: `3px solid ${ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                  <span style={{ opacity: 0.4, fontWeight: 900, fontSize: '0.7rem', minWidth: 28, paddingTop: 2 }}>{overNum}.{ball.ballNumber ?? ball.ball_number ?? i}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ball.isWicket ? '#FF4D4D' : '#FFF' }}>{ball.commentary || `${ball.runs} run(s)`}</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: 4 }}>{getPlayerNameResolved(ball.bowlerId)} to {getPlayerNameResolved(ball.strikerId)}</div>
                                    {ball.isWicket && <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, fontSize: '0.7rem', fontWeight: 900, color: '#FF4D4D', display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={10} /> {ball.out_how || 'OUT!'} — {getPlayerNameResolved(ball.strikerId || ball.striker_id)} has to depart.</div>}
                                  </div>
                                  <span style={{ fontWeight: 950, fontSize: '1rem', color: ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.7)', minWidth: 20, textAlign: 'center' }}>
                                    {ball.isWicket ? 'W' : (ball.type === 'wide' ? 'WD' : (ball.type === 'no-ball' ? 'NB' : ball.runs))}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div style={{ height: 30 }} />
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}

            {tab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
                {(() => {
                  const overStats: Record<number, any> = {};
                  const maxOvers = match.maxOvers || 20;

                  for (let i = 1; i <= maxOvers; i++) {
                    overStats[i] = { over: i, runs1: 0, cumulative1: 0, runs2: 0, cumulative2: 0, wickets1: 0, wickets2: 0 };
                  }

                  const processInn = (inn: any, key: string) => {
                    if (!inn) return;
                    let cum = 0;
                    const h = Array.isArray(inn.history) ? inn.history : [];
                    const groups: Record<number, any[]> = {};
                    h.forEach((b: any) => {
                      const ov = (b.overNumber ?? b.over_number ?? 0) + 1;
                      if (!groups[ov]) groups[ov] = [];
                      groups[ov].push(b);
                    });

                    for (let i = 1; i <= maxOvers; i++) {
                      const balls = groups[i] || [];
                      const runs = balls.reduce((s, b) => s + (Number(b.runs) || 0) + (b.isWide || b.isNoBall || b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const wkts = balls.filter(b => b.isWicket).length;
                      cum += runs;
                      overStats[i][`runs${key}`] = runs;
                      overStats[i][`cumulative${key}`] = cum;
                      overStats[i][`wickets${key}`] = wkts;
                    }
                  };

                  processInn(normalizedData.innings1, '1');
                  processInn(normalizedData.innings2, '2');

                  const analyticsData = Object.values(overStats);
                  const team1Name = match.isHomeBattingFirst ? teamAName : teamBName;
                  const team2Name = match.isHomeBattingFirst ? teamBName : teamAName;

                  const ins1Color = isInsHome === match.isHomeBattingFirst ? '#38BDF8' : '#FAB005';
                  const ins2Color = ins1Color === '#38BDF8' ? '#FAB005' : '#38BDF8';

                  return (
                    <>
                      <div style={{ background: '#1E293B', padding: '20px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <TableTitle style={{ marginLeft: 10 }}><BarChart2 size={14} /> MANHATTAN (Runs per Over)</TableTitle>
                        <div style={{ width: '100%', height: 250, marginTop: 20 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="over" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={30} />
                              <Tooltip
                                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                              <Bar dataKey="runs1" name={team1Name} fill={ins1Color} radius={[4, 4, 0, 0]} barSize={8} />
                              <Bar dataKey="runs2" name={team2Name} fill={ins2Color} radius={[4, 4, 0, 0]} barSize={8} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div style={{ background: '#1E293B', padding: '20px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <TableTitle style={{ marginLeft: 10 }}><BarChart2 size={14} /> WORM (Cumulative Runs)</TableTitle>
                        <div style={{ width: '100%', height: 250, marginTop: 20 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="over" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={30} />
                              <Tooltip
                                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                              />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                              <Line type="monotone" name={team1Name} dataKey="cumulative1" stroke={ins1Color} strokeWidth={3} dot={{ r: 3, fill: ins1Color }} />
                              <Line type="monotone" name={team2Name} dataKey="cumulative2" stroke={ins2Color} strokeWidth={3} dot={{ r: 3, fill: ins2Color }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        <datalist id="player-names-list">
          {(players || []).map(p => (
            <option key={p.id || p.player_id} value={p.name} />
          ))}
          {/* Also include opponent players for Bowler/Fielder fields */}
          {(() => {
            const opp = opponents.find(o => o.id === initialMatch.opponentId);
            return (opp?.players || []).map((p: any) => (
              <option key={p.id || `opp-${p.name}`} value={p.name} />
            ));
          })()}
        </datalist>
        </ScrollContent>

        <FABContainer>
          <FloatingButton
            onClick={() => scrollContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Scroll to top"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowUp size={16} />
          </FloatingButton>
          <FloatingButton
            onClick={() => {
              if (openInnings.size > 0) setOpenInnings(new Set());
              else setOpenInnings(new Set([1, 2]));
            }}
            title={openInnings.size > 0 ? "Collapse all" : "Expand all"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {openInnings.size > 0 ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </FloatingButton>
        </FABContainer>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              zIndex: 10000,
              background: '#10B981',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            <CheckCircle2 size={24} />
            MATCH DATA SYNCED SUCCESSFULLY
          </motion.div>
        )}
      </PremiumModalContent>
    </PremiumModalOverlay>
  );
};
