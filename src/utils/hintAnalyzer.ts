// src/utils/hintAnalyzer.ts

import type { Grid } from "./sudoku";

export interface PedagogicHint {
  techniqueTitle: string;               // nom de la technique (ex. "PAIRE NUE")
  message:        string;               // explication pédagogique SANS révéler la valeur
  targetCell:     [number, number];     // case à remplir
  value:          number;               // valeur (révélée uniquement sur demande)
  relatedCells:   [number, number][];   // cases qui justifient l'indice
  highlightCells: [number, number][];   // cases à surligner
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Candidates = Set<number>[][];
type TFunc      = (key: string) => string;
type Group      = { cells: [number, number][]; name: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function colLetter(c: number)                { return String.fromCharCode(65 + c); }
function rowName(r: number, tr: TFunc)       { return tr("hints.row").replace("{{n}}", String(r + 1)); }
function colName(c: number, tr: TFunc)       { return tr("hints.col").replace("{{letter}}", colLetter(c)); }
function boxName(r: number, c: number, tr: TFunc) {
  return tr(`hints.box.${Math.floor(r / 3)},${Math.floor(c / 3)}`);
}
function cellName(r: number, c: number)      { return `${colLetter(c)}${r + 1}`; }

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, "g"), v),
    template
  );
}

function getRow(r: number): [number, number][] {
  return Array.from({ length: 9 }, (_, c) => [r, c]);
}
function getCol(c: number): [number, number][] {
  return Array.from({ length: 9 }, (_, r) => [r, c]);
}
function getBox(r: number, c: number): [number, number][] {
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  const cells: [number, number][] = [];
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      cells.push([br + dr, bc + dc]);
  return cells;
}

function allGroups(tr: TFunc): Group[] {
  const groups: Group[] = [];
  for (let r = 0; r < 9; r++) groups.push({ cells: getRow(r), name: rowName(r, tr) });
  for (let c = 0; c < 9; c++) groups.push({ cells: getCol(c), name: colName(c, tr) });
  for (let br = 0; br < 9; br += 3)
    for (let bc = 0; bc < 9; bc += 3)
      groups.push({ cells: getBox(br, bc), name: boxName(br, bc, tr) });
  return groups;
}

