// =========================================================================
// ROLLAWORD ADULT SEGMENT - COMPETITIVE ANTI-LUCK GENERATOR
// =========================================================================

// Score map and balanced tier arrays remain hidden here, out of your core engine
window.SCRABBLE_SCORE_MAP = {
  "A": 1, "E": 1, "I": 1, "O": 1, "U": 1, "L": 1, "N": 1, "R": 1, "S": 1, "T": 1,
  "D": 2, "G": 2, "B": 3, "C": 3, "M": 3, "P": 3, "F": 4, "H": 4, "V": 4, "W": 4, "Y": 4,
  "K": 5, "J": 8, "X": 8, "Q": 10, "Z": 10, "*": 0
};

const PHYSICAL_DICE_ROSTER = [
  [ {L:"A", C:"BLUE"}, {L:"E", C:"RED"},  {L:"I", C:"BLUE"}, {L:"A", C:"RED"},  {L:"E", C:"BLUE"}, {L:"I", C:"RED"} ],
  [ {L:"A", C:"RED"},  {L:"E", C:"BLUE"}, {L:"I", C:"RED"},  {L:"A", C:"BLUE"}, {L:"E", C:"RED"},  {L:"I", C:"BLUE"} ],
  [ {L:"O", C:"BLUE"}, {L:"U", C:"RED"},  {L:"O", C:"RED"},  {L:"U", C:"BLUE"}, {L:"O", C:"BLUE"}, {L:"E", C:"RED"} ],
  [ {L:"N", C:"BLUE"}, {L:"R", C:"RED"},  {L:"S", C:"BLUE"}, {L:"T", C:"RED"},  {L:"D", C:"BLUE"}, {L:"G", C:"RED"} ],
  [ {L:"L", C:"RED"},  {L:"N", C:"BLUE"}, {L:"R", C:"RED"},  {L:"S", C:"BLUE"}, {L:"T", C:"RED"},  {L:"G", C:"BLUE"} ],
  [ {L:"B", C:"BLUE"}, {L:"C", C:"RED"},  {L:"M", C:"BLUE"}, {L:"P", C:"RED"},  {L:"F", C:"BLUE"}, {L:"H", C:"RED"} ],
  [ {L:"V", C:"BLUE"}, {L:"W", C:"RED"},  {L:"Y", C:"BLUE"}, {L:"K", C:"RED"},  {L:"J", C:"BLUE"}, {L:"*", C:"RED"} ],
  [ {L:"X", C:"RED"},  {L:"Z", C:"BLUE"}, {L:"Q", C:"RED"},  {L:"M", C:"BLUE"}, {L:"P", C:"RED"},  {L:"*", C:"BLUE"} ]
];

/**
 * Executes the standard adult competitive tier dice layout roll
 */
window.generateLetterPayload = function() {
  const initialRollResult = PHYSICAL_DICE_ROSTER.map(physicalDie => {
    const randomIndex = Math.floor(Math.random() * physicalDie.length);
    return { ...physicalDie[randomIndex] };
  });

  const verifiedRollResult = [...initialRollResult];
  const hasQ = verifiedRollResult.some(face => face.L === "Q");
  const hasU = verifiedRollResult.some(face => face.L === "U");

  // Q/U Balance protection algorithm
  if (hasQ && !hasU) {
    const uDieIndex = PHYSICAL_DICE_ROSTER.findIndex(
      (physicalDie, index) => verifiedRollResult[index].L !== "Q" && physicalDie.some(face => face.L === "U")
    );
    if (uDieIndex !== -1) {
      verifiedRollResult[uDieIndex] = { ...PHYSICAL_DICE_ROSTER[uDieIndex].find(face => face.L === "U") };
    }
  }
  return verifiedRollResult;
};

console.log("🏆 [RollaWord Segment] Adult Data Generation Layer Online.");
