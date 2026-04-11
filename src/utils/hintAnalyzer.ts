// src/utils/hintAnalyzer.ts
// Analyse la grille courante et retourne un indice pédagogique :
// la première technique applicable + un message expliquant le raisonnement.

import type { Grid } from "./sudoku";

export interface PedagogicHint {
  message:       string;               // explication pour le joueur
  targetCell:    [number, number];     // case à remplir
  value:         number;               // valeur à y placer
  relatedCells:  [number, number][];   // cases qui justifient l'indice
  highlightCells:[number, number][];   // cases à surligner (lignes/col/blocs mentionnés)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Candidates = Set<number>[][];

function buildCandidates(grid: Grid): Candidates {
  return grid.map((row, r) =>
    row.map((val, c) => {
      if (val !== 0) return new Set<number>();
      const s = new Set<number>();
      for (let n = 1; n <= 9; n++) if (canPlace(grid, r, c, n)) s.add(n);
      return s;
    })
  );
}

function canPlace(grid: Grid, row: number, col: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === n) return false;
    if (grid[i][col] === n) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if (grid[br + dr][bc + dc] === n) return false;
  return true;
}

type TFunc = (key: string) => string;

function colLetter(c: number) { return String.fromCharCode(65 + c); } // A–I
function rowName(r: number, tr: TFunc)   { return tr("hints.row").replace("{{n}}", String(r + 1)); }
function colName(c: number, tr: TFunc)   { return tr("hints.col").replace("{{letter}}", colLetter(c)); }
function boxName(r: number, c: number, tr: TFunc) {
  return tr(`hints.box.${Math.floor(r/3)},${Math.floor(c/3)}`);
}
function cellName(r: number, c: number) { return `${colLetter(c)}${r + 1}`; }
function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), v), template);
}

function getRow(r: number): [number,number][] {
  return Array.from({ length: 9 }, (_, c) => [r, c]);
}
function getCol(c: number): [number,number][] {
  return Array.from({ length: 9 }, (_, r) => [r, c]);
}
function getBox(r: number, c: number): [number,number][] {
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  const cells: [number,number][] = [];
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      cells.push([br + dr, bc + dc]);
  return cells;
}

// ─── Technique 1 : Naked Single ───────────────────────────────────────────────
// Une case vide n'a qu'un seul candidat possible.

function findNakedSingle(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0 || cands[r][c].size !== 1) continue;
      const value = [...cands[r][c]][0];

      // Trouver quelles cases éliminent les autres chiffres
      const related: [number,number][] = [];
      for (let i = 0; i < 9; i++) {
        if (i !== c && grid[r][i] !== 0) related.push([r, i]);
        if (i !== r && grid[i][c] !== 0) related.push([i, c]);
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          if ((br+dr !== r || bc+dc !== c) && grid[br+dr][bc+dc] !== 0)
            related.push([br+dr, bc+dc]);

      const hCells: [number,number][] = [
        ...getRow(r), ...getCol(c), ...getBox(r, c)
      ];
      return {
        value,
        targetCell: [r, c],
        relatedCells: related,
        highlightCells: hCells,
        message: fillTemplate(tr("hints.naked_single"), {
            cell: cellName(r, c), row: rowName(r, tr), col: colName(c, tr),
            box: boxName(r, c, tr), n: String(value),
          }),
      };
    }
  }
  return null;
}

// ─── Technique 2 : Hidden Single ─────────────────────────────────────────────
// Dans un groupe (ligne, colonne, boîte), un chiffre n'est possible que dans une case.

function findHiddenSingle(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  // Lignes
  for (let r = 0; r < 9; r++) {
    for (let n = 1; n <= 9; n++) {
      const possible = getRow(r).filter(([, c]) => grid[r][c] === 0 && cands[r][c].has(n));
      if (possible.length !== 1) continue;
      const [, c] = possible[0];
      return {
        value: n,
        targetCell: [r, c],
        relatedCells: getRow(r).filter(([, cc]) => cc !== c && grid[r][cc] === 0),
        highlightCells: getRow(r),
        message: fillTemplate(tr("hints.hidden_single_row"), {
            row: rowName(r, tr), n: String(n), cell: cellName(r, c),
          }),
      };
    }
  }
  // Colonnes
  for (let c = 0; c < 9; c++) {
    for (let n = 1; n <= 9; n++) {
      const possible = getCol(c).filter(([r]) => grid[r][c] === 0 && cands[r][c].has(n));
      if (possible.length !== 1) continue;
      const [r] = possible[0];
      return {
        value: n,
        targetCell: [r, c],
        relatedCells: getCol(c).filter(([rr]) => rr !== r && grid[rr][c] === 0),
        highlightCells: getCol(c),
        message: fillTemplate(tr("hints.hidden_single_col"), {
            col: colName(c, tr), n: String(n), cell: cellName(r, c),
          }),
      };
    }
  }
  // Boîtes
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box = getBox(br, bc);
      for (let n = 1; n <= 9; n++) {
        const possible = box.filter(([r, c]) => grid[r][c] === 0 && cands[r][c].has(n));
        if (possible.length !== 1) continue;
        const [r, c] = possible[0];
        return {
          value: n,
          targetCell: [r, c],
          relatedCells: box.filter(([rr, cc]) => !(rr === r && cc === c) && grid[rr][cc] === 0),
          highlightCells: box,
          message: fillTemplate(tr("hints.hidden_single_box"), {
              box: boxName(r, c, tr), n: String(n), cell: cellName(r, c),
            }),
        };
      }
    }
  }
  return null;
}

