/**
 * extractHeaderAndControls.cjs
 * Extracts:
 *   ScorerHeader:    lines 1690-1759  (<Header> block)
 *   ScoringControls: lines 2025-2197  (<ScoringInterface> block)
 *
 * Run: node scripts/extractHeaderAndControls.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'components', 'ScorerDashboard.tsx');
const SCORER_DIR = path.join(ROOT, 'components', 'Scorer');

const raw = fs.readFileSync(DASHBOARD, 'utf8');
const lines = raw.split('\n');

// ─── Find exact boundaries ──────────────────────────────────────────────────

function findFirst(pattern, from = 0) {
  for (let i = from; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

// ScorerHeader: the SECOND <Header> (the live scorer, not the innings-break one)
const firstHeader = findFirst('<Header>');
const headerStart  = findFirst('<Header>', firstHeader + 1);
const headerEnd    = findFirst('</Header>', headerStart);
console.log(`ScorerHeader: lines ${headerStart+1}–${headerEnd+1}`);

// ScoringControls: <ScoringInterface>
const controlsStart = findFirst('<ScoringInterface>');
const controlsEnd   = findFirst('</ScoringInterface>', controlsStart);
console.log(`ScoringControls: lines ${controlsStart+1}–${controlsEnd+1}`);

// ─── 1. Build ScorerHeader.tsx ─────────────────────────────────────────────

const headerJSX = lines.slice(headerStart, headerEnd + 1).join('\n');

const scorerHeaderFile = `import React from 'react';
import { ChevronLeft, Shield, Settings } from 'lucide-react';
import { Header } from './ScorerStyles';
import SyncStatus from '../SyncStatus';
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
${headerJSX}
  );
};

export default ScorerHeader;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'ScorerHeader.tsx'), scorerHeaderFile, 'utf8');
console.log(`✅ Written: ScorerHeader.tsx`);

// ─── 2. Build ScoringControls.tsx ──────────────────────────────────────────

const controlsJSX = lines.slice(controlsStart, controlsEnd + 1).join('\n');

const scoringControlsFile = `import React from 'react';
import { motion } from 'framer-motion';
import { Users, Share2, RotateCcw, Lock as LockIcon } from 'lucide-react';
import {
  ScoringInterface, RunGrid, ExtraStack, ScoringBtn,
  TimelineContainer, BallCircle, OverSeparator
} from './ScorerStyles';
import { toast } from 'react-hot-toast';
import { InningsState, UnifiedMatchStore } from '../../types';

export interface ScoringControlsProps {
  store: UnifiedMatchStore;
  currentInnings: InningsState | null;
  isLocked: boolean;
  isWaitingForBowler: boolean;
  timelineRef: React.RefObject<HTMLDivElement>;
  onRecord: (runs: number, type: string) => void;
  onWicket: () => void;
  onExtra: (type: 'wd' | 'nb' | 'byes' | 'lb') => void;
  onUndo: () => void;
  onLineups: () => void;
  onBowlerSelect: () => void;
}

export const ScoringControls: React.FC<ScoringControlsProps> = ({
  store, currentInnings, isLocked, isWaitingForBowler,
  timelineRef, onRecord, onWicket, onExtra, onUndo, onLineups, onBowlerSelect,
}) => {
  // Alias to match original variable names in extracted JSX
  const attemptRecord = (runs: number, type: string) => onRecord(runs, type);
  const setShowLineups = (v: boolean) => { if (v) onLineups(); };
  const setShowBowlerModal = (v: boolean) => { if (v) onBowlerSelect(); };
  const setShowWicketModal = (v: boolean) => { if (v) onWicket(); };
  const setExtraType = (type: 'wd' | 'nb' | 'byes' | 'lb') => onExtra(type);
  const setShowNBModal = (v: boolean) => {};  // noop — extra modal triggered via onExtra
  const setIsOverComplete = (v: boolean) => {};

  return (
${controlsJSX}
  );
};

export default ScoringControls;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'ScoringControls.tsx'), scoringControlsFile, 'utf8');
console.log(`✅ Written: ScoringControls.tsx`);

// ─── 3. Update ScorerDashboard.tsx ─────────────────────────────────────────

const newLines = [...lines];

// Replacements (apply bottom-up: controls first since they're lower)
const controlsReplacement = `          <ScoringControls
            store={store}
            currentInnings={currentInnings}
            isLocked={!!isLocked}
            isWaitingForBowler={store.isWaitingForBowler}
            timelineRef={timelineRef}
            onRecord={(runs, type) => attemptRecord(runs, type as any)}
            onWicket={() => setShowWicketModal(true)}
            onExtra={(type) => { setExtraType(type); setShowNBModal(true); }}
            onUndo={() => { if (!isLocked) { store.undoLastBall(); setIsOverComplete(false); } }}
            onLineups={() => setShowLineups(true)}
            onBowlerSelect={() => setShowBowlerModal(true)}
          />`.split('\n');

const headerReplacement = `          <ScorerHeader
            store={store}
            matchMeta={matchMeta}
            teamLogo={teamLogo}
            isOnline={isOnline}
            isSyncing={isSyncing}
            onBack={() => {
              if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
                navigate('/match-center');
              }
            }}
            onSettingsOpen={() => setShowSettingsDrawer(true)}
          />`.split('\n');

// Apply bottom-up
newLines.splice(controlsStart, controlsEnd - controlsStart + 1, ...controlsReplacement);
// headerStart/headerEnd indices still valid (they're above controlsStart)
newLines.splice(headerStart, headerEnd - headerStart + 1, ...headerReplacement);

// Add imports after MatchCompletionFlow import
const completionIdx = newLines.findIndex(l => l.includes("from './Scorer/MatchCompletionFlow'"));
const newImports = [
  `import { ScorerHeader } from './Scorer/ScorerHeader';`,
  `import { ScoringControls } from './Scorer/ScoringControls';`
];
newLines.splice(completionIdx + 1, 0, ...newImports);

fs.writeFileSync(DASHBOARD, newLines.join('\n'), 'utf8');
console.log(`✅ Updated: ScorerDashboard.tsx`);
console.log(`   Removed ${headerEnd - headerStart + 1} header lines + ${controlsEnd - controlsStart + 1} control lines`);
console.log('\nDone! Run: npx tsc --noEmit');
