// =========================================================================
// IMMUTABLE CONFIGURATION LAYER (Strictly Global Constants)
// =========================================================================
const GRID_ROWS = 8;
const GRID_COLS = 8;
const INITIAL_TIME_SECONDS = 60; // 1 Minute Game Cycle Configuration

// Authoritative Dictionary Map of Classic Scrabble Value Rankings
const SCRABBLE_SCORE_MAP = {
  "A": 1, "E": 1, "I": 1, "O": 1, "U": 1, "L": 1, "N": 1, "R": 1, "S": 1, "T": 1,
  "D": 2, "G": 2,
  "B": 3, "C": 3, "M": 3, "P": 3,
  "F": 4, "H": 4, "V": 4, "W": 4, "Y": 4,
  "K": 5,
  "J": 8, "X": 8,
  "Q": 10, "Z": 10,
  "*": 0 // Wildcard/Blank Face Value Blueprint
};

// Explicit 8-Dice Frequency Distribution Blueprint (6 Mixed Colors & Letters Per Matrix)
const PHYSICAL_DICE_ROSTER = [
  [ {L:"A", C:"BLUE"}, {L:"E", C:"YELLOW"}, {L:"I", C:"BLUE"}, {L:"O", C:"YELLOW"}, {L:"U", C:"RED"}, {L:"T", C:"BLUE"} ],
  [ {L:"A", C:"YELLOW"}, {L:"E", C:"BLUE"}, {L:"I", C:"YELLOW"}, {L:"O", C:"BLUE"}, {L:"N", C:"RED"}, {L:"R", C:"YELLOW"} ],
  [ {L:"A", C:"BLUE"}, {L:"E", C:"YELLOW"}, {L:"I", C:"BLUE"}, {L:"O", C:"YELLOW"}, {L:"S", C:"RED"}, {L:"L", C:"BLUE"} ],
  [ {L:"A", C:"YELLOW"}, {L:"E", C:"BLUE"}, {L:"Y", C:"YELLOW"}, {L:"D", C:"BLUE"}, {L:"G", C:"RED"}, {L:"M", C:"YELLOW"} ],
  [ {L:"B", C:"BLUE"}, {L:"C", C:"YELLOW"}, {L:"D", C:"BLUE"}, {L:"F", C:"YELLOW"}, {L:"H", C:"RED"}, {L:"P", C:"BLUE"} ],
  [ {L:"L", C:"YELLOW"}, {L:"N", C:"BLUE"}, {L:"R", C:"YELLOW"}, {L:"S", C:"BLUE"}, {L:"T", C:"RED"}, {L:"W", C:"YELLOW"} ],
  [ {L:"G", C:"BLUE"}, {L:"H", C:"YELLOW"}, {L:"M", C:"BLUE"}, {L:"V", C:"YELLOW"}, {L:"K", C:"RED"}, {L:"*", C:"BLUE"} ],
  [ {L:"J", C:"YELLOW"}, {L:"K", C:"BLUE"}, {L:"Q", C:"YELLOW"}, {L:"X", C:"BLUE"}, {L:"Z", C:"RED"}, {L:"*", C:"YELLOW"} ]
];

// =========================================================================
// GAME CORE ENGINE & INITIALIZATION LAYER
// =========================================================================

// Assemble the 8x8 Board Architecture
const gridContainer = document.getElementById('grid-container');
for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.dataset.row = r;
    cell.dataset.col = c;
    
    // Native HTML5 Drag and Drop Handlers for Grid Cells
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('dragleave', handleDragLeave);
    cell.addEventListener('drop', handleDrop);
    
    gridContainer.appendChild(cell);
  }
}

// Engine Roller Module: Selects 1 random face from each of the 8 physical dice arrays
const diceTray = document.getElementById('dice-tray');

// Phase 1: Run an initial draft roll to collect a list of raw faces across all 8 dice
const initialRollResult = PHYSICAL_DICE_ROSTER.map(physicalDie => {
  const randomIndex = Math.floor(Math.random() * physicalDie.length);
  return { ...physicalDie[randomIndex] }; 
});

// Phase 2: Check for our Q-with-U business rule protection
const hasU = initialRollResult.some(face => face.L === "U");

const verifiedRollResult = initialRollResult.map((face, index) => {
  // If a Q landed but there is no U anywhere in the wider roll, trigger a selective reroll
  if (face.L === "Q" && !hasU) {
    const activeDiePool = PHYSICAL_DICE_ROSTER[index];
    let reRolledFace = face;
    
    // Keep picking a new face from this specific die until it is no longer a Q
    while (reRolledFace.L === "Q") {
      const newRandomIndex = Math.floor(Math.random() * activeDiePool.length);
      reRolledFace = activeDiePool[newRandomIndex];
    }
    return reRolledFace;
  }
  return face;
});

// Phase 3: Take the verified final faces and draw them into the visible tray
verifiedRollResult.forEach((chosenFace, index) => {
  const dieElement = document.createElement('div');
  dieElement.classList.add('die', chosenFace.C.toLowerCase());
  dieElement.id = `die-${index}`;
  dieElement.draggable = true;

  // Inject Letter Symbol
  const letterSpan = document.createElement('span');
  letterSpan.textContent = chosenFace.L === "*" ? "" : chosenFace.L; // Handle wildcards cleanly
  dieElement.appendChild(letterSpan);

  // Inject Scrabble Point Value Subscript Badge
  const valueBadge = document.createElement('span');
  valueBadge.classList.add('die-value');
  valueBadge.textContent = SCRABBLE_SCORE_MAP[chosenFace.L];
  dieElement.appendChild(valueBadge);
  
  // Native HTML5 Drag Event Registries
  dieElement.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', e.target.id);
  });
  
  diceTray.appendChild(dieElement);
});

// Make the Dice Tray itself a drop target so players can pull dice back out
diceTray.addEventListener('dragover', handleDragOver);
diceTray.addEventListener('drop', handleTrayDrop);

// =========================================================================
// INTERACTION ACTION MANAGEMENT INTERFACE
// =========================================================================
function handleDragOver(e) {
  e.preventDefault();
  if (e.target.classList.contains('grid-cell') && !e.target.hasChildNodes()) {
    e.target.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  if (e.target.classList.contains('grid-cell')) {
    e.target.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const cell = e.target.closest('.grid-cell');
  if (!cell || cell.hasChildNodes()) return;
  
  cell.classList.remove('drag-over');
  const dieId = e.dataTransfer.getData('text/plain');
  const dieElement = document.getElementById(dieId);
  
  if (dieElement) {
    cell.appendChild(dieElement);
  }
}

function handleTrayDrop(e) {
  e.preventDefault();
  const dieId = e.dataTransfer.getData('text/plain');
  const dieElement = document.getElementById(dieId);
  
  if (dieElement && e.target.closest('#dice-tray')) {
    diceTray.appendChild(dieElement);
  }
}

// =========================================================================
// COUNTDOWN TIMING RUNNER SYSTEM
// =========================================================================
let timeRemaining = INITIAL_TIME_SECONDS;
const timerDisplay = document.getElementById('timer-display');

const countdownTicker = setInterval(() => {
  if (timeRemaining <= 0) {
    clearInterval(countdownTicker);
    timerDisplay.textContent = "0:00";
    handleTimeExpiration();
    return;
  }
  
  timeRemaining--;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}, 1000);

function handleTimeExpiration() {
  const allDice = document.querySelectorAll('.die');
  allDice.forEach(die => die.draggable = false);
  alert("Time's Up! Let's calculate your RollaWord configurations.");
}
