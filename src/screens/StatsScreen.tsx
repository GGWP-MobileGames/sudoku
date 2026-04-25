import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadStats, loadHistory, formatTime, formatDate, calcAdjustedTime, type AllStats, type HistoryEntry } from "../utils/storage";
import { useSettings } from "../context/SettingsContext";
import { type ColorTheme } from "../utils/theme";
import { useResponsive } from "../hooks/useResponsive";

interface Props { onBack: () => void; }

const LEVELS = [
  { key: "easy"       as const },
  { key: "medium"     as const },
  { key: "hard"       as const },
  { key: "diabolical" as const },
];

function getResultLabels(t: (k: string) => string, colors: ColorTheme): Record<string, { label: string; color: string }> {
  return {
    win:         { label: t("stats.result_win"),    color: colors.success },
    "daily-win": { label: t("stats.result_daily"),  color: colors.gold },
    failed:      { label: t("stats.result_failed"), color: colors.error },
    ongoing:     { label: t("stats.result_ongoing"),color: colors.gold },
  };
}

function TableTitle({ label, colors }: { label: string; colors: ColorTheme }) {
  return (
    <View style={tbl.titleRow}>
      <Text style={[tbl.titleText, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}

export default function StatsScreen({ onBack }: Props) {
  const { colors, settings, t } = useSettings();
  const { isTablet } = useResponsive();
  const [stats,   setStats]   = useState<AllStats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadStats().then(setStats);
    loadHistory().then(setHistory);
  }, []);

  const isDark = colors.isDark;
  const RESULT_LABELS = getResultLabels(t, colors);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Header fixe ── */}
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <View style={styles.titleBlock}>
          <Text style={[styles.titleSub, { color: colors.textSecondary }]}>{t('stats.title_sub')}</Text>
          <View style={styles.titleRow}>
            <View style={[styles.titleLine, { backgroundColor: colors.borderBox }]} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('stats.title')}</Text>
            <View style={[styles.titleLine, { backgroundColor: colors.borderBox }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.textPrimary }]}>{t('stats.back')}</Text>
        </TouchableOpacity>
        <View style={styles.ornament}>
          <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, isTablet && { maxWidth: 700, alignSelf: "center" as const, width: "100%" as const }]} showsVerticalScrollIndicator={false}>

        {!stats ? <ActivityIndicator color={colors.textSecondary} style={{ marginVertical: 32 }} /> : (<>

          {/* ── 1. Statistiques globales ── */}
          <TableTitle label={t("stats.global_title")} colors={colors} />
          <View style={[tbl.table, { borderColor: colors.borderBox }]}>
            <View style={[tbl.row, { backgroundColor: colors.bgCard }]}>
              <Text style={[tbl.cell, tbl.wide, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_level')}</Text>
              <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]} numberOfLines={2} adjustsFontSizeToFit>{t('stats.col_games')}</Text>
              <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]} numberOfLines={2} adjustsFontSizeToFit>{t('stats.col_avg_time')}</Text>
              <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]} numberOfLines={2} adjustsFontSizeToFit>{t("stats.col_avg_errors")}</Text>
            </View>
            {LEVELS.map(({ key }, i) => {
              const s = stats[key] ?? { gamesPlayed: 0, totalSeconds: 0, totalErrors: 0, bestTime: null, bestTimeErrors: 0 };
              const avgTime   = s.gamesPlayed > 0 ? formatTime(Math.round(s.totalSeconds / s.gamesPlayed)) : "—";
              const avgErrors = s.gamesPlayed > 0 ? (s.totalErrors / s.gamesPlayed).toFixed(1) : "—";
              return (
                <View key={key} style={[tbl.row, i < LEVELS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.borderThin }]}>
                  <Text style={[tbl.cell, tbl.wide, tbl.bold, { color: colors.textPrimary }]}>{t(`home.difficulties.${key}`)}</Text>
                  <Text style={[tbl.cell, { color: colors.textPrimary }]}>{s.gamesPlayed > 0 ? s.gamesPlayed : "—"}</Text>
                  <Text style={[tbl.cell, { color: colors.textPrimary }]}>{avgTime}</Text>
                  <Text style={[tbl.cell, { color: colors.textPrimary }]}>{avgErrors}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.ornament}>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
            <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          </View>

          {/* ── 2. Meilleures parties ── */}
          <TableTitle label={t("stats.best_title")} colors={colors} />
          <View style={[tbl.table, { borderColor: colors.borderBox }]}>
            <View style={[tbl.row, { backgroundColor: colors.bgCard }]}>
              <Text style={[tbl.cell, tbl.wide, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_level')}</Text>
              <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_score')}</Text>
              <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_errors')}</Text>
              <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_hints_used')}</Text>
            </View>
            {LEVELS.map(({ key }, i) => {
              const s = stats[key] ?? { gamesPlayed: 0, totalSeconds: 0, totalErrors: 0, bestTime: null, bestTimeErrors: 0, bestTimeHints: 0 };
              const adjTime = s.bestTime !== null
                ? calcAdjustedTime(s.bestTime, s.bestTimeHints ?? 0, s.bestTimeErrors)
                : null;
              return (
                <View key={key} style={[tbl.row, i < LEVELS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.borderThin }]}>
                  <Text style={[tbl.cell, tbl.wide, tbl.bold, { color: colors.textPrimary }]}>{t(`home.difficulties.${key}`)}</Text>
                  <Text style={[tbl.cell, { color: adjTime !== null ? colors.gold : colors.textPrimary, fontWeight: adjTime !== null ? "700" : "400" }]}>
                    {adjTime !== null ? formatTime(Math.round(adjTime)) : "—"}
                  </Text>
                  <Text style={[tbl.cell, { color: colors.textPrimary }]}>
                    {s.bestTime !== null ? s.bestTimeErrors : "—"}
                  </Text>
                  <Text style={[tbl.cell, { color: colors.textPrimary }]}>
                    {s.bestTime !== null ? (s.bestTimeHints ?? 0) : "—"}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Explication de la formule de score */}
          <Text style={[styles.scoreNote, { color: colors.textSecondary, borderColor: colors.borderThin }]}>
            {t('stats.score_note')}
          </Text>

          <View style={styles.ornament}>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
            <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          </View>

          {/* ── 3. Historique ── */}
          <TableTitle label={t("stats.history_title")} colors={colors} />
          <View style={[tbl.table, { borderColor: colors.borderBox }]}>
            {history.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>{t('stats.empty')}</Text>
            ) : (<>
              <View style={[tbl.row, { backgroundColor: colors.bgCard }]}>
                <Text style={[tbl.cell, tbl.wide, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_date')}</Text>
                <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_level')}</Text>
                <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_time')}</Text>
                <Text style={[tbl.cell, tbl.hTxt, { color: colors.textSecondary }]}>{t('stats.col_errors')}</Text>
              </View>
              {history.map((h, i) => {
                const isDailyWin    = h.result === "daily-win";
                const isDailyFailed = h.result === "daily-failed";
                const isFailed      = h.result === "failed" || isDailyFailed;
                const isWin         = h.result === "win";
                const levelLabel = (isDailyWin || isDailyFailed)
                  ? t("stats.result_daily_short")
                  : t(`home.difficulties.${h.difficulty}`);
                const levelColor = isDailyWin   ? colors.gold
                  : isFailed     ? colors.error
                  : isWin        ? colors.success
                  : colors.textPrimary;
                return (
                  <View key={i} style={[tbl.row, i < history.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.borderThin }]}>
                    <Text style={[tbl.cell, tbl.wide, { fontSize: 12, color: colors.textPrimary }]}>{formatDate(h.date)}</Text>
                    <Text style={[tbl.cell, { fontSize: 12, color: levelColor, fontWeight: (isDailyWin || isDailyFailed) ? "700" : isFailed || isWin ? "600" : "400" }]}>{levelLabel}</Text>
                    <Text style={[tbl.cell, { fontSize: 12, color: colors.textPrimary }]}>{formatTime(h.seconds)}</Text>
                    <Text style={[tbl.cell, { fontSize: 12, color: isFailed ? colors.error : colors.textPrimary }]}>{h.mistakes}</Text>
                  </View>
                );
              })}
            </>)}
          </View>

        </>)}

      </ScrollView>
    </SafeAreaView>
  );
}

// Tous les StyleSheet utilisent COLORS (statique) — jamais colors (runtime)
const tbl = StyleSheet.create({
  table:    { width: "100%" },
  titleRow: { width: "100%", paddingVertical: 10, alignItems: "center" },
  titleText:{ fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  row:      { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12 },
  cell:     { flex: 1, textAlign: "center", fontSize: 12 },
  wide:     { flex: 1.6, textAlign: "left" },
  hTxt:     { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  bold:     { fontWeight: "600" },
  cellView: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
});

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, gap: 12, alignItems: "center", maxWidth: 700, alignSelf: "center", width: "100%" },
  scroll: { alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 16 },
  backBtn:  { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  backText: { fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  titleBlock: { width: "100%", alignItems: "center", gap: 2 },
  titleSub:   { fontSize: 12, letterSpacing: 6, fontWeight: "500" },
  titleRow:   { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  titleLine:  { flex: 1, height: 2 },
  title:      { fontSize: 26, fontWeight: "800", letterSpacing: 6 },
  ornament:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },
  empty:     { padding: 20, textAlign: "center", fontSize: 13, fontStyle: "italic" },
  scoreNote: { width: "100%", fontSize: 11, lineHeight: 17, textAlign: "center", fontStyle: "italic", paddingHorizontal: 4, borderTopWidth: 0.5, paddingTop: 10 },
});
