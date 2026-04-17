import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from "../utils/settings";
import { getColors, type ColorTheme, type ThemeKey } from "../utils/theme";
import { createT, DEVICE_LANGUAGE, type Language, SUPPORTED_LANGUAGES } from "../i18n";

interface SettingsContextValue {
  settings:       AppSettings;
  colors:         ColorTheme;
  updateSettings: (patch: Partial<AppSettings>) => void;
  t:              (key: string, vars?: Record<string, string | number>) => string;
  language:       Language;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings:       DEFAULT_SETTINGS,
  colors:         getColors("classic"),
  updateSettings: () => {},
  t:              createT('fr'),
  language:       'fr',
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(loaded => {
      // Migration : anciens utilisateurs avec darkMode mais sans theme
      if (!loaded.theme || loaded.theme === "classic") {
        if (loaded.darkMode) {
          loaded.theme = "dark";
        }
      }
      // Migration : remplacer 'auto' par la langue détectée du système
      if (!loaded.language || loaded.language === 'auto') {
        loaded.language = DEVICE_LANGUAGE;
      }
      saveSettings(loaded);
      setSettings(loaded);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const language: Language = settings.language as Language;
  const t = useMemo(() => createT(language), [language]);
  const themeKey = (settings.theme || "classic") as ThemeKey;
  const colors = useMemo(() => getColors(themeKey), [themeKey]);

  const value = useMemo(() => ({
    settings, colors, updateSettings, t, language,
  }), [settings, colors, updateSettings, t, language]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
