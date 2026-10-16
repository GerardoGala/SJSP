// =========================================================================
// IMMUTABLE SCORING LAYER (Dictionary Map & Math Formulas)
// =========================================================================
const COLOR_MULTIPLIERS = {
  "RED": 2,
  "BLUE": 3,
  "YELLOW": 4
};

const ALL_DICE_JACKPOT_MULTIPLIER = 2;

// =========================================================================
// PRODUCTION SCORING & DYNAMIC LINE OVERLAY
// =========================================================================
function processEndgameScoring() {
  const allDice = document.querySelectorAll('.die');
  allDice.forEach(die => die.draggable = false);
  
  gridContainer.querySelectorAll('.grid-cell').forEach(cell => {
    cell.removeAttribute('dragover');
    cell.removeAttribute('drop');
  });

  const boardMatrix = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
  let totalDicePlaced = 0;

  document.querySelectorAll('.grid-cell').forEach(cell => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (cell.hasChildNodes()) {
      const die = cell.firstChild;
      boardMatrix[row][col] = {
        letter: die.dataset.letter,
        color: die.dataset.color,
        score: SCRABBLE_SCORE_MAP[die.dataset.letter],
        element: cell
      };
      totalDicePlaced++;
    }
  });

  const discoveredWords = [];

  // Parse horizontal rows
  for (let r = 0; r < GRID_ROWS; r++) {
    let currentWord = [];
    for (let c = 0; c < GRID_COLS; c++) {
      if (boardMatrix[r][c]) {
        currentWord.push({ r, c, ...boardMatrix[r][c] });
      } else {
        if (currentWord.length >= 2) discoveredWords.push({ type: 'H', tiles: currentWord });
        currentWord = [];
      }
    }
    if (currentWord.length >= 2) discoveredWords.push({ type: 'H', tiles: currentWord });
  }

  // Parse vertical columns
  for (let c = 0; c < GRID_COLS; c++) {
    let currentWord = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      if (boardMatrix[r][c]) {
        currentWord.push({ r, c, ...boardMatrix[r][c] });
      } else {
        if (currentWord.length >= 2) discoveredWords.push({ type: 'V', tiles: currentWord });
        currentWord = [];
      }
    }
    if (currentWord.length >= 2) discoveredWords.push({ type: 'V', tiles: currentWord });
  }

  let grandBaseTotal = 0;
  const scoreArea = document.getElementById('score-output-area');
  scoreArea.innerHTML = ""; 

  discoveredWords.forEach((wordObj) => {
    const textString = wordObj.tiles.map(t => t.letter.toLowerCase()).join("");
    let baseWordScore = wordObj.tiles.reduce((acc, t) => acc + t.score, 0);
    
    const initialColor = wordObj.tiles[0].color;
    const isPureColor = wordObj.tiles.every(t => t.color === initialColor);
    let activeMultiplier = 1;

    if (isPureColor && COLOR_MULTIPLIERS[initialColor]) {
      activeMultiplier = COLOR_MULTIPLIERS[initialColor];
      drawVisualStrikethrough(wordObj.tiles, initialColor.toLowerCase(), activeMultiplier);
    }

    const calculatedWordFinal = baseWordScore * activeMultiplier;
    grandBaseTotal += calculatedWordFinal;

    const lineDiv = document.createElement('div');
    if (activeMultiplier > 1) {
      lineDiv.textContent = `${textString} = ${baseWordScore} x ${activeMultiplier} = ${calculatedWordFinal}`;
    } else {
      lineDiv.textContent = `${textString} = ${baseWordScore}`;
    }
    scoreArea.appendChild(lineDiv);
  });

  let finalScore = grandBaseTotal;
  if (totalDicePlaced === 8 && discoveredWords.length > 0) {
    finalScore = grandBaseTotal * ALL_DICE_JACKPOT_MULTIPLIER;
    const jackpotDiv = document.createElement('div');
    jackpotDiv.style.color = "var(--color-yellow)";
    jackpotDiv.textContent = `8-dice bonus = x${ALL_DICE_JACKPOT_MULTIPLIER}`;
    scoreArea.appendChild(jackpotDiv);
  }

  const finalDiv = document.createElement('div');
  finalDiv.classList.add('total-line');
  finalDiv.textContent = `TOTAL = ${finalScore}`;
  scoreArea.appendChild(finalDiv);
}

function drawVisualStrikethrough(tiles, colorClass, factor) {
  const firstCell = tiles[0].element;
  const lastCell = tiles[tiles.length - 1].element;
  
  const rectStart = firstCell.getBoundingClientRect();
  const rectEnd = lastCell.getBoundingClientRect();
  const containerRect = gridContainer.getBoundingClientRect();

  const startX = (rectStart.left + rectStart.width / 2) - containerRect.left;
  const startY = (rectStart.top + rectStart.height / 2) - containerRect.top;
  const endX = (rectEnd.left + rectEnd.width / 2) - containerRect.left;
  const endY = (rectEnd.top + rectEnd.height / 2) - containerRect.top;

  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

  const strikeLine = document.createElement('div');
  strikeLine.classList.add('word-strike-line', colorClass);
  strikeLine.style.width = `${length}px`;
  strikeLine.style.left = `${startX}px`;
  strikeLine.style.top = `${startY}px`;
  strikeLine.style.transform = `rotate(${angle}deg)`;

  const tag = document.createElement('span');
  tag.classList.add('multiplier-tag');
  tag.textContent = `${factor}x Multiplier`;
  tag.style.transform = `rotate(${-angle}deg)`;
  strikeLine.appendChild(tag);

  gridContainer.appendChild(strikeLine);
}
