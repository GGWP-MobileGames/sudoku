import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Switch, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { SUPPORTED_LANGUAGES, type Language } from "../i18n";

interface Props { onBack: () => void; }

export default function SettingsScreen({ onBack }: Props) {
  const { settings, colors, updateSettings, t, language } = useSettings();

  const Row = ({ label, desc, value, onToggle, last = false }: { label: string; desc?: string; value: boolean; onToggle: () => void; last?: boolean }) => (
    <View style={[s.row, last && s.rowLast, { borderBottomColor: colors.borderThin }]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[s.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {desc && <Text style={[s.rowDesc, { color: colors.textSecondary }]}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.borderThin, true: colors.hintColor }}
        thumbColor={value ? colors.bg : colors.bgCard}
      />
    </View>
  );

  const currentLang = settings.language === 'auto' ? language : settings.language;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={settings.darkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      <View style={s.header}>
        <View style={s.titleBlock}>
          <Text style={[s.titleSub, { color: colors.textSecondary }]}>{t('settings.title_sub')}</Text>
          <View style={s.titleRow}>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
            <Text style={[s.title, { color: colors.textPrimary }]}>{t('settings.title')}</Text>
            <View style={[s.titleLine, { backgroundColor: colors.borderBox }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
          <Text style={[s.backText, { color: colors.textPrimary }]}>{t('settings.back')}</Text>
        </TouchableOpacity>
        <View style={s.ornament}>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
          <Text style={[s.ornamentDot, { color: colors.textSecondary }]}>◆</Text>
          <View style={[s.ornamentLine, { backgroundColor: colors.borderThin }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Langue */}
        <View style={[s.section, { borderColor: colors.borderBox }]}>
          <View style={[s.sectionHead, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderThin }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t('settings.section_language')}</Text>
          </View>
          <View style={s.langRow}>
            {/* Auto = langue du système */}
            <TouchableOpacity
              style={[s.langBtn, { borderColor: colors.borderThin }, currentLang === language && settings.language === 'auto' && { borderColor: colors.borderBox, backgroundColor: colors.bgCellSelected }]}
              onPress={() => updateSettings({ language: 'auto' })}
              activeOpacity={0.7}
            >
              <Text style={[s.langText, { color: colors.textSecondary }, settings.language === 'auto' && { color: colors.textOnSelected, fontWeight: "700" as const }]}>Auto</Text>
            </TouchableOpacity>
            {SUPPORTED_LANGUAGES.map((lang: Language) => (
              <TouchableOpacity
                key={lang}
                style={[s.langBtn, { borderColor: colors.borderThin }, settings.language === lang && { borderColor: colors.borderBox, backgroundColor: colors.bgCellSelected }]}
                onPress={() => updateSettings({ language: lang })}
                activeOpacity={0.7}
              >
                <Text style={[s.langText, { color: colors.textSecondary }, settings.language === lang && { color: colors.textOnSelected, fontWeight: "700" as const }]}>
                  {t(`languages.${lang}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Apparence */}
        <View style={[s.section, { borderColor: colors.borderBox }]}>
          <View style={[s.sectionHead, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderThin }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t('settings.section_appearance')}</Text>
          </View>
          <Row label={t('settings.dark_mode')} desc={t('settings.dark_mode_desc')} value={settings.darkMode} onToggle={() => updateSettings({ darkMode: !settings.darkMode })} last />
        </View>

        {/* Indices */}
        <View style={[s.section, { borderColor: colors.borderBox }]}>
          <View style={[s.sectionHead, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderThin }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t('settings.section_hints')}</Text>
          </View>
          <View style={[s.row, s.rowLast, { borderBottomColor: colors.borderThin }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.textPrimary }]}>{t('settings.hints_label')}</Text>
              <Text style={[s.rowDesc, { color: colors.textSecondary }]}>{t('settings.hints_default')}</Text>
            </View>
            <TextInput
              style={[s.hintsInput, { borderColor: colors.borderBox, color: colors.textPrimary, backgroundColor: colors.bg }]}
              value={String(settings.hintsPerGame)}
              onChangeText={v => {
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 0 && n <= 99) updateSettings({ hintsPerGame: n });
                else if (v === "") updateSettings({ hintsPerGame: 0 });
              }}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
            />
          </View>
        </View>

        {/* Erreurs par partie */}
        <View style={[s.section, { borderColor: colors.borderBox }]}>
          <View style={[s.sectionHead, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderThin }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t('settings.section_errors')}</Text>
          </View>
          <Row
            label={t('settings.limit_errors')}
            desc={t('settings.limit_errors_desc')}
            value={settings.limitErrors}
            onToggle={() => updateSettings({ limitErrors: !settings.limitErrors })}
            last={!settings.limitErrors}
          />
          {settings.limitErrors && (
            <View style={[s.row, s.rowLast, { borderBottomColor: colors.borderThin }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>{t('settings.max_errors_label')}</Text>
                <Text style={[s.rowDesc, { color: colors.textSecondary }]}>{t('settings.max_errors_default')}</Text>
              </View>
              <TextInput
                style={[s.hintsInput, { borderColor: colors.borderBox, color: colors.textPrimary, backgroundColor: colors.bg }]}
                value={String(settings.maxErrors)}
                onChangeText={v => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 0 && n <= 99) updateSettings({ maxErrors: n });
                  else if (v === "") updateSettings({ maxErrors: 0 });
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
            </View>
          )}
        </View>

        {/* Aide au jeu */}
        <View style={[s.section, { borderColor: colors.borderBox }]}>
          <View style={[s.sectionHead, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderThin }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t('settings.section_gameplay')}</Text>
          </View>
          <Row label={t('settings.large_numbers')} desc={t('settings.large_numbers_desc')} value={settings.largeNumbers} onToggle={() => updateSettings({ largeNumbers: !settings.largeNumbers })} />
          <Row label={t('settings.highlight_identical')} desc={t('settings.highlight_identical_desc')} value={settings.highlightIdentical} onToggle={() => updateSettings({ highlightIdentical: !settings.highlightIdentical })} />
          <Row label={t('settings.highlight_group')} desc={t('settings.highlight_group_desc')} value={settings.highlightGroup} onToggle={() => updateSettings({ highlightGroup: !settings.highlightGroup })} />
          <Row label={t('settings.show_cell_errors')} desc={t('settings.show_cell_errors_desc')} value={settings.showCellErrors} onToggle={() => updateSettings({ showCellErrors: !settings.showCellErrors })} last />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, gap: 12, alignItems: "center" },
  scroll:       { alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 16 },
  titleBlock:   { width: "100%", alignItems: "center", gap: 2 },
  titleSub:     { fontSize: 12, letterSpacing: 6, fontWeight: "500" },
  titleRow:     { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  titleLine:    { flex: 1, height: 2 },
  title:        { fontSize: 26, fontWeight: "800", letterSpacing: 6 },
  ornament:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  ornamentLine: { flex: 1, height: 0.5 },
  ornamentDot:  { fontSize: 8 },
  backBtn:      { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  backText:     { fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
  section:      { width: "100%", borderWidth: 1 },
  sectionHead:  { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  row:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  rowLast:      { borderBottomWidth: 0 },
  rowLabel:     { fontSize: 14, fontWeight: "500", flex: 1, marginRight: 12 },
  rowDesc:      { fontSize: 12, marginTop: 2 },
  hintsInput:   { width: 64, height: 44, borderWidth: 1, textAlign: "center", fontSize: 18, fontWeight: "700", paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" },
  langRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  langBtn:      { paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1 },
  langText:     { fontSize: 12 },
});