// ─── Technique 3 : Pointing Pair ──────────────────────────────────────────────
// Dans une boîte, tous les candidats d'un chiffre sont alignés sur une ligne/colonne.
// → Ce chiffre ne peut pas être ailleurs sur cette ligne/colonne.
// On ne donne pas la case directement mais on oriente le joueur.

function findPointingPair(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box = getBox(br, bc);
      for (let n = 1; n <= 9; n++) {
        const cells = box.filter(([r, c]) => grid[r][c] === 0 && cands[r][c].has(n));
        if (cells.length < 2 || cells.length > 3) continue;
        const rows = new Set(cells.map(([r]) => r));
        const cols = new Set(cells.map(([, c]) => c));

        if (rows.size === 1) {
          const row = [...rows][0];
          const outside = getRow(row).filter(([r, c]) =>
            Math.floor(c / 3) !== Math.floor(bc / 3) &&
            grid[r][c] === 0 && cands[r][c].has(n)
          );
          if (outside.length === 0) continue;
          // La technique pointing pair élimine n des cases outside.
          // Elle ne peut fournir une case cible QUE si un hidden single
          // se révèle après cette élimination. Sinon, on passe.
          const hint = findHiddenSingle(
            grid,
            buildCandidatesWithElim(grid, cands, n, outside as [number,number][]),
            tr
          );
          if (!hint) continue;
          return {
            value: n,
            targetCell: hint.targetCell,
            relatedCells: cells as [number,number][],
            highlightCells: [...getRow(row), ...getBox(br, bc)],
            message: fillTemplate(tr("hints.pointing_pair_row"), {
                box: boxName(br, bc, tr), n: String(n), row: rowName(row, tr),
              }),
          };
        }
        if (cols.size === 1) {
          const col = [...cols][0];
          const outside = getCol(col).filter(([r, c]) =>
            Math.floor(r / 3) !== Math.floor(br / 3) &&
            grid[r][c] === 0 && cands[r][c].has(n)
          );
          if (outside.length === 0) continue;
          // Même logique : hidden single requis après élimination.
          const hint = findHiddenSingle(
            grid,
            buildCandidatesWithElim(grid, cands, n, outside as [number,number][]),
            tr
          );
          if (!hint) continue;
          return {
            value: n,
            targetCell: hint.targetCell,
            relatedCells: cells as [number, number][],
            highlightCells: [...getCol(col), ...getBox(br, bc)],
            message: fillTemplate(tr("hints.pointing_pair_col"), {
                box: boxName(br, bc, tr), n: String(n), col: colName(col, tr),
              }),
          };
        }
      }
    }
  }
  return null;
}

// Helper : clone les candidats en éliminant n des cases données
function buildCandidatesWithElim(
  grid: Grid, cands: Candidates,
  n: number, toElim: [number,number][]
): Candidates {
  const next = cands.map(row => row.map(s => new Set(s)));
  for (const [r, c] of toElim) next[r][c].delete(n);
  return next;
}

// ─── Fallback : indice générique basé sur la case la plus contrainte ──────────

function findMostConstrainedCell(
  grid: Grid, cands: Candidates, solution: Grid, tr: TFunc
): PedagogicHint | null {
  let bestR = -1, bestC = -1, bestSize = 10;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      const sz = cands[r][c].size;
      if (sz > 0 && sz < bestSize) { bestSize = sz; bestR = r; bestC = c; }
    }
  }
  if (bestR === -1) return null;
  const value = solution[bestR][bestC];

  if (bestSize === 2) {
    const [a, b] = [...cands[bestR][bestC]].sort();
    return {
      value,
      targetCell: [bestR, bestC],
      relatedCells: [],
      highlightCells: [...getRow(bestR), ...getCol(bestC), ...getBox(bestR, bestC)],
      message: fillTemplate(tr("hints.fallback_two"), {
          cell: cellName(bestR, bestC), a: String(a), b: String(b),
          row: rowName(bestR, tr), col: colName(bestC, tr), box: boxName(bestR, bestC, tr),
        }),
    };
  }

  return {
    value,
    targetCell: [bestR, bestC],
    relatedCells: [],
    highlightCells: [...getRow(bestR), ...getCol(bestC), ...getBox(bestR, bestC)],
    message: fillTemplate(tr("hints.fallback"), {
        cell: cellName(bestR, bestC), n: String(bestSize),
        row: rowName(bestR, tr), col: colName(bestC, tr), box: boxName(bestR, bestC, tr),
      }),
  };
}

// ─── Validation : vérifie qu'un indice correspond bien à la solution ──────────

function validateHint(hint: PedagogicHint | null, solution: Grid): PedagogicHint | null {
  if (!hint) return null;
  const [r, c] = hint.targetCell;
  return hint.value === solution[r][c] ? hint : null;
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

export function analyzeHint(grid: Grid, solution: Grid, t?: TFunc): PedagogicHint | null {
  const tr = t ?? ((k: string) => k); // fallback identité
  // Nettoyer la grille : ignorer les valeurs incorrectes du joueur pour ne pas
  // corrompre le calcul des candidats. Une valeur incorrecte est traitée comme vide.
  const merged: Grid = grid.map((row, r) =>
    row.map((val, c) => (val !== 0 && val !== solution[r][c] ? 0 : val))
  );

  const cands = buildCandidates(merged);

  // Chaque technique est validée contre la solution avant d'être retournée.
  // findMostConstrainedCell lit directement la solution — toujours correct.
  return (
    validateHint(findNakedSingle(merged, cands, tr),  solution) ??
    validateHint(findHiddenSingle(merged, cands, tr), solution) ??
    validateHint(findPointingPair(merged, cands, tr), solution) ??
    findMostConstrainedCell(merged, cands, solution, tr)
  );
}
