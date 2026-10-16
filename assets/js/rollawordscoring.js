const COLOR_MULTIPLIERS = { "RED": 2, "BLUE": 3, "YELLOW": 4 };
const ALL_DICE_JACKPOT_MULTIPLIER = 2;

const BACKUP_DICTIONARY = new Set([
  "aa", "ab", "ad", "ae", "ag", "ah", "ai", "al", "am", "an", "ar", "as", "at", "aw", "ax", "ay",
  "ba", "be", "bi", "bo", "by", "da", "de", "do", "ed", "ef", "eh", "el", "em", "en", "er", "es",
  "et", "ex", "fa", "fe", "go", "ha", "he", "hi", "hm", "ho", "id", "if", "in", "is", "it", "jo",
  "ka", "ki", "la", "li", "lo", "ma", "me", "mi", "mm", "mo", "mu", "my", "na", "ne", "no", "nu",
  "od", "oe", "of", "oh", "oi", "ok", "om", "on", "op", "or", "os", "ow", "ox", "oy", "pa", "pe",
  "pi", "po", "qi", "re", "sh", "si", "so", "ta", "te", "ti", "to", "uh", "um", "un", "up", "us",
  "ut", "we", "wo", "xi", "xu", "ya", "ye", "yo", "za", "awe", "ax", "act", "add", "ado", "aft", 
  "age", "ago", "aid", "ail", "aim", "air", "ale", "all", "and", "bad", "bag", "ball", "beach", "dime", "is", "joe"
]);

async function processEndgameScoring() {
  const allDice = document.querySelectorAll('.die');
  allDice.forEach(die => die.draggable = false);
  
  gridContainer.querySelectorAll('.grid-cell').forEach(cell => {
    cell.removeAttribute('dragover');
    cell.removeAttribute('drop');
  });

  const scoreArea = document.getElementById('score-output-area');
  scoreArea.innerHTML = "<div>Checking live dictionary...</div>";

  const boardMatrix = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
  let totalDicePlaced = 0;

  document.querySelectorAll('.grid-cell').forEach(cell => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (cell.hasChildNodes()) {
      const die = cell.firstChild;
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

  const rawWords = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    let currentWord = [];
    for (let c = 0; c < GRID_COLS; c++) {
      if (boardMatrix[r][c]) {
        currentWord.push({ r, c, ...boardMatrix[r][c] });
      } else {
        if (currentWord.length >= 2) rawWords.push({ tiles: currentWord });
        currentWord = [];
      }
    }
    if (currentWord.length >= 2) rawWords.push({ tiles: currentWord });
  }

  for (let c = 0; c < GRID_COLS; c++) {
    let currentWord = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      if (boardMatrix[r][c]) {
        currentWord.push({ r, c, ...boardMatrix[r][c] });
      } else {
        if (currentWord.length >= 2) rawWords.push({ tiles: currentWord });
        currentWord = [];
      }
    }
    if (currentWord.length >= 2) rawWords.push({ tiles: currentWord });
  }

  const validationPromises = rawWords.map(async (wordObj) => {
    const textString = wordObj.tiles.map(t => t.letter.toLowerCase()).join("");
    try {
      const response = await fetch(`https://dictionaryapi.dev{textString}`);
      return { ...wordObj, text: textString, isValid: response.ok };
    } catch (err) {
      return { ...wordObj, text: textString, isValid: BACKUP_DICTIONARY.has(textString) };
    }
  });

  const validatedWords = await Promise.all(validationPromises);
  scoreArea.innerHTML = ""; 

  let grandBaseTotal = 0;
  const validDiceIds = new Set(); 

  validatedWords.forEach((wordObj) => {
    if (!wordObj.isValid) {
      const invalidDiv = document.createElement('div');
      invalidDiv.style.color = "var(--text-muted, #a1a1aa)";
      invalidDiv.style.textDecoration = "line-through";
      invalidDiv.textContent = `${wordObj.text} = 0 (invalid)`;
      scoreArea.appendChild(invalidDiv);
      return;
    }

    wordObj.tiles.forEach(t => validDiceIds.add(t.id));

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
      lineDiv.textContent = `${wordObj.text} = ${baseWordScore} x ${activeMultiplier} = ${calculatedWordFinal}`;
    } else {
      lineDiv.textContent = `${wordObj.text} = ${baseWordScore}`;
    }
    scoreArea.appendChild(lineDiv);
  });

  let finalScore = grandBaseTotal;
  const triggeredJackpot = totalDicePlaced === 8 && validDiceIds.size === 8;

  if (triggeredJackpot) {
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
