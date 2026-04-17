import React, { useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
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
import { useResponsive } from "../hooks/useResponsive";
import { useKeyboard } from "../hooks/useKeyboard";
import { clearOngoing, clearSavedGame, serializeNotes, serializeCellErrors } from "../utils/storage";
import { saveDailyRecord, getTodayKey, saveDailyGame, clearDailyGame, recordDailyInHistory, recordDailyFailureInHistory } from "../utils/dailyChallenge";
import type { Difficulty } from "../utils/puzzles";
import type { Grid } from "../utils/sudoku";
import type { SavedGame } from "../utils/storage";
import { lightImpact, mediumImpact, errorNotification, successNotification } from "../utils/haptics";

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
  const { gridSize, isLandscape, isCompact, deviceType } = useResponsive();
  // Sur desktop/web, toujours le layout portrait centré (plus esthétique)
  const useLandscape = isLandscape && deviceType !== "desktop";
  const hintsPerGame = isDaily ? 3 : (settings?.hintsPerGame ?? 3);
  const effectiveLimitErrors = isDaily ? true : (settings?.limitErrors ?? true);
  const effectiveMaxErrors   = isDaily ? 3   : (settings?.maxErrors   ?? 3);
  const effectiveFreePlay    = isDaily ? false : (settings?.freePlayMode ?? false);

  // Capturer le dateKey au montage — ne jamais utiliser getTodayKey() dynamiquement
  // pour éviter le bug minuit (partie commencée hier, quittée après minuit)
  const gameDateKey = useRef<string>(dailyDateKey ?? getTodayKey()).current;

  const mistakesAnim = useRef(new Animated.Value(1)).current;
  const prevMistakesRef = useRef(0);

  const flashMistakes = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(mistakesAnim, { toValue: 1.6, duration: 100, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(mistakesAnim, { toValue: 1,   duration: 100, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(mistakesAnim, { toValue: 1.4, duration: 80,  useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(mistakesAnim, { toValue: 1,   duration: 100, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [mistakesAnim]);

  const {
    grid, notes, cellErrors, puzzle, solution, selected, setSelected,
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
    freePlayErrors, clearFreePlayErrors,
  } = useGameState(difficulty, {
    savedGame, prebuilt, hintsPerGame, t,
    limitErrors: effectiveLimitErrors, maxErrors: effectiveMaxErrors,
    isDaily, freePlayMode: effectiveFreePlay,
  });

  const handleInput = React.useCallback((n: number) => {
    inputNumber(n);
  }, [inputNumber]);

  // ── Mode Blitz ──────────────────────────────────────────────────────────────
  // null = rien sélectionné, -1 = mode effacement, 1-9 = chiffre sélectionné
  const [blitzNumber, setBlitzNumber] = React.useState<number | null>(null);
  const blitzNumberRef = React.useRef<number | null>(null);
  blitzNumberRef.current = blitzNumber;
  const blitzModeRef = React.useRef(false);
  blitzModeRef.current = settings.blitzMode ?? false;
  const blitzAutoSelectRef = React.useRef(true);
  blitzAutoSelectRef.current = settings.blitzAutoSelect ?? true;
  // Ref sur la grille courante pour accès sans stale closure dans handleSelect
  const gridRef = React.useRef(grid);
  gridRef.current = grid;

  // Réinitialiser le chiffre blitz quand on quitte le mode
  React.useEffect(() => {
    if (!settings.blitzMode) setBlitzNumber(null);
  }, [settings.blitzMode]);

  // Désélectionner automatiquement un chiffre quand il est complètement placé (9 fois)
  React.useEffect(() => {
    if (!settings.blitzMode || blitzNumber === null || blitzNumber <= 0) return;
    const placed = grid.flat().filter(v => v === blitzNumber).length;
    if (placed >= 9) setBlitzNumber(null);
  }, [grid, blitzNumber, settings.blitzMode]);

  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;
  const handleSelect = React.useCallback((r: number, c: number) => {
    if (pausedRef.current) return;
    if (blitzModeRef.current) {
      const cellValue = gridRef.current[r]?.[c] ?? 0;

      // Auto-sélection : clic sur une case remplie → sélectionne son chiffre
      if (cellValue !== 0 && blitzAutoSelectRef.current) {
        setBlitzNumber(cellValue);
        return;
      }

      // Placer le chiffre sélectionné (ou effacer si -1)
      const bn = blitzNumberRef.current;
      if (bn !== null) {
        inputNumber(bn === -1 ? 0 : bn, r, c);
      }
      return;
    }
    setSelected([r, c]);
  }, [setSelected, inputNumber]);

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

  // Navigation au clavier : flèches directionnelles
  const handleArrow = React.useCallback((dir: "up" | "down" | "left" | "right") => {
    setSelected(prev => {
      const [r, c] = prev ?? [0, 0];
      switch (dir) {
        case "up":    return [Math.max(0, r - 1), c] as [number, number];
        case "down":  return [Math.min(8, r + 1), c] as [number, number];
        case "left":  return [r, Math.max(0, c - 1)] as [number, number];
        case "right": return [r, Math.min(8, c + 1)] as [number, number];
      }
    });
  }, [setSelected]);

  // Raccourcis clavier (web / clavier externe)
  useKeyboard({
    onNumber:      handleInput,
    onDelete:      () => handleInput(0),
    onToggleNotes: () => setNotesMode(prev => !prev),

    onHint:        useHint,
    onEscape:      () => setSelected(null),
    onArrow:       handleArrow,
    disabled:      paused || completed || defeatPending,
  });

  // ── Haptics (conditionné par le paramètre) ──────────────────────────────────
  const haptic = settings.hapticFeedback;
  React.useEffect(() => { if (bounceCell && haptic) lightImpact(); }, [bounceCell]);
  React.useEffect(() => { if (shakeCell && haptic) errorNotification(); }, [shakeCell]);
  const prevCompletedGroupsRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (haptic && completedGroups.length > 0 && completedGroups.length !== prevCompletedGroupsRef.current) {
      mediumImpact();
    }
    prevCompletedGroupsRef.current = completedGroups.length;
  }, [completedGroups]);
  React.useEffect(() => { if (completed && haptic) successNotification(); }, [completed]);

  const victoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defeatTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const puzzleKeyRef  = useRef<string>("");
  const prevPuzzleRef = useRef<Grid>([]);
  if (puzzle.length > 0 && puzzle !== prevPuzzleRef.current) {
    prevPuzzleRef.current = puzzle;
    puzzleKeyRef.current  = puzzle.flat().join("-");
  }

  const isDefeated = effectiveLimitErrors && !completed && mistakes >= effectiveMaxErrors;

  const dailySaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!isDaily || !grid.length || completed || isDefeated) return;
    if (dailySaveTimerRef.current) clearTimeout(dailySaveTimerRef.current);
    dailySaveTimerRef.current = setTimeout(() => {
      try {
        saveDailyGame({
          difficulty, grid,
          notes: serializeNotes(notes),
          cellErrors: serializeCellErrors(cellErrors),
          puzzle, solution,
          mistakes: mistakesRef.current, hintsLeft: hintsLeftRef.current, seconds: secondsRef.current,
          dateKey: gameDateKey,
        });
      } catch (e) { console.warn("saveDailyGame failed", e); }
    }, 2000);
    return () => { if (dailySaveTimerRef.current) clearTimeout(dailySaveTimerRef.current); };
  }, [grid, notes, mistakes]);

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

  // ── Blocs réutilisés en portrait et paysage ────────────────────────────────
  const headerBlock = (
    <View style={styles.header}>
      <TouchableOpacity onPress={async () => {
          if (!completed && isDaily) {
            saveDailyRecord({ dateKey: gameDateKey, seconds: secondsRef.current, mistakes: mistakesRef.current, hints: hintsPerGame - hintsLeftRef.current, completed: false }).catch(() => {});
          }
          flushSave();
          onBackToHome();
        }} style={[styles.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
        <Text style={[styles.chevron, { color: colors.textPrimary }]}>‹</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.backText, { color: colors.textPrimary }]}>{t('game.menu')}</Text>
      </TouchableOpacity>
      <View style={[styles.diffPill, { backgroundColor: isDaily ? COLORS.gold : colors.bgCellSelected }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.diffText, { color: isDaily ? '#1A1A1A' : colors.textOnSelected }]}>
          {isDaily ? t('game.daily_badge') : t(`home.difficulties.${difficulty}`).toUpperCase()}
        </Text>
      </View>
    </View>
  );

  const statsBarBlock = (
    <View style={styles.statsBar}>
      <TouchableOpacity
        onPress={() => setPaused(!paused)}
        style={[styles.pauseBtn, paused && { borderWidth: 1.5, borderColor: colors.borderBox, backgroundColor: colors.bgCellSelected }]}
        activeOpacity={0.7}
      >
        {paused ? (
          <View style={[styles.playIcon, { borderLeftColor: colors.textOnSelected }]} />
        ) : (
          <View style={styles.pauseIconShape}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{paused ? t('game.paused') : t('game.time')}</Text>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatTime(seconds)}</Text>
      </View>
      <View style={[styles.statSep, { backgroundColor: colors.borderThin }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('game.errors')}</Text>
        <Animated.Text style={[styles.statValue, { color: mistakes > 0 && !effectiveFreePlay ? colors.error : colors.textPrimary, transform: [{ scale: mistakesAnim }] }]}>
          {effectiveFreePlay ? "—" : effectiveLimitErrors ? `${mistakes}/${effectiveMaxErrors}` : String(mistakes)}
        </Animated.Text>
      </View>
    </View>
  );

  const gridBlock = (
    <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={styles.gridWrapper}>
      <SudokuGrid
        grid={grid.length > 0 ? grid : EMPTY_GRID}
        notes={grid.length > 0 ? notes : EMPTY_NOTES}
        errors={grid.length > 0 ? cellErrors : EMPTY_ERRORS}
        selected={paused || !!pendingHint ? null : selected}
        onSelect={handleSelect}
        isFixed={isFixed} isError={isError}
        puzzleKey={puzzleKeyRef.current}
        gridSize={gridSize}
        completedGroups={completedGroups}
        bounceCell={bounceCell}
        shakeCell={shakeCell}
        victoryWave={completed && !victoryReady}
        showCoords={!!pendingHint}
        hintHighlight={pendingHint?.highlightCells as [number,number][] | undefined}
        hintTarget={pendingHint?.targetCell ?? null}
        hintPreviewValue={null}
        highlightIdentical={settings.highlightIdentical}
        highlightGroup={settings.highlightGroup}
        largeNumbers={settings.largeNumbers}
        highlightNotes={settings.highlightNotes}
        selectedValueOverride={
          settings.blitzMode && blitzNumber !== null && blitzNumber > 0
            ? blitzNumber
            : undefined
        }
        freePlayErrorCells={
          freePlayErrors
            ? new Set(freePlayErrors.map(([r, c]) => `${r},${c}`))
            : undefined
        }
      />
      {paused && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setPaused(false)}
          style={[styles.pausedOverlay, { backgroundColor: colors.bg, borderColor: colors.borderBox }]}
        >
          <Text style={[styles.pausedText, { color: colors.textPrimary }]}>{t('game.paused_text')}</Text>
          <Text style={[styles.pausedSub, { color: colors.textSecondary }]}>{t('game.paused_sub')}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const padBlock = (
    <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[styles.padWrapper, (paused || defeatPending) && styles.padHidden]} disabled={paused || defeatPending}>
      <NumberPad
        onInput={handleInput} onErase={() => handleInput(0)} onHint={useHint}
        hintsLeft={hintsLeft} notesMode={notesMode}
        onToggleNotes={() => setNotesMode(prev => !prev)}
        onLongPressNotes={settings.autoNotesEnabled ? autoFillNotes : undefined}
        grid={grid}
        compact={isCompact}
        blitzMode={settings.blitzMode}
        blitzNumber={blitzNumber}
        onSelectBlitzNumber={setBlitzNumber}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <TouchableOpacity
        style={useLandscape ? styles.screenLandscape : styles.screen}
        activeOpacity={1}
        onPress={() => setSelected(null)}
      >
        {useLandscape ? (
          <>
            {/* Paysage : grille à gauche, contrôles à droite */}
            <View style={styles.landscapeLeft}>
              {gridBlock}
            </View>
            <View style={styles.landscapeRight}>
              {headerBlock}
              {statsBarBlock}
              <View style={{ flex: 1 }} />
              {padBlock}
            </View>
          </>
        ) : (
          <>
            {/* Portrait : layout vertical classique */}
            {headerBlock}
            {statsBarBlock}
            {gridBlock}
            {padBlock}
          </>
        )}
      </TouchableOpacity>

      <HintModal
        hint={paused ? null : pendingHint}
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
        onReplay={() => { setVictoryReady(false); setBlitzNumber(null); newGame(); }}
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
        onReplay={() => { setDefeatPending(false); setDefeatReady(false); setDefeatStats(null); setBlitzNumber(null); newGame(); }}
        onHome={onBackToHome}
      />

      {/* Overlay jeu libre : grille remplie mais cases erronées */}
      {!!freePlayErrors && freePlayErrors.length > 0 && (
        <View style={[styles.freePlayOverlayWrap, { backgroundColor: colors.bg + "CC" }]}>
          <View style={[styles.freePlayCard, { backgroundColor: colors.bgCard, borderColor: colors.borderBox }]}>
            <Text style={[styles.freePlayTitle, { color: colors.textPrimary }]}>
              {t('game.free_play_title')}
            </Text>
            <Text style={[styles.freePlayMsg, { color: colors.textSecondary }]}>
              {freePlayErrors.length === 1
                ? t('game.free_play_msg_one')
                : t('game.free_play_msg_many').replace('{{n}}', String(freePlayErrors.length))}
            </Text>
            <TouchableOpacity
              onPress={clearFreePlayErrors}
              style={[styles.freePlayBtn, { borderColor: colors.borderBox }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.freePlayBtnText, { color: colors.textPrimary }]}>
                {t('game.free_play_continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, alignItems: "center", justifyContent: "space-evenly", paddingVertical: SPACING.md, maxWidth: 520, alignSelf: "center", width: "100%" },
  screenLandscape: { flex: 1, flexDirection: "row", paddingHorizontal: SPACING.md, maxWidth: 960, alignSelf: "center", width: "100%" },
  landscapeLeft:  { flex: 1, alignItems: "center", justifyContent: "center" },
  landscapeRight: { flex: 1, justifyContent: "center", paddingVertical: SPACING.sm, gap: 12 },

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
  diffPill:  { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: COLORS.bgCellSelected, flexShrink: 1 },
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

  // Overlay jeu libre
  freePlayOverlayWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    zIndex: 100,
  },
  freePlayCard: {
    width: "80%", maxWidth: 320,
    padding: 24, gap: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  freePlayTitle: {
    fontSize: 18, fontWeight: "800", letterSpacing: 4, textAlign: "center",
  },
  freePlayMsg: {
    fontSize: 14, textAlign: "center", lineHeight: 22,
  },
  freePlayBtn: {
    paddingVertical: 12, paddingHorizontal: 32,
    borderWidth: 1, marginTop: 4,
  },
  freePlayBtnText: {
    fontSize: 12, fontWeight: "700", letterSpacing: 2.5,
  },
});
