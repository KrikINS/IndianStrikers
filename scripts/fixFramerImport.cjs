/**
 * fixFramerImport.cjs
 * Restores framer-motion import to ScorerDashboard.tsx
 */
const fs = require('fs');
const path = require('path');

const DASHBOARD = path.join(__dirname, '..', 'components', 'ScorerDashboard.tsx');
let content = fs.readFileSync(DASHBOARD, 'utf8');

// The framer-motion import was swallowed. Add it back after line 1.
if (!content.includes("from 'framer-motion'")) {
  content = content.replace(
    "import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';\n",
    "import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';\nimport { motion, AnimatePresence } from 'framer-motion';\n"
  );
  console.log('Restored: framer-motion import');
} else {
  console.log('framer-motion already present');
}

fs.writeFileSync(DASHBOARD, content, 'utf8');
console.log('Done! Run: npx tsc --noEmit');
