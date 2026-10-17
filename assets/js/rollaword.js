// =========================================================================
// ROLLAWORD - TWO-COLOR, TWO-GRID LAYOUT
// =========================================================================

const GRID_ROWS = 6;
const GRID_COLS = 8;
const INITIAL_TIME_SECONDS = 180;

const SCRABBLE_SCORE_MAP = {
  "A": 1, "E": 1, "I": 1, "O": 1, "U": 1, "L": 1, "N": 1, "R": 1, "S": 1, "T": 1,
  "D": 2, "G": 2,
  "B": 3, "C": 3, "M": 3, "P": 3,
  "F": 4, "H": 4, "V": 4, "W": 4, "Y": 4,
  "K": 5,
  "J": 8, "X": 8,
  "Q": 10, "Z": 10,
  "*": 0
};

const PHYSICAL_DICE_ROSTER = [
  [ {L:"A", C:"BLUE"}, {L:"E", C:"RED"},  {L:"I", C:"BLUE"}, {L:"O", C:"RED"},  {L:"U", C:"RED"},  {L:"T", C:"BLUE"} ],
  [ {L:"A", C:"RED"},  {L:"E", C:"BLUE"}, {L:"I", C:"RED"},  {L:"O", C:"BLUE"}, {L:"N", C:"RED"}, {L:"R", C:"RED"} ],
  [ {L:"A", C:"BLUE"}, {L:"E", C:"RED"},  {L:"I", C:"BLUE"}, {L:"O", C:"RED"},  {L:"S", C:"RED"},  {L:"L", C:"BLUE"} ],
  [ {L:"A", C:"RED"},  {L:"E", C:"BLUE"}, {L:"Y", C:"RED"},  {L:"D", C:"BLUE"}, {L:"G", C:"RED"},  {L:"M", C:"RED"} ],
  [ {L:"B", C:"BLUE"}, {L:"C", C:"RED"},  {L:"D", C:"BLUE"}, {L:"F", C:"RED"},  {L:"H", C:"RED"},  {L:"P", C:"BLUE"} ],
  [ {L:"L", C:"RED"},  {L:"N", C:"BLUE"}, {L:"R", C:"RED"},  {L:"S", C:"BLUE"}, {L:"T", C:"RED"},  {L:"W", C:"RED"} ],
  [ {L:"G", C:"BLUE"}, {L:"H", C:"RED"},  {L:"M", C:"BLUE"}, {L:"V", C:"RED"},  {L:"K", C:"RED"},  {L:"*", C:"BLUE"} ],
  [ {L:"J", C:"RED"},  {L:"K", C:"BLUE"}, {L:"Q", C:"RED"},  {L:"X", C:"BLUE"}, {L:"Z", C:"RED"},  {L:"*", C:"RED"} ]
];

// =========================================================================
// PHASE 1: BUILD THE 6x8 PLAYING BOARD (Runs Immediately)
// =========================================================================

const gameBoard = document.getElementById("game-board");
const diceTray = document.getElementById("dice-tray");

if (!gameBoard || !diceTray) {
  throw new Error("RollaWord requires #game-board and #dice-tray containers.");
}

for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    const cell = document.createElement("div");

    cell.classList.add("grid-cell");
    cell.dataset.row = r;
    cell.dataset.col = c;

    cell.addEventListener("dragover", handleDragOver);
    cell.addEventListener("dragleave", handleDragLeave);
    cell.addEventListener("drop", handleDrop);

    gameBoard.appendChild(cell);
  }
}

// =========================================================================
// PHASE 2: BUILD THE 1x8 DICE TRAY (Runs Immediately)
// =========================================================================

for (let c = 0; c < GRID_COLS; c++) {
  const cell = document.createElement("div");

  cell.classList.add("grid-cell", "tray-cell");
  cell.dataset.row = "tray";
  cell.dataset.col = c;

  cell.addEventListener("dragover", handleDragOver);
  cell.addEventListener("dragleave", handleDragLeave);
  cell.addEventListener("drop", handleDrop);

  diceTray.appendChild(cell);
}

// =========================================================================
// INTERACTION: DRAG AND DROP REFERENCE HOOKS
// =========================================================================

function handleDragOver(e) {
  e.preventDefault();
  const cell = e.target.closest(".grid-cell");
  if (cell && !cell.hasChildNodes()) {
    cell.classList.add("drag-over");
  }
}

