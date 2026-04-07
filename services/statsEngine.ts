import { BattingStats, BowlingStats, Performer } from '../types';

/**
 * Logic Engine for Indian Strikers Career Statistics.
 * Merges game-level match performance into cumulative career stats.
 * Adheres to professional Cricket Data Scientist standards for AVE, SR, and ECON.
 */

/**
 * addCricketOvers: Correctly adds two cricket over values.
 * Cricket overs are NOT decimal numbers. 3.5 means "3 overs and 5 balls".
 * So 3.5 + 2.4 = 6.3 (not 5.9).
 * 
 * @param a - First overs value (e.g., 3.5)
 * @param b - Second overs value (e.g., 2.4)
 * @returns Sum in cricket notation (e.g., 6.3)
 */
export const addCricketOvers = (a: number, b: number): number => {
  const wholeA = Math.floor(a);
  const ballsA = Math.round((a % 1) * 10);
  const wholeB = Math.floor(b);
  const ballsB = Math.round((b % 1) * 10);

  let totalBalls = ballsA + ballsB;
  let totalOvers = wholeA + wholeB;

  // Every 6 balls = 1 over
  totalOvers += Math.floor(totalBalls / 6);
  totalBalls = totalBalls % 6;

  return parseFloat(`${totalOvers}.${totalBalls}`);
};

/**
 * oversToTotalBalls: Converts cricket overs notation to total balls.
 * Needed for accurate ECON, AVE, SR calculations.
 */
export const oversToTotalBalls = (overs: number): number => {
  const wholeOvers = Math.floor(overs);
  const balls = Math.round((overs % 1) * 10);
  return (wholeOvers * 6) + balls;
};

/**
 * calculateBattingAverage: Runs / (Innings - Not Outs)
 * If all innings are not outs, returns total runs (standard cricket rule).
 */
export const calculateBattingAverage = (runs: number, innings: number, notOuts: number): number => {
  const outs = innings - notOuts;
  return outs > 0 ? parseFloat((runs / outs).toFixed(2)) : runs;
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA ARCHITECT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * syncMatchValue: Forces numeric addition to prevent string concatenation (the "13180" issue).
 * Ensures both legacy and match values are treated as numbers.
 */
const syncMatchValue = (legacyVal: number | string, matchVal: number | string): number => {
  return Number(legacyVal || 0) + Number(matchVal || 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// BATTING CAREER STATS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export const updateBattingCareerStats = (current: BattingStats, perf: Performer): BattingStats => {
  const updated = { ...current };

  // MAT always increments for all Playing XI members
  updated.matches = syncMatchValue(current.matches, 1);

  // Only count as an innings if the player actually batted:
  const didBat = Number(perf.balls) > 0 || (Number(perf.runs) === 0 && !perf.isNotOut);

  if (didBat) {
    const matchRuns = Number(perf.runs || 0);
    const matchBalls = Number(perf.balls || 0);

    updated.innings = syncMatchValue(current.innings, 1);
    updated.runs = syncMatchValue(current.runs, matchRuns);
    updated.balls = syncMatchValue(current.balls, matchBalls);
    updated.fours = syncMatchValue(current.fours || 0, perf.fours || 0);
    updated.sixes = syncMatchValue(current.sixes || 0, perf.sixes || 0);

    // Not Out / Duck Logic
    if (perf.isNotOut) {
      updated.notOuts = syncMatchValue(current.notOuts, 1);
    } else {
      if (matchRuns === 0) updated.ducks = syncMatchValue(current.ducks, 1);
    }

    // Milestones
    if (matchRuns >= 100) updated.hundreds = syncMatchValue(current.hundreds, 1);
    else if (matchRuns >= 50) updated.fifties = syncMatchValue(current.fifties, 1);

    // High Score: Parse legacy HS which may have '*' suffix (e.g., "87*")
    const currentHS = parseInt(current.highestScore) || 0;
    if (matchRuns > currentHS) {
      updated.highestScore = `${matchRuns}${perf.isNotOut ? '*' : ''}`;
    }
  }

  // Recalculate derived stats
  updated.average = calculateBattingAverage(updated.runs, updated.innings, updated.notOuts);
  updated.strikeRate = updated.balls > 0
    ? parseFloat(((updated.runs / updated.balls) * 100).toFixed(2))
    : 0;

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// BOWLING CAREER STATS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export const updateBowlingCareerStats = (current: BowlingStats, perf: Performer): BowlingStats => {
  const updated = { ...current };

  // Skip bowling update if player didn't bowl
  if (Number(perf.bowlingOvers || 0) <= 0) return updated;

  const matchOvers = Number(perf.bowlingOvers);
  const matchRuns = Number(perf.bowlingRuns || 0);
  const matchWkts = Number(perf.wickets || 0);
  const matchMaidens = Number(perf.maidens || 0);

  updated.matches = syncMatchValue(current.matches, 1);
  updated.innings = syncMatchValue(current.innings, 1);

  // ✅ CRITICAL FIX: Use addCricketOvers instead of float addition
  updated.overs = addCricketOvers(Number(current.overs || 0), matchOvers);

  updated.maidens = syncMatchValue(current.maidens, matchMaidens);
  updated.runs = syncMatchValue(current.runs, matchRuns);
  updated.wickets = syncMatchValue(current.wickets, matchWkts);
  updated.dotBalls = syncMatchValue(current.dotBalls || 0, perf.dotBalls || 0);
  updated.wides = syncMatchValue(current.wides || 0, perf.wides || 0);
  updated.noBalls = syncMatchValue(current.noBalls || 0, perf.noBalls || 0);

  // Milestones
  if (matchWkts >= 5) updated.fiveWickets = syncMatchValue(current.fiveWickets, 1);
  else if (matchWkts >= 4) updated.fourWickets = syncMatchValue(current.fourWickets, 1);

  // Best Bowling (BBI): Higher wickets = better; at equal wickets, fewer runs = better
  const [bestWkts, bestRuns] = (current.bestBowling || '0/999').split('/').map(Number);
  if (matchWkts > bestWkts || (matchWkts === bestWkts && matchRuns < bestRuns)) {
    updated.bestBowling = `${matchWkts}/${matchRuns}`;
  }

  // Recalculate ECON, AVE, SR using correct ball count
  const totalBalls = oversToTotalBalls(updated.overs);
  const trueOvers = totalBalls / 6;

  updated.economy = trueOvers > 0
    ? parseFloat((updated.runs / trueOvers).toFixed(2))
    : 0;

  if (updated.wickets > 0) {
    updated.average = parseFloat((updated.runs / updated.wickets).toFixed(2));
    updated.strikeRate = parseFloat((totalBalls / updated.wickets).toFixed(2));
  }

  return updated;
};
