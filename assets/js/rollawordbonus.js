// =========================================================================
// ROLLAWORD BONUS AND CALCULATION ENGINE
// Blank-tile optimization, word scoring, jackpot, and time bonus
// =========================================================================


// SCORE A PARTICULAR ASSIGNMENT OF BLANK LETTERS
// Add this at the absolute top of the file to safely link your snippet
const COLOR_MULTIPLIERS = window.COLOR_MULTIPLIERS;

function scoreAssignment(rawWords, assignments) {
  const words = rawWords.map(wordObj => {
    const letters = wordObj.tiles.map(tile => {
      if (tile.isBlank) {
        return assignments.get(tile.id) || "A";
      }

      return tile.letter;
    });

    const text = letters.join("").toLowerCase();
    const isValid = LOCAL_DICTIONARY.has(text);

    const baseScore = wordObj.tiles.reduce(
      (total, tile) => total + (tile.isBlank ? 0 : tile.score),
      0
    );

    const firstColor = wordObj.tiles[0].color;

    const sameColor = wordObj.tiles.every(
      tile => tile.color === firstColor
    );

  //  Safe fallback ensures the game won't crash even if scripts load out of order
  const activeMultipliers = window.COLOR_MULTIPLIERS || { "BLUE": 2, "RED": 3 };

  const multiplier = sameColor
    ? (activeMultipliers[firstColor] || 1)
    : 1;

    return {
      ...wordObj,
      text,
      isValid,
      isDisqualified: false,
      baseScore,
      multiplier,
      score: 0
    };
  });


  // IDENTIFY ALL TILES THAT BELONG TO INVALID WORDS

  const disqualifiedDiceIds = new Set();

  words.forEach(word => {
    if (!word.isValid) {
      word.tiles.forEach(tile => {
        disqualifiedDiceIds.add(tile.id);
      });
    }
  });


  // DISQUALIFY VALID WORDS THAT SHARE TILES WITH INVALID WORDS

  words.forEach(word => {
    const sharesInvalidTile = word.tiles.some(
      tile => disqualifiedDiceIds.has(tile.id)
    );

    word.isDisqualified =
      word.isValid && sharesInvalidTile;
  });


  // SCORE ONLY VALID, NON-DISQUALIFIED WORDS

  words.forEach(word => {
    if (word.isValid && !word.isDisqualified) {
      word.score = word.baseScore * word.multiplier;
    } else {
      word.score = 0;
    }
  });


  // CALCULATE TOTAL FROM ELIGIBLE WORDS ONLY

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


// =========================================================================
// FIND THE HIGHEST-SCORING BLANK-TILE ASSIGNMENT
// =========================================================================

function calculateBestWordScores(rawWords, blankTiles) {
  let bestResult = null;
  const assignments = new Map();

  function searchBlankAssignments(index) {
    if (index >= blankTiles.length) {
      const result = scoreAssignment(rawWords, assignments);

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
    bestResult = scoreAssignment(rawWords, new Map());
  }

  return bestResult;
}


// =========================================================================
// APPLY JACKPOT, TIME BONUS, AND FINAL SCORE
// =========================================================================
function applyScoreBonuses(
  bestResult,
  totalDicePlaced,
  validDiceIds,
  grandBaseTotal,
  timeBonus,
  scoreArea
) {
  // 🧠 THE ANTI-NAN FIX: Resolve global namespace scope safely
  // Uses your global window declaration or defaults to a standard x2 multiplier backup
  const jackpotMultiplier = window.ALL_DICE_JACKPOT_MULTIPLIER || 2;
  
  let finalScore = grandBaseTotal;

  // JACKPOT: ALL EIGHT PLAYABLE DICE MUST SCORE

  const triggeredJackpot =
    totalDicePlaced === 8 &&
    validDiceIds.size === 8;

  if (triggeredJackpot) {
    // 👉 Updated to use the safe local variable reference for mathematical calculation
    finalScore *= jackpotMultiplier;

    const jackpotDiv = document.createElement("div");

    jackpotDiv.style.color = "var(--color-yellow)";

    // 👉 Updated string literal to read clean integers instead of printing "xundefined"
    jackpotDiv.textContent =
      `8-dice bonus = x${jackpotMultiplier}`;

    scoreArea.appendChild(jackpotDiv);
  }


  // TIME BONUS: EVERY WORD MUST BE VALID AND QUALIFIED

  const allWordsValid = bestResult.words.every(
    word => word.isValid && !word.isDisqualified
  );

  const awardedTimeBonus =
    totalDicePlaced === 8 && allWordsValid
      ? timeBonus
      : 0;

  finalScore += awardedTimeBonus;

  if (awardedTimeBonus > 0) {
    const timeBonusDiv = document.createElement("div");

    timeBonusDiv.textContent =
      `Time bonus = ${awardedTimeBonus / 2} x 2 = ` +
      `${awardedTimeBonus}`;

    scoreArea.appendChild(timeBonusDiv);
  }


  // DISPLAY FINAL SCORE

  const finalDiv = document.createElement("div");

  finalDiv.classList.add("total-line");
  finalDiv.textContent = `TOTAL = ${finalScore}`;

  scoreArea.appendChild(finalDiv);


  window.finalScore = finalScore
  console.log("Time bonus  in applyScoreBonuses:", awardedTimeBonus);
  console.log("Final score in applyScoreBonuses:", window.finalScore);
}




// =========================================================================
// DRAW COLOR MULTIPLIER GRAPHICS
// =========================================================================

function drawVisualStrikethrough(tiles, colorClass, factor) {
  const firstCell = tiles[0].element;
  const lastCell = tiles[tiles.length - 1].element;

  const rectStart = firstCell.getBoundingClientRect();
  const rectEnd = lastCell.getBoundingClientRect();
  const gridContainer = document.getElementById("game-board");
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