import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from "../utils/settings";
import { getColors, type ColorTheme } from "../utils/theme";
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
  colors:         getColors(false),
  updateSettings: () => {},
  t:              createT('fr'),
  language:       'fr',
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const language: Language = (settings.language === 'auto' ? DEVICE_LANGUAGE : settings.language as Language);
  const t = useMemo(() => createT(language), [language]);
  const colors = useMemo(() => getColors(settings.darkMode), [settings.darkMode]);

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
