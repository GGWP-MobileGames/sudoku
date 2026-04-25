import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Platform, PanResponder } from "react-native";
import SudokuCell from "./SudokuCell";
import { useSettings } from "../context/SettingsContext";
import type { Grid } from "../utils/sudoku";
import type { NotesGrid, ErrorsGrid } from "../hooks/useGameState";

const WAVE_STEP_MS = 1000;

interface Props {
  grid:          Grid;
  notes:         NotesGrid;
  errors:        ErrorsGrid;
  selected:      [number, number] | null;
  onSelect:      (r: number, c: number) => void;
  isFixed:       (r: number, c: number) => boolean;
  isError:       (r: number, c: number) => boolean;
  puzzleKey:     string;
  gridSize:      number; // taille dynamique passée par le parent
  completedGroups?: number[][]; // cellules [r,c] à flasher en or
  bounceCell?:     { r: number; c: number; tick: number } | null;
  shakeCell?:      { r: number; c: number; tick: number } | null;
  victoryWave?:    boolean;
  showCoords?:       boolean;
  hintHighlight?:      [number, number][];
  hintTarget?:         [number, number] | null;
  hintPreviewValue?:   number | null; // valeur à pré-afficher dans la case cible
  highlightIdentical?:     boolean;
  highlightGroup?:         boolean;
  largeNumbers?:           boolean;
  highlightNotes?:         boolean;
  selectedValueOverride?:  number; // mode blitz : force la valeur pour les highlights (match + notes)
  freePlayErrorCells?:     Set<string>; // cases erronées révélées (mode jeu libre)
  hypothesisCells?:        Set<string>; // cases posées en mode hypothèse (bleu)
  hypothesisNoteKeys?:     Set<string>; // notes ajoutées en mode hypothèse, clés "r,c,n"
  onDragCell?:             (r: number, c: number) => void; // Blitz : appelé pour chaque nouvelle case traversée par le glissement
  dragEnabled?:            boolean; // Active le PanResponder (évite d'intercepter les gestes en mode normal)
}

function SudokuGrid({
  grid, notes, errors, selected, onSelect, isFixed, isError, puzzleKey, gridSize, completedGroups,
  bounceCell, shakeCell, victoryWave, showCoords, hintHighlight, hintTarget, hintPreviewValue,
  highlightIdentical = true, highlightGroup = true, largeNumbers = true, highlightNotes = true,
  selectedValueOverride, freePlayErrorCells, hypothesisCells, hypothesisNoteKeys,
  onDragCell, dragEnabled,
}: Props) {
  const { colors } = useSettings();
  const CELL_SIZE = gridSize / 9;

  // ── Drag Blitz : peindre des notes en glissant le doigt ────────────────────
  // Refs pour éviter les stale closures dans le PanResponder (créé une seule fois)
  const cellSizeRef     = useRef(CELL_SIZE);
  cellSizeRef.current   = CELL_SIZE;
  const dragEnabledRef  = useRef(false);
  dragEnabledRef.current = !!dragEnabled;
  const onDragCellRef   = useRef(onDragCell);
  onDragCellRef.current = onDragCell;
  const visitedCellsRef = useRef<Set<string>>(new Set());

  const emitCellAt = useCallback((x: number, y: number) => {
    const cs = cellSizeRef.current;
    if (!cs) return;
    const r = Math.max(0, Math.min(8, Math.floor(y / cs)));
    const c = Math.max(0, Math.min(8, Math.floor(x / cs)));
    const key = `${r},${c}`;
    if (visitedCellsRef.current.has(key)) return;
    visitedCellsRef.current.add(key);
    onDragCellRef.current?.(r, c);
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    // Ne pas voler le tap : seul un mouvement > seuil capture le responder
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      dragEnabledRef.current && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4),
    onMoveShouldSetPanResponderCapture: (_, gs) =>
      dragEnabledRef.current && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4),
    onPanResponderGrant: (e) => {
      visitedCellsRef.current.clear();
      const { locationX, locationY } = e.nativeEvent;
      emitCellAt(locationX, locationY);
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      emitCellAt(locationX, locationY);
    },
    onPanResponderRelease:   () => { visitedCellsRef.current.clear(); },
    onPanResponderTerminate: () => { visitedCellsRef.current.clear(); },
  }), [emitCellAt]);


  const cellFontSize = largeNumbers ? Math.floor(CELL_SIZE * 0.76) : 19;
  const noteFontSize = largeNumbers
    ? Math.max(Math.floor(CELL_SIZE / 3 * 0.72), 9)
    : Math.max(Math.floor(CELL_SIZE / 3 * 0.55), 7);
