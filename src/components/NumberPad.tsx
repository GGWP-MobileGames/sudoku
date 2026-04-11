import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSettings } from "../context/SettingsContext";
import type { Grid } from "../utils/sudoku";

interface Props {
  onInput:       (n: number) => void;
  onHint:        () => void;
  onUndo:        () => void;
  canUndo:       boolean;
  hintsLeft:     number;
  notesMode:     boolean;
  onToggleNotes: () => void;
  grid:          Grid;
  compact?:      boolean;
}

function countInGrid(grid: Grid, num: number): number {
  return grid.reduce((acc, row) => acc + row.filter(v => v === num).length, 0);
}

const NumberPad = React.memo(function NumberPad({ onInput, onHint, onUndo, canUndo, hintsLeft, notesMode, onToggleNotes, grid, compact }: Props) {
  // État local optimiste pour un retour visuel instantané
  const [localNotes, setLocalNotes] = useState(notesMode);
  useEffect(() => { setLocalNotes(notesMode); }, [notesMode]);

  const handleToggleNotes = () => {
    setLocalNotes(n => !n);
    onToggleNotes();
  };
  const { t, settings, colors } = useSettings();
  const large = settings.largeNumbers;
  const sz = {
    numText:     large ? 26 : 20,
    remaining:   large ? 13 : 11,
    actionIcon:  large ? 20 : 16,
    actionLabel: large ? 15 : 12,
  };

  const btnStyle    = { backgroundColor: colors.btnNum, borderColor: colors.btnNumBorder };
  const secColor    = { color: colors.textSecondary };
  const primaryColor = { color: colors.textPrimary };

  return (
    <View style={[styles.container, compact && { paddingHorizontal: 4, gap: 4 }]}>
      {/* Chiffres */}
      <View style={styles.numRow}>
        {[1,2,3,4,5,6,7,8,9].map((n) => {
          const placed    = countInGrid(grid, n);
          const remaining = 9 - placed;
          const done      = remaining === 0;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onInput(n)}
              disabled={done}
              style={[styles.numBtn, btnStyle, done && styles.numBtnDone]}
              activeOpacity={0.6}
            >
              <Text style={[styles.numText, primaryColor, done && secColor, { fontSize: sz.numText }]}>{n}</Text>
              <Text style={[styles.remaining, secColor, done && { color: colors.hintColor }, { fontSize: sz.remaining }]}>
                {done ? "✓" : remaining}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>

        {/* Annuler */}
        <TouchableOpacity
          onPress={onUndo}
          disabled={!canUndo}
          style={[styles.actionBtn, btnStyle, { borderColor: colors.textSecondary }]}
          activeOpacity={canUndo ? 0.6 : 1}
        >
          <Text style={[styles.actionIcon, secColor, { opacity: canUndo ? 1 : 0.35, fontSize: sz.actionIcon }]}>↩</Text>
          <Text style={[styles.actionLabel, secColor, { opacity: canUndo ? 1 : 0.35, fontSize: sz.actionLabel }]}>{t("game.undo")}</Text>
        </TouchableOpacity>

        {/* Notes */}
        <TouchableOpacity
          onPress={handleToggleNotes}
          style={[
            styles.actionBtn, btnStyle,
            localNotes && { backgroundColor: colors.bgCellSelected, borderColor: colors.borderBox },
          ]}
          activeOpacity={0.6}
        >
          <Text style={[styles.actionIcon, secColor, localNotes && { color: colors.textOnSelected }, { fontSize: sz.actionIcon }]}>✎</Text>
          <Text style={[styles.actionLabel, secColor, localNotes && { color: colors.textOnSelected }, { fontSize: sz.actionLabel }]}>{t("game.notes")}</Text>
        </TouchableOpacity>

        {/* Indice */}
        <TouchableOpacity
          onPress={onHint}
          disabled={hintsLeft === 0}
          style={[styles.actionBtn, btnStyle, { borderColor: colors.hintColor }, hintsLeft === 0 && styles.disabledBtn]}
          activeOpacity={0.6}
        >
          <Text style={[styles.actionIcon, { color: colors.hintColor, fontSize: sz.actionIcon }]}>✦</Text>
          <Text style={[styles.actionLabel, { color: colors.hintColor, fontSize: sz.actionLabel }]}>{hintsLeft >= 2 ? t("game.hints_plural") : t("game.hint")} ({hintsLeft})</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
});
export default NumberPad;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    gap: 8,
  },
  numRow: {
    flexDirection: "row",
    gap: 5,
  },
  numBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  numBtnDone: { opacity: 0.3 },
  numText: {
    fontSize: 20,
    fontWeight: "600",
  },
  remaining: { fontSize: 11, fontWeight: "500" },

  actionRow: { flexDirection: "row", gap: 5 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  disabledBtn: { opacity: 0.45 },
  actionIcon:  { fontSize: 16 },
  actionLabel: { fontSize: 12, letterSpacing: 0.3 },
});
