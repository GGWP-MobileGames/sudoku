import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { useResponsive } from "../hooks/useResponsive";
import RuleDiagram, { type RuleHighlight } from "../components/RuleDiagram";

interface Props { onBack: () => void; }

type Section = {
  key:        string;
  titleKey:   string;
  bodyKey:    string;
  diagram?:   RuleHighlight;
};

const SECTIONS: Section[] = [
  { key: "1", titleKey: "rules.section_1_title", bodyKey: "rules.section_1_body" },
  { key: "2", titleKey: "rules.section_2_title", bodyKey: "rules.section_2_body", diagram: "row"   },
  { key: "3", titleKey: "rules.section_3_title", bodyKey: "rules.section_3_body", diagram: "col"   },
  { key: "4", titleKey: "rules.section_4_title", bodyKey: "rules.section_4_body", diagram: "block" },
  { key: "5", titleKey: "rules.section_5_title", bodyKey: "rules.section_5_body" },
];

export default function RulesScreen({ onBack }: Props) {
  const { colors, t } = useSettings();
  const { isTablet } = useResponsive();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Header fixe ── */}
      <View style={[s.header, { backgroundColor: colors.bg }]}>
        <View style={s.titleBlock}>
          <Text style={[s.titleSub, { color: colors.textSecondary }]}>{t("rules.subtitle")}</Text>
          <View style={s.titleRow}>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
            <Text style={[s.title, { color: colors.textPrimary }]}>{t("rules.title")}</Text>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
          <Text style={[s.backText, { color: colors.textPrimary }]}>{t("rules.back")}</Text>
        </TouchableOpacity>
        <View style={s.ornament}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>
      </View>

      {/* ── Contenu ── */}
      <ScrollView
        contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((sec, idx) => (
          <View key={sec.key} style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t(sec.titleKey)}</Text>
            <Text style={[s.sectionBody,  { color: colors.textPrimary }]}>{t(sec.bodyKey)}</Text>
            {sec.diagram && (
              <View style={s.diagramWrap}>
                <RuleDiagram highlight={sec.diagram} />
              </View>
            )}
            {idx < SECTIONS.length - 1 && (
              <View style={[s.divider, { backgroundColor: colors.borderThin }]} />
            )}
          </View>
        ))}

        {/* Ornement de fermeture */}
        <View style={s.ornamentClose}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },

  // Header (aligné StatsScreen / SettingsScreen)
  header:       { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, gap: 12, alignItems: "center", maxWidth: 700, alignSelf: "center", width: "100%" },
  backBtn:      { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  backText:     { fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  titleBlock:   { width: "100%", alignItems: "center", gap: 2 },
  titleSub:     { fontSize: 12, letterSpacing: 6, fontWeight: "500" },
  titleRow:     { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  titleLine:    { flex: 1, height: 2 },
  title:        { fontSize: 26, fontWeight: "800", letterSpacing: 6 },
  ornament:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentClose:{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 24 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },

  // Contenu
  scroll:       { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  scrollTablet: { maxWidth: 600, alignSelf: "center", width: "100%" },

  section:      { gap: 10, paddingVertical: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  sectionBody:  { fontSize: 14, lineHeight: 22, fontWeight: "300" },
  diagramWrap:  { alignItems: "center", paddingVertical: 8 },
  divider:      { height: 0.5, marginTop: 8 },
});
