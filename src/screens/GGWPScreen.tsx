import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { useResponsive } from "../hooks/useResponsive";

interface Props {
  onClose: () => void;
}

function withGGWP(text: string, baseStyle: object, ggwpColor: string) {
  const parts = text.split("GGWP");
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <Text style={{ fontFamily: "Cinzel_700Bold", color: ggwpColor }}>GGWP</Text>
          )}
        </React.Fragment>
      ))}
    </Text>
  );
}

export default function GGWPScreen({ onClose }: Props) {
  const { colors, settings, t } = useSettings();
  const { isTablet } = useResponsive();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      <ScrollView contentContainerStyle={[s.scroll, isTablet && { maxWidth: 520, alignSelf: "center" as const }]} showsVerticalScrollIndicator={false}>

        {/* Titre */}
        <View style={s.header}>
          <View style={s.titleRow}>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
            <Text style={[s.title, { color: colors.textPrimary }]}>{t("welcome.title")}</Text>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
          </View>
        </View>

        <View style={s.ornament}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>

        {/* Texte */}
        <View style={s.body}>
          {withGGWP(t("welcome.p1"), [s.paragraph, { color: colors.textPrimary }], colors.textPrimary)}
          {withGGWP(t("welcome.p2"), [s.paragraph, { color: colors.textPrimary }], colors.textPrimary)}
          <Text style={[s.thanks, { color: colors.textSecondary }]}>{t("welcome.p4")}</Text>
        </View>

        <View style={s.ornament}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>

        {/* Bouton retour */}
        <TouchableOpacity
          onPress={onClose}
          style={[s.backBtn, { borderColor: colors.borderBox }]}
          activeOpacity={0.7}
        >
          <Text style={[s.backText, { color: colors.textPrimary }]}>
            {t("welcome.back_btn")}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingVertical: 40, gap: 28 },

  header:    { width: "100%", alignItems: "center" },
  titleRow:  { flexDirection: "row", alignItems: "center", width: "100%", gap: 14 },
  titleLine: { flex: 1, height: 2 },
  title:     { fontSize: 26, fontFamily: "Cinzel_700Bold", letterSpacing: 6 },

  ornament:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },

  body:      { width: "100%", gap: 20 },
  paragraph: { fontSize: 15, lineHeight: 24, fontWeight: "300", textAlign: "center" },
  thanks:    { fontSize: 14, lineHeight: 22, fontWeight: "400",
               textAlign: "center", fontStyle: "italic" },

  backBtn:  { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  backText: { fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
});
