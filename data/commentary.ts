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
    "Solid defense.",
    "No run there.",
    "Beaten by the pace!",
    "Straight to the fielder.",
  ]
};

export const getRandomCommentary = (type: 'FOUR' | 'SIX' | 'WICKET' | 'DOT') => {
  const array = COMMENTARY_DATA[`${type}S` as keyof typeof COMMENTARY_DATA] || COMMENTARY_DATA.DOTS;
  return array[Math.floor(Math.random() * array.length)];
};
