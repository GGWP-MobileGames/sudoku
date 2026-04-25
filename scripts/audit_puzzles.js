// Sudoku Puzzle Database Audit Script
const db = require('./src/utils/puzzleDatabase.json');

const SAMPLE_SIZE = 60; // per level
const CLUE_RANGES = {
  easy: [36, 39],
  medium: [30, 32],
  hard: [23, 28],
  diabolical: [22, 23],
};

// --- Helpers ---

function countClues(puzzle) {
  let count = 0;
  for (const row of puzzle) for (const cell of row) if (cell !== 0) count++;
  return count;
}

function isValidSolution(solution) {
  // Check dimensions
  if (solution.length !== 9) return { valid: false, reason: 'not 9 rows' };
  for (let r = 0; r < 9; r++) {
    if (solution[r].length !== 9) return { valid: false, reason: `row ${r} not 9 cols` };
  }
  // Check rows
  for (let r = 0; r < 9; r++) {
    const set = new Set(solution[r]);
    if (set.size !== 9) return { valid: false, reason: `row ${r} has duplicates` };
    for (let v = 1; v <= 9; v++) if (!set.has(v)) return { valid: false, reason: `row ${r} missing ${v}` };
  }
  // Check columns
  for (let c = 0; c < 9; c++) {
    const set = new Set();
    for (let r = 0; r < 9; r++) set.add(solution[r][c]);
    if (set.size !== 9) return { valid: false, reason: `col ${c} has duplicates` };
    for (let v = 1; v <= 9; v++) if (!set.has(v)) return { valid: false, reason: `col ${c} missing ${v}` };
  }
  // Check 3x3 blocks
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const set = new Set();
      for (let r = br * 3; r < br * 3 + 3; r++)
        for (let c = bc * 3; c < bc * 3 + 3; c++)
          set.add(solution[r][c]);
      if (set.size !== 9) return { valid: false, reason: `block (${br},${bc}) has duplicates` };
      for (let v = 1; v <= 9; v++) if (!set.has(v)) return { valid: false, reason: `block (${br},${bc}) missing ${v}` };
    }
  }
  return { valid: true };
}

function puzzleMatchesSolution(puzzle, solution) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (puzzle[r][c] !== 0 && puzzle[r][c] !== solution[r][c])
        return false;
  return true;
}

// Backtracking solver that counts solutions (stops at 2)
function countSolutions(puzzle, maxCount = 2) {
  const grid = puzzle.map(r => [...r]);
  let count = 0;

  function getCandidates(grid, r, c) {
    const used = new Set();
    // Row
    for (let j = 0; j < 9; j++) if (grid[r][j] !== 0) used.add(grid[r][j]);
    // Col
    for (let i = 0; i < 9; i++) if (grid[i][c] !== 0) used.add(grid[i][c]);
    // Block
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++)
      for (let j = bc; j < bc + 3; j++)
        if (grid[i][j] !== 0) used.add(grid[i][j]);
    const candidates = [];
    for (let v = 1; v <= 9; v++) if (!used.has(v)) candidates.push(v);
    return candidates;
  }

  function findBestEmpty(grid) {
    let best = null, bestLen = 10;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0) {
          const len = getCandidates(grid, r, c).length;
          if (len < bestLen) { best = [r, c]; bestLen = len; }
          if (len === 0) return { cell: [r, c], candidates: [] };
        }
    if (!best) return null;
    return { cell: best, candidates: getCandidates(grid, best[0], best[1]) };
  }

  function solve() {
    if (count >= maxCount) return;
    const result = findBestEmpty(grid);
    if (!result) { count++; return; }
    const { cell: [r, c], candidates } = result;
    for (const v of candidates) {
      grid[r][c] = v;
      solve();
      if (count >= maxCount) { grid[r][c] = 0; return; }
      grid[r][c] = 0;
    }
  }

  solve();
  return count;
}

function puzzleToString(puzzle) {
  return puzzle.map(r => r.join('')).join('');
}

// --- Random sampling ---
function sampleIndices(total, n) {
  const indices = new Set();
  while (indices.size < n) indices.add(Math.floor(Math.random() * total));
  return [...indices];
}

