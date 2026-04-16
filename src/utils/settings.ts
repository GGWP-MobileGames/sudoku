import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppSettings {
  darkMode:           boolean;  // @deprecated — conservé pour migration
  theme:              string;   // ThemeKey: classic | dark | gruvbox-light | gruvbox-dark | ocean | forest
  highlightIdentical: boolean;  // surligner les chiffres identiques
  highlightGroup:     boolean;  // surligner ligne/colonne/bloc
  hintsPerGame:       number;
  language:           string;   // fr | en | es | de | pt
  largeNumbers:       boolean;  // chiffres grands dans la grille
  limitErrors:        boolean;  // activer la limite d'erreurs
  maxErrors:          number;   // nombre d'erreurs max (0-99)
  showCellErrors:     boolean;  // afficher les erreurs dans les cases
  hapticFeedback:     boolean;  // retour haptique (vibration)
  highlightNotes:     boolean;  // surligner les notes correspondant au chiffre sélectionné
}

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode:           false,
  theme:              "classic",
  highlightIdentical: true,
  highlightGroup:     true,
  hintsPerGame:       3,
  language:           'auto', // auto = langue de l'appareil
  largeNumbers:       true,
  limitErrors:        true,
  maxErrors:          3,
  showCellErrors:     true,
  hapticFeedback:     true,
  highlightNotes:     true,
};

const KEY = "app_settings";

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
