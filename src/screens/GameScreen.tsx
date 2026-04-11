import React, { useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGameState } from "../hooks/useGameState";
import SudokuGrid from "../components/SudokuGrid";
import NumberPad from "../components/NumberPad";
import VictoryModal from "../components/VictoryModal";
import DefeatModal from "../components/DefeatModal";
import HintModal from "../components/HintModal";
import { COLORS, SPACING } from "../utils/theme";
import { useSettings } from "../context/SettingsContext";
import { clearOngoing, clearSavedGame, serializeNotes, serializeCellErrors } from "../utils/storage";
import { saveDailyRecord, getTodayKey, saveDailyGame, clearDailyGame, recordDailyInHistory, recordDailyFailureInHistory } from "../utils/dailyChallenge";
import type { Difficulty } from "../utils/puzzles";
import type { Grid } from "../utils/sudoku";
import type { SavedGame } from "../utils/storage";

const EMPTY_GRID: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));
const EMPTY_NOTES  = Array.from({ length: 9 }, () =>
  Array.from({ length: 9 }, () => new Set<number>())
);
const EMPTY_ERRORS = Array.from({ length: 9 }, () =>
  Array.from({ length: 9 }, () => new Set<number>())
);

interface Props {
  difficulty:    Difficulty;
  savedGame?:    SavedGame | null;
  prebuilt?:     { puzzle: Grid; solution: Grid };
  isDaily?:      boolean;
  dailyDateKey?: string; // dateKey figé au démarrage de la partie, indépendant de l'heure
  onBackToHome:  () => void;
}
export default function GameScreen({ difficulty, savedGame, prebuilt, isDaily, dailyDateKey, onBackToHome }: Props) {
  const { colors, settings, t } = useSettings();
  const hintsPerGame = isDaily ? 3 : (settings?.hintsPerGame ?? 3);
  const effectiveLimitErrors = isDaily ? true : (settings?.limitErrors ?? true);
  const effectiveMaxErrors   = isDaily ? 3   : (settings?.maxErrors   ?? 3);

  // Capturer le dateKey au montage — ne jamais utiliser getTodayKey() dynamiquement
  // pour éviter le bug minuit (partie commencée hier, quittée après minuit)
  const gameDateKey = useRef<string>(dailyDateKey ?? getTodayKey()).current;

  const mistakesAnim = useRef(new Animated.Value(1)).current;
  const prevMistakesRef = useRef(0);

  const flashMistakes = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(mistakesAnim, { toValue: 1.6, duration: 100, useNativeDriver: true }),
      Animated.timing(mistakesAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
      Animated.timing(mistakesAnim, { toValue: 1.4, duration: 80,  useNativeDriver: true }),
      Animated.timing(mistakesAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
    ]).start();
  }, [mistakesAnim]);

  const {
    grid, notes, cellErrors, puzzle, solution, selected, setSelected,
    notesMode, setNotesMode,
    mistakes, hintsLeft,
    seconds, formatTime,
    paused, setPaused,
    completed, completedGroups,
    inputNumber, useHint, undo, undoStack,
    pendingHint, dismissHint, applyHint,
    newGame,
    isFixed, isError,
    secondsRef, mistakesRef, hintsLeftRef,
  } = useGameState(difficulty, {
    savedGame, prebuilt, hintsPerGame, t,
  });

  const handleInput = React.useCallback((n: number) => {
    inputNumber(n);
  }, [inputNumber]);

  React.useEffect(() => {
    if (mistakes > prevMistakesRef.current) {
      flashMistakes();
    }
    prevMistakesRef.current = mistakes;
  }, [mistakes]);

  const [victoryReady,  setVictoryReady]  = React.useState(false);
  const [defeatPending, setDefeatPending] = React.useState(false);
  const [defeatReady,   setDefeatReady]   = React.useState(false);
  const [defeatStats,   setDefeatStats]   = React.useState<{ seconds: number; mistakes: number; hintsUsed: number } | null>(null);
  const victoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defeatTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const puzzleKeyRef  = useRef<string>("");
  const prevPuzzleRef = useRef<Grid>([]);
  if (puzzle.length > 0 && puzzle !== prevPuzzleRef.current) {
    prevPuzzleRef.current = puzzle;
    puzzleKeyRef.current  = puzzle.flat().join("-");
  }

  React.useEffect(() => {
    if (!isDaily || !grid.length || completed) return;
    try {
      saveDailyGame({
        difficulty, grid,
        notes: serializeNotes(notes),
        cellErrors: serializeCellErrors(cellErrors),
        puzzle, solution,
        mistakes, hintsLeft, seconds,
        dateKey: gameDateKey,
      });
    } catch (e) { console.warn("saveDailyGame failed", e); }
  }, [seconds, mistakes, hintsLeft]);

  React.useEffect(() => {
    if (completed) {
      setSelected(null);
      setVictoryReady(false);
      if (isDaily) {
        saveDailyRecord({ dateKey: gameDateKey, seconds: secondsRef.current, mistakes: mistakesRef.current, hints: hintsPerGame - hintsLeftRef.current, completed: true });
        recordDailyInHistory(secondsRef.current, mistakesRef.current);
        clearDailyGame();
      }
      victoryTimerRef.current = setTimeout(() => setVictoryReady(true), 3200);
    }
    return () => { if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current); };
  }, [completed]);

  const isDefeated = effectiveLimitErrors && !completed && mistakes >= effectiveMaxErrors;

  React.useEffect(() => {
    if (isDefeated && !defeatPending) {
      setDefeatPending(true);
      setSelected(null);
      const hintsUsed = hintsPerGame - hintsLeftRef.current;
      setDefeatStats({ seconds: secondsRef.current, mistakes: mistakesRef.current, hintsUsed });
      if (isDaily) {
        saveDailyRecord({ dateKey: gameDateKey, seconds: secondsRef.current, mistakes: mistakesRef.current, hints: hintsUsed, completed: false, failed: true }).catch(() => {});
        recordDailyFailureInHistory(secondsRef.current, mistakesRef.current);
        clearDailyGame();
      } else {
        clearSavedGame();
      }
      defeatTimerRef.current = setTimeout(() => setDefeatReady(true), 1200);
    }
    return () => { if (defeatTimerRef.current) clearTimeout(defeatTimerRef.current); };
  }, [isDefeated]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={settings.darkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <TouchableOpacity
        style={styles.screen}
        activeOpacity={1}
        onPress={() => setSelected(null)}
      >

        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={async () => {
              if (!completed && isDaily) {
                saveDailyRecord({ dateKey: gameDateKey, seconds: secondsRef.current, mistakes: mistakesRef.current, hints: hintsPerGame - hintsLeftRef.current, completed: false }).catch(() => {});
              }
              onBackToHome();
            }} style={[styles.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
            <Text style={[styles.chevron, { color: colors.textPrimary }]}>‹</Text>
            <Text style={[styles.backText, { color: colors.textPrimary }]}>{t('game.menu')}</Text>
          </TouchableOpacity>
          <View style={[styles.diffPill, { backgroundColor: isDaily ? COLORS.gold : colors.bgCellSelected }]}>
            <Text style={[styles.diffText, { color: isDaily ? '#1A1A1A' : colors.textOnSelected }]}>
              {isDaily ? t('game.daily_badge') : t(`home.difficulties.${difficulty}`).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Barre de stats — toujours le même layout, contenu qui change selon pause */}
        <View style={styles.statsBar}>

          {/* Bouton pause — à gauche du temps */}
          <TouchableOpacity
            onPress={() => setPaused(!paused)}
            style={[styles.pauseBtn, paused && { borderWidth: 1.5, borderColor: colors.borderBox, backgroundColor: colors.bgCellSelected }]}
            activeOpacity={0.7}
          >
            {paused ? (
              /* Triangle ▶ dessiné avec borderWidth */
              <View style={[styles.playIcon, { borderLeftColor: colors.textOnSelected }]} />
            ) : (
              /* Deux barres ⏸ dessinées avec des View */
              <View style={styles.pauseIconShape}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            )}
          </TouchableOpacity>

          {/* Temps */}
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{paused ? t('game.paused') : t('game.time')}</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatTime(seconds)}</Text>
          </View>

          <View style={[styles.statSep, { backgroundColor: colors.borderThin }]} />

          {/* Erreurs */}
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('game.errors')}</Text>
            <Animated.Text style={[styles.statValue, { color: mistakes > 0 ? colors.error : colors.textPrimary, transform: [{ scale: mistakesAnim }] }]}>
              {effectiveLimitErrors ? `${mistakes}/${effectiveMaxErrors}` : String(mistakes)}
            </Animated.Text>
          </View>

        </View>

        {/* Zone grille — toujours rendue, overlay EN PAUSE par-dessus si pausé */}
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={styles.gridWrapper}>
          <SudokuGrid
            grid={grid.length > 0 ? grid : EMPTY_GRID}
            notes={grid.length > 0 ? notes : EMPTY_NOTES}
            errors={grid.length > 0 ? cellErrors : EMPTY_ERRORS}
            selected={paused || !!pendingHint ? null : selected}
            onSelect={(r, c) => { if (!paused) setSelected([r, c]); }}
            isFixed={isFixed} isError={isError}
            puzzleKey={puzzleKeyRef.current}
            completedGroups={completedGroups}
            victoryWave={completed && !victoryReady}
            showCoords={!!pendingHint}
            hintHighlight={pendingHint?.highlightCells as [number,number][] | undefined}
            hintTarget={pendingHint?.targetCell ?? null}
            hintPreviewValue={pendingHint?.value ?? null}
            highlightIdentical={settings.highlightIdentical}
            highlightGroup={settings.highlightGroup}
            largeNumbers={settings.largeNumbers}
          />
          {paused && (
            <View style={[styles.pausedOverlay, { backgroundColor: colors.bg, borderColor: colors.borderBox }]}>
              <Text style={[styles.pausedText, { color: colors.textPrimary }]}>{t('game.paused_text')}</Text>
              <Text style={[styles.pausedSub, { color: colors.textSecondary }]}>{t('game.paused_sub')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Pavé — toujours rendu pour stabiliser le layout, masqué si pausé ou défaite */}
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[styles.padWrapper, (paused || defeatPending) && styles.padHidden]} disabled={paused || defeatPending}>
          <NumberPad
            onInput={handleInput} onHint={useHint}
            onUndo={undo} canUndo={undoStack.length > 0}
            hintsLeft={hintsLeft} notesMode={notesMode}
            onToggleNotes={() => setNotesMode(!notesMode)}
            grid={grid}
          />
        </TouchableOpacity>

      </TouchableOpacity>

      <HintModal
        hint={pendingHint}
        onApply={applyHint}
        onDismiss={dismissHint}
      />

      <VictoryModal
        visible={victoryReady}
        time={formatTime(seconds)}
        seconds={seconds}
        mistakes={mistakes}
        hintsLeft={hintsLeft}
        maxHints={hintsPerGame}
        difficulty={difficulty}
        diffLabel={t(`home.difficulties.${difficulty}`)}
        isDaily={isDaily}
        onReplay={newGame}
        onHome={onBackToHome}
      />

      <DefeatModal
        visible={defeatReady}
        time={defeatStats ? formatTime(defeatStats.seconds) : formatTime(seconds)}
        seconds={defeatStats?.seconds ?? seconds}
        mistakes={defeatStats?.mistakes ?? mistakes}
        maxMistakes={effectiveMaxErrors}
        hintsUsed={defeatStats?.hintsUsed ?? 0}
        difficulty={difficulty}
        isDaily={isDaily}
        onReplay={() => { setDefeatPending(false); setDefeatReady(false); setDefeatStats(null); newGame(); }}
        onHome={onBackToHome}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, alignItems: "center", justifyContent: "space-evenly", paddingVertical: SPACING.md },

  // En-tête
  header: {
    width: "100%", flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.borderBox,
  },
  chevron: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "700",
    lineHeight: 15,
    includeFontPadding: false,
    marginRight: 3,
  },
  backText:  { fontSize: 12, color: COLORS.textPrimary, fontWeight: "700", letterSpacing: 2.5 },
  diffPill:  { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: COLORS.bgCellSelected },
  diffText:  { fontSize: 12, color: COLORS.textOnSelected, fontWeight: "700", letterSpacing: 2 },

  // Barre de stats
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },

  // Bouton pause agrandi, à gauche du timer
  pauseBtn: {
    width: 44, height: 44,
    alignItems: "center", justifyContent: "center",
  },
  // Icône pause : deux barres verticales
  pauseIconShape: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBar: {
    width: 4,
    height: 16,
    borderRadius: 1,
    backgroundColor: COLORS.gold,
  },
  // Icône play : triangle CSS
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 15,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: COLORS.textOnSelected,
    marginLeft: 3, // compenser l'asymétrie visuelle du triangle
  },

  statItem:  { alignItems: "center", gap: 2 },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "600" },
  statValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "300", letterSpacing: 1 },
  statSep:   { width: 1, height: 32, backgroundColor: COLORS.borderThin },

  // Grille avec overlay pause
  gridWrapper: { position: "relative" },
  pausedOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.borderBox,
    gap: 10,
  },
  pausedText: { fontSize: 22, fontWeight: "800", letterSpacing: 8, color: COLORS.textPrimary },
  pausedSub:  { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },

  // Pavé masqué (mais toujours dans le layout)
  padWrapper: { width: "100%" },
  padHidden:  { opacity: 0 },
});
