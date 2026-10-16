// =========================================================================
// ROLLAWORD DICTIONARY
// Local dictionary + scoring constants
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
    const response = await fetch(
      "https://gerardogala.github.io/SJSP/assets/js/dictionary.txt"
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: Could not load dictionary.txt`
      );
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

const dictionaryLoadingPromise = loadLocalDictionary();