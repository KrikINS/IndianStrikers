/**
 * extractDrawers.cjs
 * Extracts SettingsDrawer (lines 2766-3072) and AnalyticsDrawer (lines 3290-3451)
 * plus WormDot/WormTooltip (lines 436-462) from ScorerDashboard.tsx into:
 *   components/Scorer/SettingsDrawer.tsx
 *   components/Scorer/AnalyticsDrawer.tsx
 *
 * Run: node scripts/extractDrawers.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'components', 'ScorerDashboard.tsx');
const SCORER_DIR = path.join(ROOT, 'components', 'Scorer');

const raw = fs.readFileSync(DASHBOARD, 'utf8');
const lines = raw.split('\n');

// ─── Find all boundaries by content patterns ──────────────────────────────

function findLine(pattern, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

// WormDot/WormTooltip: inside component, lines ~436-462
const wormDotStart = findLine('const WormDot = (props: any)');
const wormTooltipEnd = findLine('};', findLine('const WormTooltip', wormDotStart) + 1);
console.log(`WormDot: ${wormDotStart+1}–${wormTooltipEnd+1}`);

// Settings Drawer: <AnimatePresence> wrapping showSettingsDrawer
let settingsStart = -1, settingsEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<AnimatePresence>') && lines[i+1] && lines[i+1].includes('showSettingsDrawer')) {
    settingsStart = i; break;
  }
}
// Find the matching </AnimatePresence>
let depth = 0;
for (let i = settingsStart; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t === '<AnimatePresence>') depth++;
  if (t === '</AnimatePresence>') { depth--; if (depth === 0) { settingsEnd = i; break; } }
}
console.log(`SettingsDrawer: ${settingsStart+1}–${settingsEnd+1}`);

// Analytics Drawer: <AnimatePresence> wrapping showAnalyticsDrawer
let analyticsStart = -1, analyticsEnd = -1;
for (let i = settingsEnd + 1; i < lines.length; i++) {
  if (lines[i].includes('<AnimatePresence>') && lines[i+1] && lines[i+1].includes('showAnalyticsDrawer')) {
    analyticsStart = i; break;
  }
}
depth = 0;
for (let i = analyticsStart; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t === '<AnimatePresence>') depth++;
  if (t === '</AnimatePresence>') { depth--; if (depth === 0) { analyticsEnd = i; break; } }
}
console.log(`AnalyticsDrawer: ${analyticsStart+1}–${analyticsEnd+1}`);

// ─── 1. Build SettingsDrawer.tsx ──────────────────────────────────────────

const settingsJSX = lines.slice(settingsStart, settingsEnd + 1).join('\n');

const settingsFile = `import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DrawerOverlay, DrawerContent, SettingsGroup, GroupTitle, ControlButton,
  IconButton
} from './ScorerStyles';
import {
  X, Repeat, CloudLightning, Cloud, CloudDownload,
  Settings, Zap, Trophy, RotateCcw, PlusCircle, Edit3, Star, User
} from 'lucide-react';
import { ScheduledMatch } from '../../types';
import { UnifiedMatchStore, InningsState } from '../../types';
import { toast } from 'react-hot-toast';

export interface SettingsDrawerProps {
  isOpen: boolean;
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  activeMatchId: string;
  currentInnings: InningsState | null;
  syncStatus: 'idle' | 'loading' | 'success' | 'error';
  teamLogo?: string;
  getPlayerName: (id: any) => string;
  onClose: () => void;
  onChangeScorer: () => void;
  onDeclareInnings: () => void;
  onResetMatch: () => void;
  onOpenQuickScore: () => void;
  updateMatch: (id: string, data: any) => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen, store, matchMeta, activeMatchId, currentInnings, syncStatus,
  teamLogo, getPlayerName, onClose, onChangeScorer, onDeclareInnings,
  onResetMatch, onOpenQuickScore, updateMatch, syncWithCloud,
}) => {
  // Alias props to match the original local variable names used in the extracted JSX
  const showSettingsDrawer = isOpen;
  const setShowSettingsDrawer = (v: boolean) => { if (!v) onClose(); };
  const handleChangeScorer = onChangeScorer;
  const handleDeclareInnings = onDeclareInnings;
  const handleResetMatch = onResetMatch;
  const setShowQuickScoreModal = (v: boolean) => { if (v) onOpenQuickScore(); };
  const setShowSettingsDrawer_ = onClose;

  return (
${settingsJSX}
  );
};

export default SettingsDrawer;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'SettingsDrawer.tsx'), settingsFile, 'utf8');
console.log(`✅ Written: SettingsDrawer.tsx`);

// ─── 2. Build AnalyticsDrawer.tsx ─────────────────────────────────────────

const wormHelpers = lines.slice(wormDotStart, wormTooltipEnd + 1).join('\n');
const analyticsJSX = lines.slice(analyticsStart, analyticsEnd + 1).join('\n');

const analyticsFile = `import React from 'react';
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

// ─── Internal chart helpers ──────────────────────────────────────────────────
${wormHelpers}

// ─── Component ───────────────────────────────────────────────────────────────
export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen, activeChart, manhattanData, analyticsWormData, store,
  onClose, onChartChange, getPlayerNameForChart,
}) => {
  const showAnalyticsDrawer = isOpen;
  const setShowAnalyticsDrawer = (v: boolean) => { if (!v) onClose(); };
  const setActiveChart = onChartChange;

  return (
${analyticsJSX}
  );
};

export default AnalyticsDrawer;
`;

fs.writeFileSync(path.join(SCORER_DIR, 'AnalyticsDrawer.tsx'), analyticsFile, 'utf8');
console.log(`✅ Written: AnalyticsDrawer.tsx`);

// ─── 3. Update ScorerDashboard.tsx ────────────────────────────────────────

// Collect skip ranges (sorted descending to splice correctly)
const skipRanges = [
  [wormDotStart, wormTooltipEnd],
  [settingsStart, settingsEnd],
  [analyticsStart, analyticsEnd],
].sort((a, b) => b[0] - a[0]); // descending

const newLines = [...lines];

// Replace each range bottom-up with its replacement
const settingsReplacement = `          <SettingsDrawer
            isOpen={showSettingsDrawer}
            store={store}
            matchMeta={matchMeta}
            activeMatchId={activeMatchId || ''}
            currentInnings={currentInnings}
            syncStatus={syncStatus}
            teamLogo={teamLogo}
            getPlayerName={getPlayerName}
            onClose={() => setShowSettingsDrawer(false)}
            onChangeScorer={handleChangeScorer}
            onDeclareInnings={handleDeclareInnings}
            onResetMatch={handleResetMatch}
            onOpenQuickScore={() => setShowQuickScoreModal(true)}
            updateMatch={updateMatch}
            syncWithCloud={syncWithCloud}
          />`.split('\n');

const analyticsReplacement = `          <AnalyticsDrawer
            isOpen={showAnalyticsDrawer}
            activeChart={activeChart}
            manhattanData={manhattanData}
            analyticsWormData={analyticsWormData}
            store={store}
            onClose={() => setShowAnalyticsDrawer(false)}
            onChartChange={setActiveChart}
            getPlayerNameForChart={getPlayerNameForChart}
          />`.split('\n');

// Apply bottom-up (analytics first since it comes after settings)
newLines.splice(analyticsStart, analyticsEnd - analyticsStart + 1, ...analyticsReplacement);
// After analytics splice, settings indices unchanged (analytics is below settings)
newLines.splice(settingsStart, settingsEnd - settingsStart + 1, ...settingsReplacement);
// Remove WormDot/WormTooltip (they come before settings)
newLines.splice(wormDotStart, wormTooltipEnd - wormDotStart + 1);

// Add imports after existing MatchModals import
const matchModalsIdx = newLines.findIndex(l => l.includes("from './Scorer/MatchModals'"));
const newImports = [
  `import { SettingsDrawer } from './Scorer/SettingsDrawer';`,
  `import { AnalyticsDrawer } from './Scorer/AnalyticsDrawer';`
];
newLines.splice(matchModalsIdx + 1, 0, ...newImports);

// Remove recharts imports from dashboard (now owned by AnalyticsDrawer)
const rechartsStart = newLines.findIndex(l => l.includes("from 'recharts'"));
if (rechartsStart !== -1) {
  // Find the start of this import block (the opening 'import {')
  let blockStart = rechartsStart;
  while (blockStart > 0 && !newLines[blockStart].trim().startsWith('import {')) blockStart--;
  newLines.splice(blockStart, rechartsStart - blockStart + 1);
  console.log(`✅ Removed recharts import block from dashboard`);
}

fs.writeFileSync(DASHBOARD, newLines.join('\n'), 'utf8');
console.log(`✅ Updated: ScorerDashboard.tsx`);
console.log('\nDone! Run: npx tsc --noEmit');
