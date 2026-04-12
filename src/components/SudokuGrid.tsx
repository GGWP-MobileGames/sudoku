import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import SudokuCell from "./SudokuCell";
import { COLORS } from "../utils/theme";
import { useSettings } from "../context/SettingsContext";
import type { Grid, NotesGrid, ErrorsGrid } from "../hooks/useGameState";

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
  victoryWave?:    boolean;
  showCoords?:       boolean;
  hintHighlight?:      [number, number][];
  hintTarget?:         [number, number] | null;
  hintPreviewValue?:   number | null; // valeur à pré-afficher dans la case cible
  highlightIdentical?: boolean;
  highlightGroup?:     boolean;
  largeNumbers?:       boolean;
}

export default function SudokuGrid({
  grid, notes, errors, selected, onSelect, isFixed, isError, puzzleKey, gridSize, completedGroups,
  victoryWave, showCoords, hintHighlight, hintTarget, hintPreviewValue,
  highlightIdentical = true, highlightGroup = true, largeNumbers = true,
}: Props) {
  const { colors } = useSettings();
  const CELL_SIZE = gridSize / 9;
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

  const puzzleId = useRef<string>("");

useEffect(() => {
    if (puzzleKey === puzzleId.current || !puzzleKey) return;
    puzzleId.current = puzzleKey;

    cellAnims.forEach(a => a.setValue(0));
    goldAnims.forEach(a => a.setValue(0));

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
    const t1 = setTimeout(() => runWave(1), 1000);
    const t2 = setTimeout(() => runWave(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [victoryWave]);

const prevGroupsRef = useRef<string>("");
  useEffect(() => {
    if (!completedGroups || completedGroups.length === 0) return;
    const key = completedGroups.map(([r, c]) => `${r},${c}`).join("|");
    if (key === prevGroupsRef.current) return;
    prevGroupsRef.current = key;

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

    Animated.parallel(anims).start();
  }, [completedGroups]);

  const selectedValue = selected ? grid[selected[0]]?.[selected[1]] : 0;
  const isSelected    = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isHighlighted = (r: number, c: number) => {
    if (!selected || !highlightGroup) return false;
    const [sr, sc] = selected;
    return r === sr || c === sc ||
      (Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3));
  };
  const isMatchValue = (r: number, c: number) => {
    if (!selected || selectedValue === 0 || !highlightIdentical) return false;
    return !isSelected(r, c) && grid[r][c] === selectedValue;
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
      <View style={styles.cellsContainer}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => {
              const idx = r * 9 + c;
              return (
                <View key={`${r}-${c}`} style={{ width: CELL_SIZE, height: CELL_SIZE }}>
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
                    isMatchValue={isMatchValue(r, c)}
                    isError={isError(r, c)}
                    onPress={() => onSelect(r, c)}
                    animValue={cellAnims[idx]}
                    goldAnim={goldAnims[idx]}
                    cellFontSize={cellFontSize}
                    noteFontSize={noteFontSize}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Lignes de séparation */}
      {hLines.map(({ top, thick }, i) => (
        <View key={`h${i}`} pointerEvents="none" style={{
          position: "absolute", top: top - (thick ? 1 : 0.25), left: 0,
          width: gridSize, height: thick ? 2 : 0.5,
          backgroundColor: thick ? colors.borderBox : colors.borderThin,
        }} />
      ))}
      {vLines.map(({ left, thick }, i) => (
        <View key={`v${i}`} pointerEvents="none" style={{
          position: "absolute", left: left - (thick ? 1 : 0.25), top: 0,
          height: gridSize, width: thick ? 2 : 0.5,
          backgroundColor: thick ? colors.borderBox : colors.borderThin,
        }} />
      ))}
      <View pointerEvents="none" style={[styles.outerBorder, { borderColor: colors.borderBox }]} />

    </View>
  );
}

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
    borderWidth: 2, borderColor: COLORS.borderBox,
  },
});
