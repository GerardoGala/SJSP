// =========================================================================
// ROLLAWORD SCORING ENGINE
// Local dictionary + automatic blank-tile letter selection
// =========================================================================

const COLOR_MULTIPLIERS = {
  RED: 2,
  BLUE: 3,
  YELLOW: 4
};

const ALL_DICE_JACKPOT_MULTIPLIER = 2;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
    console.log(`RollaWord dictionary loaded: ${LOCAL_DICTIONARY.size} words.`);

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

const dictionaryLoadingPromise = loadLocalDictionary();

// =========================================================================
// ENDGAME SCORING
// =========================================================================

async function processEndgameScoring(timeBonus = 0) {
  await dictionaryLoadingPromise;

  if (!dictionaryReady) {
    console.error(
      "Scoring cancelled: dictionary is unavailable.",
      dictionaryError
    );
    return;
  }

  // Disable further dice movement.
  document.querySelectorAll(".die").forEach(die => {
    die.draggable = false;
  });

  gridContainer.querySelectorAll(".grid-cell").forEach(cell => {
    cell.classList.remove("drag-over");
  });

  const scoreArea = document.getElementById("score-output-area");
  scoreArea.innerHTML = "<div>Checking words...</div>";

  // =======================================================================
  // BUILD THE COMPLETE 8x8 BOARD
  // =======================================================================

  const boardMatrix = Array.from(
    { length: GRID_ROWS },
    () => Array(GRID_COLS).fill(null)
  );

  let totalDicePlaced = 0;

  document.querySelectorAll(".grid-cell").forEach(cell => {
    const row = Number.parseInt(cell.dataset.row, 10);
    const col = Number.parseInt(cell.dataset.col, 10);
    const die = cell.querySelector(".die");

    if (
      !die ||
      row < 0 ||
      row >= GRID_ROWS ||
      col < 0 ||
      col >= GRID_COLS
    ) {
      return;
    }

    const originalLetter = (die.dataset.letter || "").toUpperCase();
    const isBlank = originalLetter === "*";

    boardMatrix[row][col] = {
      id: die.id,
      letter: originalLetter,
      color: (die.dataset.color || "").toUpperCase(),
      score: isBlank
        ? 0
        : (SCRABBLE_SCORE_MAP[originalLetter] || 0),
      isBlank,
      element: cell,
      dieElement: die
    };

    totalDicePlaced++;
  });

  // =======================================================================
  // FIND HORIZONTAL WORDS
  // =======================================================================

  const rawWords = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    let run = [];

    for (let c = 0; c < GRID_COLS; c++) {
      if (boardMatrix[r][c]) {
        run.push({
          r,
          c,
          ...boardMatrix[r][c]
        });
      } else {
        if (run.length >= 2) {
          rawWords.push({
            tiles: run,
            direction: "horizontal"
          });
        }

        run = [];
      }
    }

    if (run.length >= 2) {
      rawWords.push({
        tiles: run,
        direction: "horizontal"
      });
    }
  }

  // =======================================================================
  // FIND VERTICAL WORDS
  // =======================================================================

  for (let c = 0; c < GRID_COLS; c++) {
    let run = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      if (boardMatrix[r][c]) {
        run.push({
          r,
          c,
          ...boardMatrix[r][c]
        });
      } else {
        if (run.length >= 2) {
          rawWords.push({
            tiles: run,
            direction: "vertical"
          });
        }

        run = [];
      }
    }

    if (run.length >= 2) {
      rawWords.push({
        tiles: run,
        direction: "vertical"
      });
    }
  }

  // =======================================================================
  // IDENTIFY BLANK TILES
  // =======================================================================

  const blankTiles = [];
  const seenBlankIds = new Set();

  rawWords.forEach(word => {
    word.tiles.forEach(tile => {
      if (tile.isBlank && !seenBlankIds.has(tile.id)) {
        seenBlankIds.add(tile.id);
        blankTiles.push(tile);
      }
    });
  });

  // =======================================================================
  // SCORE A PARTICULAR ASSIGNMENT OF BLANK LETTERS
  // =======================================================================

  function scoreAssignment(assignments) {
    const words = rawWords.map(wordObj => {
      const letters = wordObj.tiles.map(tile => {
        if (tile.isBlank) {
          return assignments.get(tile.id) || "A";
        }

        return tile.letter;
      });

      const text = letters.join("").toLowerCase();
      const isValid = LOCAL_DICTIONARY.has(text);

      // Blank tiles always score zero.
      const baseScore = wordObj.tiles.reduce(
        (total, tile) => total + (tile.isBlank ? 0 : tile.score),
        0
      );

      const firstColor = wordObj.tiles[0].color;

      const sameColor = wordObj.tiles.every(
        tile => tile.color === firstColor
      );

      const multiplier = sameColor
        ? (COLOR_MULTIPLIERS[firstColor] || 1)
        : 1;

      const score = isValid
        ? baseScore * multiplier
        : 0;

      return {
        ...wordObj,
        text,
        isValid,
        baseScore,
        multiplier,
        score
      };
    });

    const total = words.reduce(
      (sum, word) => sum + word.score,
      0
    );

    return {
      words,
      total,
      assignments: new Map(assignments)
    };
  }

  // =======================================================================
  // TEST ALL POSSIBLE LETTER COMBINATIONS FOR BLANK TILES
  // Up to 26 x 26 combinations for two blanks.
  // Intersecting words use the same assigned letter.
  // =======================================================================

  let bestResult = null;
  const assignments = new Map();

  function searchBlankAssignments(index) {
    if (index >= blankTiles.length) {
      const result = scoreAssignment(assignments);

      if (!bestResult || result.total > bestResult.total) {
        bestResult = result;
      }

      return;
    }

    const blank = blankTiles[index];

    for (const letter of ALPHABET) {
      assignments.set(blank.id, letter);
      searchBlankAssignments(index + 1);
    }

    assignments.delete(blank.id);
  }

  searchBlankAssignments(0);

  if (!bestResult) {
    bestResult = scoreAssignment(new Map());
  }

  // =======================================================================
  // DISPLAY THE SELECTED LETTERS ON BLANK TILES
  // Blank tile point values remain zero.
  // =======================================================================

  blankTiles.forEach(tile => {
    const chosenLetter =
      bestResult.assignments.get(tile.id) || "A";

    tile.dieElement.dataset.assignedLetter = chosenLetter;

    let letterSpan = tile.dieElement.querySelector("span");

    if (!letterSpan) {
      letterSpan = document.createElement("span");
      tile.dieElement.prepend(letterSpan);
    }

    letterSpan.textContent = chosenLetter;

    const valueBadge = tile.dieElement.querySelector(".die-value");

    if (valueBadge) {
      valueBadge.textContent = "0";
    }
  });

  // =======================================================================
  // DISPLAY WORD SCORES
  // =======================================================================

  gridContainer
    .querySelectorAll(".word-strike-line")
    .forEach(line => line.remove());

  scoreArea.innerHTML = "";

  let grandBaseTotal = 0;
  const validDiceIds = new Set();

  bestResult.words.forEach(wordObj => {
    if (!wordObj.isValid) {
      const invalidDiv = document.createElement("div");

      invalidDiv.style.color =
        "var(--text-muted, #a1a1aa)";

      invalidDiv.style.textDecoration = "line-through";

      invalidDiv.textContent =
        `${wordObj.text} = 0 (invalid)`;

      scoreArea.appendChild(invalidDiv);
      return;
    }

    wordObj.tiles.forEach(tile => {
      validDiceIds.add(tile.id);
    });

    grandBaseTotal += wordObj.score;

    if (wordObj.multiplier > 1) {
      drawVisualStrikethrough(
        wordObj.tiles,
        wordObj.tiles[0].color.toLowerCase(),
        wordObj.multiplier
      );
    }

    const lineDiv = document.createElement("div");

    if (wordObj.multiplier > 1) {
      lineDiv.textContent =
        `${wordObj.text} = ${wordObj.baseScore} x ` +
        `${wordObj.multiplier} = ${wordObj.score}`;
    } else {
      lineDiv.textContent =
        `${wordObj.text} = ${wordObj.baseScore}`;
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
    finalScore *= ALL_DICE_JACKPOT_MULTIPLIER;

    const jackpotDiv = document.createElement("div");

    jackpotDiv.style.color = "var(--color-yellow)";

    jackpotDiv.textContent =
      `8-dice bonus = x${ALL_DICE_JACKPOT_MULTIPLIER}`;

    scoreArea.appendChild(jackpotDiv);
  }

  // =======================================================================
  // TIME BONUS
  // =======================================================================

  const allWordsValid = bestResult.words.every(
    word => word.isValid
  );

  const awardedTimeBonus =
    totalDicePlaced === 8 && allWordsValid
      ? timeBonus
      : 0;

  finalScore += awardedTimeBonus;

  if (awardedTimeBonus > 0) {
    const timeBonusDiv = document.createElement("div");

    timeBonusDiv.textContent =
      `Time bonus = ${awardedTimeBonus / 5} x 5 = ` +
      `${awardedTimeBonus}`;

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
  console.log("Dice on board:", totalDicePlaced);
  console.log("Words checked:", bestResult.words.length);
  console.log(
    "Blank assignments:",
    Object.fromEntries(bestResult.assignments)
  );
  console.log("Time bonus:", awardedTimeBonus);
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
    (rectStart.left + rectStart.width / 2) -
    containerRect.left;

  const startY =
    (rectStart.top + rectStart.height / 2) -
    containerRect.top;

  const endX =
    (rectEnd.left + rectEnd.width / 2) -
    containerRect.left;

  const endY =
    (rectEnd.top + rectEnd.height / 2) -
    containerRect.top;

  const length = Math.sqrt(
    Math.pow(endX - startX, 2) +
    Math.pow(endY - startY, 2)
  );

  const angle =
    Math.atan2(endY - startY, endX - startX) *
    (180 / Math.PI);

  const strikeLine = document.createElement("div");

  strikeLine.classList.add(
    "word-strike-line",
    colorClass
  );

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