function handleDragLeave(e) {
  const cell = e.target.closest(".grid-cell");
  if (cell) {
    cell.classList.remove("drag-over");
  }
}

function handleDrop(e) {
  e.preventDefault();
  const cell = e.target.closest(".grid-cell");
  if (!cell || cell.hasChildNodes()) return;

  cell.classList.remove("drag-over");
  const dieId = e.dataTransfer.getData("text/plain");
  const dieElement = document.getElementById(dieId);

  if (dieElement) {
    cell.appendChild(dieElement);
  }
}

// =========================================================================
// ENGINE VARIABLES AND CLOCKWORK ACTIONS
// =========================================================================

let timeRemaining = INITIAL_TIME_SECONDS;
let gameEnded = true; // Starts in a resting/ended state until START is clicked
let countdownTicker = null;

const timerDisplay = document.getElementById("timer-display");

function startGameEngine() {
  // 1. Reset Game Cycle Variables
  gameEnded = false;
  timeRemaining = INITIAL_TIME_SECONDS;
  if (timerDisplay) {
    timerDisplay.textContent = "3:00";
  }

  // 2. Clear Existing Letters from prior matches
  document.querySelectorAll('.grid-cell').forEach(cell => {
    cell.innerHTML = '';
  });

  // 3. PHASE 3: RANDOMIZE DICE WITH Q/U PROTECTION
  const initialRollResult = PHYSICAL_DICE_ROSTER.map(physicalDie => {
    const randomIndex = Math.floor(Math.random() * physicalDie.length);
    return { ...physicalDie[randomIndex] };
  });

  const verifiedRollResult = [...initialRollResult];
  const hasQ = verifiedRollResult.some(face => face.L === "Q");
  const hasU = verifiedRollResult.some(face => face.L === "U");

  if (hasQ && !hasU) {
    const uDieIndex = PHYSICAL_DICE_ROSTER.findIndex(
      (physicalDie, index) =>
        verifiedRollResult[index].L !== "Q" &&
        physicalDie.some(face => face.L === "U")
    );
    if (uDieIndex !== -1) {
      const uFace = PHYSICAL_DICE_ROSTER[uDieIndex].find(face => face.L === "U");
      verifiedRollResult[uDieIndex] = { ...uFace };
    }
  }

  // 4. PHASE 4: PLACE THE EIGHT DICE IN THE SEPARATE TRAY
  verifiedRollResult.forEach((chosenFace, index) => {
    const dieElement = document.createElement("div");

    dieElement.classList.add("die", chosenFace.C.toLowerCase());
    dieElement.id = `die-${index}`;
    dieElement.draggable = true;
    dieElement.dataset.letter = chosenFace.L;
    dieElement.dataset.color = chosenFace.C;

    const letterSpan = document.createElement("span");
    letterSpan.textContent = chosenFace.L === "*" ? "" : chosenFace.L;
    dieElement.appendChild(letterSpan);

    const valueBadge = document.createElement("span");
    valueBadge.classList.add("die-value");
    valueBadge.textContent = SCRABBLE_SCORE_MAP[chosenFace.L];
    dieElement.appendChild(valueBadge);

    dieElement.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", e.currentTarget.id);
    });

    const targetTrayCell = diceTray.querySelector(`.grid-cell[data-col="${index}"]`);
    if (targetTrayCell) {
      targetTrayCell.appendChild(dieElement);
    }
  });

  // 5. RUN TIMER COUNTDOWN TICKER
  clearInterval(countdownTicker);
  countdownTicker = setInterval(() => {
    if (timeRemaining <= 0) {
      clearTimeoutEngine();
      return;
    }

    timeRemaining--;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    if (timerDisplay) {
      timerDisplay.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }
  }, 1000);
}

function clearTimeoutEngine() {
  if (gameEnded) return;
  gameEnded = true;
  clearInterval(countdownTicker);

  const timeBonus = timeRemaining * 5;

  if (typeof processEndgameScoring === 'function') {
    processEndgameScoring(timeBonus);
  }
}

// =========================================================================
// EXPOSE ENGINE ACTIONS TO WINDOW GLOBAL SCOPE (For HTML Inline Clicks)
// =========================================================================
window.startGameEngine = startGameEngine;
window.clearTimeoutEngine = clearTimeoutEngine;

console.log("🚀 [RollaWord Script] Engine hooks successfully bound to window.");
