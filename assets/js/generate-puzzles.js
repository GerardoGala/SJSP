// RollaWord daily puzzle generator
// Usage: node generate-puzzles.js words.txt [startDate YYYYMMDD] [days]
//   words.txt = one word per line (Scrabble list, or a smaller "common words" list)
// Writes: puzzles.json   -> { "20261018": [{l:"D",c:"blue"}, ...8 items] }  (put on your site)
//         solutions.json -> a valid board for each date (keep private, for checking)
//
// Every puzzle is built by actually laying out a connected board of exactly
// 8 tiles where every word formed is in the dictionary, so the 8-dice bonus
// is guaranteed possible.

const fs = require("fs");

const COLORS = ["blue", "red"];          // add more here later
const TILES = 8;
const MIN_LEN = 2, MAX_LEN = 6;          // word lengths used when building boards
const VOWELS = new Set("AEIOU");

const [, , wordFile = "words.txt", startArg = "20261018", daysArg = "365"] = process.argv;

// ---- dictionary ----
const words = fs.readFileSync(wordFile, "utf8")
  .split(/\r?\n/).map(w => w.trim().toUpperCase())
  .filter(w => /^[A-Z]+$/.test(w) && w.length >= MIN_LEN && w.length <= MAX_LEN);
const dict = new Set(words);
const byLetter = {};                      // letter -> words containing it
for (const w of words) for (const ch of new Set(w)) (byLetter[ch] ||= []).push(w);
const seeds = words.filter(w => w.length >= 3);

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const key = (r, c) => r + "," + c;

// ---- board validation: every run of 2+ tiles (across and down) must be a word ----
function runs(board) {
  const out = [];
  const cells = [...board.keys()].map(k => k.split(",").map(Number));
  for (const [dr, dc] of [[0, 1], [1, 0]]) {
    for (const [r, c] of cells) {
      if (board.has(key(r - dr, c - dc))) continue;     // not a run start
      let w = "", rr = r, cc = c;
      while (board.has(key(rr, cc))) { w += board.get(key(rr, cc)); rr += dr; cc += dc; }
      if (w.length >= 2) out.push(w);
    }
  }
  return out;
}
const valid = board => runs(board).every(w => dict.has(w));

// ---- build one board ----
function buildBoard() {
  const board = new Map();
  const seed = pick(seeds);
  if (seed.length > TILES) return null;
  [...seed].forEach((ch, i) => board.set(key(0, i), ch));

  for (let attempt = 0; attempt < 400 && board.size < TILES; attempt++) {
    const [r, c] = pick([...board.keys()]).split(",").map(Number);
    const ch = board.get(key(r, c));
    const w = pick(byLetter[ch] || []);
    if (!w) continue;
    const idx = pick([...w].map((x, i) => (x === ch ? i : -1)).filter(i => i >= 0));
    const [dr, dc] = Math.random() < 0.5 ? [0, 1] : [1, 0];

    const next = new Map(board);
    let added = 0, ok = true;
    for (let i = 0; i < w.length; i++) {
      const k = key(r + (i - idx) * dr, c + (i - idx) * dc);
      if (next.has(k)) { if (next.get(k) !== w[i]) { ok = false; break; } }
      else { next.set(k, w[i]); added++; }
    }
    if (!ok || added === 0 || next.size > TILES || !valid(next)) continue;
    for (const [k, v] of next) board.set(k, v);
  }
  return board.size === TILES && valid(board) ? board : null;
}

// ---- quality filter on the letter set ----
function goodSet(letters) {
  const vowels = letters.filter(l => VOWELS.has(l)).length;
  const counts = {};
  letters.forEach(l => (counts[l] = (counts[l] || 0) + 1));
  return vowels >= 2 && vowels <= 4 && Math.max(...Object.values(counts)) <= 3;
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function boardToRows(board) {
  const cells = [...board.entries()].map(([k, v]) => [...k.split(",").map(Number), v]);
  const minR = Math.min(...cells.map(x => x[0])), maxR = Math.max(...cells.map(x => x[0]));
  const minC = Math.min(...cells.map(x => x[1])), maxC = Math.max(...cells.map(x => x[1]));
  const rows = [];
  for (let r = minR; r <= maxR; r++) {
    let line = "";
    for (let c = minC; c <= maxC; c++) line += board.get(key(r, c)) || ".";
    rows.push(line);
  }
  return rows;
}

// ---- main ----
function addDays(yyyymmdd, n) {
  const s = String(yyyymmdd);
  const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8) + n));
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const puzzles = {}, solutions = {}, used = new Set();
const days = parseInt(daysArg, 10);
for (let i = 0; i < days; i++) {
  const date = addDays(startArg, i);
  for (let tries = 0; tries < 5000; tries++) {
    const board = buildBoard();
    if (!board) continue;
    const letters = [...board.values()];
    const sig = [...letters].sort().join("");
    if (!goodSet(letters) || used.has(sig)) continue;
    used.add(sig);
    puzzles[date] = shuffle(letters).map(l => ({ l, c: pick(COLORS) }));
    solutions[date] = { words: [...new Set(runs(board))], board: boardToRows(board) };
    break;
  }
  if (!puzzles[date]) { console.error("Could not build a puzzle for", date); process.exit(1); }
}

fs.writeFileSync("puzzles.json", JSON.stringify(puzzles, null, 1));
fs.writeFileSync("solutions.json", JSON.stringify(solutions, null, 1));
console.log(`Wrote ${days} puzzles. Example ${startArg}:`, JSON.stringify(puzzles[startArg]));
console.log("Solution:", solutions[startArg].words.join(", "));
