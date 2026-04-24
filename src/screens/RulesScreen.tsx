import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { useResponsive } from "../hooks/useResponsive";
import RuleDiagram, { type RuleHighlight } from "../components/RuleDiagram";
import TechniquesTab from "../components/TechniquesTab";

interface Props { onBack: () => void; }

type Bullet = { bodyKey: string; diagram?: RuleHighlight };
type Section = {
  key:        string;
  titleKey:   string;
  bodyKey?:   string;
  bullets?:   Bullet[];
  footerKey?: string;
};

const SECTIONS: Section[] = [
  { key: "1", titleKey: "rules.s1_title", bodyKey: "rules.s1_body" },
  { key: "2", titleKey: "rules.s2_title", bodyKey: "rules.s2_body",
    bullets: [
      { bodyKey: "rules.s2_bullet_row",   diagram: "row"   },
      { bodyKey: "rules.s2_bullet_col",   diagram: "col"   },
      { bodyKey: "rules.s2_bullet_block", diagram: "block" },
    ],
    footerKey: "rules.s2_footer" },
  { key: "3", titleKey: "rules.s3_title", bodyKey: "rules.s3_body" },
  { key: "4", titleKey: "rules.s4_title",
    bullets: [
      { bodyKey: "rules.s4_bullet_notes" },
      { bodyKey: "rules.s4_bullet_hints" },
    ] },
];

type TabKey = "rules" | "techniques";

export default function RulesScreen({ onBack }: Props) {
  const { colors, t } = useSettings();
  const { isTablet } = useResponsive();
  const [tab, setTab] = useState<TabKey>("rules");

  const title    = tab === "rules" ? t("rules.title")    : t("techniques.title");
  const subtitle = tab === "rules" ? t("rules.subtitle") : t("techniques.subtitle");

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Header fixe ── */}
      <View style={[s.header, { backgroundColor: colors.bg }]}>
        <View style={s.titleBlock}>
          <Text style={[s.titleSub, { color: colors.textSecondary }]}>{subtitle}</Text>
          <View style={s.titleRow}>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
            <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
          <Text style={[s.backText, { color: colors.textPrimary }]}>{t("rules.back")}</Text>
        </TouchableOpacity>

        {/* Pill segmenté Règles / Techniques */}
        <View style={[s.pill, { borderColor: colors.borderBox }]}>
          <TouchableOpacity
            onPress={() => setTab("rules")}
            activeOpacity={0.8}
            style={[
              s.pillBtn,
              tab === "rules" && { backgroundColor: colors.textPrimary },
            ]}
          >
            <Text style={[
              s.pillText,
              { color: tab === "rules" ? colors.bg : colors.textPrimary },
            ]}>
              {t("techniques.tab_rules")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("techniques")}
            activeOpacity={0.8}
            style={[
              s.pillBtn,
              tab === "techniques" && { backgroundColor: colors.textPrimary },
            ]}
          >
            <Text style={[
              s.pillText,
              { color: tab === "techniques" ? colors.bg : colors.textPrimary },
            ]}>
              {t("techniques.tab_techniques")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.ornament}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>
      </View>

      {/* ── Contenu ── */}
      {tab === "rules" ? (
        <ScrollView
          contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}
          showsVerticalScrollIndicator={false}
        >
          {SECTIONS.map((sec, idx) => (
            <View key={sec.key} style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t(sec.titleKey)}</Text>
              {sec.bodyKey && (
                <Text style={[s.sectionBody, { color: colors.textPrimary }]}>{t(sec.bodyKey)}</Text>
              )}
              {sec.bullets && sec.bullets.map((b, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bulletDot, { color: colors.textSecondary }]}>•</Text>
                  <View style={s.bulletContent}>
                    <Text style={[s.sectionBody, { color: colors.textPrimary }]}>{t(b.bodyKey)}</Text>
                    {b.diagram && (
                      <View style={s.diagramWrap}>
                        <RuleDiagram highlight={b.diagram} />
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {sec.footerKey && (
                <Text style={[s.sectionFooter, { color: colors.textPrimary }]}>{t(sec.footerKey)}</Text>
              )}
              {idx < SECTIONS.length - 1 && (
                <View style={[s.divider, { backgroundColor: colors.borderThin }]} />
              )}
            </View>
          ))}

          {/* Ligne de clôture */}
          <Text style={[s.closing, { color: colors.textSecondary }]}>{t("rules.closing")}</Text>

          {/* Ornement de fermeture */}
          <View style={s.ornamentClose}>
            <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
            <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
            <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          </View>
        </ScrollView>
      ) : (
        <TechniquesTab />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },

  header:       { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, gap: 12, alignItems: "center", maxWidth: 700, alignSelf: "center", width: "100%" },
  backBtn:      { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  backText:     { fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  titleBlock:   { width: "100%", alignItems: "center", gap: 2 },
  titleSub:     { fontSize: 12, letterSpacing: 6, fontWeight: "500" },
  titleRow:     { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  titleLine:    { flex: 1, height: 2 },
  title:        { fontSize: 26, fontWeight: "800", letterSpacing: 6 },

  pill:         { flexDirection: "row", borderWidth: 1, alignSelf: "center" },
  pillBtn:      { paddingVertical: 8, paddingHorizontal: 22 },
  pillText:     { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },

  ornament:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentClose:{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 24 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },

  scroll:       { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  scrollTablet: { maxWidth: 600, alignSelf: "center", width: "100%" },

  section:      { gap: 10, paddingVertical: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  sectionBody:  { fontSize: 14, lineHeight: 22, fontWeight: "300" },
  sectionFooter:{ fontSize: 14, lineHeight: 22, fontWeight: "400", fontStyle: "italic", marginTop: 4 },
  bulletRow:    { flexDirection: "row", gap: 10, paddingLeft: 4, marginTop: 2 },
  bulletDot:    { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  bulletContent:{ flex: 1, gap: 8 },
  diagramWrap:  { alignItems: "center", paddingVertical: 8 },
  divider:      { height: 0.5, marginTop: 8 },
  closing:      { textAlign: "center", fontStyle: "italic", fontSize: 14, letterSpacing: 1, marginTop: 8, marginBottom: 4 },
});
