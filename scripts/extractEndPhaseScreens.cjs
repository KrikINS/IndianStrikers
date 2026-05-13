/**
 * extractEndPhaseScreens.cjs
 * Extracts:
 *   InningsBreakScreen: lines 2234-2308
 *   MatchCompletionFlow: lines 2310-2957
 * from ScorerDashboard.tsx
 *
 * Run: node scripts/extractEndPhaseScreens.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'components', 'ScorerDashboard.tsx');
const SCORER_DIR = path.join(ROOT, 'components', 'Scorer');

const raw = fs.readFileSync(DASHBOARD, 'utf8');
const lines = raw.split('\n');

// ─── Find exact boundaries ─────────────────────────────────────────────────

function findLineContaining(text, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(text)) return i;
  }
  return -1;
}

// InningsBreak: starts at '{isInningsBreak && !showSetupModal && ('
const inningsStart = findLineContaining('{isInningsBreak && !showSetupModal && (');
// Ends at the closing ')}' before isMatchComplete
const inningsEnd = findLineContaining('{isMatchComplete && !store.manOfTheMatch', inningsStart) - 2;

// MatchCompletion: starts at '{isMatchComplete && !store.manOfTheMatch'
const completionStart = inningsEnd + 2; // same as the isMatchComplete line
// Ends after MatchSummaryModal closing )} — line before MilestoneOverlay
const milestoneIdx = findLineContaining('<MilestoneOverlay ref={milestoneRef}');
const completionEnd = milestoneIdx - 2; // just before blank line + MilestoneOverlay

console.log(`InningsBreak: lines ${inningsStart+1}–${inningsEnd+1}`);
console.log(`MatchCompletion: lines ${completionStart+1}–${completionEnd+1}`);

// ─── 1. Build InningsBreakScreen.tsx ─────────────────────────────────────

const inningsJSX = lines.slice(inningsStart, inningsEnd + 1).join('\n');

const inningsFile = `import React from 'react';
import { Shield } from 'lucide-react';
import {
  InningsBreakModal, ActionButton, ScoreSummaryCard,
  ScoreCardTable, Th, Td
} from './ScorerStyles';
import { ScheduledMatch } from '../../types';
import { UnifiedMatchStore } from '../../types';

export interface InningsBreakScreenProps {
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  teamLogo?: string;
  calculateTopPerformers: () => any[];
  onUndoLastBall: () => void;
  onStartSecondInnings: () => void;
}

export const InningsBreakScreen: React.FC<InningsBreakScreenProps> = ({
  store, matchMeta, teamLogo, calculateTopPerformers, onUndoLastBall, onStartSecondInnings,
}) => {
  // Alias to match original variable names used in extracted JSX
  const setShowInningsReview = (v: boolean) => { if (v) onStartSecondInnings(); };
  const setShowSetupModal = (v: boolean) => { if (v) onStartSecondInnings(); };
  const handleUndoLastBall = onUndoLastBall;
  const isInningsBreak = true;
  const showSetupModal = false;

  return (
${inningsJSX}
  );
};

export default InningsBreakScreen;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'InningsBreakScreen.tsx'), inningsFile, 'utf8');
console.log(`✅ Written: InningsBreakScreen.tsx`);

// ─── 2. Build MatchCompletionFlow.tsx ─────────────────────────────────────

const completionJSX = lines.slice(completionStart, completionEnd + 1).join('\n');

const completionFile = `import React from 'react';
import { Trophy, Zap, Share2, Download } from 'lucide-react';
import {
  ModalOverlay, ModalContent, HeroPosterWrapper, PosterContainer
} from './ScorerStyles';
import { toPng, toBlob } from 'html-to-image';
import MatchSummaryModal from '../MatchSummaryModal';
import { ScheduledMatch, Player } from '../../types';
import { UnifiedMatchStore } from '../../types';

export interface MatchCompletionFlowProps {
  isMatchComplete: boolean;
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  venueName: string;
  isGeneratingPoster: boolean;
  posterRef: React.RefObject<HTMLDivElement>;
  showMatchSummaryModal: boolean;
  activeMatchId: string;
  calculateTopPerformers: () => any[];
  getPlayerName: (id: any) => string;
  getPlayerAvatar: (id: string | null) => string | null;
  downloadHeroPoster: () => void;
  handleShareHeroPoster: () => void;
  onUpdateMatchSettings: (settings: any) => void;
  onSaveMatchSummary: (summary: any) => Promise<void>;
  onCloseMatchSummary: () => void;
  players: Player[];
  allOpponents: any[];
  setSyncStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void;
}

export const MatchCompletionFlow: React.FC<MatchCompletionFlowProps> = ({
  isMatchComplete, store, matchMeta, venueName, isGeneratingPoster,
  posterRef, showMatchSummaryModal, activeMatchId,
  calculateTopPerformers, getPlayerName, getPlayerAvatar,
  downloadHeroPoster, handleShareHeroPoster, onUpdateMatchSettings,
  onSaveMatchSummary, onCloseMatchSummary,
  players, allOpponents, setSyncStatus,
}) => {
  // Alias to match original variable names
  const setShowMatchSummaryModal = (v: boolean) => { if (!v) onCloseMatchSummary(); };
  const navigate = null; // handled via onSaveMatchSummary callback in parent

  if (!isMatchComplete) return null;

  return (
    <>
${completionJSX}
    </>
  );
};

export default MatchCompletionFlow;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'MatchCompletionFlow.tsx'), completionFile, 'utf8');
console.log(`✅ Written: MatchCompletionFlow.tsx`);

// ─── 3. Update ScorerDashboard.tsx ────────────────────────────────────────

const newLines = [...lines];

// Build replacements
const inningsReplacement = `          {isInningsBreak && !showSetupModal && (
            <InningsBreakScreen
              store={store}
              matchMeta={matchMeta}
              teamLogo={teamLogo}
              calculateTopPerformers={calculateTopPerformers}
              onUndoLastBall={handleUndoLastBall}
              onStartSecondInnings={() => {
                setShowInningsReview(false);
                setShowSetupModal(true);
              }}
            />
          )}`.split('\n');

const completionReplacement = `          <MatchCompletionFlow
            isMatchComplete={isMatchComplete}
            store={store}
            matchMeta={matchMeta}
            venueName={venueName}
            isGeneratingPoster={isGeneratingPoster}
            posterRef={posterRef}
            showMatchSummaryModal={showMatchSummaryModal}
            activeMatchId={activeMatchId || ''}
            calculateTopPerformers={calculateTopPerformers}
            getPlayerName={getPlayerName}
            getPlayerAvatar={getPlayerAvatar}
            downloadHeroPoster={downloadHeroPoster}
            handleShareHeroPoster={handleShareHeroPoster}
            onUpdateMatchSettings={(s) => store.updateMatchSettings(s)}
            onSaveMatchSummary={async (summary) => {
              setSyncStatus('loading');
              try {
                const allParticipatingIds = new Set([
                  ...Object.keys(store.innings1?.battingStats || {}),
                  ...Object.keys(store.innings1?.bowlingStats || {}),
                  ...Object.keys(store.innings2?.battingStats || {}),
                  ...Object.keys(store.innings2?.bowlingStats || {}),
                ]);
                const performers = Array.from(allParticipatingIds).map(pid => ({
                  playerId: pid,
                  playerName: getPlayerName(pid),
                  runs: (store.innings1?.battingStats[pid]?.runs || 0) + (store.innings2?.battingStats[pid]?.runs || 0),
                  balls: (store.innings1?.battingStats[pid]?.balls || 0) + (store.innings2?.battingStats[pid]?.balls || 0),
                  fours: (store.innings1?.battingStats[pid]?.fours || 0) + (store.innings2?.battingStats[pid]?.fours || 0),
                  sixes: (store.innings1?.battingStats[pid]?.sixes || 0) + (store.innings2?.battingStats[pid]?.sixes || 0),
                  wickets: (store.innings1?.bowlingStats[pid]?.wickets || 0) + (store.innings2?.bowlingStats[pid]?.wickets || 0),
                  bowlingRuns: (store.innings1?.bowlingStats[pid]?.runs || 0) + (store.innings2?.bowlingStats[pid]?.runs || 0),
                  bowlingOvers: (store.innings1?.bowlingStats[pid]?.overs || 0) + (store.innings2?.bowlingStats[pid]?.overs || 0),
                  maidens: (store.innings1?.bowlingStats[pid]?.maidens || 0) + (store.innings2?.bowlingStats[pid]?.maidens || 0),
                  isNotOut: (store.innings1?.battingStats[pid] && store.innings1.battingStats[pid].status !== 'out') ||
                            (store.innings2?.battingStats[pid] && store.innings2.battingStats[pid].status !== 'out'),
                }));
                await fetch(\`\${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/matches/\${activeMatchId}/finalize\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${sessionStorage.getItem('authToken')}\` },
                  body: JSON.stringify({ matchData: { ...summary, performers }, updatedPlayers: performers })
                });
                toast.success('Match Finalized & Career Stats Updated!');
                localStorage.removeItem('ins-cricket-scorer');
                localStorage.removeItem('active_match_id');
                navigate('/match-center');
              } catch (err) {
                console.error('Finalization failed:', err);
                toast.error('Finalization failed. Please check connection.');
              } finally {
                setSyncStatus('idle');
              }
            }}
            onCloseMatchSummary={() => setShowMatchSummaryModal(false)}
            players={players}
            allOpponents={allOpponents}
            setSyncStatus={setSyncStatus}
          />`.split('\n');

// Apply bottom-up
newLines.splice(completionStart, completionEnd - completionStart + 1, ...completionReplacement);
// inningsStart/inningsEnd indices unchanged (they're above completionStart)
newLines.splice(inningsStart, inningsEnd - inningsStart + 1, ...inningsReplacement);

// Add imports after AnalyticsDrawer import
const analyticsImportIdx = newLines.findIndex(l => l.includes("from './Scorer/AnalyticsDrawer'"));
const newImports = [
  `import { InningsBreakScreen } from './Scorer/InningsBreakScreen';`,
  `import { MatchCompletionFlow } from './Scorer/MatchCompletionFlow';`
];
newLines.splice(analyticsImportIdx + 1, 0, ...newImports);

// Remove html-to-image import from dashboard if no longer used there
// (toPng/toBlob are only used in downloadHeroPoster/handleShareHeroPoster which call posterRef)
// Actually posterRef handlers ARE defined in the dashboard — keep html-to-image there.
// The MatchCompletionFlow also imports toPng/toBlob for completeness (in case needed)
// but the actual handlers stay in dashboard. So we KEEP html-to-image in dashboard.

fs.writeFileSync(DASHBOARD, newLines.join('\n'), 'utf8');
console.log(`✅ Updated: ScorerDashboard.tsx`);
console.log(`   InningsBreak: removed ${inningsEnd - inningsStart + 1} lines`);
console.log(`   MatchCompletion: removed ${completionEnd - completionStart + 1} lines`);
console.log('\nDone! Run: npx tsc --noEmit');
