import React from 'react';
import { ChevronLeft, Shield, Settings } from 'lucide-react';
import { Header } from './ScorerStyles';
import { SyncStatus } from '../common/SyncStatus';
import { ScheduledMatch } from '../../types';
import { UnifiedMatchStore } from '../../types';

export interface ScorerHeaderProps {
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  teamLogo?: string;
  isOnline: boolean;
  isSyncing: boolean;
  onBack: () => void;
  onSettingsOpen: () => void;
}

export const ScorerHeader: React.FC<ScorerHeaderProps> = ({
  store, matchMeta, teamLogo, isOnline, isSyncing, onBack, onSettingsOpen,
}) => {
  // Alias to match original variable names in extracted JSX
  const navigate = (path: string) => onBack();
  const setShowSettingsDrawer = (v: boolean) => { if (v) onSettingsOpen(); };

  return (
          <Header>
            <button
              title="Back to Match Center"
              onClick={() => {
                if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
                  navigate('/match-center');
                }
              }}
              className="p-1 hover:bg-slate-100 rounded-lg transition-all text-slate-500 flex items-center"
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                <img
                  src={store.team1Logo || teamLogo || '/INS%20LOGO.PNG'}
                  style={{ width: 30, height: 30, objectFit: 'contain' }}
                  alt="TEAM1"
                />
                <span style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: 900, color: '#FFF', letterSpacing: '0.5px' }}>
                  {(store.team1Name || 'INDIAN STRIKERS').toUpperCase()}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#FAB005', opacity: 0.8 }}>VS</span>
                <span style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: 900, color: '#FFF', letterSpacing: '0.5px' }}>
                  {(store.team2Name || matchMeta?.team2Name || 'OPPONENT').toUpperCase()}
                </span>
                {store.team2Logo || matchMeta?.team2Logo ? (
                  <img
                    src={store.team2Logo || matchMeta?.team2Logo}
                    style={{ width: 30, height: 30, objectFit: 'contain' }}
                    alt="TEAM2"
                  />
                ) : <Shield size={24} color="rgba(255,255,255,0.2)" />}
              </div>
              <div style={{ fontSize: '7.5px', fontWeight: 900, opacity: 0.9, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                {store.toss.winnerId && (
                  <div style={{ color: '#FAB005' }}>
                    {store.toss.winnerId === 'TEAM1' ? (store.team1Name || 'Indian Strikers') : (store.team2Name || 'OPPONENT')} won toss & elected to {store.toss.choice}
                  </div>
                )}
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {`${(store.currentInnings === 1 ? (store.toss.winnerId === 'TEAM1' ? (store.toss.choice === 'Bat' ? (store.team1Name || 'Indian Strikers') : (store.team2Name || 'OPPONENT')) : (store.toss.choice === 'Bat' ? (store.team2Name || 'OPPONENT') : (store.team1Name || 'Indian Strikers'))) : (store.toss.winnerId === 'TEAM1' ? (store.toss.choice === 'Bat' ? (store.team2Name || 'OPPONENT') : (store.team1Name || 'Indian Strikers')) : (store.toss.choice === 'Bat' ? (store.team1Name || 'Indian Strikers') : (store.team2Name || 'OPPONENT'))))}  •  ${store.maxOvers || 20} Overs`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SyncStatus />
                <button
                  title="Match Settings"
                  onClick={() => setShowSettingsDrawer(true)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <Settings size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: !isOnline ? '#EF4444' : (isSyncing ? '#FAB005' : '#10B981'),
                  boxShadow: isOnline && !isSyncing ? '0 0 4px rgba(16,185,129,0.5)' : 'none'
                }} />
                <span style={{ fontSize: '0.5rem', fontWeight: 900, color: '#FFFFFF', opacity: 0.4, letterSpacing: 0.5 }}>
                  {!isOnline ? 'OFFLINE' : (isSyncing ? 'SYNCING...' : 'LIVE TUNNEL')}
                </span>
              </div>
            </div>
          </Header>
  );
};

export default ScorerHeader;
