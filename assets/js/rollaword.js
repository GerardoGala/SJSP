// =========================================================================
// INITIALIZER CORE MODULE LOOP
// =========================================================================
const GRID_ROWS = 8;
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
  [ {L:"A", C:"BLUE"}, {L:"E", C:"YELLOW"}, {L:"I", C:"BLUE"}, {L:"O", C:"YELLOW"}, {L:"U", C:"RED"}, {L:"T", C:"BLUE"} ],
  [ {L:"A", C:"YELLOW"}, {L:"E", C:"BLUE"}, {L:"I", C:"YELLOW"}, {L:"O", C:"BLUE"}, {L:"N", C:"RED"}, {L:"R", C:"YELLOW"} ],
  [ {L:"A", C:"BLUE"}, {L:"E", C:"YELLOW"}, {L:"I", C:"BLUE"}, {L:"O", C:"YELLOW"}, {L:"S", C:"RED"}, {L:"L", C:"BLUE"} ],
  [ {L:"A", C:"YELLOW"}, {L:"E", C:"BLUE"}, {L:"Y", C:"YELLOW"}, {L:"D", C:"BLUE"}, {L:"G", C:"RED"}, {L:"M", C:"YELLOW"} ],
  [ {L:"B", C:"BLUE"}, {L:"C", C:"YELLOW"}, {L:"D", C:"BLUE"}, {L:"F", C:"YELLOW"}, {L:"H", C:"RED"}, {L:"P", C:"BLUE"} ],
  [ {L:"L", C:"YELLOW"}, {L:"N", C:"BLUE"}, {L:"R", C:"YELLOW"}, {L:"S", C:"BLUE"}, {L:"T", C:"RED"}, {L:"W", C:"YELLOW"} ],
  [ {L:"G", C:"BLUE"}, {L:"H", C:"YELLOW"}, {L:"M", C:"BLUE"}, {L:"V", C:"YELLOW"}, {L:"K", C:"RED"}, {L:"*", C:"BLUE"} ],
  [ {L:"J", C:"YELLOW"}, {L:"K", C:"BLUE"}, {L:"Q", C:"YELLOW"}, {L:"X", C:"BLUE"}, {L:"Z", C:"RED"}, {L:"*", C:"YELLOW"} ]
];

const gridContainer = document.getElementById('grid-container');
for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.dataset.row = r;
    cell.dataset.col = c;
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('dragleave', handleDragLeave);
    cell.addEventListener('drop', handleDrop);
    gridContainer.appendChild(cell);
  }
}

const diceTray = document.getElementById('dice-tray');
const initialRollResult = PHYSICAL_DICE_ROSTER.map(physicalDie => {
  const randomIndex = Math.floor(Math.random() * physicalDie.length);
  return { ...physicalDie[randomIndex] }; 
});

const hasU = initialRollResult.some(face => face.L === "U");
const verifiedRollResult = initialRollResult.map((face, index) => {
  if (face.L === "Q" && !hasU) {
    const activeDiePool = PHYSICAL_DICE_ROSTER[index];
    let reRolledFace = face;
    while (reRolledFace.L === "Q") {
      reRolledFace = activeDiePool[Math.floor(Math.random() * activeDiePool.length)];
    }
    return reRolledFace;
  }
  return face;
});

verifiedRollResult.forEach((chosenFace, index) => {
  const dieElement = document.createElement('div');
  dieElement.classList.add('die', chosenFace.C.toLowerCase());
  dieElement.id = `die-${index}`;
  dieElement.draggable = true;
  dieElement.dataset.letter = chosenFace.L;
  dieElement.dataset.color = chosenFace.C;

  const letterSpan = document.createElement('span');
  letterSpan.textContent = chosenFace.L === "*" ? "" : chosenFace.L;
  dieElement.appendChild(letterSpan);

  const valueBadge = document.createElement('span');
  valueBadge.classList.add('die-value');
  valueBadge.textContent = SCRABBLE_SCORE_MAP[chosenFace.L];
  dieElement.appendChild(valueBadge);
  
  dieElement.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', e.target.id);
  });
  
  diceTray.appendChild(dieElement);
});

diceTray.addEventListener('dragover', handleDragOver);
diceTray.addEventListener('drop', handleTrayDrop);

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
  if (dieElement) cell.appendChild(dieElement);
}
function handleTrayDrop(e) {
  e.preventDefault();
  const dieId = e.dataTransfer.getData('text/plain');
  const dieElement = document.getElementById(dieId);
  if (dieElement && e.target.closest('#dice-tray')) diceTray.appendChild(dieElement);
}

let timeRemaining = INITIAL_TIME_SECONDS;
const timerDisplay = document.getElementById('timer-display');

const countdownTicker = setInterval(() => {
  if (timeRemaining <= 0) {
    clearInterval(countdownTicker);
    timerDisplay.textContent = "0:00";
    processEndgameScoring();
    return;
  }
  timeRemaining--;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}, 1000);