// --- Main audit ---
const levels = ['easy', 'medium', 'hard', 'diabolical'];
const results = {};

for (const level of levels) {
  const puzzles = db[level];
  const indices = sampleIndices(puzzles.length, SAMPLE_SIZE);

  const res = {
    total: puzzles.length,
    sampled: SAMPLE_SIZE,
    solutionValid: 0,
    solutionInvalid: [],
    puzzleMatchesSolution: 0,
    puzzleMismatch: [],
    uniqueSolution: 0,
    multipleSolutions: [],
    noSolution: [],
    cluesInRange: 0,
    cluesOutOfRange: [],
    clueMin: Infinity,
    clueMax: -Infinity,
  };

  console.log(`\n=== Auditing ${level} (${SAMPLE_SIZE} samples) ===`);

  for (let si = 0; si < indices.length; si++) {
    const idx = indices[si];
    const entry = puzzles[idx];
    const { puzzle, solution } = entry;

    // 1. Valid solution?
    const sv = isValidSolution(solution);
    if (sv.valid) res.solutionValid++;
    else res.solutionInvalid.push({ idx, reason: sv.reason });

    // 2. Puzzle matches solution?
    if (puzzleMatchesSolution(puzzle, solution)) res.puzzleMatchesSolution++;
    else res.puzzleMismatch.push(idx);

    // 3. Clue count
    const clues = countClues(puzzle);
    if (clues < res.clueMin) res.clueMin = clues;
    if (clues > res.clueMax) res.clueMax = clues;
    const [lo, hi] = CLUE_RANGES[level];
    if (clues >= lo && clues <= hi) res.cluesInRange++;
    else res.cluesOutOfRange.push({ idx, clues });

    // 4. Unique solution (backtracking)
    const solCount = countSolutions(puzzle, 2);
    if (solCount === 1) res.uniqueSolution++;
    else if (solCount === 0) res.noSolution.push(idx);
    else res.multipleSolutions.push(idx);

    if ((si + 1) % 10 === 0) process.stdout.write(`  ${si + 1}/${SAMPLE_SIZE} done\n`);
  }

  results[level] = res;
}

// --- Duplicate check (full database, string comparison) ---
console.log('\n=== Checking duplicates (full database) ===');
const dupResults = {};
for (const level of levels) {
  const puzzles = db[level];
  const seen = new Set();
  let dups = 0;
  for (let i = 0; i < puzzles.length; i++) {
    const key = puzzleToString(puzzles[i].puzzle);
    if (seen.has(key)) dups++;
    else seen.add(key);
  }
  dupResults[level] = dups;
  console.log(`  ${level}: ${dups} duplicates out of ${puzzles.length}`);
}

// --- Print summary ---
console.log('\n\n========== AUDIT RESULTS ==========\n');

for (const level of levels) {
  const r = results[level];
  const [lo, hi] = CLUE_RANGES[level];
  console.log(`--- ${level.toUpperCase()} (${r.sampled} sampled / ${r.total} total) ---`);
  console.log(`  Solutions valid:          ${r.solutionValid}/${r.sampled}` + (r.solutionInvalid.length ? ` FAILURES: ${JSON.stringify(r.solutionInvalid)}` : ''));
  console.log(`  Puzzle matches solution:  ${r.puzzleMatchesSolution}/${r.sampled}` + (r.puzzleMismatch.length ? ` FAILURES at indices: ${r.puzzleMismatch}` : ''));
  console.log(`  Unique solution:          ${r.uniqueSolution}/${r.sampled}` + (r.multipleSolutions.length ? ` MULTIPLE: ${r.multipleSolutions}` : '') + (r.noSolution.length ? ` NO_SOLUTION: ${r.noSolution}` : ''));
  console.log(`  Clues in range [${lo}-${hi}]:   ${r.cluesInRange}/${r.sampled} (actual range: ${r.clueMin}-${r.clueMax})` + (r.cluesOutOfRange.length ? `\n    Out of range: ${JSON.stringify(r.cluesOutOfRange)}` : ''));
  console.log(`  Duplicates (full DB):     ${dupResults[level]}`);
  console.log('');
}
