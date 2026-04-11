import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { clearSavedGame, recordFailure } from "../utils/storage";
import type { Difficulty } from "../utils/puzzles";

interface Props {
  visible:     boolean;
  time:        string;
  seconds:     number;
  mistakes:    number;
  maxMistakes: number;
  hintsUsed:   number;
  difficulty:  Difficulty;
  isDaily?:    boolean;
  onReplay:    () => void;
  onHome:      () => void;
}

export default function DefeatModal({
  visible, time, seconds, mistakes, maxMistakes, hintsUsed, difficulty, isDaily, onReplay, onHome,
}: Props) {
  const { t, colors } = useSettings();
  const [saved, setSaved] = React.useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale      = useRef(new Animated.Value(0.82)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const titleScale     = useRef(new Animated.Value(0.6)).current;
  const stat1Opacity   = useRef(new Animated.Value(0)).current;
  const stat2Opacity   = useRef(new Animated.Value(0)).current;
  const stat3Opacity   = useRef(new Animated.Value(0)).current;
  const btnsTranslate  = useRef(new Animated.Value(20)).current;
  const btnsOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !saved) {
      clearSavedGame();
      if (!isDaily) {
        recordFailure(difficulty, seconds, mistakes, hintsUsed);
      }
      setSaved(true);
    }
    if (!visible) { setSaved(false); return; }

    overlayOpacity.setValue(0);
    cardScale.setValue(0.82); cardOpacity.setValue(0);
    titleScale.setValue(0.6);
    stat1Opacity.setValue(0); stat2Opacity.setValue(0); stat3Opacity.setValue(0);
    btnsTranslate.setValue(20); btnsOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardScale,   { toValue: 1, tension: 90, friction: 11, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(titleScale,  { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
      ]),
      Animated.stagger(100, [
        Animated.timing(stat1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(stat2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(stat3Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnsOpacity,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(btnsTranslate, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: overlayOpacity }]}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: colors.bg, borderColor: colors.error, opacity: cardOpacity, transform: [{ scale: cardScale }] }
        ]}>

          <View style={[styles.innerBorder, { backgroundColor: colors.error }]} />

          <Animated.Text
            style={[styles.title, { color: colors.error, transform: [{ scale: titleScale }] }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {t("defeat.title")}
          </Animated.Text>

          <View style={styles.ornament}>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
            <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          </View>

          <View style={styles.statsRow}>
            <Animated.View style={[styles.stat, { opacity: stat1Opacity }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{time}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("victory.time")}</Text>
            </Animated.View>
            <View style={[styles.statSep, { backgroundColor: colors.borderThin }]} />
            <Animated.View style={[styles.stat, { opacity: stat2Opacity }]}>
              <Text style={[styles.statValue, { color: colors.error }]}>{mistakes}/{maxMistakes}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("victory.errors")}</Text>
            </Animated.View>
            <View style={[styles.statSep, { backgroundColor: colors.borderThin }]} />
            <Animated.View style={[styles.stat, { opacity: stat3Opacity }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{hintsUsed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {hintsUsed <= 1 ? t("daily.hint_used_label") : t("daily.hints_used_label")}
              </Text>
            </Animated.View>
          </View>

          <View style={styles.ornament}>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
            <Text style={[styles.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
            <View style={[styles.ornamentLine, { backgroundColor: colors.borderThin }]} />
          </View>

          <Animated.View style={[styles.btnRow, { opacity: btnsOpacity, transform: [{ translateY: btnsTranslate }] }]}>
            {isDaily ? (
              <TouchableOpacity onPress={onHome} style={[styles.btn, { flex: 1, backgroundColor: colors.bg, borderColor: colors.error, borderWidth: 1.5 }]} activeOpacity={0.7}>
                <Text style={[styles.btnSecondaryText, { color: colors.error }]}>{t("victory.home")}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={onHome} style={[styles.btn, { backgroundColor: colors.bg, borderColor: colors.borderBox, borderWidth: 1.5 }]} activeOpacity={0.7}>
                  <Text style={[styles.btnSecondaryText, { color: colors.textPrimary }]}>{t("victory.menu")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onReplay} style={[styles.btn, { backgroundColor: colors.bgCellSelected, borderColor: colors.borderBox, borderWidth: 1.5 }]} activeOpacity={0.7}>
                  <Text style={[styles.btnPrimaryText, { color: colors.textOnSelected }]}>{t("victory.replay")}</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          <View style={[styles.innerBorder, { backgroundColor: colors.error }]} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  card:        { width: "100%", maxWidth: 440, padding: 28, alignItems: "center", gap: 20, borderWidth: 2 },
  innerBorder: { width: "85%", height: 1 },
  title:       { fontSize: 26, fontWeight: "800", letterSpacing: 3, width: "100%", textAlign: "center" },
  ornament:    { width: "100%", flexDirection: "row", alignItems: "center", gap: 10 },
  ornamentLine:{ flex: 1, height: 0.5 },
  ornamentDot: { fontSize: 8 },
  statsRow:    { flexDirection: "row", alignItems: "stretch", gap: 16, width: "100%", justifyContent: "center" },
  stat:        { alignItems: "center", flex: 1, justifyContent: "flex-end" },
  statValue:   { fontSize: 22, fontWeight: "600" },
  statLabel:   { fontSize: 11, letterSpacing: 2, marginTop: 3 },
  statSep:     { width: 1, height: 36, alignSelf: "center" },
  btnRow:      { flexDirection: "row", gap: 12, width: "100%" },
  btn:         { flex: 1, paddingVertical: 14, alignItems: "center" },
  btnPrimaryText:   { fontSize: 13, fontWeight: "700", letterSpacing: 3 },
  btnSecondaryText: { fontSize: 13, fontWeight: "700", letterSpacing: 3 },
});
