import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { COLORS, type ColorTheme } from "../utils/theme";
import { useResponsive } from "../hooks/useResponsive";
import {
  getTodayKey, formatDayLabel, loadDailyRecords, loadTodayRecord,
  type DailyRecord,
} from "../utils/dailyChallenge";
import { formatTime } from "../utils/storage";

interface Props {
  onStart:                () => void;
  onResume:               () => void;
  onBack:                 () => void;
  hasSavedGame?:          boolean;     // partie du jour en cours
  onStartPast:            (dateKey: string) => void;
  onResumePast:           (dateKey: string) => void;
  onAbandonAndStartPast:  (dateKey: string) => void;
  savedPastDateKey?:      string;      // rattrapage en cours (dateKey)
}

function MonthCalendar({ records, year, month, colors, onDayPress, t, savedPastDateKey, today, thirtyDaysAgo }: {
  records: DailyRecord[]; year: number; month: number; colors: ColorTheme;
  onDayPress: (key: string, rec: DailyRecord | null) => void;
  t: (key: string) => string;
  savedPastDateKey?: string;
  today: string;
  thirtyDaysAgo: string;
}) {
  const firstDay = new Date(year, month, 1);
  // Décalage lundi=0
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={cal.grid}>
      {[0,1,2,3,4,5,6].map(i => (
        <Text key={`h-${i}`} style={[cal.dayLabel, { color: colors.textSecondary }]}>{t(`daily.day_${i}`)}</Text>
      ))}
      {cells.map((d, i) => {
        if (!d) return <View key={`e-${i}`} style={cal.empty} />;
        const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const rec = records.find(r => r.dateKey === key);
        const isToday    = key === today;
        const isFuture   = key > today;
        const isPast     = key < today;
        const isCatchupActive = savedPastDateKey === key; // rattrapage en cours pour ce jour
        const isInWindow = isPast && key >= thirtyDaysAgo; // dans la fenêtre de 30 jours

        const done        = rec?.completed && !rec?.isCatchup;
        const doneCatchup = rec?.completed && rec?.isCatchup;
        const failed      = rec && !rec.completed && rec.failed;
        const attempted   = rec && !rec.completed && !rec.failed && !rec.isCatchup;

        // Tous les jours passés sont cliquables (hors futur) : si hors fenêtre, la modal
        // affiche le message out_of_window plutôt qu'un dead-end.
        const isTappable = !isFuture;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => isTappable && onDayPress(key, rec ?? null)}
            activeOpacity={isTappable ? 0.7 : 1}
            style={[
              cal.cell,
              done         && { backgroundColor: COLORS.gold },
              doneCatchup  && { backgroundColor: colors.hintHighlight },
              failed       && { backgroundColor: '#E05040' },
              attempted    && { backgroundColor: colors.borderThin },
              isToday      && { borderWidth: 1.5, borderColor: colors.borderBox },
              isCatchupActive && { borderWidth: 1.5, borderColor: colors.hintHighlight },
            ]}
          >
            <Text style={[
              cal.cellText,
              { color: isFuture ? colors.borderThin : (done || doneCatchup || failed) ? "#FFFFFF" : colors.textPrimary },
              done        && { color: "#1A1A1A" },
              doneCatchup && { color: colors.hintColor },
              isToday     && { fontWeight: "700" },
              !isTappable && !isFuture && { color: colors.borderThin }, // hors fenêtre, pas jouable
            ]}>{d}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const cal = StyleSheet.create({
  grid:      { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  dayLabel:  { width: "14.28%", textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0, paddingVertical: 4 },
  cell:      { width: "14.28%", height: 36, alignItems: "center", justifyContent: "center" },
  empty:     { width: "14.28%", height: 36 },
  cellText:  { fontSize: 12 },
});

export default function DailyChallengeScreen({ onStart, onResume, onBack, hasSavedGame, onStartPast, onResumePast, onAbandonAndStartPast, savedPastDateKey }: Props) {
  const { colors, settings, t } = useSettings();
  const { isTablet } = useResponsive();
  const [todayRecord, setTodayRecord] = useState<DailyRecord | null>(null);
  const [allRecords,  setAllRecords]  = useState<DailyRecord[]>([]);
  // Recalculé au passage de minuit / retour en foreground pour que la date "aujourd'hui",
  // la fenêtre de 30 jours et la streak restent synchronisées sans reload manuel.
  const [todayTick, setTodayTick] = useState(() => getTodayKey());
  const today = todayTick;
  const formatDayI18n = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const monthKey = "months." + (m - 1);
    return d + " " + t(monthKey) + " " + y;
  };
  const todayLabel = formatDayI18n(today);
  const [calYear,  setCalYear]  = React.useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = React.useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = React.useState<{ key: string; rec: DailyRecord | null } | null>(null);

  // Streak : compte les jours consécutifs complétés (hors rattrapage) jusqu'à aujourd'hui.
  // Dépend de `today` pour se recalculer au passage de minuit.
  const streak = React.useMemo(() => {
    const isCompleted = (d: Date) => {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return !!allRecords.find(r => r.dateKey === key && r.completed && !r.isCatchup);
    };
    const [ty, tm, td] = today.split("-").map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    const start = isCompleted(todayDate) ? todayDate : new Date(ty, tm - 1, td - 1);
    let count = 0;
    const d = new Date(start);
    while (isCompleted(d)) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [allRecords, today]);

  useEffect(() => {
    loadTodayRecord().then(setTodayRecord);
    loadDailyRecords().then(setAllRecords);
  }, []);

  // Re-sync de la date courante : minuterie + retour en foreground.
  useEffect(() => {
    const refresh = () => {
      const k = getTodayKey();
      setTodayTick(prev => (prev !== k ? k : prev));
    };
    const id = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(id); sub.remove(); };
  }, []);

  const alreadyPlayed = !!todayRecord || !!hasSavedGame;
  const completed     = todayRecord?.completed;
  const failed        = !!(todayRecord?.failed);

  // Détermine si on peut lancer un rattrapage (aucun défi actif en cours)
  const hasActiveGame = hasSavedGame || !!savedPastDateKey;

  // Dépend de `today` pour glisser au passage de minuit.
  const thirtyDaysAgo = React.useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 30);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
  }, [today]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Header fixe */}
      <View style={[s.header, { backgroundColor: colors.bg }]}>
        <View style={s.titleBlock}>
          <Text style={[s.titleSub, { color: colors.textSecondary }]}>{t('daily.title_sub')}</Text>
          <View style={s.titleRow}>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
            <Text style={[s.title, { color: colors.textPrimary }]}>{t('daily.title')}</Text>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
          <Text style={[s.backText, { color: colors.textPrimary }]}>{t('daily.back')}</Text>
        </TouchableOpacity>
        <View style={s.ornament}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, isTablet && { maxWidth: 520, alignSelf: "center" as const, width: "100%" as const }]} showsVerticalScrollIndicator={false}>

        {/* Date du jour + statut */}
        <View style={[s.dateCard, { borderColor: completed ? COLORS.gold : failed ? '#E05040' : colors.borderBox, backgroundColor: (completed || failed) ? colors.bgCard : colors.bg }]}>
          <Text style={[s.dateLabel, { color: colors.textSecondary }]}>{t('daily.today')}</Text>
          <Text style={[s.dateValue, { color: colors.textPrimary }]}>{todayLabel}</Text>
          <Text style={[s.dateLevel, { color: completed ? COLORS.gold : failed ? '#E05040' : alreadyPlayed ? colors.textSecondary : COLORS.gold }]}>
            {completed
              ? t('daily.success_title')
              : failed
              ? t('daily.failed_title')
              : alreadyPlayed
              ? t('daily.status_ongoing')
              : t('daily.status_new')}
          </Text>
          {(completed || failed) && todayRecord && (
            <View style={s.resultStats}>
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: colors.textPrimary }]}>{formatTime(todayRecord.seconds)}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>{t('daily.time_label')}</Text>
              </View>
              <View style={[s.statSep, { backgroundColor: colors.borderThin }]} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: colors.textPrimary }]}>{todayRecord.mistakes}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>{todayRecord.mistakes <= 1 ? t('daily.error_label') : t('daily.errors_label')}</Text>
              </View>
              <View style={[s.statSep, { backgroundColor: colors.borderThin }]} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: colors.textPrimary }]}>{todayRecord.hints}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                  {todayRecord.hints <= 1 ? t('daily.hint_used_label') : t('daily.hints_used_label')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Streak */}
        {streak > 0 && (
          <View style={s.streakRow}>
            <Text style={[s.streakText, { color: COLORS.gold }]}>
            {streak === 1
              ? `🔥 1 ${t('daily.streak')}`
              : `🔥 ${streak} ${t('daily.streak_plural')}`}
          </Text>
          </View>
        )}

        {/* Calendrier mensuel */}
        <View style={s.calSection}>
          <View style={s.calNav}>
            <TouchableOpacity onPress={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
              else setCalMonth(m => m - 1);
            }} style={s.calArrow} activeOpacity={0.7}>
              <Text style={[s.calArrowText, { color: colors.textPrimary }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.calMonthLabel, { color: colors.textPrimary }]}>
              {t("months." + calMonth)} {calYear}
            </Text>
            <TouchableOpacity onPress={() => {
              const now = new Date();
              if (calYear === now.getFullYear() && calMonth === now.getMonth()) return;
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
              else setCalMonth(m => m + 1);
            }} style={s.calArrow} activeOpacity={0.7}>
              <Text style={[s.calArrowText, { color: colors.textPrimary }]}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.calLegend}>
            <View style={s.calLegendItem}>
              <View style={[s.calLegendDot, { backgroundColor: COLORS.gold }]} />
              <Text style={[s.calLegendText, { color: colors.textSecondary }]}>{t('daily.legend_done')}</Text>
            </View>
            <View style={s.calLegendItem}>
              <View style={[s.calLegendDot, { backgroundColor: '#E05040' }]} />
              <Text style={[s.calLegendText, { color: colors.textSecondary }]}>{t('daily.legend_failed')}</Text>
            </View>
            <View style={s.calLegendItem}>
              <View style={[s.calLegendDot, { backgroundColor: colors.hintHighlight }]} />
              <Text style={[s.calLegendText, { color: colors.textSecondary }]}>{t('daily.legend_catchup')}</Text>
            </View>
            <View style={s.calLegendItem}>
              <View style={[s.calLegendDot, { backgroundColor: colors.borderThin }]} />
              <Text style={[s.calLegendText, { color: colors.textSecondary }]}>{t('daily.legend_tried')}</Text>
            </View>
          </View>
          <MonthCalendar
            records={allRecords}
            year={calYear}
            month={calMonth}
            colors={colors}
            onDayPress={(key, rec) => setSelectedDay({ key, rec })}
            t={t}
            savedPastDateKey={savedPastDateKey}
            today={today}
            thirtyDaysAgo={thirtyDaysAgo}
          />
        </View>

        {/* Bouton jouer aujourd'hui — après le calendrier */}
        {!completed && !failed && (
          <TouchableOpacity
            onPress={alreadyPlayed ? onResume : onStart}
            style={[s.playBtn, { backgroundColor: colors.btnPrimary, borderColor: colors.btnPrimaryBorder }]}
            activeOpacity={0.75}
          >
            <Text style={[s.playText, { color: colors.btnPrimaryText }]}>
              {alreadyPlayed ? t("daily.resume") : t("daily.play")}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Modal détail d'un jour */}
      {selectedDay && (() => {
        const { key, rec } = selectedDay;
        const isPastKey    = key < today;
        const isInWindow   = isPastKey && key >= thirtyDaysAgo;
        const isCatchupInProgress = savedPastDateKey === key;

        // États jouables pour un jour passé
        const canPlayPast   = isInWindow && !rec?.completed && !rec?.failed && !hasActiveGame && !isCatchupInProgress;
        const canResumePast = isCatchupInProgress;

        return (
          <TouchableOpacity
            style={[modal.backdrop]}
            activeOpacity={1}
            onPress={() => setSelectedDay(null)}
          >
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}
              style={[modal.card, { backgroundColor: colors.bg, borderColor: colors.borderBox }]}
            >
              <Text style={[modal.date, { color: colors.textSecondary }]}>
                {formatDayI18n(key).toUpperCase()}
              </Text>
              <View style={[modal.divider, { backgroundColor: colors.borderThin }]} />
              <View style={modal.rows}>
                <View style={modal.row}>
                  <Text style={[modal.label, { color: colors.textSecondary }]}>{t('daily.result_label')}</Text>
                  <Text style={[modal.value, {
                    color: !rec ? (isCatchupInProgress ? colors.hintColor : colors.textSecondary)
                      : rec.completed && rec.isCatchup ? colors.hintColor
                      : rec.completed ? COLORS.gold
                      : rec.failed    ? '#E05040'
                      : colors.textSecondary
                  }]}>
                    {!rec
                      ? (isCatchupInProgress ? t("daily.status_ongoing") : t("daily.status_not_played"))
                      : rec.completed && rec.isCatchup ? t("daily.result_catchup")
                      : rec.completed ? t("daily.done")
                      : rec.failed    ? t("daily.failed_result")
                      : t("daily.tried")}
                  </Text>
                </View>
                {rec && (
                  <>
                    <View style={modal.row}>
                      <Text style={[modal.label, { color: colors.textSecondary }]}>{t('daily.time_label')}</Text>
                      <Text style={[modal.value, { color: colors.textPrimary }]}>
                        {formatTime(rec.seconds)}
                      </Text>
                    </View>
                    <View style={modal.row}>
                      <Text style={[modal.label, { color: colors.textSecondary }]}>{t('daily.errors_label')}</Text>
                      <Text style={[modal.value, { color: colors.textPrimary }]}>{rec.mistakes}</Text>
                    </View>
                    <View style={modal.row}>
                      <Text style={[modal.label, { color: colors.textSecondary }]}>{t('daily.hints_used_label')}</Text>
                      <Text style={[modal.value, { color: colors.textPrimary }]}>{rec.hints}</Text>
                    </View>
                  </>
                )}
                {/* Message "hors fenêtre de rattrapage" : jour > 30 jours, non joué ou tenté sans échec */}
                {isPastKey && !isInWindow && !rec?.completed && !rec?.failed && !isCatchupInProgress && (
                  <Text style={[modal.blockedMsg, { color: colors.textSecondary, marginTop: 4 }]}>
                    {t('daily.out_of_window')}
                  </Text>
                )}
                {/* Message + bouton abandon si un autre défi est en cours */}
                {isInWindow && !rec?.completed && !rec?.failed && hasActiveGame && !isCatchupInProgress && (
                  <View style={{ gap: 12, marginTop: 4 }}>
                    <Text style={[modal.blockedMsg, { color: colors.textSecondary }]}>
                      {t('daily.catch_up_blocked')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDay(null);
                        onAbandonAndStartPast(key);
                      }}
                      style={[modal.playBtn, { backgroundColor: "#E05040", borderColor: "#E05040" }]}
                      activeOpacity={0.75}
                    >
                      <Text style={[modal.playTxt, { color: "#FFFFFF" }]}>
                        {t("daily.catch_up_abandon_btn")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Bouton rattrapage */}
              {(canPlayPast || canResumePast) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDay(null);
                    if (canResumePast) onResumePast(key);
                    else onStartPast(key);
                  }}
                  style={[modal.playBtn, { backgroundColor: colors.hintColor, borderColor: colors.hintColor }]}
                  activeOpacity={0.75}
                >
                  <Text style={[modal.playTxt, { color: "#FFFFFF" }]}>
                    {canResumePast ? t("daily.resume") : t("daily.play_past")}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={[modal.closeBtn, { borderColor: colors.borderBox }]}
                activeOpacity={0.7}
              >
                <Text style={[modal.closeTxt, { color: colors.textPrimary }]}>{t('daily.close')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })()}
    </SafeAreaView>
  );
}

const modal = StyleSheet.create({
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center",
  },
  card: {
    width: "80%", borderWidth: 1,
    padding: 24, gap: 16,
  },
  date:    { fontSize: 12, fontWeight: "700", letterSpacing: 2, textAlign: "center" },
  divider: { height: 0.5, width: "100%" },
  rows:    { gap: 10 },
  row:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:   { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  value:   { fontSize: 16, fontWeight: "300" },
  blockedMsg: { fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 4 },
  playBtn: { paddingVertical: 14, alignItems: "center", borderWidth: 2, marginTop: 4 },
  playTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 3 },
  closeBtn:{ borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  closeTxt:{ fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
});

const s = StyleSheet.create({
  safe:   { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, gap: 12, alignItems: "center", maxWidth: 520, alignSelf: "center", width: "100%" },
  scroll: { alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 20 },

  titleBlock: { width: "100%", alignItems: "center", gap: 2 },
  titleSub:   { fontSize: 12, letterSpacing: 6, fontWeight: "500" },
  titleRow:   { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  titleLine:  { flex: 1, height: 2 },
  title:      { fontSize: 24, fontWeight: "800", letterSpacing: 4 },
  backBtn:    { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  backText:   { fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  ornament:   { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },

  dateCard:  { width: "100%", borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  dateLabel: { fontSize: 12, letterSpacing: 3, fontWeight: "700" },
  dateValue: { fontSize: 22, fontWeight: "300", letterSpacing: 1 },
  dateLevel: { fontSize: 12, fontWeight: "700", letterSpacing: 3, marginTop: 4 },

  streakRow: { alignItems: "center" },
  streakText: { fontSize: 16, fontWeight: "600" },

  resultCard:  { width: "100%", borderWidth: 1.5, padding: 20, gap: 16, alignItems: "center" },
  resultTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 3 },
  resultStats: { flexDirection: "row", alignItems: "center", gap: 20 },
  statItem:    { alignItems: "center", gap: 4 },
  statValue:   { fontSize: 22, fontWeight: "300" },
  statLabel:   { fontSize: 12, letterSpacing: 2, fontWeight: "700" },
  statSep:     { width: 1, height: 32 },

  playBtn:  { width: "100%", paddingVertical: 18, alignItems: "center", borderWidth: 2 },
  playText: { fontSize: 14, fontWeight: "700", letterSpacing: 4 },

  calSection: { width: "100%", gap: 12 },
  calNav:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  calMonthLabel: { fontSize: 14, fontWeight: "600", letterSpacing: 1 },
  calArrow:   { padding: 8 },
  calArrowText: { fontSize: 22, fontWeight: "300", lineHeight: 22 },
  calLegend:     { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", columnGap: 12, rowGap: 4 },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  calLegendDot:  { width: 10, height: 10, borderRadius: 5 },
  calLegendText: { fontSize: 12 },
});