function dedupCells(cells: [number, number][]): [number, number][] {
  const seen = new Set<string>();
  return cells.filter(([r, c]) => {
    const k = `${r},${c}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function withElim(
  cands: Candidates,
  toElim: { r: number; c: number; vals: number[] }[]
): Candidates {
  const next = cands.map(row => row.map(s => new Set(s)));
  for (const { r, c, vals } of toElim)
    for (const v of vals) next[r][c].delete(v);
  return next;
}

// ─── Technique 1 : Naked Single ───────────────────────────────────────────────
// Une seule valeur candidate dans cette case.

function findNakedSingle(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0 || cands[r][c].size !== 1) continue;
      const value = [...cands[r][c]][0];
      return {
        techniqueTitle: tr("hints.technique.naked_single"),
        value,
        targetCell:     [r, c],
        relatedCells:   [],
        highlightCells: dedupCells([...getRow(r), ...getCol(c), ...getBox(r, c)]),
        message: fill(tr("hints.naked_single"), {
          cell: cellName(r, c),
          row:  rowName(r, tr),
          col:  colName(c, tr),
          box:  boxName(r, c, tr),
        }),
      };
    }
  }
  return null;
}

// ─── Technique 2 : Hidden Single ─────────────────────────────────────────────
// Dans un groupe, un chiffre n'est possible que dans une seule case.

function findHiddenSingle(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  // Lignes
  for (let r = 0; r < 9; r++) {
    for (let n = 1; n <= 9; n++) {
      const possible = getRow(r).filter(([, c]) => grid[r][c] === 0 && cands[r][c].has(n));
      if (possible.length !== 1) continue;
      const [, c] = possible[0];
      return {
        techniqueTitle: tr("hints.technique.hidden_single"),
        value:          n,
        targetCell:     [r, c],
        relatedCells:   getRow(r).filter(([, cc]) => cc !== c && grid[r][cc] === 0),
        highlightCells: getRow(r),
        message: fill(tr("hints.hidden_single_row"), {
          row:  rowName(r, tr),
          cell: cellName(r, c),
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
        techniqueTitle: tr("hints.technique.hidden_single"),
        value:          n,
        targetCell:     [r, c],
        relatedCells:   getCol(c).filter(([rr]) => rr !== r && grid[rr][c] === 0),
        highlightCells: getCol(c),
        message: fill(tr("hints.hidden_single_col"), {
          col:  colName(c, tr),
          cell: cellName(r, c),
        }),
      };
    }
  }
  // Blocs
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box = getBox(br, bc);
      for (let n = 1; n <= 9; n++) {
        const possible = box.filter(([r, c]) => grid[r][c] === 0 && cands[r][c].has(n));
        if (possible.length !== 1) continue;
        const [r, c] = possible[0];
        return {
          techniqueTitle: tr("hints.technique.hidden_single"),
          value:          n,
          targetCell:     [r, c],
          relatedCells:   box.filter(([rr, cc]) => !(rr === r && cc === c) && grid[rr][cc] === 0),
          highlightCells: box,
          message: fill(tr("hints.hidden_single_box"), {
            box:  boxName(r, c, tr),
            cell: cellName(r, c),
          }),
        };
      }
    }
  }
  return null;
}

// ─── Technique 3 : Naked Pair ─────────────────────────────────────────────────
// Deux cases d'un groupe partagent exactement les mêmes deux candidats.
// → Ces deux chiffres sont réservés à ces cases et éliminés des autres.

function findNakedPair(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  for (const { cells, name } of allGroups(tr)) {
    const empty = cells.filter(([r, c]) => grid[r][c] === 0);
    const pairs = empty.filter(([r, c]) => cands[r][c].size === 2);

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [r1, c1] = pairs[i];
        const [r2, c2] = pairs[j];
        const ca = [...cands[r1][c1]].sort((a, b) => a - b);
        const cb = [...cands[r2][c2]].sort((a, b) => a - b);
        if (ca[0] !== cb[0] || ca[1] !== cb[1]) continue;

        const [a, b] = ca;
        const toElim = empty
          .filter(([r, c]) => !(r === r1 && c === c1) && !(r === r2 && c === c2))
          .filter(([r, c]) => cands[r][c].has(a) || cands[r][c].has(b))
          .map(([r, c]) => ({ r, c, vals: [a, b] }));
        if (toElim.length === 0) continue;

        const result = findNakedSingle(grid, withElim(cands, toElim), tr)
                    ?? findHiddenSingle(grid, withElim(cands, toElim), tr);
        if (!result) continue;

        return {
          techniqueTitle: tr("hints.technique.naked_pair"),
          value:          result.value,
          targetCell:     result.targetCell,
          relatedCells:   [pairs[i], pairs[j]],
          highlightCells: dedupCells([...cells, ...result.highlightCells]),
          message: fill(tr("hints.naked_pair"), {
            group: name,
            cell1: cellName(r1, c1), cell2: cellName(r2, c2),
            a: String(a), b: String(b),
          }),
        };
      }
    }
  }
  return null;
}

// ─── Technique 4 : Hidden Pair ────────────────────────────────────────────────
// Dans un groupe, deux chiffres n'apparaissent que dans exactement deux cases.
// → Ces cases ne peuvent contenir que ces deux chiffres.

function findHiddenPair(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  for (const { cells, name } of allGroups(tr)) {
    const empty = cells.filter(([r, c]) => grid[r][c] === 0);

    for (let n1 = 1; n1 <= 8; n1++) {
      for (let n2 = n1 + 1; n2 <= 9; n2++) {
        const c1 = empty.filter(([r, c]) => cands[r][c].has(n1));
        const c2 = empty.filter(([r, c]) => cands[r][c].has(n2));
        if (c1.length !== 2 || c2.length !== 2) continue;

        const key1 = c1.map(([r, c]) => `${r},${c}`).sort().join("|");
        const key2 = c2.map(([r, c]) => `${r},${c}`).sort().join("|");
        if (key1 !== key2) continue;

        const [r1, c1c] = c1[0];
        const [r2, c2c] = c1[1];

        const toElim = [
          ...[...cands[r1][c1c]].filter(v => v !== n1 && v !== n2).map(v => ({ r: r1, c: c1c, vals: [v] })),
          ...[...cands[r2][c2c]].filter(v => v !== n1 && v !== n2).map(v => ({ r: r2, c: c2c, vals: [v] })),
        ];
        if (toElim.length === 0) continue;

        const result = findNakedSingle(grid, withElim(cands, toElim), tr)
                    ?? findHiddenSingle(grid, withElim(cands, toElim), tr);
        if (!result) continue;

        return {
          techniqueTitle: tr("hints.technique.hidden_pair"),
          value:          result.value,
          targetCell:     result.targetCell,
          relatedCells:   [[r1, c1c], [r2, c2c]],
          highlightCells: dedupCells([...cells, ...result.highlightCells]),
          message: fill(tr("hints.hidden_pair"), {
            group: name,
            cell1: cellName(r1, c1c), cell2: cellName(r2, c2c),
            a: String(n1), b: String(n2),
          }),
        };
      }
    }
  }
  return null;
}

// ─── Technique 5 : Pointing Pair / Triple ─────────────────────────────────────
// Dans un bloc, tous les candidats d'un chiffre sont alignés sur une ligne/colonne.
// → Ce chiffre ne peut pas apparaître ailleurs sur cette ligne/colonne.

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
          const elim = outside.map(([r, c]) => ({ r, c, vals: [n] }));
          const result = findHiddenSingle(grid, withElim(cands, elim), tr);
          if (!result) continue;
          return {
            techniqueTitle: tr("hints.technique.pointing_pair"),
            value:          n,
            targetCell:     result.targetCell,
            relatedCells:   cells as [number, number][],
            highlightCells: dedupCells([...getRow(row), ...getBox(br, bc)]),
            message: fill(tr("hints.pointing_pair_row"), {
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
          const elim = outside.map(([r, c]) => ({ r, c, vals: [n] }));
          const result = findHiddenSingle(grid, withElim(cands, elim), tr);
          if (!result) continue;
          return {
            techniqueTitle: tr("hints.technique.pointing_pair"),
            value:          n,
            targetCell:     result.targetCell,
            relatedCells:   cells as [number, number][],
            highlightCells: dedupCells([...getCol(col), ...getBox(br, bc)]),
            message: fill(tr("hints.pointing_pair_col"), {
              box: boxName(br, bc, tr), n: String(n), col: colName(col, tr),
            }),
          };
        }
      }
    }
  }
  return null;
}

// ─── Technique 6 : Naked Triple ──────────────────────────────────────────────
// Trois cases d'un groupe dont l'union des candidats contient exactement 3 chiffres.
// → Ces chiffres sont réservés à ces cases et éliminés des autres.

function findNakedTriple(grid: Grid, cands: Candidates, tr: TFunc): PedagogicHint | null {
  for (const { cells, name } of allGroups(tr)) {
    const empty = cells.filter(([r, c]) => grid[r][c] === 0 && cands[r][c].size >= 2 && cands[r][c].size <= 3);

    for (let i = 0; i < empty.length; i++) {
      for (let j = i + 1; j < empty.length; j++) {
        for (let k = j + 1; k < empty.length; k++) {
          const [r1, c1] = empty[i];
          const [r2, c2] = empty[j];
          const [r3, c3] = empty[k];
          const union = new Set([...cands[r1][c1], ...cands[r2][c2], ...cands[r3][c3]]);
          if (union.size !== 3) continue;

          const vals = [...union];
          const allEmpty = cells.filter(([r, c]) => grid[r][c] === 0);
          const toElim = allEmpty
            .filter(([r, c]) =>
              !(r === r1 && c === c1) && !(r === r2 && c === c2) && !(r === r3 && c === c3)
            )
            .filter(([r, c]) => vals.some(v => cands[r][c].has(v)))
            .map(([r, c]) => ({ r, c, vals }));
          if (toElim.length === 0) continue;

          const result = findNakedSingle(grid, withElim(cands, toElim), tr)
                      ?? findHiddenSingle(grid, withElim(cands, toElim), tr);
          if (!result) continue;

          return {
            techniqueTitle: tr("hints.technique.naked_triple"),
            value:          result.value,
            targetCell:     result.targetCell,
            relatedCells:   [[r1, c1], [r2, c2], [r3, c3]],
            highlightCells: dedupCells([...cells, ...result.highlightCells]),
            message: fill(tr("hints.naked_triple"), {
              group: name,
              cell1: cellName(r1, c1), cell2: cellName(r2, c2), cell3: cellName(r3, c3),
              a: String(vals[0]), b: String(vals[1]), c: String(vals[2]),
            }),
          };
        }
      }
    }
  }
  return null;
}

// ─── Fallback : case la plus contrainte ──────────────────────────────────────

function findMostConstrainedCell(
  grid: Grid, cands: Candidates, solution: Grid, tr: TFunc
): PedagogicHint | null {
  let bestR = -1, bestC = -1, bestSize = 10;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      const sz = cands[r][c].size;
      if (sz > 0 && sz < bestSize) { bestSize = sz; bestR = r; bestC = c; }
    }
  if (bestR === -1) return null;
  const value = solution[bestR][bestC];

  if (bestSize === 2) {
    const [a, b] = [...cands[bestR][bestC]].sort((x, y) => x - y);
    return {
      techniqueTitle: tr("hints.technique.fallback"),
      value,
      targetCell:     [bestR, bestC],
      relatedCells:   [],
      highlightCells: dedupCells([...getRow(bestR), ...getCol(bestC), ...getBox(bestR, bestC)]),
      message: fill(tr("hints.fallback_two"), {
        cell: cellName(bestR, bestC),
        a: String(a), b: String(b),
        row: rowName(bestR, tr), col: colName(bestC, tr), box: boxName(bestR, bestC, tr),
      }),
    };
  }
  return {
    techniqueTitle: tr("hints.technique.fallback"),
    value,
    targetCell:     [bestR, bestC],
    relatedCells:   [],
    highlightCells: dedupCells([...getRow(bestR), ...getCol(bestC), ...getBox(bestR, bestC)]),
    message: fill(tr("hints.fallback"), {
      cell: cellName(bestR, bestC), n: String(bestSize),
      row: rowName(bestR, tr), col: colName(bestC, tr), box: boxName(bestR, bestC, tr),
    }),
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateHint(hint: PedagogicHint | null, solution: Grid): PedagogicHint | null {
  if (!hint) return null;
  const [r, c] = hint.targetCell;
  return hint.value === solution[r][c] ? hint : null;
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

export function analyzeHint(grid: Grid, solution: Grid, t?: TFunc): PedagogicHint | null {
  const tr = t ?? ((k: string) => k);
  // Ignorer les valeurs incorrectes du joueur pour ne pas corrompre les candidats
  const merged: Grid = grid.map((row, r) =>
    row.map((val, c) => (val !== 0 && val !== solution[r][c] ? 0 : val))
  );
  const cands = buildCandidates(merged);

  return (
    validateHint(findNakedSingle(merged,  cands, tr), solution) ??
    validateHint(findHiddenSingle(merged, cands, tr), solution) ??
    validateHint(findNakedPair(merged,    cands, tr), solution) ??
    validateHint(findHiddenPair(merged,   cands, tr), solution) ??
    validateHint(findPointingPair(merged, cands, tr), solution) ??
    validateHint(findNakedTriple(merged,  cands, tr), solution) ??
    findMostConstrainedCell(merged, cands, solution, tr)
  );
}
