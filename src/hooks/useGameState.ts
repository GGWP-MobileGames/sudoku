import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

// ── Historique (undo / mode hypothèse) ──────────────────────────────────────
type HistoryEntry = {
  grid:       Grid;
  notes:      NotesGrid;
  cellErrors: ErrorsGrid;
  // mistakes intentionnellement exclu : les erreurs commises sont permanentes
};

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

// Vérifie si le chiffre n peut être placé en (r,c) selon les règles (ligne/col/bloc)
function canPlaceNote(grid: Grid, r: number, c: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === n) return false;
    if (grid[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if (grid[br + dr][bc + dc] === n) return false;
  return true;
}

interface GameInit {
  savedGame?:       SavedGame | null;
  prebuilt?:        { puzzle: Grid; solution: Grid };
  hintsPerGame?:    number;
  limitErrors?:     boolean;
  maxErrors?:       number;
  isDaily?:         boolean;
  t?:               (key: string) => string;
  freePlayMode?:    boolean;
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
  const [bounceCell, setBounceCell] = useState<{ r: number; c: number; tick: number } | null>(null);
  const [shakeCell,  setShakeCell]  = useState<{ r: number; c: number; tick: number } | null>(null);
  const [pendingHint,    setPendingHint]    = useState<PedagogicHint | null>(null);
  const [freePlayErrors, setFreePlayErrors] = useState<[number, number][] | null>(null);
  const [hypothesisMode, setHypothesisMode] = useState(false);
  const [historyLength,  setHistoryLength]  = useState(0); // miroir de historyStackRef.length pour déclencher les rendus
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridRef        = useRef<Grid>(grid);
  const notesRef       = useRef<NotesGrid>(notes);
  const cellErrorsRef  = useRef<ErrorsGrid>(cellErrors);
  const secondsRef     = useRef<number>(seconds);
  const mistakesRef    = useRef<number>(mistakes);
  const hintsLeftRef   = useRef<number>(hintsLeft);
  const freePlayErrorsRef = useRef<[number, number][] | null>(null);
  // Clés "r-c-n" des notes ajoutées automatiquement (appui long Notes)
  const autoNotesSetRef = useRef<Set<string>>(new Set());
  // Pile d'historique pour undo (max 100 entrées)
  const historyStackRef        = useRef<HistoryEntry[]>([]);
  // Mode hypothèse : index de la pile à l'entrée + snapshot de la grille
  const hypothesisMarkerRef    = useRef<number>(0);
  const hypothesisSnapshotRef  = useRef<Grid | null>(null);

  gridRef.current       = grid;
  notesRef.current      = notes;
  cellErrorsRef.current = cellErrors;
  secondsRef.current    = seconds;
  mistakesRef.current   = mistakes;
  hintsLeftRef.current  = hintsLeft;
  freePlayErrorsRef.current = freePlayErrors;

  const newGame = useCallback(() => {
    const { puzzle: p, solution: s } = getRandomPuzzle(difficulty);
    setPuzzle(p);
    setSolution(s);
    setGrid(deepCopy(p));
    setNotes(emptyNotes());
    setCellErrors(emptyErrors());
    setBounceCell(null);
    setShakeCell(null);
    setSelected(null);
    setMistakes(0);
    setHintsLeft(maxHints);
    setSeconds(0);
    setPaused(false);
    setCompleted(false);
    setFreePlayErrors(null);
    setHypothesisMode(false);
    setHistoryLength(0);
    autoNotesSetRef.current      = new Set();
    historyStackRef.current      = [];
    hypothesisMarkerRef.current  = 0;
    hypothesisSnapshotRef.current = null;
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

  // ── Pause automatique en arrière-plan + flush save ───────────────────────────
  const flushSaveRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (!completed && grid.length) {
          setPaused(true);
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Sauvegarder immédiatement avant passage en arrière-plan
        flushSaveRef.current?.();
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [completed, grid.length]);

  // ── Sauvegarde auto (debounced, pas à chaque tick du timer) ─────────────────
  const defeated = !!(init.limitErrors && !init.freePlayMode && mistakes >= (init.maxErrors ?? 3));
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

  // ── Sauvegarde immédiate (appelée à la fermeture / passage en arrière-plan) ─
  const flushSave = useCallback(() => {
    if (!gridRef.current.length || !puzzle.length || completed || defeated || init.isDaily) return;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    saveGame({
      grid: gridRef.current, puzzle, solution, difficulty,
      mistakes: mistakesRef.current, hintsLeft: hintsLeftRef.current, seconds: secondsRef.current,
      notes: serializeNotes(notesRef.current),
      cellErrors: serializeCellErrors(cellErrorsRef.current),
      savedAt: Date.now(),
    });
  }, [puzzle, solution, difficulty, completed, defeated]);
  flushSaveRef.current = flushSave;

  // ── Historique : capture l'état courant avant chaque action ────────────────
  const pushHistory = useCallback(() => {
    const stack = historyStackRef.current;
    if (stack.length >= 100) stack.shift();
    stack.push({
      grid:       deepCopy(gridRef.current),
      notes:      notesRef.current.map(row => row.map(s => new Set(s))),
      cellErrors: cellErrorsRef.current.map(row => row.map(s => new Set(s))),
    });
    setHistoryLength(stack.length);
  }, []); // refs et setState sont stables

  // ── Saisie ──────────────────────────────────────────────────────────────────
  const inputNumber = useCallback((num: number, forceR?: number, forceC?: number) => {
    if (completed) return;
    const r = forceR !== undefined ? forceR : selected?.[0];
    const c = forceC !== undefined ? forceC : selected?.[1];
    if (r === undefined || c === undefined) return;
    if (puzzle[r]?.[c] !== 0) return;
    // Case déjà correctement remplie → verrouillée comme une case initiale
    if (gridRef.current[r]?.[c] !== 0 && gridRef.current[r]?.[c] === solution[r]?.[c]) return;

    if (notesMode && num !== 0) {
      pushHistory();
      // La note est modifiée manuellement → elle n'est plus "auto"
      autoNotesSetRef.current.delete(`${r}-${c}-${num}`);
      setNotes(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        const cell = next[r][c];
        if (cell.has(num)) cell.delete(num); else cell.add(num);
        return next;
      });
      return;
    }

    // ── Mode hypothèse : placement direct, sans comptage d'erreurs ──────────
    if (hypothesisMode && num !== 0) {
      pushHistory();
      const prevGrid = gridRef.current;
      const nextGrid = deepCopy(prevGrid);
      nextGrid[r][c] = num;
      setGrid(nextGrid);
      setBounceCell({ r, c, tick: Date.now() });

      const _h_br = Math.floor(r / 3) * 3;
      const _h_bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        autoNotesSetRef.current.delete(`${r}-${i}-${num}`);
        autoNotesSetRef.current.delete(`${i}-${c}-${num}`);
      }
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          autoNotesSetRef.current.delete(`${_h_br + dr}-${_h_bc + dc}-${num}`);
      setNotes(prevN => {
        const nn = prevN.map(row => row.map(s => new Set(s)));
        for (let i = 0; i < 9; i++) { nn[r][i].delete(num); nn[i][c].delete(num); }
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            nn[_h_br + dr][_h_bc + dc].delete(num);
        return nn;
      });

      if (isComplete(nextGrid, solution)) setCompleted(true);
      return;
    }

    // ── Mode jeu libre : placement direct sans vérification ─────────────────
    if (init.freePlayMode) {
      if (num === 0) {
        // Effacer
        const hasNotes   = (notesRef.current[r]?.[c]?.size ?? 0) > 0;
        const hasValue   = gridRef.current[r][c] !== 0;
        if (!hasNotes && !hasValue) return;
        pushHistory();
        if (hasValue) {
          const nextGrid = deepCopy(gridRef.current);
          nextGrid[r][c] = 0;
          setGrid(nextGrid);
          setFreePlayErrors(null); // réinitialiser l'overlay si on corrige
        }
        if (hasNotes) {
          for (let n = 1; n <= 9; n++) autoNotesSetRef.current.delete(`${r}-${c}-${n}`);
          setNotes(prev => {
            const next = prev.map(row => row.map(s => new Set(s)));
            next[r][c].clear();
            return next;
          });
        }
        return;
      }

      // Placer directement (bon ou mauvais)
      pushHistory();
      const prevGrid = gridRef.current;
      const nextGrid = deepCopy(prevGrid);
      nextGrid[r][c] = num;
      setGrid(nextGrid);
      setBounceCell({ r, c, tick: Date.now() });

      const _fp_br = Math.floor(r / 3) * 3;
      const _fp_bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        autoNotesSetRef.current.delete(`${r}-${i}-${num}`);
        autoNotesSetRef.current.delete(`${i}-${c}-${num}`);
      }
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          autoNotesSetRef.current.delete(`${_fp_br + dr}-${_fp_bc + dc}-${num}`);
      setNotes(prevN => {
        const nn = prevN.map(row => row.map(s => new Set(s)));
        for (let i = 0; i < 9; i++) { nn[r][i].delete(num); nn[i][c].delete(num); }
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            nn[_fp_br + dr][_fp_bc + dc].delete(num);
        return nn;
      });

      if (isComplete(nextGrid, solution)) {
        setCompleted(true);
      } else {
        // Détecter si la grille est entièrement remplie (toutes les cases vides du puzzle)
        const allFilled = nextGrid.every((row, ri) =>
          row.every((v, ci) => puzzle[ri]?.[ci] !== 0 || v !== 0)
        );
        if (allFilled) {
          const errors: [number, number][] = [];
          for (let er = 0; er < 9; er++)
            for (let ec = 0; ec < 9; ec++)
              if (puzzle[er][ec] === 0 && nextGrid[er][ec] !== solution[er][ec])
                errors.push([er, ec]);
          if (errors.length > 0) setFreePlayErrors(errors);
        }
      }
      return;
    }

    // ── Mode normal ──────────────────────────────────────────────────────────

    // Effacer : vide la case (chiffre incorrect, erreurs ou notes)
    if (num === 0) {
      const hasNotes = (notes[r]?.[c]?.size ?? 0) > 0;
      const hasErrors = (cellErrorsRef.current[r]?.[c]?.size ?? 0) > 0;
      const hasIncorrectValue = grid[r][c] !== 0 && grid[r][c] !== solution[r][c];
      if (!hasNotes && !hasIncorrectValue && !hasErrors) return; // rien à effacer
      pushHistory();
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
        // Retirer toutes les notes auto de cette case du suivi
        for (let n = 1; n <= 9; n++) autoNotesSetRef.current.delete(`${r}-${c}-${n}`);
        setNotes(prev => {
          const next = prev.map(row => row.map(s => new Set(s)));
          next[r][c].clear();
          return next;
        });
      }
      return;
    }

    if (solution[r][c] !== num) {
      pushHistory();
      const alreadyTried = cellErrorsRef.current[r]?.[c]?.has(num) ?? false;
      if (!alreadyTried) setMistakes(m => m + 1);
      setCellErrors(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        next[r][c].add(num);
        return next;
      });
      setShakeCell({ r, c, tick: Date.now() });
      return;
    }

    // Bonne réponse
    pushHistory();
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
    setBounceCell({ r, c, tick: Date.now() });

    // Supprimer les notes liées (ligne, colonne, boîte) + suivi auto
    const _br = Math.floor(r / 3) * 3;
    const _bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 9; i++) {
      autoNotesSetRef.current.delete(`${r}-${i}-${num}`);
      autoNotesSetRef.current.delete(`${i}-${c}-${num}`);
    }
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        autoNotesSetRef.current.delete(`${_br + dr}-${_bc + dc}-${num}`);
    setNotes(prevN => {
      const nn = prevN.map(row => row.map(s => new Set(s)));
      for (let i = 0; i < 9; i++) { nn[r][i].delete(num); nn[i][c].delete(num); }
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          nn[_br + dr][_bc + dc].delete(num);
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
  }, [selected, completed, notesMode, puzzle, solution, pushHistory, hypothesisMode]);

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

  // ── Notes automatiques (appui long sur le bouton Notes) ─────────────────────
  // - 1er appui long : remplit tous les candidats valides non déjà présents → taggés comme "auto"
  // - 2e appui long : efface uniquement les notes auto-taguées ; les notes manuelles survivent
  const autoFillNotes = useCallback(() => {
    if (completed) return;
    pushHistory();
    if (autoNotesSetRef.current.size > 0) {
      // Retirer uniquement les notes auto-taguées
      const toRemove = new Set(autoNotesSetRef.current);
      autoNotesSetRef.current = new Set();
      setNotes(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        for (const key of toRemove) {
          const parts = key.split("-");
          const nr = Number(parts[0]), nc = Number(parts[1]), n = Number(parts[2]);
          next[nr][nc].delete(n);
        }
        return next;
      });
    } else {
      // Remplir les candidats valides absents → les tagger comme auto
      const currentGrid = gridRef.current;
      const currentNotes = notesRef.current;
      const newAutoKeys = new Set<string>();
      setNotes(prev => {
        const next = prev.map(row => row.map(s => new Set(s)));
        for (let nr = 0; nr < 9; nr++) {
          for (let nc = 0; nc < 9; nc++) {
            if (currentGrid[nr][nc] !== 0) continue;
            for (let n = 1; n <= 9; n++) {
              if (canPlaceNote(currentGrid, nr, nc, n) && !currentNotes[nr][nc].has(n)) {
                next[nr][nc].add(n);
                newAutoKeys.add(`${nr}-${nc}-${n}`);
              }
            }
          }
        }
        return next;
      });
      autoNotesSetRef.current = newAutoKeys;
    }
  }, [completed, pushHistory]);

  const clearFreePlayErrors = useCallback(() => setFreePlayErrors(null), []);

  // Efface toutes les cellules erronées en mode Jeu Libre (valeurs + notes),
  // puis retire l'overlay. Undo possible via pushHistory.
  const clearFreePlayErrorCells = useCallback(() => {
    const errs = freePlayErrorsRef.current;
    if (!errs || errs.length === 0) return;
    pushHistory();
    const currentGrid = gridRef.current;
    const nextGrid = deepCopy(currentGrid);
    for (const [r, c] of errs) nextGrid[r][c] = 0;
    setGrid(nextGrid);
    setNotes(prev => {
      const next = prev.map(row => row.map(s => new Set(s)));
      for (const [r, c] of errs) {
        for (let n = 1; n <= 9; n++) autoNotesSetRef.current.delete(`${r}-${c}-${n}`);
        next[r][c].clear();
      }
      return next;
    });
    setFreePlayErrors(null);
  }, [pushHistory]);

  // ── Undo ────────────────────────────────────────────────────────────────────
  const canUndo = historyLength > 0 && !completed;

  const undo = useCallback(() => {
    if (completed) return;
    const stack = historyStackRef.current;
    if (stack.length === 0) return;
    const prev = stack.pop()!;
    setHistoryLength(stack.length);
    setGrid(prev.grid);
    setNotes(prev.notes);
    setCellErrors(prev.cellErrors);
    // mistakes non restauré : les erreurs commises restent définitives
    autoNotesSetRef.current = new Set();
    setFreePlayErrors(null);
    // Si on est retourné avant le marqueur d'hypothèse, sortir du mode
    if (hypothesisMode && stack.length <= hypothesisMarkerRef.current) {
      setHypothesisMode(false);
      hypothesisSnapshotRef.current = null;
    }
  }, [completed, hypothesisMode]);

  // ── Mode Hypothèse ──────────────────────────────────────────────────────────
  const enterHypothesis = useCallback(() => {
    if (completed || hypothesisMode) return;
    hypothesisMarkerRef.current   = historyStackRef.current.length;
    hypothesisSnapshotRef.current = deepCopy(gridRef.current);
    setHypothesisMode(true);
  }, [completed, hypothesisMode]);

  const validateHypothesis = useCallback(() => {
    if (!hypothesisMode) return;
    const snap = hypothesisSnapshotRef.current;

    // Mode normal (Free Play OFF) : les placements erronés du mode Test doivent
    // être comptabilisés comme des erreurs et retirés de la grille (cohérence
    // avec la saisie normale).
    if (snap && !init.freePlayMode) {
      const wrongCells: Array<[number, number, number]> = [];
      const currentGrid = gridRef.current;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (snap[r][c] === 0 && currentGrid[r][c] !== 0) {
            const num = currentGrid[r][c];
            if (num !== solution[r][c]) {
              wrongCells.push([r, c, num]);
            }
          }
        }
      }
      if (wrongCells.length > 0) {
        // Retirer les valeurs incorrectes de la grille
        const nextGrid = deepCopy(currentGrid);
        for (const [r, c] of wrongCells) nextGrid[r][c] = 0;
        setGrid(nextGrid);
        // Les signaler comme erreurs (affichage rouge)
        setCellErrors(prev => {
          const next = prev.map(row => row.map(s => new Set(s)));
          for (const [r, c, num] of wrongCells) next[r][c].add(num);
          return next;
        });
        // Compter les erreurs (1 par nouvelle erreur non déjà tentée sur cette case)
        let newMistakes = 0;
        for (const [r, c, num] of wrongCells) {
          const already = cellErrorsRef.current[r]?.[c]?.has(num) ?? false;
          if (!already) newMistakes++;
        }
        if (newMistakes > 0) setMistakes(m => m + newMistakes);
        // Feedback visuel sur la première cellule erronée
        const [sr, sc] = wrongCells[0];
        setShakeCell({ r: sr, c: sc, tick: Date.now() });
      }
    }

    // Les coups (corrects) deviennent définitifs — on garde la pile telle quelle
    setHypothesisMode(false);
    hypothesisSnapshotRef.current = null;
  }, [hypothesisMode, solution, init.freePlayMode]);

  const cancelHypothesis = useCallback(() => {
    if (!hypothesisMode) return;
    const marker = hypothesisMarkerRef.current;
    const stack  = historyStackRef.current;
    if (stack.length > marker) {
      // Restaure l'état qui était au sommet de la pile quand on a fait le 1er coup d'hypothèse
      const restore = stack[marker];
      setGrid(restore.grid);
      setNotes(restore.notes);
      setCellErrors(restore.cellErrors);
      // mistakes non restauré : les erreurs commises restent définitives
      historyStackRef.current = stack.slice(0, marker);
      setHistoryLength(marker);
    }
    autoNotesSetRef.current       = new Set();
    setFreePlayErrors(null);
    setHypothesisMode(false);
    hypothesisSnapshotRef.current = null;
  }, [hypothesisMode]);

  // Cellules posées pendant l'hypothèse (pour surlignage bleu)
  const hypothesisCells = useMemo((): Set<string> => {
    if (!hypothesisMode || !hypothesisSnapshotRef.current) return new Set();
    const snap = hypothesisSnapshotRef.current;
    const result = new Set<string>();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] !== 0 && snap[r][c] === 0)
          result.add(`${r},${c}`);
    return result;
  }, [grid, hypothesisMode]);

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
    completed, completedGroups, bounceCell, shakeCell,
    inputNumber, useHint,
    pendingHint, dismissHint, applyHint,
    newGame, flushSave,
    isFixed, isError,
    secondsRef, mistakesRef, hintsLeftRef,
    autoFillNotes,
    freePlayErrors, clearFreePlayErrors, clearFreePlayErrorCells,
    canUndo, undo,
    hypothesisMode, hypothesisCells,
    enterHypothesis, validateHypothesis, cancelHypothesis,
  };
}
