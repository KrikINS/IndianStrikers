import { CommentaryEventType } from '../types';

export const COMMENTARY_DATA = {
  FOURS: [
    "Crunched through the covers!",
    "That’s a boundary rider's nightmare!",
    "Pure class, timed to perfection.",
    "Shot! Finds the gap and the ball races away.",
    "Exquisite timing, that's gone for four!",
  ],
  SIXES: [
    "Into the stands!",
    "That’s out of the ground!",
    "High, handsome, and historic!",
    "He’s cleared the ropes with ease.",
    "Massive hit! That one's in the parking lot.",
  ],
  WICKETS: [
    "In the air... and taken!",
    "Clean bowled! The stumps are a mess.",
    "Huge shout... and the finger goes up!",
    "Gone! A massive blow for the batting side.",
    "Got him! The bowler strikes.",
  ],
  DOTS: [
    "Straight to the fielder, no run.",
    "A dot ball! The pressure is mounting.",
    "Beaten him for pace! Good comeback by the bowler.",
    "Solid defense. Playing it safe for now.",
  ],
  SINGLES: [
    "Pushed to the sweep for a quick single.",
    "Nudged into the gap, they take one.",
    "Clever running, index rotation in full effect.",
    "Just a single there, keeping the scoreboard moving.",
  ],
  DOUBLES: [
    "Coming back for the second! Excellent running.",
    "Drilled into the deep, they'll pick up two.",
    "Good placement, a comfortable brace for the batters.",
    "The sprint is on! They've managed to steal two.",
  ],
  TRIPLES: [
    "Great stop in the deep, but they've run three!",
    "Terrific hustle! That's a triple through the covers.",
    "Wide of the fielder, they push hard for the third.",
    "Running like greyhounds! Three more added to the total.",
  ]
};

export const getRandomCommentary = (type: CommentaryEventType) => {
  const array = (COMMENTARY_DATA as any)[`${type}S`] || COMMENTARY_DATA.DOTS;
  return array[Math.floor(Math.random() * array.length)];
};
