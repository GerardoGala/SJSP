// =========================================================================
// ROLLAWORD SCORING ENGINE
// Version: Local Dictionary
// =========================================================================

// COLOR MULTIPLIERS
const COLOR_MULTIPLIERS = {
  "RED": 2,
  "BLUE": 3,
  "YELLOW": 4
};

const ALL_DICE_JACKPOT_MULTIPLIER = 2;

// =========================================================================
// LOCAL DICTIONARY
// Loads dictionary.txt once and stores words in a Set for fast lookup.
// =========================================================================

let LOCAL_DICTIONARY = new Set();
let dictionaryReady = false;
let dictionaryError = null;

async function loadLocalDictionary() {
  try {
    const response = await fetch("/assets/js/dictionary.txt");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Could not load dictionary.txt`);
    }

    const contents = await response.text();

    LOCAL_DICTIONARY = new Set(
      contents
        .split(/\s+/)
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0)
    );

    dictionaryReady = true;

    console.log(
      `RollaWord dictionary loaded: ${LOCAL_DICTIONARY.size} words.`
    );

  } catch (error) {
    dictionaryError = error;
    dictionaryReady = false;

    console.error("RollaWord dictionary loading failed:", error);

    const scoreArea = document.getElementById("score-output-area");

    if (scoreArea) {
      scoreArea.textContent =
        "Dictionary failed to load. Please refresh the game and try again.";
    }
  }
}

// Begin loading the dictionary immediately.
const dictionaryLoadingPromise = loadLocalDictionary();

// =========================================================================
// ENDGAME SCORING
// =========================================================================

async function processEndgameScoring(timeBonus = 0) {

  // Ensure the dictionary has finished loading before scoring.
  await dictionaryLoadingPromise;

  if (!dictionaryReady) {
    console.error("Scoring cancelled: dictionary is unavailable.");
    return;
  }

  // Disable further dice movement.
  const allDice = document.querySelectorAll(".die");

  allDice.forEach(die => {
    die.draggable = false;
  });

  gridContainer.querySelectorAll(".grid-cell").forEach(cell => {
    cell.classList.remove("drag-over");
  });

  const scoreArea = document.getElementById("score-output-area");

  scoreArea.innerHTML = "<div>Checking words...</div>";

  // =======================================================================
  // BUILD THE BOARD MATRIX
  // All 8 rows are part of the playing field and must be scored.
  // =======================================================================

  const boardMatrix = Array(GRID_ROWS)
    .fill(null)
    .map(() => Array(GRID_COLS).fill(null));

  let totalDicePlaced = 0;

  document.querySelectorAll(".grid-cell").forEach(cell => {

    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

 
    if (cell.hasChildNodes()) {

      const die = cell.querySelector(".die");

      if (!die) return;

      boardMatrix[row][col] = {
        id: die.id,
        letter: die.dataset.letter,
        color: die.dataset.color,
        score: SCRABBLE_SCORE_MAP[die.dataset.letter],
        element: cell
      };

      totalDicePlaced++;
    }
  });

  // =======================================================================
  // FIND HORIZONTAL WORDS
  // =======================================================================

  const rawWords = [];

  for (let r = 0; r < GRID_ROWS; r++) {

    let currentWord = [];

    for (let c = 0; c < GRID_COLS; c++) {

      if (boardMatrix[r][c]) {

        currentWord.push({
          r,
          c,
          ...boardMatrix[r][c]
        });

      } else {

        if (currentWord.length >= 2) {
          rawWords.push({ tiles: currentWord });
        }

        currentWord = [];
      }
    }

    if (currentWord.length >= 2) {
      rawWords.push({ tiles: currentWord });
    }
  }

  // =======================================================================
  // FIND VERTICAL WORDS
  // =======================================================================

  for (let c = 0; c < GRID_COLS; c++) {

    let currentWord = [];

for (let r = 0; r < GRID_ROWS; r++) {

      if (boardMatrix[r][c]) {

        currentWord.push({
          r,
          c,
          ...boardMatrix[r][c]
        });

      } else {

        if (currentWord.length >= 2) {
          rawWords.push({ tiles: currentWord });
        }

        currentWord = [];
      }
    }

    if (currentWord.length >= 2) {
      rawWords.push({ tiles: currentWord });
    }
  }

  // =======================================================================
  // VALIDATE WORDS AGAINST THE LOCAL DICTIONARY
  // No external API calls and no CORS problems.
  // =======================================================================

  const validatedWords = rawWords.map(wordObj => {

    const textString = wordObj.tiles
      .map(tile => tile.letter.toLowerCase())
      .join("");

    return {
      ...wordObj,
      text: textString,
      isValid: LOCAL_DICTIONARY.has(textString)
    };
  });

  // =======================================================================
  // SCORE VALID WORDS
  // =======================================================================

  scoreArea.innerHTML = "";

  let grandBaseTotal = 0;

  const validDiceIds = new Set();

  // Clear any previous multiplier graphics.
  gridContainer.querySelectorAll(".word-strike-line").forEach(line => {
    line.remove();
  });

  validatedWords.forEach(wordObj => {

    // Invalid words score zero.
    if (!wordObj.isValid) {

      const invalidDiv = document.createElement("div");

      invalidDiv.style.color = "var(--text-muted, #a1a1aa)";
      invalidDiv.style.textDecoration = "line-through";

      invalidDiv.textContent = `${wordObj.text} = 0 (invalid)`;

      scoreArea.appendChild(invalidDiv);

      return;
    }

    // Record dice belonging to valid words.
    wordObj.tiles.forEach(tile => {
      validDiceIds.add(tile.id);
    });

    // Calculate the base word score.
    const baseWordScore = wordObj.tiles.reduce(
      (total, tile) => total + tile.score,
      0
    );

    // Check whether every die in the word has the same color.
    const initialColor = wordObj.tiles[0].color;

    const isPureColor = wordObj.tiles.every(
      tile => tile.color === initialColor
    );

    let activeMultiplier = 1;

    if (isPureColor && COLOR_MULTIPLIERS[initialColor]) {

      activeMultiplier = COLOR_MULTIPLIERS[initialColor];

      drawVisualStrikethrough(
        wordObj.tiles,
        initialColor.toLowerCase(),
        activeMultiplier
      );
    }

    const calculatedWordFinal = baseWordScore * activeMultiplier;

    grandBaseTotal += calculatedWordFinal;

    const lineDiv = document.createElement("div");

    if (activeMultiplier > 1) {

      lineDiv.textContent =
        `${wordObj.text} = ${baseWordScore} x ${activeMultiplier} = ${calculatedWordFinal}`;

    } else {

      lineDiv.textContent =
        `${wordObj.text} = ${baseWordScore}`;
    }

    scoreArea.appendChild(lineDiv);
  });

  // =======================================================================
  // EIGHT-DICE JACKPOT
  // =======================================================================

  let finalScore = grandBaseTotal;

  const triggeredJackpot =
    totalDicePlaced === 8 &&
    validDiceIds.size === 8;

  if (triggeredJackpot) {

    finalScore = grandBaseTotal * ALL_DICE_JACKPOT_MULTIPLIER;

    const jackpotDiv = document.createElement("div");

    jackpotDiv.style.color = "var(--color-yellow)";

    jackpotDiv.textContent =
      `8-dice bonus = x${ALL_DICE_JACKPOT_MULTIPLIER}`;

    scoreArea.appendChild(jackpotDiv);
  }

  
// =======================================================================
// TIME BONUS
// =======================================================================

const allWordsValid = validatedWords.every(word => word.isValid);

const awardedTimeBonus =
  totalDicePlaced === 8 && allWordsValid
    ? timeBonus
    : 0;

finalScore += awardedTimeBonus;

if (awardedTimeBonus > 0) {
  const timeBonusDiv = document.createElement("div");

  timeBonusDiv.textContent =
    `Time bonus = ${awardedTimeBonus / 5} x 5 = ${awardedTimeBonus}`;

  scoreArea.appendChild(timeBonusDiv);
}

// =======================================================================
// DISPLAY FINAL SCORE
// =======================================================================

const finalDiv = document.createElement("div");

finalDiv.classList.add("total-line");
finalDiv.textContent = `TOTAL = ${finalScore}`;

scoreArea.appendChild(finalDiv);

console.log("RollaWord scoring complete.");
console.log("Dice placed in playing area:", totalDicePlaced);
console.log("Words checked:", validatedWords.length);
console.log("Time bonus:", timeBonus);
console.log("Final score:", finalScore);
}

// =========================================================================
// DRAW COLOR MULTIPLIER GRAPHICS
// =========================================================================

function drawVisualStrikethrough(tiles, colorClass, factor) {

  const firstCell = tiles[0].element;
  const lastCell = tiles[tiles.length - 1].element;

  const rectStart = firstCell.getBoundingClientRect();
  const rectEnd = lastCell.getBoundingClientRect();
  const containerRect = gridContainer.getBoundingClientRect();

  const startX =
    (rectStart.left + rectStart.width / 2) - containerRect.left;

  const startY =
    (rectStart.top + rectStart.height / 2) - containerRect.top;

  const endX =
    (rectEnd.left + rectEnd.width / 2) - containerRect.left;

  const endY =
    (rectEnd.top + rectEnd.height / 2) - containerRect.top;

  const length = Math.sqrt(
    Math.pow(endX - startX, 2) +
    Math.pow(endY - startY, 2)
  );

  const angle =
    Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

  const strikeLine = document.createElement("div");

  strikeLine.classList.add("word-strike-line", colorClass);

  strikeLine.style.width = `${length}px`;
  strikeLine.style.left = `${startX}px`;
  strikeLine.style.top = `${startY}px`;
  strikeLine.style.transform = `rotate(${angle}deg)`;

  const tag = document.createElement("span");

  tag.classList.add("multiplier-tag");
  tag.textContent = `${factor}x Multiplier`;
  tag.style.transform = `rotate(${-angle}deg)`;

  strikeLine.appendChild(tag);

  gridContainer.appendChild(strikeLine);
}