const cellAnims = useRef(
    Array.from({ length: 81 }, () => new Animated.Value(0))
  ).current;

const goldAnims = useRef(
    Array.from({ length: 81 }, () => new Animated.Value(0))
  ).current;

const scaleAnims = useRef(
    Array.from({ length: 81 }, () => new Animated.Value(1))
  ).current;

const shakeAnims = useRef(
    Array.from({ length: 81 }, () => new Animated.Value(0))
  ).current;

  const puzzleId = useRef<string>("");

useEffect(() => {
    if (puzzleKey === puzzleId.current || !puzzleKey) return;
    puzzleId.current = puzzleKey;

    cellAnims.forEach(a => a.setValue(0));
    goldAnims.forEach(a => a.setValue(0));
    scaleAnims.forEach(a => a.setValue(1));
    shakeAnims.forEach(a => a.setValue(0));

    // Grouper par diagonale (r + c) pour la vague
    const byDiag: { wave: Animated.CompositeAnimation; gold: Animated.CompositeAnimation }[][] =
      Array.from({ length: 17 }, () => []);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const idx = r * 9 + c;
        byDiag[r + c].push({
          wave: Animated.timing(cellAnims[idx], {
            toValue: 1, duration: 380, useNativeDriver: Platform.OS !== "web",
          }),
          gold: Animated.sequence([
            Animated.timing(goldAnims[idx], { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(goldAnims[idx], { toValue: 0, duration: 500, useNativeDriver: Platform.OS !== "web" }),
          ]),
        });
      }
    }

    const diagAnimations = byDiag.map((diag, i) =>
      Animated.sequence([
        Animated.delay(160 + i * 28),
        Animated.parallel([
          Animated.parallel(diag.map(d => d.wave)),
          Animated.parallel(diag.map(d => d.gold)),
        ]),
      ])
    );
    Animated.parallel(diagAnimations).start();
  }, [puzzleKey]);

const victoryRef = useRef(false);
  useEffect(() => {
    if (!victoryWave) { victoryRef.current = false; return; }
    if (victoryRef.current) return;
    victoryRef.current = true;

const maxDist = Math.sqrt(32); // dist max ≈ 5.66

    const runWave = (waveIndex: number) => {
      const anims = goldAnims.map((a, idx) => {
        const r = Math.floor(idx / 9), col = idx % 9;
        const dist = Math.sqrt((r - 4) ** 2 + (col - 4) ** 2);
        const delay = (dist / maxDist) * 400; // 0→400ms selon distance
        return Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(a, { toValue: 0, duration: 350, useNativeDriver: Platform.OS !== "web" }),
        ]);
      });
      Animated.parallel(anims).start();
    };

    runWave(0);
    const t1 = setTimeout(() => runWave(1), WAVE_STEP_MS);
    const t2 = setTimeout(() => runWave(2), WAVE_STEP_MS * 2);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [victoryWave]);

