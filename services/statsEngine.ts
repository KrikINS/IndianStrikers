import { BattingStats, BowlingStats, Performer } from '../types';

/**
 * Logic Engine for Indian Strikers Career Statistics.
 * Merges game-level match performance into cumulative career stats.
 * Adheres to professional Cricket Data Scientist standards for AVE, SR, and ECON.
 */

export const updateBattingCareerStats = (current: BattingStats, perf: Performer): BattingStats => {
  const updated = { ...current };
  
  // Logic: Only update if the player actually participated in the match (has runs or balls)
  // or if they are explicitly marked as a participant (in the XI)
  updated.matches += 1;
  updated.innings += 1; // Assuming if in XI and match completed, they had an innings (standard sim logic)
  
  updated.runs += Number(perf.runs || 0);
  updated.balls += Number(perf.balls || 0);
  updated.fours += Number(perf.fours || 0);
  updated.sixes += Number(perf.sixes || 0);
  
  // Not Out Logic
  if (perf.isNotOut) {
    updated.notOuts += 1;
  } else {
    updated.ducks += (Number(perf.runs) === 0 ? 1 : 0);
  }

  // Milestones
  const matchRuns = Number(perf.runs || 0);
  if (matchRuns >= 100) updated.hundreds += 1;
  else if (matchRuns >= 50) updated.fifties += 1;

  // High Score Logic (Comparison of strings for legacy reasons, but needs to handle numeric)
  const currentHS = parseInt(current.highestScore) || 0;
  if (matchRuns > currentHS) {
    updated.highestScore = `${matchRuns}${perf.isNotOut ? '*' : ''}`;
  }

  // Recalculate Derived Stats (AVE & SR)
  const dismissals = updated.innings - updated.notOuts;
  updated.average = dismissals > 0 ? parseFloat((updated.runs / dismissals).toFixed(2)) : updated.runs;
  updated.strikeRate = updated.balls > 0 ? parseFloat(((updated.runs / updated.balls) * 100).toFixed(2)) : 0;

  return updated;
};

export const updateBowlingCareerStats = (current: BowlingStats, perf: Performer): BowlingStats => {
  const updated = { ...current };
  
  if (Number(perf.bowlingOvers || 0) <= 0) return updated;

  updated.matches += 1;
  updated.innings += 1;
  updated.overs = parseFloat((updated.overs + Number(perf.bowlingOvers || 0)).toFixed(1));
  updated.maidens += Number(perf.maidens || 0);
  updated.runs += Number(perf.bowlingRuns || 0);
  updated.wickets += Number(perf.wickets || 0);

  // Milestones
  if (Number(perf.wickets) >= 5) updated.fiveWickets += 1;
  else if (Number(perf.wickets) >= 4) updated.fourWickets += 1;

  // Best Bowling (BBI) Logic
  // Format: "W/R" e.g. "5/24"
  const [bestWkts, bestRuns] = (current.bestBowling || "0/999").split('/').map(Number);
  const currentWkts = Number(perf.wickets || 0);
  const currentRuns = Number(perf.bowlingRuns || 0);

  if (currentWkts > bestWkts || (currentWkts === bestWkts && currentRuns < bestRuns)) {
    updated.bestBowling = `${currentWkts}/${currentRuns}`;
  }

  // Recalculate Derived Stats (ECON, AVE, SR)
  // 1. Economy
  const wholeOvers = Math.floor(updated.overs);
  const balls = Math.round((updated.overs % 1) * 10);
  const totalBalls = (wholeOvers * 6) + balls;
  const trueOvers = totalBalls / 6;

  updated.economy = trueOvers > 0 ? parseFloat((updated.runs / trueOvers).toFixed(2)) : 0;
  
  // 2. Average & Strike Rate
  if (updated.wickets > 0) {
    updated.average = parseFloat((updated.runs / updated.wickets).toFixed(2));
    updated.strikeRate = parseFloat((totalBalls / updated.wickets).toFixed(2));
  }

  return updated;
};
