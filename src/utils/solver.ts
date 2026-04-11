// src/utils/solver.ts
// Solveur logique "humain" — résout sans backtracking, technique par technique.
// Retourne les techniques utilisées, ce qui permet de classifier la difficulté.

import type { Grid } from "./sudoku";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Technique =
  | "nakedSingle"       // une seule candidature dans la case
  | "hiddenSingle"      // un chiffre possible à un seul endroit dans un groupe
  | "nakedPair"         // deux cases d'un groupe partagent exactement 2 candidats
  | "pointingPair"      // les candidats d'un chiffre dans une boîte sont alignés
  | "boxLineReduction"  // les candidats d'un chiffre dans une ligne/col sont dans une boîte
  | "hiddenPair"        // deux chiffres n'apparaissent que dans deux cases d'un groupe
  | "backtrack";        // aucune technique logique n'a suffi → essai/erreur

export interface SolveResult {
  solved:     boolean;
  techniques: Set<Technique>;
  grid:       Grid;
}

// ─── Candidatures ─────────────────────────────────────────────────────────────

type Candidates = Set<number>[][];

function buildCandidates(grid: Grid): Candidates {
  const cands: Candidates = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      for (let n = 1; n <= 9; n++) {
        if (canPlace(grid, r, c, n)) cands[r][c].add(n);
      }
    }
  }
  return cands;
}

function canPlace(grid: Grid, row: number, col: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === n) return false;
    if (grid[i][col] === n) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === n) return false;
  return true;
}

function place(grid: Grid, cands: Candidates, r: number, c: number, n: number) {
  grid[r][c] = n;
  cands[r][c].clear();
  // Éliminer n des candidats de la même ligne, colonne, boîte
  for (let i = 0; i < 9; i++) { cands[r][i].delete(n); cands[i][c].delete(n); }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      cands[br + dr][bc + dc].delete(n);
}

function deepCopyGrid(grid: Grid): Grid { return grid.map(r => [...r]); }
function deepCopyCands(cands: Candidates): Candidates {
  return cands.map(row => row.map(cell => new Set(cell)));
}

// ─── Groupes (lignes, colonnes, boîtes) ───────────────────────────────────────

type Cell = [number, number];

function getRow(r: number): Cell[] {
  return Array.from({ length: 9 }, (_, c) => [r, c]);
}
function getCol(c: number): Cell[] {
  return Array.from({ length: 9 }, (_, r) => [r, c]);
}
function getBox(r: number, c: number): Cell[] {
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  const cells: Cell[] = [];
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      cells.push([br + dr, bc + dc]);
  return cells;
}
function allGroups(): Cell[][] {
  const groups: Cell[][] = [];
  for (let i = 0; i < 9; i++) { groups.push(getRow(i)); groups.push(getCol(i)); }
  for (let r = 0; r < 9; r += 3)
    for (let c = 0; c < 9; c += 3)
      groups.push(getBox(r, c));
  return groups;
}

// ─── Technique 1 : Naked Single ───────────────────────────────────────────────
// Une case n'a qu'un seul candidat possible.

function applyNakedSingles(grid: Grid, cands: Candidates): boolean {
  let progress = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      if (cands[r][c].size === 1) {
        place(grid, cands, r, c, [...cands[r][c]][0]);
        progress = true;
      }
    }
  }
  return progress;
}

// ─── Technique 2 : Hidden Single ─────────────────────────────────────────────
// Dans un groupe, un chiffre n'apparaît comme candidat que dans une seule case.

function applyHiddenSingles(grid: Grid, cands: Candidates): boolean {
  let progress = false;
  for (const group of allGroups()) {
    for (let n = 1; n <= 9; n++) {
      const possible = group.filter(([r, c]) => grid[r][c] === 0 && cands[r][c].has(n));
      if (possible.length === 1) {
        const [r, c] = possible[0];
        if (grid[r][c] === 0) { place(grid, cands, r, c, n); progress = true; }
      }
    }
  }
  return progress;
}

