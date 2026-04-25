import React from "react";
import { Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useResponsive } from "../hooks/useResponsive";

// ───────────────────────────────────────────────────────────────────────────────
// Onglet Techniques : redirige vers le site sudoku.coach (campagne d'apprentissage),
// adapté à la langue courante de l'utilisateur.
// ───────────────────────────────────────────────────────────────────────────────

const SUDOKU_COACH_URLS: Record<string, string> = {
  fr: "https://sudoku.coach/fr/learn",
  de: "https://sudoku.coach/de/home",
  pt: "https://sudoku.coach/pt/home",
  // en, es, ja et toutes autres langues → version anglaise
};

function urlForLanguage(lang: string): string {
  return SUDOKU_COACH_URLS[lang] ?? "https://sudoku.coach/en/home";
}

export default function TechniquesTab() {
  const { colors, t, language } = useSettings();
  const { isTablet } = useResponsive();

  const url = urlForLanguage(language);

  const handleOpen = () => {
    Linking.openURL(url).catch(() => {
      // silencieux : si l'OS ne peut pas ouvrir le lien, on ne fait rien
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, isTablet && s.scrollTablet]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.intro, { color: colors.textPrimary }]}>
        {t("techniques.intro")}
      </Text>

      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[s.btn, { borderColor: colors.borderBox }]}
      >
        <Text style={[s.btnText, { color: colors.textPrimary }]}>
          {t("techniques.open_link")}
        </Text>
      </TouchableOpacity>

      <Text style={[s.urlHint, { color: colors.textSecondary }]} numberOfLines={1}>
        {url}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  scrollTablet: { maxWidth: 600, alignSelf: "center", width: "100%" },

  intro:    { fontSize: 14, lineHeight: 22, fontWeight: "300", marginBottom: 24 },
  btn:      { paddingVertical: 14, borderWidth: 1, alignItems: "center", marginBottom: 12 },
  btnText:  { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  urlHint:  { fontSize: 11, fontWeight: "300", textAlign: "center" },
});
