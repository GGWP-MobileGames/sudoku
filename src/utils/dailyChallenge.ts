import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Difficulty } from "./puzzles";
import database from "./puzzleDatabase.json";
import type { Grid } from "./sudoku";
import { addHistory, type SavedGame } from "./storage";

export type DailySavedGame = Omit<SavedGame, "savedAt"> & { dateKey: string };

export interface DailyRecord {
  dateKey:   string;
  seconds:   number;
  mistakes:  number;
  hints:     number;
  completed: boolean;
  failed?:   boolean; // nombre max d'erreurs atteint
}

const MONTH_NAMES = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre",
];

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function getDailyPuzzle(dateKey?: string): { puzzle: Grid; solution: Grid; label: string; dateKey: string } {
  const key = dateKey ?? getTodayKey();
  const [y, m, d] = key.split("-").map(Number);
  const db = database as Record<string, { puzzle: Grid; solution: Grid }[]>;
  const hardPuzzles = db["hard"];
  const seed = y * 10000 + m * 100 + d;
  const idx = seed % hardPuzzles.length;
  return { ...hardPuzzles[idx], label: formatDayLabel(key), dateKey: key };
}

const KEY = "daily_records";

export async function loadDailyRecords(): Promise<DailyRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  try {
    const list = await loadDailyRecords();
    const idx = list.findIndex(r => r.dateKey === record.dateKey);
    if (idx >= 0) list[idx] = record; else list.push(record);
    list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) { console.warn("saveDailyRecord error", e); }
}

export async function loadTodayRecord(): Promise<DailyRecord | null> {
  const records = await loadDailyRecords();
  const today = getTodayKey();
  return records.find(r => r.dateKey === today) ?? null;
}

// ─── Sauvegarde de la partie quotidienne en cours ────────────────────────────
const DAILY_GAME_KEY = "daily_current_game";

export async function saveDailyGame(data: DailySavedGame): Promise<void> {
  try { await AsyncStorage.setItem(DAILY_GAME_KEY, JSON.stringify(data)); }
  catch (e) { console.warn("saveDailyGame error", e); }
}

export async function loadDailyGame(): Promise<DailySavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { console.warn("loadDailyGame error", e); return null; }
}

export async function clearDailyGame(): Promise<void> {
  try { await AsyncStorage.removeItem(DAILY_GAME_KEY); }
  catch (e) { console.warn("clearDailyGame error", e); }
}

// Logger le défi du jour dans l'historique global
export async function recordDailyInHistory(
  seconds: number, mistakes: number
): Promise<void> {
  try {
    await addHistory({
      difficulty: "hard" as Difficulty,
      result: "daily-win",
      seconds,
      mistakes,
      date: Date.now(),
    });
  } catch (e) { console.warn("recordDailyInHistory error", e); }
}

export async function recordDailyFailureInHistory(
  seconds: number, mistakes: number
): Promise<void> {
  try {
    await addHistory({
      difficulty: "hard" as Difficulty,
      result: "daily-failed",
      seconds,
      mistakes,
      date: Date.now(),
    });
  } catch (e) { console.warn("recordDailyFailureInHistory error", e); }
}
