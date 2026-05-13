import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AnalyticsDrawerOverlay, AnalyticsDrawerContent, AnalyticsHeader,
  ChartContainer, FilterChip, IconButton
} from './ScorerStyles';
import { X } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';
import { UnifiedMatchStore } from '../../types';

export interface AnalyticsDrawerProps {
  isOpen: boolean;
  activeChart: 'manhattan' | 'worm';
  manhattanData: any[];
  analyticsWormData: { innings1: any[]; innings2: any[] };
  store: UnifiedMatchStore;
  onClose: () => void;
  onChartChange: (chart: 'manhattan' | 'worm') => void;
  getPlayerNameForChart: (id: string) => string;
}


// ─── Component ───────────────────────────────────────────────────────────────
export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen, activeChart, manhattanData, analyticsWormData, store,
  onClose, onChartChange, getPlayerNameForChart,
}) => {
  const showAnalyticsDrawer = isOpen;
  const setShowAnalyticsDrawer = (v: boolean) => { if (!v) onClose(); };
  const setActiveChart = onChartChange;

  // ─── Internal chart helpers (need getPlayerNameForChart in scope) ───────────
  const WormDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) return null;
    if (!payload || !payload.isWicket) return null;
    return <circle cx={cx} cy={cy} r={5} fill="#FF4D4D" stroke="#FFF" strokeWidth={2} />;
  };

  const WormTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0]?.payload;
      if (!data) return null;
      return (
        <div style={{ background: '#001F3F', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 9999 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#FFF' }}>Over: {Number(label || 0).toFixed(1)}</p>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>Runs: {data.runs || 0}</p>
          {data.isWicket && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 900, color: '#FF4D4D' }}>
              WICKET: {data.outPlayer ? getPlayerNameForChart(data.outPlayer) : 'Batsman'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
          <AnimatePresence>
            {showAnalyticsDrawer && (
              <AnalyticsDrawerOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAnalyticsDrawer(false)}
              >
                <AnalyticsDrawerContent
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  onClick={e => e.stopPropagation()}
                >
                  <AnalyticsHeader>
                    <h2>{activeChart === 'manhattan' ? 'MATCH HEARTBEAT' : 'CHASE PROFILE'}</h2>
                    <IconButton onClick={() => setShowAnalyticsDrawer(false)} style={{ color: '#FFF' }}>
                      <X size={20} />
                    </IconButton>
                  </AnalyticsHeader>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <FilterChip
                      $active={activeChart === 'manhattan'}
                      onClick={() => setActiveChart('manhattan')}
                      aria-pressed={activeChart === 'manhattan' ? "true" : "false"}
                    >
                      MANHATTAN
                    </FilterChip>
                    <FilterChip
                      $active={activeChart === 'worm'}
                      onClick={() => setActiveChart('worm')}
                      aria-pressed={activeChart === 'worm' ? "true" : "false"}
                    >
                      WORM CHART
                    </FilterChip>
                  </div>

                  <ChartContainer style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    <h3 style={{ marginBottom: 12 }}>
                      {activeChart === 'manhattan' ? 'Runs Per Over (Including Extras)' : 'Cumulative Progress Comparison'}
                    </h3>

                    <div style={{ flex: 1, width: '100%', position: 'relative' }}>
                      {manhattanData.length === 0 && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: '0.9rem', fontWeight: 700, letterSpacing: 2 }}>
                          NO SCORING DATA YET
                        </div>
                      )}
                      {activeChart === 'manhattan' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={manhattanData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis
                              dataKey="over"
                              stroke="rgba(255,255,255,0.5)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: 'OVERS', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 900 }}
                            />
                            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ background: '#001F3F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                            
                            <Bar dataKey="runs1" name={(store.innings1?.battingTeamId === 'TEAM1' ? (store.team1Name || 'INDIAN STRIKERS') : (store.team2Name || 'OPPONENT')).toUpperCase()} fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={10}>
                              {manhattanData.map((entry, index) => (
                                <Cell key={`cell1-${index}`} fill={entry.wickets1 > 0 ? '#ef4444' : '#38BDF8'} />
                              ))}
                              <LabelList content={(props: any) => {
                                const entry = manhattanData[props.index];
                                if (!entry || !entry.wickets1) return null;
                                return <circle cx={props.x + props.width / 2} cy={props.y - 10} r={4} fill="#ef4444" stroke="#FFF" strokeWidth={1} />;
                              }} />
                            </Bar>

                            <Bar dataKey="runs2" name={(store.innings2?.battingTeamId === 'TEAM1' ? (store.team1Name || 'INDIAN STRIKERS') : (store.team2Name || 'OPPONENT')).toUpperCase()} fill="#FAB005" radius={[4, 4, 0, 0]} barSize={10}>
                              {manhattanData.map((entry, index) => (
                                <Cell key={`cell2-${index}`} fill={entry.wickets2 > 0 ? '#ef4444' : '#FAB005'} />
                              ))}
                              <LabelList content={(props: any) => {
                                const entry = manhattanData[props.index];
                                if (!entry || !entry.wickets2) return null;
                                return <circle cx={props.x + props.width / 2} cy={props.y - 10} r={4} fill="#ef4444" stroke="#FFF" strokeWidth={1} />;
                              }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis
                              dataKey="over"
                              type="number"
                              domain={[0, store.maxOvers || 20]}
                              stroke="rgba(255,255,255,0.5)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: 'OVERS', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 900 }}
                            />
                            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip content={<WormTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />

                            {/* 1st Innings Line */}
                            {analyticsWormData.innings1.length > 0 && (
                              <Line
                                data={analyticsWormData.innings1}
                                name={(store.innings1?.battingTeamId === 'TEAM1' ? (store.team1Name || 'INDIAN STRIKERS') : (store.team2Name || 'OPPONENT')).toUpperCase()}
                                type="monotone"
                                dataKey="runs"
                                stroke="#38BDF8"
                                strokeWidth={2}
                                dot={<WormDot />}
                                activeDot={{ r: 6 }}
                                strokeDasharray={store.currentInnings === 2 ? "5 5" : "0"}
                              />
                            )}

                            {/* 2nd Innings Line */}
                            {store.currentInnings === 2 && analyticsWormData.innings2.length > 0 && (
                              <Line
                                data={analyticsWormData.innings2}
                                name={(store.innings2?.battingTeamId === 'TEAM1' ? (store.team1Name || 'INDIAN STRIKERS') : (store.team2Name || 'OPPONENT')).toUpperCase()}
                                type="monotone"
                                dataKey="runs"
                                stroke="#FAB005"
                                strokeWidth={3}
                                dot={<WormDot />}
                                activeDot={{ r: 6 }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#FAB005', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Analytic Insight</h4>
                      <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
                        {activeChart === 'manhattan'
                          ? "Bars show total runs per over. Red highlights indicate overs with wickets, marking momentum shifts."
                          : "The Worm tracks cumulative progress. In Innings 2, the solid line shows the chase against the dotted target line."
                        }
                      </p>
                    </div>
                  </ChartContainer>

                  <div style={{ marginTop: 'auto', textAlign: 'center', opacity: 0.3, fontSize: '0.6rem', fontWeight: 900, letterSpacing: 2 }}>
                    INDIAN STRIKERS ANALYTICS ENGINE v1.0
                  </div>
                </AnalyticsDrawerContent>
              </AnalyticsDrawerOverlay>
            )}
          </AnimatePresence>
  );
};

export default AnalyticsDrawer;
