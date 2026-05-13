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
