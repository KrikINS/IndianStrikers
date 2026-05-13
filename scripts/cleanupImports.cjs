/**
 * cleanupImports.cjs
 * Removes all unused lucide-react icons and ScorerStyles imports
 * from ScorerDashboard.tsx after component extraction.
 *
 * Run: node scripts/cleanupImports.cjs
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD = path.join(__dirname, '..', 'components', 'ScorerDashboard.tsx');
let content = fs.readFileSync(DASHBOARD, 'utf8');

// ─── 1. Lucide icons to REMOVE (confirmed unused) ──────────────────────────
const unusedLucide = [
  'MapPin', 'Plus', 'Minus', 'Users', 'User', 'Trophy',
  'RefreshCcw', 'Repeat', 'LayoutList', 'PlusCircle', 'Edit3',
  'Share2', 'MessageSquare', 'CloudDownload',
  'LineChart as ChartIcon', 'Lock as LockIcon'
];

// ─── 2. ScorerStyles exports to REMOVE (confirmed unused in dashboard) ──────
const unusedStyled = [
  'MiddleWorkspace', 'FreeHitBadge', 'IconButton', 'OverSeparator', 'ScoreSection',
  'ScorecardPillBtn', 'MainScore', 'OversText', 'ActiveParticipants',
  'PartnershipRow', 'BowlerRow', 'PartnershipMain', 'PartnershipSub',
  'ParticipantCard', 'CardHeader', 'NameLabel', 'StatValue',
  'TimelineContainer', 'BallCircle', 'ScoringInterface', 'RunGrid',
  'ExtraStack', 'ScoringBtn', 'InningsBreakModal', 'HeroPosterWrapper',
  'PosterContainer', 'SetupContainer', 'SetupCard', 'MatchTitle', 'GroundText',
  'TeamRow', 'TeamBlock', 'TeamLogoCircle', 'ActionButton', 'TossOption',
  'SettingsSection', 'OversControl', 'ControlBtn', 'PlayerCard',
  'StatRibbon', 'StatItem', 'StatLabel', 'StatVal', 'FilterChip',
  'SliderTrack', 'SliderHandle', 'SliderText', 'SliderProgress',
  'CoinWrapper', 'Coin3D', 'CoinFace', 'ScoreCardTable', 'Th', 'Td',
  'ScoreSummaryCard', 'DrawerOverlay', 'DrawerContent', 'SettingsGroup',
  'GroupTitle', 'ControlButton', 'SettingsInput',
  'AnalyticsDrawerOverlay', 'AnalyticsDrawerContent',
  'AnalyticsHeader', 'ChartContainer'
];

// ─── Helper: remove a specific named export from a multi-line import block ──
function removeNamedImports(source, names) {
  let result = source;
  for (const name of names) {
    // Match the name as a whole word, possibly followed by comma and/or newline
    // Handles: "  Name,\n", "  Name\n", "Name, ", ", Name"
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Try removing "  Name,\r?\n" (name at end of a line with trailing comma)
    result = result.replace(new RegExp(`^[ \\t]*${escaped},?\\r?\\n`, 'gm'), '');
    // Try removing ", Name" on the same line
    result = result.replace(new RegExp(`,\\s*${escaped}`, 'g'), '');
    // Try removing "Name, " on the same line  
    result = result.replace(new RegExp(`${escaped},\\s*`, 'g'), '');
    // Try standalone
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), (m, offset) => {
      // Only remove if inside an import statement context — skip if it's in JSX/code
      // We do a simple check: has the word already been removed from imports?
      return m; // skip code-level; line-based removal above handles imports
    });
  }
  return result;
}

// ─── Process lucide imports block ──────────────────────────────────────────
// The block is: import {\n  ...\n} from 'lucide-react';
const lucideMatch = content.match(/import \{([\s\S]*?)\} from 'lucide-react';/);
if (lucideMatch) {
  let importBody = lucideMatch[1];
  unusedLucide.forEach(name => {
    // Each name might appear as "  Name,\n" or "  Name\n" or "  Alias as Name,\n"
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    importBody = importBody.replace(new RegExp(`^[ \\t]*${escaped},?\\r?\\n`, 'gm'), '');
  });
  content = content.replace(lucideMatch[1], importBody);
  console.log(`✅ Cleaned lucide-react imports (removed ${unusedLucide.length} icons)`);
}

// ─── Process ScorerStyles imports block ────────────────────────────────────
const stylesMatch = content.match(/import \{([\s\S]*?)\} from '\.\/Scorer\/ScorerStyles';/);
if (stylesMatch) {
  let importBody = stylesMatch[1];
  unusedStyled.forEach(name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    importBody = importBody.replace(new RegExp(`^[ \\t]*${escaped},?\\r?\\n`, 'gm'), '');
    // Also handle trailing comma on same-line entries
    importBody = importBody.replace(new RegExp(`,\\s*${escaped}(?=[,\\s\\n\\r])`, 'g'), '');
    importBody = importBody.replace(new RegExp(`^[ \\t]*${escaped}[ \\t]*,`, 'gm'), '');
  });
  // Clean up orphaned commas and trailing whitespace on import lines
  importBody = importBody.replace(/,[ \t]*\n[ \t]*,/g, ',\n');
  importBody = importBody.replace(/^\s*,\s*$/gm, '');
  importBody = importBody.replace(/\n{3,}/g, '\n\n');
  content = content.replace(stylesMatch[1], importBody);
  console.log(`✅ Cleaned ScorerStyles imports (removed ${unusedStyled.length} exports)`);
}

// ─── Remove orphaned SyncStatus import (it's now only in ScorerHeader) ──────
// Keep it if used directly in dashboard JSX. Check:
const afterImportBlock = content.split("} from './Scorer/ScorerStyles';")[1] || '';
if (!afterImportBlock.includes('<SyncStatus') && !afterImportBlock.includes('SyncStatus ')) {
  content = content.replace(/import \{ SyncStatus \} from '\.\/common\/SyncStatus';\n?/, '');
  console.log('✅ Removed unused SyncStatus import from dashboard');
}

// ─── Write result ───────────────────────────────────────────────────────────
fs.writeFileSync(DASHBOARD, content, 'utf8');
const finalLines = content.split('\n').length;
console.log(`✅ ScorerDashboard.tsx now has ${finalLines} lines`);
console.log('\nDone! Run: npx tsc --noEmit');
