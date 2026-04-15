import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { saveGame, serializeNotes, serializeCellErrors, deserializeNotes, deserializeCellErrors, type SavedGame } from "../utils/storage";
import { analyzeHint, type PedagogicHint } from "../utils/hintAnalyzer";
import { getRandomPuzzle, type Difficulty } from "../utils/puzzles";
import { isComplete, deepCopy, type Grid } from "../utils/sudoku";

// Retourne une liste de groupes, chaque groupe étant un tableau de cellules [r,c]
function getCompletedGroups(grid: Grid): number[][][] {
  const groups: number[][][] = [];
  // Lignes
  for (let r = 0; r < 9; r++) {
    const row = grid[r];
    if (row.every(v => v !== 0) && new Set(row).size === 9)
      groups.push(Array.from({ length: 9 }, (_, c) => [r, c]));
  }
  // Colonnes
  for (let c = 0; c < 9; c++) {
    const col = grid.map(row => row[c]);
    if (col.every(v => v !== 0) && new Set(col).size === 9)
      groups.push(Array.from({ length: 9 }, (_, r) => [r, c]));
  }
  // Boîtes 3×3
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const cells: number[][] = [];
      const vals: number[] = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++) {
          cells.push([br+dr, bc+dc]);
          vals.push(grid[br+dr][bc+dc]);
        }
      if (vals.every(v => v !== 0) && new Set(vals).size === 9)
        groups.push(cells);
    }
  }
  return groups;
}

// Clé unique pour identifier un groupe (basée sur ses cellules triées)
function groupKey(cells: number[][]): string {
  return cells.map(([r, c]) => `${r},${c}`).sort().join("|");
}

export type CellNotes  = Set<number>;
export type CellErrors = Set<number>; // mauvais essais accumulés

export type NotesGrid  = CellNotes[][];
export type ErrorsGrid = CellErrors[][];

function emptyErrors(): ErrorsGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
}

function emptyNotes(): NotesGrid {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
}

interface GameInit {
  savedGame?:       SavedGame | null;
  prebuilt?:        { puzzle: Grid; solution: Grid };
  hintsPerGame?:    number;
  limitErrors?:     boolean;
  maxErrors?:       number;
  isDaily?:         boolean;
  t?:               (key: string) => string;
}

export type { PedagogicHint };

