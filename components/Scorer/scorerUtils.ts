/**
 * scorerUtils.ts
 * Pure utility functions for the Scorer Dashboard.
 * Extracted from ScorerDashboard.tsx — no business logic changes.
 */

import { useCommentaryStore } from '../../store/commentaryStore';

/**
 * Generates dynamic commentary text for a given ball event.
 * Uses the commentary store templates as the base, then appends
 * contextual detail (player name, zone, outcome).
 */
export const generateDynamicCommentary = (
  player: string,
  runs: number,
  zone?: string,
  isWicket?: boolean
): string => {
  const z = zone || 'the gap';
  const firstName = player.split(' ')[0];

  if (isWicket) {
    const base = useCommentaryStore.getState().getRandomDialogue('WICKET');
    return `${base} ${firstName} is out! Trapped while trying to hit towards ${z}.`;
  }

  const baseFour = useCommentaryStore.getState().getRandomDialogue('FOUR');
  const baseSix = useCommentaryStore.getState().getRandomDialogue('SIX');
  const baseDot = useCommentaryStore.getState().getRandomDialogue('DOT');

  switch (runs) {
    case 6:
      return `${baseSix} ${firstName} clears the ropes at ${z} with pure power.`;
    case 4:
      return `${baseFour} ${firstName} pierces the field at ${z} for a boundary.`;
    case 1:
      return `Quick single! ${firstName} taps it into ${z} and scampers through.`;
    case 2:
      return `Good placement! ${firstName} finds the gap in ${z} and returns for the second.`;
    case 3:
      return `Excellent running from ${firstName}! He hits it deep into ${z} and they run three.`;
    case 0:
      return `${baseDot} ${firstName} looks for room in ${z} but can't find a way past.`;
    default:
      return `${firstName} scores ${runs} run(s) towards ${z}.`;
  }
};
/**
 * Extracts initials from a name string.
 * Example: "Anees Ahad" -> "AA", "Zeb" -> "Z"
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
};

/**
 * Calculates dynamic career totals by summing legacy baseline stats with recent match performances.
 * Used to ensure consistency between Player Cards and Profile Modals.
 */
export const calculateCareerTotals = (
  player: any,
  performances: any[],
  legacyRow?: any
) => {
  // Sum recent performances for this specific player
  const playerPerformances = performances.filter(perf => 
    String(perf.playerId ?? perf.id) === String(player.id)
  );

  const totalMatchRuns = playerPerformances.reduce((sum, perf) => sum + Number(perf.runs ?? 0), 0);
  const totalMatchWickets = playerPerformances.reduce((sum, perf) => sum + Number(perf.wickets ?? 0), 0);
  const totalMatchBalls = playerPerformances.reduce((sum, perf) => sum + Number(perf.balls ?? 0), 0);
  
  const totalMatchInnings = playerPerformances.reduce((sum, perf) => {
    const didBat = Number(perf.balls ?? 0) > 0 || Number(perf.runs ?? 0) > 0;
    return sum + (didBat ? 1 : 0);
  }, 0);

  const totalMatchNotOuts = playerPerformances.reduce((sum, perf) => {
    return sum + (perf.isNotOut ? 1 : 0);
  }, 0);

  // Logic for matches: handle historical weightings if present
  const totalMatchMatches = playerPerformances.reduce((sum, perf) => {
    const status = String(perf.status ?? '');
    if (status.startsWith('HISTORICAL:')) {
      return sum + (parseInt(status.split(':')[1]) ?? 1);
    }
    return sum + 1;
  }, 0);

  const baseMatches = Number(legacyRow?.matches ?? legacyRow?.matches_played ?? 0);
  const baseRuns = Number(legacyRow?.runs ?? legacyRow?.runs_scored ?? 0);
  const baseWickets = Number(legacyRow?.wickets ?? legacyRow?.wickets_taken ?? 0);
  const baseInnings = Number(legacyRow?.innings ?? 0);
  const baseNotOuts = Number(legacyRow?.not_outs ?? legacyRow?.notOuts ?? 0);
  const baseBalls = Number(legacyRow?.balls ?? 0);

  const finalRuns = baseRuns + totalMatchRuns;
  const finalInnings = baseInnings + totalMatchInnings;
  const finalNotOuts = baseNotOuts + totalMatchNotOuts;
  const finalBalls = baseBalls + totalMatchBalls;
  const finalWickets = baseWickets + totalMatchWickets;

  const outs = finalInnings - finalNotOuts;
  const average = outs > 0 ? parseFloat((finalRuns / outs).toFixed(2)) : 0;
  const strikeRate = finalBalls > 0 ? parseFloat(((finalRuns / finalBalls) * 100).toFixed(2)) : 0;

  const finalStats = {
    matches: baseMatches + totalMatchMatches,
    runs: finalRuns,
    wickets: finalWickets,
    innings: finalInnings,
    notOuts: finalNotOuts,
    average,
    strikeRate
  };

  if (playerPerformances.length > 0) {
    console.log(`[calculateCareerTotals] ${player.name}: Found ${playerPerformances.length} matches. Final Runs: ${finalStats.runs} (Base: ${baseRuns})`);
  }

  return finalStats;
};
