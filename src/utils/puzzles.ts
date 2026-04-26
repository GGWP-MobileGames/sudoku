import database from "./puzzleDatabase.json";
import type { Grid } from "./sudoku";

export type Difficulty = "easy" | "medium" | "hard" | "diabolical";

export interface PuzzleEntry {
  puzzle:   Grid;
  solution: Grid;
}

type Database = Record<Difficulty, PuzzleEntry[]>;
const db = database as Database;

export function getRandomPuzzle(difficulty: Difficulty): PuzzleEntry {
  const list = db[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}
