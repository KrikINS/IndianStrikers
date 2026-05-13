/**
 * fixLucideImports.cjs
 * Rebuilds the correct lucide-react import block in ScorerDashboard.tsx
 * by scanning actual usage in the file body (skipping the import section).
 */
const fs = require('fs');
const path = require('path');

const DASHBOARD = path.join(__dirname, '..', 'components', 'ScorerDashboard.tsx');
let content = fs.readFileSync(DASHBOARD, 'utf8');

// All possible icons that WERE in the original import
const allIcons = [
  'ChevronLeft', 'Undo', 'Settings', 'MapPin', 'Shield', 'Plus', 'Minus', 'Users',
  'X', 'User', 'Trophy', 'ChevronRight', 'RefreshCcw', 'Repeat', 'LayoutList', 'Star',
  'Zap', 'PlusCircle', 'Edit3', 'Share2', 'MessageSquare', 'RotateCcw', 'Cloud',
  'CloudLightning', 'CloudDownload', 'CloudOff', 'AlertTriangle',
  // Aliased
  'LineChart', 'Lock'
];

// Get body after import block
const importEnd = content.indexOf("} from 'lucide-react';");
const body = content.slice(importEnd + "} from 'lucide-react';".length);

// Check which icons are actually used in JSX/code (not just import lines)
const used = allIcons.filter(icon => {
  const bare = icon === 'LineChart' ? 'ChartIcon' : icon === 'Lock' ? 'LockIcon' : icon;
  // In body, check for <Icon, Icon size=, {Icon}, Icon(
  const patterns = [
    new RegExp('<' + bare + '[\\s/>]'),
    new RegExp('<' + bare + '>'),
    new RegExp(bare + ' size='),
    new RegExp('\\{' + bare + '\\}'),
    new RegExp(bare + ',\\s*color='),
  ];
  // Also check original name for aliases
  const origPatterns = [
    new RegExp('<' + icon + '[\\s/>]'),
    new RegExp(icon + ' size='),
  ];
  return patterns.some(p => p.test(body)) || origPatterns.some(p => p.test(body));
});

console.log('Icons still in use in dashboard body:', used);

// Build new import block
const importLines = used.map(icon => {
  if (icon === 'LineChart') return `  LineChart as ChartIcon,`;
  if (icon === 'Lock') return `  Lock as LockIcon,`;
  return `  ${icon},`;
});
const newImportBlock = `import {\n${importLines.join('\n')}\n} from 'lucide-react';`;

// Replace the existing (broken) lucide import block
content = content.replace(
  /import \{[\s\S]*?\} from 'lucide-react';/,
  newImportBlock
);

fs.writeFileSync(DASHBOARD, content, 'utf8');
console.log('\n✅ Rebuilt lucide-react import block');
console.log('Done! Run: npx tsc --noEmit');