const prevGroupsRef   = useRef<string>("");
  // Référence à l'animation de groupe en cours pour pouvoir l'arrêter proprement
  const groupAnimRef  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!completedGroups || completedGroups.length === 0) return;
    const key = completedGroups.map(([r, c]) => `${r},${c}`).join("|");
    if (key === prevGroupsRef.current) return;
    prevGroupsRef.current = key;

    // Stopper l'animation précédente si elle tourne encore, et remettre à zéro
    // tous les goldAnims/scaleAnims pour éviter les artefacts visuels en mode Blitz
    if (groupAnimRef.current) {
      groupAnimRef.current.stop();
      groupAnimRef.current = null;
      goldAnims.forEach(a => a.setValue(0));
      scaleAnims.forEach(a => a.setValue(1));
    }

    // Barycentre des cellules complétées → point d'origine de la vague
    const centerR = completedGroups.reduce((s, [r]) => s + r, 0) / completedGroups.length;
    const centerC = completedGroups.reduce((s, [, c]) => s + c, 0) / completedGroups.length;
    const maxDist = Math.max(
      ...completedGroups.map(([r, c]) => Math.abs(r - centerR) + Math.abs(c - centerC))
    ) || 1;

    const anims = completedGroups.map(([r, c]) => {
      const a = goldAnims[r * 9 + c];
      a.setValue(0);
      const dist  = Math.abs(r - centerR) + Math.abs(c - centerC);
      const delay = (dist / maxDist) * 200;
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 140, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(a, { toValue: 0, duration: 580, useNativeDriver: Platform.OS !== "web" }),
      ]);
    });

    // Scale pulse sur les cellules complétées
    const scaleAn = completedGroups.map(([r, c]) => {
      const a = scaleAnims[r * 9 + c];
      const dist  = Math.abs(r - centerR) + Math.abs(c - centerC);
      const delay = (dist / maxDist) * 200;
      return Animated.sequence([
        Animated.delay(delay + 50),
        Animated.timing(a, { toValue: 1.06, duration: 120, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(a, { toValue: 1,    duration: 150, useNativeDriver: Platform.OS !== "web" }),
      ]);
    });

    const composite = Animated.parallel([...anims, ...scaleAn]);
    groupAnimRef.current = composite;
    composite.start(() => { groupAnimRef.current = null; });
  }, [completedGroups]);

  // ── Bounce sur placement correct ────────────────────────────────────────────
  useEffect(() => {
    if (!bounceCell) return;
    const { r, c } = bounceCell;
    const idx = r * 9 + c;
    const anim = scaleAnims[idx];
    anim.setValue(0.85);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.08, duration: 120, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(anim, { toValue: 1,    duration: 100, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [bounceCell]);

  // ── Shake sur erreur ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shakeCell) return;
    const { r, c } = shakeCell;
    const idx = r * 9 + c;
    const anim = shakeAnims[idx];
    Animated.sequence([
      Animated.timing(anim, { toValue:  4, duration: 50, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(anim, { toValue: -4, duration: 50, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(anim, { toValue:  3, duration: 50, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(anim, { toValue: -3, duration: 50, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(anim, { toValue:  0, duration: 50, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [shakeCell]);

  const selectedValue  = selected ? grid[selected[0]]?.[selected[1]] : 0;
  // En mode blitz, on peut forcer la valeur utilisée pour les highlights
  const effectiveValue = selectedValueOverride !== undefined ? selectedValueOverride : selectedValue;

  const isSelected    = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isHighlighted = (r: number, c: number) => {
    if (!selected || !highlightGroup) return false;
    const [sr, sc] = selected;
    return r === sr || c === sc ||
      (Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3));
  };
  const isMatchValue = (r: number, c: number) => {
    if (effectiveValue === 0 || !highlightIdentical) return false;
    if (selectedValueOverride !== undefined) {
      // Mode blitz : comparer sans tenir compte de la sélection de case
      return grid[r][c] === effectiveValue;
    }
    if (!selected) return false;
    return !isSelected(r, c) && grid[r][c] === effectiveValue;
  };

const hintHighlightSet = React.useMemo(() => {
    const s = new Set<string>();
    if (hintHighlight) for (const [r, c] of hintHighlight) s.add(`${r},${c}`);
    return s;
  }, [hintHighlight]);
  const isHintHighlight = (r: number, c: number) => hintHighlightSet.has(`${r},${c}`);

  const hLines = React.useMemo(() => [1,2,3,4,5,6,7,8].map(i => ({ top:  i * CELL_SIZE, thick: i === 3 || i === 6 })), [CELL_SIZE]);
  const vLines = React.useMemo(() => [1,2,3,4,5,6,7,8].map(i => ({ left: i * CELL_SIZE, thick: i === 3 || i === 6 })), [CELL_SIZE]);

  const LETTERS = ["A","B","C","D","E","F","G","H","I"];

  return (
    <View style={{ width: gridSize, height: gridSize }}>

      {/* Lettres colonnes (A–I) — en absolu au-dessus, dans la marge */}
      {showCoords && (
        <View pointerEvents="none" style={{ position: "absolute", top: -14, left: 0, right: 0, flexDirection: "row" }}>
          {LETTERS.map((l) => (
            <View key={l} style={{ width: CELL_SIZE, alignItems: "center" }}>
              <Text style={[coord.label, { color: colors.hintColor }]}>{l}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Numéros lignes (1–9) — en absolu à gauche, dans la marge */}
      {showCoords && (
        <View pointerEvents="none" style={{ position: "absolute", left: -14, top: 0, bottom: 0, width: 14, justifyContent: "space-around", alignItems: "center" }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <Text key={n} style={[coord.label, { color: colors.hintColor }]}>{n}</Text>
          ))}
        </View>
      )}

      {/* Cellules */}
      <View style={styles.cellsContainer} {...panResponder.panHandlers}>
        {grid.map((row: number[], r: number) => (
          <View key={r} style={styles.row}>
            {row.map((_: number, c: number) => {
              const idx = r * 9 + c;
              return (
                <View key={`${r}-${c}`} style={{ width: CELL_SIZE, height: CELL_SIZE }}>
                  <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnims[idx] }, { translateX: shakeAnims[idx] }] }}>
                  <SudokuCell
                    value={
                      hintTarget && hintTarget[0] === r && hintTarget[1] === c && hintPreviewValue
                        ? hintPreviewValue
                        : grid[r][c]
                    }
                    notes={notes[r][c]}
                    errors={errors[r][c]}
                    row={r} col={c}
                    isFixed={isFixed(r, c)}
                    isSelected={isSelected(r, c)}
                    isHighlighted={isHighlighted(r, c)}
                    isHintHighlight={isHintHighlight(r, c)}
                    isHintTarget={!!(hintTarget && hintTarget[0] === r && hintTarget[1] === c)}
                    isFreePlayError={freePlayErrorCells?.has(`${r},${c}`) ?? false}
                    isHypothesis={hypothesisCells?.has(`${r},${c}`) ?? false}
                    hypothesisNoteKeys={hypothesisNoteKeys}
                    isMatchValue={isMatchValue(r, c)}
                    isError={isError(r, c)}
                    highlightNoteValue={highlightNotes && effectiveValue !== 0 ? effectiveValue : 0}
                    onPress={() => onSelect(r, c)}
                    animValue={cellAnims[idx]}
                    goldAnim={goldAnims[idx]}
                    cellFontSize={cellFontSize}
                    noteFontSize={noteFontSize}
                  />
                  </Animated.View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Lignes de séparation — fines d'abord, épaisses par-dessus */}
      {hLines.filter(l => !l.thick).map(({ top }, i) => (
        <View key={`ht${i}`} pointerEvents="none" style={{
          position: "absolute", top: top - 0.25, left: 0,
          width: gridSize, height: 0.5,
          backgroundColor: colors.borderThin,
        }} />
      ))}
      {vLines.filter(l => !l.thick).map(({ left }, i) => (
        <View key={`vt${i}`} pointerEvents="none" style={{
          position: "absolute", left: left - 0.25, top: 0,
          height: gridSize, width: 0.5,
          backgroundColor: colors.borderThin,
        }} />
      ))}
      {hLines.filter(l => l.thick).map(({ top }, i) => (
        <View key={`hT${i}`} pointerEvents="none" style={{
          position: "absolute", top: top - 1, left: 0,
          width: gridSize, height: 2,
          backgroundColor: colors.borderBox,
        }} />
      ))}
      {vLines.filter(l => l.thick).map(({ left }, i) => (
        <View key={`vT${i}`} pointerEvents="none" style={{
          position: "absolute", left: left - 1, top: 0,
          height: gridSize, width: 2,
          backgroundColor: colors.borderBox,
        }} />
      ))}
      <View pointerEvents="none" style={[styles.outerBorder, { borderColor: colors.borderBox }]} />

    </View>
  );
}

export default React.memo(SudokuGrid);

const coord = StyleSheet.create({
  label: {
    fontSize: 8,
    fontWeight: "600",
    opacity: 0.85,
  },
});

const styles = StyleSheet.create({
  cellsContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  row:            { flexDirection: "row" },
  outerBorder:    {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2,
  },
});
