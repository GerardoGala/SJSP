// =========================================================================
// ROLLAWORD SCORING ENGINE
// Board analysis, word discovery, and score display
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

  // BUILD THE COMPLETE 8x8 BOARD

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

  // FIND HORIZONTAL AND VERTICAL WORDS

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

  // IDENTIFY BLANK TILES

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



  // CHECK THE MOAT RULE BEFORE SCORING
  if (!hasSingleIsland(boardMatrix)) {
    scoreArea.innerHTML = "";
    alert("Invalid game. Only one island is allowed.");
    return;
  }

const bestResult = calculateBestWordScores(rawWords, blankTiles);

  // DISPLAY THE SELECTED LETTERS ON BLANK TILES

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

  // DISPLAY WORD SCORES

  gridContainer
    .querySelectorAll(".word-strike-line")
    .forEach(line => line.remove());

  scoreArea.innerHTML = "";

  const scoreTotals = displayWordScores(bestResult.words, scoreArea);

  // APPLY JACKPOT AND TIME BONUS

  applyScoreBonuses(
    bestResult,
    totalDicePlaced,
    scoreTotals.validDiceIds,
    scoreTotals.grandBaseTotal,
    timeBonus,
    scoreArea
  );

  console.log("RollaWord scoring complete.");
  console.log("Dice on board:", totalDicePlaced);
  console.log("Words checked:", bestResult.words.length);
  console.log(
    "Blank assignments:",
    Object.fromEntries(bestResult.assignments)
  );
}

// DISPLAY VALID AND INVALID WORD SCORES

function displayWordScores(words, scoreArea) {
  let grandBaseTotal = 0;
  const validDiceIds = new Set();

  words.forEach(wordObj => {
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

  return {
    grandBaseTotal,
    validDiceIds
  };
}