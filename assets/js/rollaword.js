// =========================================================================
// ROLLAWORD - INDEPENDENT COMMON CORE CONTROLLER
// =========================================================================

const GRID_ROWS = 6;
const GRID_COLS = 8;
const INITIAL_TIME_SECONDS = 180;

const isKidsMode = window.location.pathname.includes('rollaKid.html');

// =========================================================================
// PHASE 1 & 2: INSTANT GRID INITIALIZATION
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
    attachLayoutDragListeners(cell);
    gameBoard.appendChild(cell);
  }
}

for (let c = 0; c < GRID_COLS; c++) {
  const cell = document.createElement("div");
  cell.classList.add("grid-cell", "tray-cell");
  cell.dataset.row = "tray";
  cell.dataset.col = c;
  attachLayoutDragListeners(cell);
  diceTray.appendChild(cell);
}

function attachLayoutDragListeners(cell) {
  cell.addEventListener("dragover", e => {
    e.preventDefault();
    const target = e.target.closest(".grid-cell");
    if (target && !target.hasChildNodes()) target.classList.add("drag-over");
  });
  cell.addEventListener("dragleave", e => {
    const target = e.target.closest(".grid-cell");
    if (target) target.classList.remove("drag-over");
  });
  cell.addEventListener("drop", e => {
    e.preventDefault();
    const target = e.target.closest(".grid-cell");
    if (!target || target.hasChildNodes()) return;
    target.classList.remove("drag-over");
    const dieId = e.dataTransfer.getData("text/plain");
    const die = document.getElementById(dieId);
    if (die) target.appendChild(die);
  });
}

// =========================================================================
// GAME CONTROL ENGINE HOOKS
// =========================================================================
let timeRemaining = INITIAL_TIME_SECONDS;
let gameEnded = true;
let countdownTicker = null;
const timerDisplay = document.getElementById("timer-display");

function startGameEngine() {
  gameEnded = false;
  timeRemaining = INITIAL_TIME_SECONDS;
  
  if (timerDisplay) {
    timerDisplay.textContent = isKidsMode ? "🧒 FUN PLAY" : "3:00";
  }

  // Flush stale nodes
  document.querySelectorAll('.grid-cell').forEach(cell => cell.innerHTML = '');

  // 🔄 SWAPPABLE CALL: Automatically fires the algorithm from whichever file is loaded!
  const verifiedRollResult = window.generateLetterPayload();

  // Unified rendering cycle
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
    valueBadge.textContent = window.SCRABBLE_SCORE_MAP[chosenFace.L];
    dieElement.appendChild(valueBadge);

    dieElement.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", e.currentTarget.id);
      e.currentTarget.classList.add("is-dragging");
      document.querySelectorAll('.grid-cell').forEach(c => { if(!c.hasChildNodes()) c.classList.add('valid-drop-target'); });
    });

    dieElement.addEventListener("dragend", e => {
      e.currentTarget.classList.remove("is-dragging");
      document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('valid-drop-target', 'drag-over'));
    });

    const targetTrayCell = diceTray.querySelector(`.grid-cell[data-col="${index}"]`);
    if (targetTrayCell) targetTrayCell.appendChild(dieElement);
  });

  // Ticker management
  clearInterval(countdownTicker);
  if (!isKidsMode) {
    countdownTicker = setInterval(() => {
      if (timeRemaining <= 0) { clearTimeoutEngine(); return; }
      timeRemaining--;
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      if (timerDisplay) timerDisplay.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }, 1000);
  } else {
    const outputBox = document.getElementById("score-output-area");
    if (outputBox) outputBox.innerHTML = "<div style='color: #16a34a;'>Find your hidden words! You can do it! ✨</div>";
  }
}

function clearTimeoutEngine() {
  if (gameEnded) return;
  gameEnded = true;
  clearInterval(countdownTicker);
  if (typeof processEndgameScoring === 'function') {
    processEndgameScoring(timeRemaining * 5);
  }
}

window.startGameEngine = startGameEngine;
window.clearTimeoutEngine = clearTimeoutEngine;