// ─── Technique 3 : Naked Pair ────────────────────────────────────────────────
// Deux cases d'un groupe ont exactement les mêmes 2 candidats →
// on peut éliminer ces 2 chiffres des autres cases du groupe.

function applyNakedPairs(grid: Grid, cands: Candidates): boolean {
  let progress = false;
  for (const group of allGroups()) {
    const empties = group.filter(([r, c]) => grid[r][c] === 0);
    for (let i = 0; i < empties.length; i++) {
      const [r1, c1] = empties[i];
      if (cands[r1][c1].size !== 2) continue;
      for (let j = i + 1; j < empties.length; j++) {
        const [r2, c2] = empties[j];
        if (cands[r2][c2].size !== 2) continue;
        const s1 = [...cands[r1][c1]].sort().join();
        const s2 = [...cands[r2][c2]].sort().join();
        if (s1 !== s2) continue;
        // Paire trouvée — éliminer ces 2 chiffres des autres cases du groupe
        const pair = cands[r1][c1];
        for (const [r, c] of empties) {
          if ((r === r1 && c === c1) || (r === r2 && c === c2)) continue;
          for (const n of pair) {
            if (cands[r][c].delete(n)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 4 : Pointing Pair/Triple ──────────────────────────────────────
// Dans une boîte, tous les candidats d'un chiffre sont sur la même ligne/colonne →
// on peut éliminer ce chiffre des autres cases de cette ligne/colonne.

function applyPointingPairs(grid: Grid, cands: Candidates): boolean {
  let progress = false;
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box = getBox(br, bc);
      for (let n = 1; n <= 9; n++) {
        const cells = box.filter(([r, c]) => grid[r][c] === 0 && cands[r][c].has(n));
        if (cells.length < 2 || cells.length > 3) continue;
        const rows = new Set(cells.map(([r]) => r));
        const cols = new Set(cells.map(([, c]) => c));
        if (rows.size === 1) {
          // Tous dans la même ligne → éliminer n dans le reste de la ligne
          const row = [...rows][0];
          for (let c = 0; c < 9; c++) {
            if (Math.floor(c / 3) === Math.floor(bc / 3)) continue;
            if (cands[row][c].delete(n)) progress = true;
          }
        } else if (cols.size === 1) {
          // Tous dans la même colonne
          const col = [...cols][0];
          for (let r = 0; r < 9; r++) {
            if (Math.floor(r / 3) === Math.floor(br / 3)) continue;
            if (cands[r][col].delete(n)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 5 : Box-Line Reduction ────────────────────────────────────────
// Dans une ligne/colonne, tous les candidats d'un chiffre sont dans la même boîte →
// on peut éliminer ce chiffre des autres cases de cette boîte.

function applyBoxLineReduction(grid: Grid, cands: Candidates): boolean {
  let progress = false;
  // Lignes
  for (let r = 0; r < 9; r++) {
    for (let n = 1; n <= 9; n++) {
      const cols = [];
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0 && cands[r][c].has(n)) cols.push(c);
      if (cols.length < 2 || cols.length > 3) continue;
      const boxes = new Set(cols.map(c => Math.floor(c / 3)));
      if (boxes.size !== 1) continue;
      const bc = [...boxes][0] * 3;
      const br = Math.floor(r / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          if (br + dr === r) continue;
          if (cands[br + dr][bc + dc].delete(n)) progress = true;
        }
      }
    }
  }
  // Colonnes
  for (let c = 0; c < 9; c++) {
    for (let n = 1; n <= 9; n++) {
      const rows = [];
      for (let r = 0; r < 9; r++)
        if (grid[r][c] === 0 && cands[r][c].has(n)) rows.push(r);
      if (rows.length < 2 || rows.length > 3) continue;
      const boxes = new Set(rows.map(r => Math.floor(r / 3)));
      if (boxes.size !== 1) continue;
      const br = [...boxes][0] * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          if (bc + dc === c) continue;
          if (cands[br + dr][bc + dc].delete(n)) progress = true;
        }
      }
    }
  }
  return progress;
}

// ─── Technique 6 : Hidden Pair ───────────────────────────────────────────────
// Dans un groupe, deux chiffres n'apparaissent que dans les mêmes deux cases →
// on peut éliminer tous les autres candidats de ces deux cases.

function applyHiddenPairs(grid: Grid, cands: Candidates): boolean {
  let progress = false;
  for (const group of allGroups()) {
    const empties = group.filter(([r, c]) => grid[r][c] === 0);
    for (let n1 = 1; n1 <= 8; n1++) {
      const cells1 = empties.filter(([r, c]) => cands[r][c].has(n1));
      if (cells1.length !== 2) continue;
      for (let n2 = n1 + 1; n2 <= 9; n2++) {
        const cells2 = empties.filter(([r, c]) => cands[r][c].has(n2));
        if (cells2.length !== 2) continue;
        const same =
          cells1[0][0] === cells2[0][0] && cells1[0][1] === cells2[0][1] &&
          cells1[1][0] === cells2[1][0] && cells1[1][1] === cells2[1][1];
        if (!same) continue;
        // Paire cachée trouvée — ne garder que n1 et n2 dans ces deux cases
        for (const [r, c] of cells1) {
          for (const n of [...cands[r][c]]) {
            if (n !== n1 && n !== n2) {
              cands[r][c].delete(n);
              progress = true;
            }
          }
        }
      }
    }
  }
  return progress;
}

// ─── Backtracking (dernier recours) ──────────────────────────────────────────

function backtrackSolve(grid: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      for (let n = 1; n <= 9; n++) {
        if (canPlace(grid, r, c, n)) {
          grid[r][c] = n;
          if (backtrackSolve(grid)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

// ─── Solveur principal ────────────────────────────────────────────────────────

export function logicalSolve(inputGrid: Grid, stopAtBacktrack = false): SolveResult {
  const grid  = deepCopyGrid(inputGrid);
  const cands = buildCandidates(grid);
  const techniques = new Set<Technique>();

  let maxIter = 200;
  while (maxIter-- > 0) {
    const filled = grid.flat().filter(v => v !== 0).length;
    if (filled === 81) break;

    let progress = false;

    if (applyNakedSingles(grid, cands))    { techniques.add("nakedSingle");      progress = true; continue; }
    if (applyHiddenSingles(grid, cands))   { techniques.add("hiddenSingle");     progress = true; continue; }
    if (applyNakedPairs(grid, cands))      { techniques.add("nakedPair");        progress = true; continue; }
    if (applyPointingPairs(grid, cands))   { techniques.add("pointingPair");     progress = true; continue; }
    if (applyBoxLineReduction(grid, cands)){ techniques.add("boxLineReduction"); progress = true; continue; }
    if (applyHiddenPairs(grid, cands))     { techniques.add("hiddenPair");       progress = true; continue; }

    if (!progress) {
      // Bloqué logiquement → va nécessiter du backtracking
      techniques.add("backtrack");
      if (stopAtBacktrack) {
        // Sortie rapide : on sait déjà que c'est Expert, pas besoin de finir
        return { solved: true, techniques, grid };
      }
      break;
    }
  }

  const filled = grid.flat().filter(v => v !== 0).length;
  if (filled < 81) {
    if (backtrackSolve(grid)) techniques.add("backtrack");
  }

  return {
    solved: grid.flat().filter(v => v !== 0).length === 81,
    techniques,
    grid,
  };
}

// ─── Classification de difficulté ─────────────────────────────────────────────

import type { Difficulty } from "./sudoku";

export function classifyDifficulty(techniques: Set<Technique>): Difficulty {
  if (techniques.has("backtrack"))        return "expert";
  if (techniques.has("hiddenPair") ||
      techniques.has("boxLineReduction")) return "hard";
  if (techniques.has("nakedPair") ||
      techniques.has("pointingPair"))     return "medium";
  if (techniques.has("hiddenSingle"))     return "easy";
  return "initie";
}
