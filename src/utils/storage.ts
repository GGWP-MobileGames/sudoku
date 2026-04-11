import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Grid } from "./sudoku";
import type { Difficulty } from "./puzzles";
import type { NotesGrid } from "../hooks/useGameState";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedGame {
  grid:       Grid;
  puzzle:     Grid;
  solution:   Grid;
  notes:      number[][][];
  cellErrors: number[][][]; // erreurs accumulées par case
  difficulty: Difficulty;
  seconds:    number;
  mistakes:   number;
  hintsLeft:  number;
  savedAt:    number;
}

export interface LevelStats {
  bestTime:       number | null;
  bestTimeErrors: number;          // erreurs de la meilleure partie
  bestTimeHints:  number;          // indices utilisés lors de la meilleure partie
  gamesPlayed:    number;
  totalErrors:    number;
  totalSeconds:   number;
}

export type AllStats = Record<Difficulty, LevelStats>;

// Entrée d'historique
export type GameResult = "win" | "ongoing" | "failed" | "daily-win" | "daily-failed";
export interface HistoryEntry {
  difficulty: Difficulty;
  result:     GameResult;
  seconds:    number;
  mistakes:   number;
  date:       number; // timestamp ms
}

const KEYS = {
  savedGame: "sudoku:savedGame",
  stats:     "sudoku:stats",
  history:   "sudoku:history",
};

const LEVELS: Difficulty[] = ["easy", "medium", "hard", "diabolical"];

const DEFAULT_LEVEL_STATS: LevelStats = {
  bestTime: null, bestTimeErrors: 0, bestTimeHints: 0,
  gamesPlayed: 0, totalErrors: 0, totalSeconds: 0,
};

function defaultStats(): AllStats {
  return Object.fromEntries(LEVELS.map(k => [k, { ...DEFAULT_LEVEL_STATS }])) as AllStats;
}

// ─── Partie sauvegardée ───────────────────────────────────────────────────────

export async function saveGame(data: SavedGame): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.savedGame, JSON.stringify(data)); }
  catch (e) { console.warn("saveGame error", e); }
}

export async function loadGame(): Promise<SavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.savedGame);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearSavedGame(): Promise<void> {
  try { await AsyncStorage.removeItem(KEYS.savedGame); }
  catch (e) { console.warn("clearSavedGame error", e); }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function serializeNotes(notes: NotesGrid): number[][][] {
  return notes.map(row => row.map(cell => Array.from(cell)));
}
export function serializeCellErrors(errors: Set<number>[][]): number[][][] {
  return errors.map(row => row.map(cell => Array.from(cell)));
}
export function deserializeCellErrors(raw: number[][][]): Set<number>[][] {
  if (!Array.isArray(raw) || raw.length !== 9) {
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
  }
  return raw.map(row =>
    Array.isArray(row) && row.length === 9
      ? row.map(cell => new Set(Array.isArray(cell) ? cell : []))
      : Array.from({ length: 9 }, () => new Set<number>())
  );
}
export function deserializeNotes(raw: number[][][]): NotesGrid {
  if (!Array.isArray(raw) || raw.length !== 9) {
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
  }
  return raw.map(row =>
    Array.isArray(row) && row.length === 9
      ? row.map(cell => new Set(Array.isArray(cell) ? cell : []))
      : Array.from({ length: 9 }, () => new Set<number>())
  );
}

// ─── Statistiques ─────────────────────────────────────────────────────────────

export async function loadStats(): Promise<AllStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.stats);
    const saved = raw ? JSON.parse(raw) : {};
    const base = defaultStats();
    for (const k of LEVELS) base[k] = { ...DEFAULT_LEVEL_STATS, ...(saved[k] ?? {}) };
    return base;
  } catch { return defaultStats(); }
}

export async function recordCompletion(
  difficulty: Difficulty, seconds: number, mistakes: number, hintsUsed: number = 0
): Promise<void> {
  try {
    const stats = await loadStats();
    const lvl = stats[difficulty];
    lvl.gamesPlayed  += 1;
    lvl.totalErrors  += mistakes;
    lvl.totalSeconds += seconds;
    const isBetter =
      lvl.bestTime === null ||
      seconds < lvl.bestTime ||
      (seconds === lvl.bestTime && mistakes < lvl.bestTimeErrors) ||
      (seconds === lvl.bestTime && mistakes === lvl.bestTimeErrors && hintsUsed < lvl.bestTimeHints);
    if (isBetter) {
      lvl.bestTime       = seconds;
      lvl.bestTimeErrors = mistakes;
      lvl.bestTimeHints  = hintsUsed;
    }
    await AsyncStorage.setItem(KEYS.stats, JSON.stringify(stats));
    const rawH = await AsyncStorage.getItem(KEYS.history);
    const listH: HistoryEntry[] = rawH ? JSON.parse(rawH) : [];
    const cleanH = listH.filter(e => e.result !== "ongoing");
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(cleanH));
    await addHistory({ difficulty, result: "win", seconds, mistakes, date: Date.now() });
  } catch (e) { console.warn("recordCompletion error", e); }
}


export async function recordFailure(
  difficulty: Difficulty, seconds: number, mistakes: number, hintsUsed: number = 0
): Promise<void> {
  try {
    const rawH = await AsyncStorage.getItem(KEYS.history);
    const listH: HistoryEntry[] = rawH ? JSON.parse(rawH) : [];
    const cleanH = listH.filter(e => e.result !== "ongoing");
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(cleanH));
    await addHistory({ difficulty, result: "failed", seconds, mistakes, date: Date.now() });
  } catch (e) { console.warn("recordFailure error", e); }
}

export async function clearOngoing(): Promise<void> {
  try {
    const raw  = await AsyncStorage.getItem(KEYS.history);
    const list: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(e => e.result !== "ongoing");
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(filtered));
  } catch (e) { console.warn("clearOngoing error", e); }
}

export async function convertOngoingToAbandoned(): Promise<void> {
  await clearOngoing();
}

// ─── Historique (20 dernières parties) ───────────────────────────────────────

export async function addHistory(entry: HistoryEntry): Promise<void> {
  try {
    const raw  = await AsyncStorage.getItem(KEYS.history);
    const list: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    if (list.length > 20) list.length = 20;
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(list));
  } catch (e) { console.warn("addHistory error", e); }
}

const VALID_RESULTS: GameResult[] = ["win", "failed", "daily-win", "daily-failed"];

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.history);
    if (!raw) return [];
    const list: HistoryEntry[] = JSON.parse(raw);
    const clean = list.filter(e => VALID_RESULTS.includes(e.result as GameResult));
    if (clean.length !== list.length) {
      await AsyncStorage.setItem(KEYS.history, JSON.stringify(clean));
    }
    return clean;
  } catch (e) { console.warn("loadHistory error", e); return []; }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

export function formatTime(s: number): string {
  const m   = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
