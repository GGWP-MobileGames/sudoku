import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Animated, Platform, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../utils/theme";
import { loadTodayRecord } from "../utils/dailyChallenge";
import { useSettings } from "../context/SettingsContext";
import { useResponsive } from "../hooks/useResponsive";
import { Ionicons } from "@expo/vector-icons";
import { loadGame, clearSavedGame, clearOngoing, type SavedGame } from "../utils/storage";
import { getRandomPuzzle } from "../utils/puzzles";
import type { Difficulty } from "../utils/puzzles";
import type { Grid } from "../utils/sudoku";

const DIFFICULTIES: { key: Difficulty }[] = [
  { key: "easy"       },
  { key: "medium"     },
  { key: "hard"       },
  { key: "diabolical" },
];

interface Props {
  initialDifficulty: Difficulty;
  onStart:              (difficulty: Difficulty, prebuilt: { puzzle: Grid; solution: Grid }) => void;
  onResume:             (savedGame: SavedGame) => void;
  onStats:              () => void;
  onSettings:           () => void;
  onDaily:              () => void;
  onInfo:               () => void;
  onRules:              () => void;
  onDifficultyChange:   (difficulty: Difficulty) => void;
}

export default function HomeScreen({ initialDifficulty, onStart, onResume, onStats, onSettings, onDaily, onInfo, onRules, onDifficultyChange }: Props) {
  const { colors, t } = useSettings();
  const { isTablet } = useResponsive();
  const [selected,    setSelected]    = useState<Difficulty>(initialDifficulty);
  const [dailyDone,   setDailyDone]   = useState(false);
  const [savedGame,   setSavedGame]   = useState<SavedGame | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [showConfirm,        setShowConfirm]        = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    loadGame().then(g => { setSavedGame(g); setLoadingGame(false); });
    loadTodayRecord().then(r => setDailyDone(!!(r?.completed)));
  }, []);

  // ── Slide d'abandon ──────────────────────────────────────────────────────────
  const cardSlideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (savedGame) cardSlideX.setValue(0);
  }, [savedGame]);

  const doDiscard = () => {
    Animated.timing(cardSlideX, {
      toValue: -500,
      duration: 300,
      useNativeDriver: Platform.OS !== "web",
    }).start(async () => {
      await clearSavedGame();
      await clearOngoing();
      setSavedGame(null);
    });
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(true);
  };

  const doStart = () => {
    const entry = getRandomPuzzle(selected);
    onStart(selected, entry);
    // Nettoyage en arrière-plan, sans bloquer la navigation
    clearOngoing().catch(() => {});
  };

  const handleStart = () => {
    if (savedGame) {
      setShowConfirm(true);
    } else {
      doStart();
    }
  };

  const diffLabel = savedGame?.difficulty ? t(`home.difficulties.${savedGame.difficulty}`) : '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]} showsVerticalScrollIndicator={false}>

        {/* Titre + engrenage */}
        <View style={{ width: "100%", alignItems: "center" }}>
          <TouchableOpacity onPress={onInfo} style={styles.infoBtn} activeOpacity={0.7}>
            <Text style={[styles.infoBtnText, { color: colors.textSecondary }]}>GGWP</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRules} style={styles.rulesBtn} activeOpacity={0.7} accessibilityLabel={t("home.rules_label")}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onSettings} style={styles.gearBtn} activeOpacity={0.7}>
            <Ionicons name="settings-sharp" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={[styles.titleSub, { color: colors.textSecondary }]}>{t('home.title_sub')}</Text>
            <View style={styles.titleRow}>
              <View style={[styles.titleLine, { backgroundColor: colors.borderBox }]} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t("home.title")}</Text>
              <View style={[styles.titleLine, { backgroundColor: colors.borderBox }]} />
            </View>
          </View>
        </View>

        <View style={styles.ornament}>
          <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>

        {/* Partie en cours */}
        {!loadingGame && savedGame && (
          <>
            <View style={{ width: "100%", overflow: "hidden" }}>
            <Animated.View style={{ width: "100%", transform: [{ translateX: cardSlideX }] }}>
            <View style={[styles.resumeBlock, { borderColor: colors.borderBox }]}>
              <Text style={[styles.resumeTitle, { color: colors.textSecondary }]}>{t('home.resume_title')}</Text>
              <View style={styles.resumeInfo}>
                <Text style={[styles.resumeDetail, { color: colors.textPrimary }]}>{t('home.resume_level')} : {diffLabel}</Text>
                <Text style={[styles.resumeDetail, { color: colors.textPrimary }]}>
                  {t('home.resume_time')} : {Math.floor(savedGame.seconds/60).toString().padStart(2,'0')}:{(savedGame.seconds%60).toString().padStart(2,'0')}
                </Text>
                <Text style={[styles.resumeDetail, { color: colors.textPrimary }]}>{t('home.resume_errors')} : {savedGame.mistakes}</Text>
              </View>
              <View style={styles.resumeBtns}>
                <TouchableOpacity onPress={() => onResume(savedGame)} style={[styles.resumeBtn, { backgroundColor: colors.btnPrimary, borderColor: colors.btnPrimaryBorder }]} activeOpacity={0.75}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.resumeBtnPrimaryText, { color: colors.btnPrimaryText }]}>{t('home.resume_btn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDiscard} style={[styles.resumeBtn, { backgroundColor: colors.bg, borderColor: colors.borderThin }]} activeOpacity={0.75}>
                  <Text style={[styles.resumeBtnSecondaryText, { color: colors.textSecondary }]}>{t('home.resume_discard')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            </Animated.View>
            </View>
            <View style={styles.ornament}>
              <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
              <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
              <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
            </View>
          </>
        )}

        {/* Sélection difficulté */}
        <View style={styles.diffSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('home.new_game')}</Text>
          <View style={[styles.diffList, { borderColor: colors.borderBox }]}>
            {DIFFICULTIES.map(({ key }, i) => (
              <TouchableOpacity
                key={key}
                onPress={() => { setSelected(key); onDifficultyChange(key); }}
                style={[
                  styles.diffBtn,
                  { borderBottomColor: colors.borderThin, backgroundColor: colors.bg },
                  selected === key && { backgroundColor: colors.bgCard },
                  i === DIFFICULTIES.length - 1 && styles.diffBtnLast,
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.diffBtnLeft}>
                  <View style={[styles.radio, { borderColor: selected === key ? colors.borderBox : colors.borderThin }]}>
                    {selected === key && <View style={[styles.radioDot, { backgroundColor: colors.borderBox }]} />}
                  </View>
                  <View>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.diffLabel, { color: selected === key ? colors.textPrimary : colors.textSecondary, fontWeight: selected === key ? "700" : "400" }]}>
                      {t(`home.difficulties.${key}`)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bouton Commencer */}
        <TouchableOpacity onPress={handleStart} style={[styles.startBtn, { backgroundColor: colors.btnPrimary, borderColor: colors.btnPrimaryBorder }]} activeOpacity={0.75}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.startText, { color: colors.btnPrimaryText }]}>{t('home.start')}</Text>
        </TouchableOpacity>

        {/* Défi du jour */}
        <TouchableOpacity
          onPress={onDaily}
          style={[styles.dailyBtn, { borderColor: dailyDone ? colors.success : COLORS.gold }]}
          activeOpacity={0.75}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.dailyText, { color: dailyDone ? colors.success : COLORS.gold }]}>
            {dailyDone ? t("home.daily_done") : t("home.daily_todo")}
          </Text>
        </TouchableOpacity>

        <View style={styles.ornament}>
          <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>

        <TouchableOpacity onPress={onStats} activeOpacity={0.6}>
          <View style={styles.statsLinkInner}>
            <View style={styles.listIcon}>
              <View style={[styles.listLine, { width: 14, backgroundColor: colors.textSecondary }]} />
              <View style={[styles.listLine, { width: 10, backgroundColor: colors.textSecondary }]} />
              <View style={[styles.listLine, { width: 12, backgroundColor: colors.textSecondary }]} />
            </View>
            <Text style={[styles.statsLink, { color: colors.textSecondary }]}>{t('home.stats_link')}</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* Modale d'abandon de partie */}
      <Modal visible={showDiscardConfirm} transparent animationType="fade">
        <View style={[confirmStyles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[confirmStyles.card, { backgroundColor: colors.bg, borderColor: colors.borderBox }]}>
            <Text style={[confirmStyles.title, { color: colors.textPrimary }]}>{t("home.discard_title")}</Text>
            <Text style={[confirmStyles.message, { color: colors.textSecondary }]}>{t("home.discard_message")}</Text>
            <View style={confirmStyles.btnRow}>
              <TouchableOpacity
                onPress={() => setShowDiscardConfirm(false)}
                style={[confirmStyles.btn, { borderColor: colors.borderThin }]}
                activeOpacity={0.7}
              >
                <Text style={[confirmStyles.btnText, { color: colors.textSecondary }]}>{t("home.discard_cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowDiscardConfirm(false); doDiscard(); }}
                style={[confirmStyles.btn, { backgroundColor: colors.bgCellSelected, borderColor: colors.borderBox }]}
                activeOpacity={0.7}
              >
                <Text style={[confirmStyles.btnText, { color: colors.textOnSelected }]}>{t("home.discard_ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale de confirmation — remplace Alert.alert (non supporté sur web) */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={[confirmStyles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[confirmStyles.card, { backgroundColor: colors.bg, borderColor: colors.borderBox }]}>
            <Text style={[confirmStyles.title, { color: colors.textPrimary }]}>{t("home.confirm_title")}</Text>
            <Text style={[confirmStyles.message, { color: colors.textSecondary }]}>{t("home.confirm_message")}</Text>
            <View style={confirmStyles.btnRow}>
              <TouchableOpacity
                onPress={() => setShowConfirm(false)}
                style={[confirmStyles.btn, { borderColor: colors.borderThin }]}
                activeOpacity={0.7}
              >
                <Text style={[confirmStyles.btnText, { color: colors.textSecondary }]}>{t("home.confirm_cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowConfirm(false); doStart(); }}
                style={[confirmStyles.btn, { backgroundColor: colors.bgCellSelected, borderColor: colors.borderBox }]}
                activeOpacity={0.7}
              >
                <Text style={[confirmStyles.btnText, { color: colors.textOnSelected }]}>{t("home.confirm_ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  card:    { width: "100%", maxWidth: 400, padding: 24, borderWidth: 1, gap: 16 },
  title:   { fontSize: 16, fontWeight: "700", letterSpacing: 2, textAlign: "center" },
  message: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  btnRow:  { flexDirection: "row", gap: 10 },
  btn:     { flex: 1, paddingVertical: 14, alignItems: "center", borderWidth: 1.5 },
  btnText: { fontSize: 13, fontWeight: "700", letterSpacing: 2 },
});

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 20, gap: 18 },
  scrollTablet: { maxWidth: 520, alignSelf: "center", width: "100%" },

  gearBtn:  { position: "absolute", top: 0, right: 0, padding: 8, zIndex: 1 },
  rulesBtn: { position: "absolute", top: 0, right: 40, padding: 8, zIndex: 1 },
  infoBtn:     { position: "absolute", top: 0, left: 0, padding: 8, zIndex: 1 },
  infoBtnText: { fontSize: 14, fontFamily: "Cinzel_700Bold", letterSpacing: 1.5 },

  titleBlock: { width: "100%", alignItems: "center", gap: 2 },
  titleSub:   { fontSize: 12, letterSpacing: 6, fontWeight: "500" },
  titleRow:   { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  titleLine:  { flex: 1, height: 2 },
  title:      { fontSize: 36, fontWeight: "800", letterSpacing: 10 },

  ornament:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },

  resumeBlock:  { width: "100%", borderWidth: 1, padding: 16, gap: 12 },
  resumeTitle:  { fontSize: 12, fontWeight: "700", letterSpacing: 2.5, textAlign: "center" },
  resumeInfo:   { flexDirection: "row", justifyContent: "space-between" },
  resumeDetail: { fontSize: 12, fontWeight: "500" },
  resumeBtns:   { flexDirection: "row", gap: 8 },
  resumeBtn:    { flex: 1, paddingVertical: 14, alignItems: "center", borderWidth: 1.5 },
  resumeBtnPrimaryText:   { fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  resumeBtnSecondaryText: { fontSize: 12, fontWeight: "500" },

  diffSection:  { width: "100%", gap: 10 },
  sectionLabel: { fontSize: 12, letterSpacing: 2.5, fontWeight: "600", textAlign: "center" },
  diffList:     { width: "100%", borderWidth: 1 },
  diffBtn:      { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  diffBtnLast:  { borderBottomWidth: 0 },
  diffBtnLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  radio:        { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot:     { width: 7, height: 7, borderRadius: 4 },
  diffLabel:    { fontSize: 15 },
  dailyBtn:  { width: "100%", paddingVertical: 14, alignItems: "center", borderWidth: 1.5 },
  dailyText: { fontSize: 13, fontWeight: "700", letterSpacing: 3 },
  startBtn:  { width: "100%", paddingVertical: 16, alignItems: "center", borderWidth: 2 },
  startText: { fontSize: 13, fontWeight: "700", letterSpacing: 3 },

  statsLink:      { fontSize: 13, letterSpacing: 0.5 },
  statsLinkInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  listIcon:       { gap: 3, justifyContent: "center" },
  listLine:       { height: 1.5, borderRadius: 1 },
});
