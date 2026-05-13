/**
 * extractScoreSection.cjs
 * Extracts the MiddleWorkspace/ScoreSection block (lines 1776-1968)
 * into components/Scorer/ScoreSection.tsx, then sweeps unused imports
 * from ScorerDashboard.tsx.
 *
 * Run: node scripts/extractScoreSection.cjs
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

// MiddleWorkspace wraps both ScoreSection AND ActiveParticipants/BowlerRow
const blockStart = findFirst('<MiddleWorkspace>');
const blockEnd   = findFirst('</MiddleWorkspace>', blockStart);
console.log(`MiddleWorkspace block: lines ${blockStart+1}–${blockEnd+1}`);

// ─── 1. Build ScoreSection.tsx ──────────────────────────────────────────────
const blockJSX = lines.slice(blockStart, blockEnd + 1).join('\n');

const scoreSectionFile = `import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, LayoutList } from 'lucide-react';
import {
  MiddleWorkspace, ScoreSection, FreeHitBadge, ScorecardPillBtn,
  MainScore, OversText, ActiveParticipants, PartnershipRow, BowlerRow,
  PartnershipMain, PartnershipSub, ParticipantCard, CardHeader,
  NameLabel, StatValue
} from './ScorerStyles';
import { ScheduledMatch } from '../../types';
import { InningsState, UnifiedMatchStore } from '../../types';

export interface ScoreSectionProps {
  store: UnifiedMatchStore;
  currentInnings: InningsState | null;
  matchMeta: ScheduledMatch | undefined;
  partnershipData: { totalRuns: number; totalBalls: number };
  strikerStats: { runs: number; balls: number };
  nonStrikerStats: { runs: number; balls: number };
  bowlerStats: { overs: number; runs: number; wickets: number };
  isLocked: boolean;
  isOverComplete: boolean;
  getPlayerName: (id: any) => string;
  onScorecardOpen: () => void;
  onBowlerChange: () => void;
  onStrikerSwitch: () => void;
}

export const ScoreSection: React.FC<ScoreSectionProps> = ({
  store, currentInnings, matchMeta, partnershipData,
  strikerStats, nonStrikerStats, bowlerStats,
  isLocked, isOverComplete, getPlayerName,
  onScorecardOpen, onBowlerChange, onStrikerSwitch,
}) => {
  // Alias to match original variable names in extracted JSX
  const setShowScorecardModal = (v: boolean) => { if (v) onScorecardOpen(); };
  const setShowBowlerModal = (v: boolean) => { if (v) onBowlerChange(); };

  return (
${blockJSX}
  );
};

export default ScoreSection;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'ScoreSection.tsx'), scoreSectionFile, 'utf8');
console.log(`✅ Written: ScoreSection.tsx`);

// ─── 2. Update ScorerDashboard.tsx ─────────────────────────────────────────
const newLines = [...lines];

const replacement = `          <ScoreSection
            store={store}
            currentInnings={currentInnings}
            matchMeta={matchMeta}
            partnershipData={partnershipData}
            strikerStats={strikerStats}
            nonStrikerStats={nonStrikerStats}
            bowlerStats={bowlerStats}
            isLocked={!!isLocked}
            isOverComplete={isOverComplete}
            getPlayerName={getPlayerName}
            onScorecardOpen={() => setShowScorecardModal(true)}
            onBowlerChange={() => setShowBowlerModal(true)}
            onStrikerSwitch={() => { if (!isLocked) store.switchStriker(); }}
          />`.split('\n');

newLines.splice(blockStart, blockEnd - blockStart + 1, ...replacement);

// Add ScoreSection import after ScoringControls import
const controlsIdx = newLines.findIndex(l => l.includes("from './Scorer/ScoringControls'"));
newLines.splice(controlsIdx + 1, 0, `import { ScoreSection } from './Scorer/ScoreSection';`);

fs.writeFileSync(DASHBOARD, newLines.join('\n'), 'utf8');
console.log(`✅ Updated: ScorerDashboard.tsx`);
console.log(`   Removed ${blockEnd - blockStart + 1} lines from MiddleWorkspace block`);

console.log('\nDone! Run: npx tsc --noEmit');
