import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useSettings } from "../context/SettingsContext";

// ───────────────────────────────────────────────────────────────────────────────
// TechniqueDiagram — mini-grille pédagogique pour illustrer une technique de Sudoku.
// Supporte : chiffres fixes, candidats (pencil marks 3×3), cellules surlignées
// (primary / secondary / eliminated), et marques spécifiques sur des candidats
// (target = gras, eliminated = barré rouge).
// ───────────────────────────────────────────────────────────────────────────────

export type CellHighlightRole = "primary" | "secondary" | "eliminated";
export type CandidateMarkRole = "target" | "eliminated";

export interface CellGiven      { r: number; c: number; n: number }
export interface CellCandidates { r: number; c: number; ns: number[] }
export interface CellHighlight  { cells: Array<[number, number]>; role: CellHighlightRole }
export interface CandidateMark  { r: number; c: number; n: number; role: CandidateMarkRole }

export interface TechniqueDiagramSpec {
  givens?:         CellGiven[];
  candidates?:     CellCandidates[];
  highlights?:     CellHighlight[];
  candidateMarks?: CandidateMark[];
}

interface Props extends TechniqueDiagramSpec {
  size?: number;
}

const ROWS_3x3 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]] as const;

export default function TechniqueDiagram({
  givens = [], candidates = [], highlights = [], candidateMarks = [],
  size = 240,
}: Props) {
  const { colors } = useSettings();
  const cell = size / 9;

  // Pulsation lente et continue sur la case "primary" (le chiffre à trouver)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0, duration: 2500, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const cellFontSize = Math.floor(cell * 0.62);
  const noteFontSize = Math.max(Math.floor(cell / 3 * 0.62), 8);

  // Map rapide pour lookup par cellule
  const givenMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const g of givens) m.set(`${g.r},${g.c}`, g.n);
    return m;
  }, [givens]);

  const candidatesMap = React.useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const cc of candidates) m.set(`${cc.r},${cc.c}`, new Set(cc.ns));
    return m;
  }, [candidates]);

  const highlightMap = React.useMemo(() => {
    const m = new Map<string, CellHighlightRole>();
    // Priorité : eliminated > primary > secondary (en cas de conflit, garder le plus fort)
    const priority: Record<CellHighlightRole, number> = { eliminated: 3, primary: 2, secondary: 1 };
    for (const h of highlights) {
      for (const [r, c] of h.cells) {
        const key = `${r},${c}`;
        const prev = m.get(key);
        if (!prev || priority[h.role] > priority[prev]) m.set(key, h.role);
      }
    }
    return m;
  }, [highlights]);

  const candidateMarkMap = React.useMemo(() => {
    const m = new Map<string, CandidateMarkRole>();
    for (const cm of candidateMarks) m.set(`${cm.r},${cm.c},${cm.n}`, cm.role);
    return m;
  }, [candidateMarks]);

  // Couleurs des rôles
  // `primary` reprend l'aspect d'une case sélectionnée dans le GameScreen
  // (or plus foncé, adapté au thème) — c'est "la case recherchée".
  const roleBg = (role: CellHighlightRole | undefined): string => {
    if (role === "primary")    return colors.bgCellSelectedGrid;
    if (role === "secondary")  return colors.bgGold + "55"; // gold translucide
    if (role === "eliminated") return colors.error + "22";  // rouge très doux
    return "transparent";
  };

  // Texte foncé fixe pour les contenus dans une case "primary" (comme dans le GameScreen)
  const ON_PRIMARY = "#1A1A1A";

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      {/* Cellules (fond + contenu) */}
      {Array.from({ length: 9 }).map((_, r) => (
        <View key={`r-${r}`} style={{ flexDirection: "row" }}>
          {Array.from({ length: 9 }).map((__, c) => {
            const key = `${r},${c}`;
            const given = givenMap.get(key);
            const cellCandidates = candidatesMap.get(key);
            const role = highlightMap.get(key);
            return (
              <View
                key={`c-${r}-${c}`}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: roleBg(role),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {given !== undefined ? (
                  role === "primary" ? (
                    <Animated.Text style={[
                      styles.given,
                      { fontSize: cellFontSize, color: ON_PRIMARY, opacity: pulseAnim },
                    ]}>
                      {given}
                    </Animated.Text>
                  ) : (
                    <Text style={[
                      styles.given,
                      { fontSize: cellFontSize, color: colors.textPrimary },
                    ]}>
                      {given}
                    </Text>
                  )
                ) : cellCandidates && cellCandidates.size > 0 ? (
                  <View style={styles.notesGrid}>
                    {ROWS_3x3.map((row, ri) => (
                      <View key={ri} style={styles.notesRow}>
                        {row.map(n => {
                          const present = cellCandidates.has(n);
                          const mark = candidateMarkMap.get(`${r},${c},${n}`);
                          const isOnPrimary = role === "primary";
                          return (
                            <View key={n} style={styles.noteCell}>
                              {present && (
                                <Text style={[
                                  styles.note,
                                  { fontSize: noteFontSize, color: isOnPrimary ? ON_PRIMARY : colors.textSecondary },
                                  mark === "target"     && { color: isOnPrimary ? ON_PRIMARY : colors.textPrimary, fontWeight: "800" },
                                  mark === "eliminated" && { color: colors.error, textDecorationLine: "line-through" },
                                ]}>
                                  {n}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {/* Lignes fines horizontales */}
      {[1,2,3,4,5,6,7,8].map(i => (
        <View key={`ht-${i}`} pointerEvents="none" style={{
          position: "absolute", top: i * cell - 0.25, left: 0,
          width: size, height: 0.5, backgroundColor: colors.borderThin,
        }} />
      ))}
      {/* Lignes fines verticales */}
      {[1,2,3,4,5,6,7,8].map(i => (
        <View key={`vt-${i}`} pointerEvents="none" style={{
          position: "absolute", left: i * cell - 0.25, top: 0,
          height: size, width: 0.5, backgroundColor: colors.borderThin,
        }} />
      ))}
      {/* Lignes épaisses horizontales */}
      {[3, 6].map(i => (
        <View key={`hT-${i}`} pointerEvents="none" style={{
          position: "absolute", top: i * cell - 1, left: 0,
          width: size, height: 2, backgroundColor: colors.borderBox,
        }} />
      ))}
      {/* Lignes épaisses verticales */}
      {[3, 6].map(i => (
        <View key={`vT-${i}`} pointerEvents="none" style={{
          position: "absolute", left: i * cell - 1, top: 0,
          height: size, width: 2, backgroundColor: colors.borderBox,
        }} />
      ))}

      {/* Bordure extérieure 2 px */}
      <View pointerEvents="none" style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        borderWidth: 2, borderColor: colors.borderBox,
      }} />
    </View>
  );
}

// Helpers exportés pour simplifier les specs dans src/data/techniques.ts
export const rowCells  = (r: number): Array<[number, number]> =>
  Array.from({ length: 9 }, (_, c) => [r, c] as [number, number]);
export const colCells  = (c: number): Array<[number, number]> =>
  Array.from({ length: 9 }, (_, r) => [r, c] as [number, number]);
export const boxCells  = (br: number, bc: number): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      cells.push([br * 3 + dr, bc * 3 + dc]);
  return cells;
};

const styles = StyleSheet.create({
  given:     { fontWeight: "700" },
  notesGrid: { position: "absolute", top: 1, left: 1, right: 1, bottom: 1 },
  notesRow:  { flex: 1, flexDirection: "row" },
  noteCell:  { flex: 1, alignItems: "center", justifyContent: "center" },
  note:      { fontWeight: "600" },
});
