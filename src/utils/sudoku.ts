// src/utils/sudoku.ts

export type Grid = number[][];

// ─── Utilitaires de base ──────────────────────────────────────────────────────

export function deepCopy(grid: Grid): Grid { return grid.map(r => [...r]); }

// ─── Helpers de validation ─────────────────────────────────────────────────────

export function isComplete(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] !== solution[r][c]) return false;
  return true;
}
