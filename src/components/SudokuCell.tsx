import React from "react";
import { TouchableOpacity, Text, View, StyleSheet, Animated } from "react-native";
import { COLORS } from "../utils/theme";
import { useSettings } from "../context/SettingsContext";
import type { CellNotes, CellErrors } from "../hooks/useGameState";

interface Props {
  value:         number;
  notes:         CellNotes;
  errors:        CellErrors;
  row:           number;
  col:           number;
  isFixed:       boolean;
  isSelected:    boolean;
  isHighlighted: boolean;
  isMatchValue:  boolean;
  isError:       boolean;
  isHintHighlight?:  boolean;
  isHintTarget?:     boolean; // case cible de l'indice actif
  isFreePlayError?:  boolean; // case erronée révélée en fin de partie (mode jeu libre)
  isHypothesis?:     boolean; // case posée pendant le mode hypothèse (bleu)
  highlightNoteValue?: number; // chiffre sélectionné → surligne les notes correspondantes
  onPress:       () => void;
  animValue?:    Animated.Value;
  goldAnim?:     Animated.Value;
  cellFontSize?: number;
  noteFontSize?: number;
}

const ROWS_3x3 = [[1,2,3],[4,5,6],[7,8,9]] as const;

const SudokuCell = React.memo(function SudokuCell({
  value, notes, errors,
  isFixed, isSelected, isHighlighted, isMatchValue, isError, isHintHighlight, isHintTarget,
  isFreePlayError, isHypothesis,
  highlightNoteValue,
  onPress, animValue, goldAnim, cellFontSize, noteFontSize,
}: Props) {
  const { colors, settings } = useSettings();

  let bg = colors.bgCellDefault;
  if (isHintTarget)           bg = colors.hintColor;
  else if (isSelected)        bg = colors.bgCellSelectedGrid;
  else if (isFreePlayError)   bg = colors.error + "28"; // rouge translucide
  else if (isHypothesis)      bg = "#3A6BC424";          // bleu translucide
  else if (isHintHighlight)   bg = colors.hintHighlight;
  else if (isMatchValue)      bg = colors.bgCellMatch;
  else if (isHighlighted)     bg = colors.bgCellHighlight;

  // Chiffre principal
  let textColor = isFixed ? colors.textFixed : colors.textUser;
  if (isSelected) textColor = '#1A1A1A';
  else if (isHintTarget) textColor = colors.bg;
  else if (isFreePlayError) textColor = colors.error;
  else if (isHypothesis) textColor = "#3A6BC4";

  const noteNumbers  = value === 0 ? [...notes].sort((a, b) => a - b) : [];
  const showNotes    = noteNumbers.length > 0;
  const errorNumbers = value === 0 && settings.showCellErrors ? [...errors].sort((a, b) => a - b) : [];
  const showErrors   = errorNumbers.length > 0;

  const nfs = noteFontSize ?? 8;
  const onDark = isSelected || isHintTarget;

  const content = (
    <>
      {/* Chiffre central */}
      {!showNotes && !showErrors && (
        <Text style={[
          styles.cellText,
          { color: textColor, fontSize: cellFontSize ?? 19 },
          isFixed ? styles.fixedText : styles.userText,
        ]}>
          {value !== 0 ? value : ""}
        </Text>
      )}

      {/* Grille 3×3 notes + erreurs */}
      {(showNotes || showErrors) && (
        <View style={styles.notesGrid}>
          {ROWS_3x3.map((row, ri) => (
            <View key={ri} style={styles.notesRow}>
              {row.map(n => {
                const isNote     = noteNumbers.includes(n);
                const isErr      = errorNumbers.includes(n);
                const isNoteHit  = isNote && !!highlightNoteValue && n === highlightNoteValue;
                const badgeSize  = nfs + 5;
                return (
                  <View key={n} style={styles.noteCell}>
                    {(isNote || isErr) && (
                      <View style={isNoteHit
                        ? [styles.noteHitBadge, { backgroundColor: colors.bgCellMatch, width: badgeSize, height: badgeSize }]
                        : undefined
                      }>
                        <Text style={[
                          isErr ? styles.errorDigit : styles.noteDigit,
                          { fontSize: nfs, color: isErr ? colors.error : colors.textSecondary },
                          onDark && (isErr ? styles.errorsOnDark : styles.notesOnDark),
                          isNoteHit && styles.noteHit,
                        ]}>
                          {n}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </>
  );

  const contentStyle = animValue ? {
    opacity: animValue,
    transform: [{
      translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }),
    }],
  } : undefined;

  return (
    <TouchableOpacity
      onPressIn={onPress}
      activeOpacity={0.75}
      style={[styles.cell, { backgroundColor: bg }]}
    >
      {animValue ? (
        <Animated.View style={[styles.contentWrapper, contentStyle]}>
          {content}
        </Animated.View>
      ) : content}

      {goldAnim && (
        <Animated.View
          pointerEvents="none"
          style={[styles.goldOverlay, { opacity: goldAnim }]}
        />
      )}
    </TouchableOpacity>
  );
});

export default SudokuCell;

const styles = StyleSheet.create({
  cell: {
    flex: 1, aspectRatio: 1,
    alignItems: "center", justifyContent: "center",
  },
  contentWrapper: {
    alignItems: "center", justifyContent: "center",
    width: "100%", height: "100%",
  },

  cellText:  {},
  fixedText: { fontWeight: "700" },
  userText:  { fontWeight: "500" },

  // Grille notes 3×3
  notesGrid: {
    position: "absolute",
    top: 1, left: 1, right: 1, bottom: 1,
  },
  notesRow: {
    flex: 1,
    flexDirection: "row",
  },
  noteCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noteDigit:    { fontWeight: "600" },
  noteHit:      { fontWeight: "800" },
  noteHitBadge: {
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  notesOnDark:  { color: "#1A1A1A" },
  errorDigit:   { fontWeight: "700" },
  errorsOnDark: { color: "#FFD0CC" },

  goldOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(201,150,58,0.50)",
  },
});