export function useGameState(difficulty: Difficulty, init: GameInit = {}) {
  const maxHints = init.hintsPerGame ?? 3;
  const t = init.t ?? ((k: string) => k);
  // Initialisation synchrone depuis init — évite le render vide initial
  const [puzzle,    setPuzzle]    = useState<Grid>(() => init.prebuilt?.puzzle ?? init.savedGame?.puzzle ?? []);
  const [solution,  setSolution]  = useState<Grid>(() => init.prebuilt?.solution ?? init.savedGame?.solution ?? []);
  const [grid,      setGrid]      = useState<Grid>(() => {
    if (init.savedGame?.grid?.length) return init.savedGame.grid;
    if (init.prebuilt?.puzzle)        return deepCopy(init.prebuilt.puzzle);
    return [];
  });
  const [notes,      setNotes]      = useState<NotesGrid>(() => {
    const raw = init.savedGame?.notes;
    if (Array.isArray(raw) && raw.length === 9) {
      return deserializeNotes(raw);
    }
    return emptyNotes();
  });
  const [cellErrors, setCellErrors] = useState<ErrorsGrid>(() => {
    const raw = init.savedGame?.cellErrors;
    if (Array.isArray(raw) && raw.length === 9) {
      return deserializeCellErrors(raw);
    }
    return emptyErrors();
  });
  const [selected,   setSelected]   = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes,  setMistakes]  = useState(init.savedGame?.mistakes ?? 0);
  const [hintsLeft, setHintsLeft] = useState(init.savedGame?.hintsLeft ?? maxHints);
  const [seconds,   setSeconds]   = useState(init.savedGame?.seconds ?? 0);
  const [paused,    setPaused]    = useState(false);
  const [completed,       setCompleted]       = useState(false);
  const [completedGroups, setCompletedGroups] = useState<number[][]>([]);
  const [pendingHint,  setPendingHint]  = useState<PedagogicHint | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridRef       = useRef<Grid>(grid);
  const notesRef      = useRef<NotesGrid>(notes);
  const cellErrorsRef = useRef<ErrorsGrid>(cellErrors);
  const secondsRef    = useRef<number>(seconds);
  const mistakesRef   = useRef<number>(mistakes);
  const hintsLeftRef  = useRef<number>(hintsLeft);

  gridRef.current       = grid;
  notesRef.current      = notes;
  cellErrorsRef.current = cellErrors;
  secondsRef.current    = seconds;
  mistakesRef.current   = mistakes;
  hintsLeftRef.current  = hintsLeft;

  const newGame = useCallback(() => {
    const { puzzle: p, solution: s } = getRandomPuzzle(difficulty);
    setPuzzle(p);
    setSolution(s);
    setGrid(deepCopy(p));
    setNotes(emptyNotes());
    setCellErrors(emptyErrors());
    setSelected(null);
    setMistakes(0);
    setHintsLeft(maxHints);
    setSeconds(0);
    setPaused(false);
    setCompleted(false);
  }, [difficulty]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paused || completed || !grid.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, completed, grid.length]);

  // ── Pause automatique en arrière-plan ────────────────────────────────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        // Mettre en pause pour masquer la grille dans l'app switcher
        if (!completed && grid.length) {
          setPaused(true);
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [completed, grid.length]);

  // ── Sauvegarde auto (debounced, pas à chaque tick du timer) ─────────────────
  const defeated = !!(init.limitErrors && mistakes >= (init.maxErrors ?? 3));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!grid.length || !puzzle.length || completed || defeated || init.isDaily) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveGame({
        grid, puzzle, solution, difficulty,
        mistakes: mistakesRef.current, hintsLeft: hintsLeftRef.current, seconds: secondsRef.current,
        notes: serializeNotes(notesRef.current),
        cellErrors: serializeCellErrors(cellErrorsRef.current),
        savedAt: Date.now(),
      });
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [grid, notes, mistakes]);

  // ── Saisie ──────────────────────────────────────────────────────────────────
  const inputNumber = useCallback((num: number, forceR?: number, forceC?: number) => {
    if (completed) return;
    const r = forceR !== undefined ? forceR : selected?.[0];
    const c = forceC !== undefined ? forceC : selected?.[1];
    if (r === undefined || c === undefined) return;
    if (puzzle[r]?.[c] !== 0) return;
    // Case déjà correctement remplie → verrouillée comme une case initiale
    if (grid[r]?.[c] !== 0 && grid[r]?.[c] === solution[r]?.[c]) return;

    if (notesMode && num !== 0) {
      setNotes(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        const cell = next[r][c];
        if (cell.has(num)) cell.delete(num); else cell.add(num);
        return next;
      });
      return;
    }

    // Effacer : vide la case (chiffre incorrect, erreurs ou notes)
    if (num === 0) {
      const hasNotes = (notes[r]?.[c]?.size ?? 0) > 0;
      const hasErrors = (cellErrorsRef.current[r]?.[c]?.size ?? 0) > 0;
      const hasIncorrectValue = grid[r][c] !== 0 && grid[r][c] !== solution[r][c];
      if (!hasNotes && !hasIncorrectValue && !hasErrors) return; // rien à effacer
      if (hasIncorrectValue) {
        const nextGrid = deepCopy(gridRef.current);
        nextGrid[r][c] = 0;
        setGrid(nextGrid);
      }
      if (hasErrors) {
        setCellErrors(prev => {
          const next = prev.map(row => row.map(s => new Set(s)));
          next[r][c].clear();
          return next;
        });
      }
      if (hasNotes) {
        setNotes(prev => {
          const next = prev.map(row => row.map(s => new Set(s)));
          next[r][c].clear();
          return next;
        });
      }
      return;
    }

    if (solution[r][c] !== num) {
      const alreadyTried = cellErrorsRef.current[r]?.[c]?.has(num) ?? false;
      if (!alreadyTried) setMistakes(m => m + 1);
      setCellErrors(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        next[r][c].add(num);
        return next;
      });
      return;
    }

    // Bonne réponse
    setCellErrors(prev => {
      const next = prev.map(row => row.map(s => new Set(s)));
      next[r][c].clear();
      return next;
    });

    // Calculer le nouvel état de la grille
    const prevGrid = gridRef.current;
    const nextGrid = deepCopy(prevGrid);
    nextGrid[r][c] = num;
    setGrid(nextGrid);

    // Supprimer les notes liées (ligne, colonne, boîte)
    setNotes(prevN => {
      const nn = prevN.map(row => row.map(s => new Set(s)));
      for (let i = 0; i < 9; i++) { nn[r][i].delete(num); nn[i][c].delete(num); }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          nn[br + dr][bc + dc].delete(num);
      return nn;
    });

    // Vérifier complétion
    if (isComplete(nextGrid, solution)) {
      setCompleted(true);
    } else {
      const prevGroupKeys = new Set(getCompletedGroups(prevGrid).map(groupKey));
      const newGroups = getCompletedGroups(nextGrid).filter(g => !prevGroupKeys.has(groupKey(g)));
      if (newGroups.length > 0) {
        const cellSet = new Set<string>();
        const allCells: number[][] = [];
        for (const group of newGroups) {
          for (const cell of group) {
            const k = `${cell[0]},${cell[1]}`;
            if (!cellSet.has(k)) { cellSet.add(k); allCells.push(cell); }
          }
        }
        setCompletedGroups(allCells);
      }
    }
  }, [selected, completed, notesMode, puzzle, solution]);

  // ── Indice ──────────────────────────────────────────────────────────────────

  const useHint = useCallback(() => {
    if (hintsLeftRef.current <= 0 || completed) return;
    const hint = analyzeHint(gridRef.current, solution, t);
    if (!hint) return;
    setHintsLeft(h => {
      if (h <= 0) return h;
      return h - 1;
    });
    setPendingHint(hint);
    setSelected(hint.targetCell);
  }, [completed, solution]);

  const dismissHint = useCallback(() => setPendingHint(null), []);

  const applyHint = useCallback(() => {
    if (!pendingHint) return;
    const [r, c] = pendingHint.targetCell;
    inputNumber(pendingHint.value, r, c);
    setPendingHint(null);
  }, [pendingHint, inputNumber]);

  const isFixed = (r: number, c: number) => puzzle[r]?.[c] !== 0;
  const isError = (r: number, c: number) => (cellErrors[r]?.[c]?.size ?? 0) > 0;

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return {
    grid, notes, cellErrors, puzzle, solution,
    selected, setSelected,
    notesMode, setNotesMode,
    mistakes, hintsLeft,
    seconds, formatTime,
    paused, setPaused,
    completed, completedGroups,
    inputNumber, useHint,
    pendingHint, dismissHint, applyHint,
    newGame,
    isFixed, isError,
    secondsRef, mistakesRef, hintsLeftRef,
  };
}
