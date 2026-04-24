import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useResponsive } from "../hooks/useResponsive";
import TechniqueDiagram from "./TechniqueDiagram";
import { TECHNIQUES, TIERS, groupByTier, type Technique, type Tier } from "../data/techniques";

// ───────────────────────────────────────────────────────────────────────────────
// Onglet Techniques : index (groupé par tier) + vue détail avec préc/suiv.
// ───────────────────────────────────────────────────────────────────────────────

export default function TechniquesTab() {
  const { colors, t } = useSettings();
  const { isTablet } = useResponsive();

  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // ── Vue index ──────────────────────────────────────────────────────────────
  if (activeIdx === null) {
    const groups = groupByTier(TECHNIQUES);
    return (
      <ScrollView
        contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: colors.textSecondary }]}>{t("techniques.intro")}</Text>

        {TIERS.map(tier => {
          const list = groups[tier];
          if (list.length === 0) return null;
          return (
            <View key={tier} style={s.tierBlock}>
              <Text style={[s.tierTitle, { color: colors.textSecondary }]}>
                {t(`techniques.tiers.${tier}`).toUpperCase()}
              </Text>
              <View style={[s.tierUnderline, { backgroundColor: colors.borderThin }]} />
              {list.map(tech => {
                const globalIdx = TECHNIQUES.findIndex(x => x.id === tech.id);
                return (
                  <TouchableOpacity
                    key={tech.id}
                    onPress={() => setActiveIdx(globalIdx)}
                    activeOpacity={0.7}
                    style={[s.row, { borderBottomColor: colors.borderThin }]}
                  >
                    <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                      {t(`techniques.cards.${tech.id}.title`)}
                    </Text>
                    <Text style={[s.rowChevron, { color: colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ── Vue détail ─────────────────────────────────────────────────────────────
  const tech: Technique = TECHNIQUES[activeIdx];
  const alias = t(`techniques.cards.${tech.id}.aliases`);
  const hasAlias = alias && alias !== `techniques.cards.${tech.id}.aliases`;
  const hasPrev  = activeIdx > 0;
  const hasNext  = activeIdx < TECHNIQUES.length - 1;

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        onPress={() => setActiveIdx(null)}
        activeOpacity={0.7}
        style={s.backRow}
      >
        <Text style={[s.backRowText, { color: colors.textSecondary }]}>
          {t("techniques.back_to_index")}
        </Text>
      </TouchableOpacity>

      {/* Tier badge */}
      <Text style={[s.detailTier, { color: colors.textSecondary }]}>
        {t(`techniques.tiers.${tech.tier as Tier}`).toUpperCase()}
      </Text>

      {/* Title */}
      <Text style={[s.detailTitle, { color: colors.textPrimary }]}>
        {t(`techniques.cards.${tech.id}.title`)}
      </Text>

      {/* Aliases */}
      {hasAlias ? (
        <Text style={[s.detailAlias, { color: colors.textSecondary }]}>
          {t("techniques.aliases_label")} : {alias}
        </Text>
      ) : null}

      <View style={[s.divider, { backgroundColor: colors.borderThin }]} />

      {/* Definition */}
      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
        {t("techniques.definition_label")}
      </Text>
      <Text style={[s.body, { color: colors.textPrimary }]}>
        {t(`techniques.cards.${tech.id}.definition`)}
      </Text>

      {/* Sous-sections optionnelles (s1, s2, s3) — présentes uniquement pour les
          techniques qui les définissent. Détection : si t() renvoie la clé elle-même,
          la clé n'existe pas → on passe. */}
      {(["s1", "s2", "s3"] as const).map(sk => {
        const labelKey = `techniques.cards.${tech.id}.${sk}_label`;
        const textKey  = `techniques.cards.${tech.id}.${sk}_text`;
        const label = t(labelKey);
        const text  = t(textKey);
        if (label === labelKey) return null;
        return (
          <View key={sk} style={s.subsection}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[s.body, { color: colors.textPrimary }]}>{text}</Text>
          </View>
        );
      })}

      {/* Example */}
      <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
        {t("techniques.example_label")}
      </Text>
      <View style={s.diagramWrap}>
        <TechniqueDiagram key={tech.id} {...tech.diagram} />
      </View>
      <Text style={[s.body, { color: colors.textPrimary }]}>
        {t(`techniques.cards.${tech.id}.example`)}
      </Text>

      {/* Navigation préc/suiv */}
      <View style={s.navRow}>
        <TouchableOpacity
          disabled={!hasPrev}
          onPress={() => hasPrev && setActiveIdx(activeIdx - 1)}
          activeOpacity={0.7}
          style={[
            s.navBtn,
            { borderColor: colors.borderBox },
            !hasPrev && s.navBtnDisabled,
          ]}
        >
          <Text style={[
            s.navBtnText,
            { color: colors.textPrimary },
            !hasPrev && { color: colors.textSecondary },
          ]}>
            {t("techniques.prev")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!hasNext}
          onPress={() => hasNext && setActiveIdx(activeIdx + 1)}
          activeOpacity={0.7}
          style={[
            s.navBtn,
            { borderColor: colors.borderBox },
            !hasNext && s.navBtnDisabled,
          ]}
        >
          <Text style={[
            s.navBtnText,
            { color: colors.textPrimary },
            !hasNext && { color: colors.textSecondary },
          ]}>
            {t("techniques.next")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  scrollTablet: { maxWidth: 600, alignSelf: "center", width: "100%" },

  // Index
  intro:         { fontSize: 13, lineHeight: 20, fontWeight: "300", marginBottom: 16 },
  tierBlock:     { marginBottom: 22 },
  tierTitle:     { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 6 },
  tierUnderline: { height: 0.5, marginBottom: 4 },
  row:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 0.5 },
  rowTitle:      { fontSize: 15, fontWeight: "500" },
  rowChevron:    { fontSize: 22, fontWeight: "300" },

  // Détail
  backRow:      { paddingVertical: 6, marginBottom: 8 },
  backRowText:  { fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  detailTier:   { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  detailTitle:  { fontSize: 22, fontWeight: "800", marginTop: 4 },
  detailAlias:  { fontSize: 12, fontStyle: "italic", marginTop: 4 },
  divider:      { height: 0.5, marginVertical: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 6 },
  body:         { fontSize: 14, lineHeight: 22, fontWeight: "300" },
  subsection:   { marginTop: 18 },
  diagramWrap:  { alignItems: "center", paddingVertical: 12 },

  navRow:        { flexDirection: "row", justifyContent: "space-between", marginTop: 28, gap: 12 },
  navBtn:        { flex: 1, paddingVertical: 12, borderWidth: 1, alignItems: "center" },
  navBtnDisabled:{ opacity: 0.35 },
  navBtnText:    { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
});
