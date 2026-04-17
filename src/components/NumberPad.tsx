import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSettings } from "../context/SettingsContext";
import type { Grid } from "../utils/sudoku";

interface Props {
  onInput:              (n: number) => void;
  onErase:              () => void;
  onHint:               () => void;
  hintsLeft:            number;
  notesMode:            boolean;
  onToggleNotes:        () => void;
  grid:                 Grid;
  compact?:             boolean;
  // Mode Blitz
  blitzMode?:           boolean;
  blitzNumber?:         number | null; // null = rien, -1 = effacement, 1-9 = chiffre
  onSelectBlitzNumber?: (n: number | null) => void;
}

function countInGrid(grid: Grid, num: number): number {
  return grid.reduce((acc, row) => acc + row.filter(v => v === num).length, 0);
}

const NumberPad = React.memo(function NumberPad({
  onInput, onErase, onHint, hintsLeft, notesMode, onToggleNotes, grid, compact,
  blitzMode, blitzNumber, onSelectBlitzNumber,
}: Props) {
  // États locaux optimistes pour un retour visuel instantané
  const [localNotes, setLocalNotes] = useState(notesMode);
  useEffect(() => { setLocalNotes(notesMode); }, [notesMode]);

  // État local pour la sélection blitz (retour visuel immédiat + toggle fiable)
  const [localBlitzNumber, setLocalBlitzNumber] = useState<number | null>(blitzNumber ?? null);
  useEffect(() => { setLocalBlitzNumber(blitzNumber ?? null); }, [blitzNumber]);

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

  const handleToggleNotes = () => {
    const newNotes = !localNotes;
    setLocalNotes(newNotes);
    onToggleNotes();
    // En mode blitz, désélectionner le chiffre actif quand on active les notes
    if (blitzMode && newNotes && onSelectBlitzNumber) {
      setLocalBlitzNumber(null);
      onSelectBlitzNumber(null);
    }
  };

  const handleNumPress = (n: number) => {
    if (blitzMode && onSelectBlitzNumber) {
      // Désactiver les notes si elles sont actives (exclusion mutuelle)
      if (localNotes) { setLocalNotes(false); onToggleNotes(); }
      // Toggle : si déjà sélectionné, désélectionner ; sinon sélectionner
      const next = localBlitzNumber === n ? null : n;
      setLocalBlitzNumber(next);
      onSelectBlitzNumber(next);
    } else {
      onInput(n);
    }
  };

  const handleErasePress = () => {
    if (blitzMode && onSelectBlitzNumber) {
      // Désactiver les notes si elles sont actives (exclusion mutuelle)
      if (localNotes) { setLocalNotes(false); onToggleNotes(); }
      // Toggle : si déjà en mode effacement, désélectionner ; sinon activer
      const next = localBlitzNumber === -1 ? null : -1;
      setLocalBlitzNumber(next);
      onSelectBlitzNumber(next);
    } else {
      onErase();
    }
  };

  return (
    <View style={[styles.container, compact && { paddingHorizontal: 4, gap: 4 }]}>
      {/* Chiffres */}
      <View style={styles.numRow}>
        {[1,2,3,4,5,6,7,8,9].map((n) => {
          const placed    = countInGrid(grid, n);
          const remaining = 9 - placed;
          const done      = remaining === 0;
          const isBlitzSelected = blitzMode && localBlitzNumber === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => handleNumPress(n)}
              disabled={done}
              style={[
                styles.numBtn, btnStyle,
                done && styles.numBtnDone,
                isBlitzSelected && { backgroundColor: colors.bgCellSelected, borderColor: colors.borderBox },
              ]}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.numText, primaryColor,
                done && secColor,
                isBlitzSelected && { color: colors.textOnSelected },
                { fontSize: sz.numText },
              ]}>
                {n}
              </Text>
              <Text style={[
                styles.remaining, secColor,
                done && { color: colors.hintColor },
                isBlitzSelected && { color: colors.textOnSelected },
                { fontSize: sz.remaining },
              ]}>
                {done ? "✓" : remaining}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>

        {/* Effacer */}
        <TouchableOpacity
          onPress={handleErasePress}
          style={[
            styles.actionBtn, btnStyle, { borderColor: colors.textSecondary },
            blitzMode && localBlitzNumber === -1 && { backgroundColor: colors.bgCellSelected, borderColor: colors.borderBox },
          ]}
          activeOpacity={0.6}
        >
          <Text style={[
            styles.actionIcon, secColor,
            blitzMode && localBlitzNumber === -1 && { color: colors.textOnSelected },
            { fontSize: sz.actionIcon },
          ]}>✕</Text>
          <Text style={[
            styles.actionLabel, secColor,
            blitzMode && localBlitzNumber === -1 && { color: colors.textOnSelected },
            { fontSize: sz.actionLabel },
          ]}>{t("game.erase")}</Text>
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
