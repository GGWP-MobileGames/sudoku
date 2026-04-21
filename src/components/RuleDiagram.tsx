import React from "react";
import { View } from "react-native";
import { useSettings } from "../context/SettingsContext";

export type RuleHighlight = "row" | "col" | "block";

interface Props {
  highlight: RuleHighlight;
  size?:     number; // largeur/hauteur totale en px (défaut 180)
}

// Mini-grille 9×9 purement décorative : reproduit les bordures de SudokuGrid
// (fines `borderThin` + épaisses `borderBox` tous les 3 × cellSize + outer 2 px)
// et met en évidence une ligne / colonne / bloc 3×3 en `bgGold`.
export default function RuleDiagram({ highlight, size = 180 }: Props) {
  const { colors } = useSettings();
  const cell = size / 9;

  // Indices de la zone surlignée (milieu)
  const highlightRow = 4;
  const highlightCol = 4;
  const highlightBlockR = [3, 4, 5];
  const highlightBlockC = [3, 4, 5];

  const isHighlighted = (r: number, c: number) => {
    if (highlight === "row")   return r === highlightRow;
    if (highlight === "col")   return c === highlightCol;
    if (highlight === "block") return highlightBlockR.includes(r) && highlightBlockC.includes(c);
    return false;
  };

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      {/* Fond : 81 cellules */}
      {Array.from({ length: 9 }).map((_, r) => (
        <View key={`r-${r}`} style={{ flexDirection: "row" }}>
          {Array.from({ length: 9 }).map((__, c) => (
            <View
              key={`c-${r}-${c}`}
              style={{
                width: cell,
                height: cell,
                backgroundColor: isHighlighted(r, c) ? colors.bgGold : "transparent",
              }}
            />
          ))}
        </View>
      ))}

      {/* Lignes fines horizontales (1 à 8) */}
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

      {/* Lignes épaisses horizontales (séparateurs de blocs 3×3) */}
      {[3,6].map(i => (
        <View key={`hT-${i}`} pointerEvents="none" style={{
          position: "absolute", top: i * cell - 1, left: 0,
          width: size, height: 2, backgroundColor: colors.borderBox,
        }} />
      ))}
      {/* Lignes épaisses verticales */}
      {[3,6].map(i => (
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
