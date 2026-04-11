// src/i18n/index.ts
// Système de traduction léger sans dépendance externe.
// Détecte la langue de l'appareil, supporte FR/EN/ES/DE/PT.

import { NativeModules, Platform } from "react-native";
import fr from "./fr.json";
import en from "./en.json";
import es from "./es.json";
import de from "./de.json";
import pt from "./pt.json";
import ja from "./ja.json";

export type Language = "fr" | "en" | "es" | "de" | "pt" | "ja";

export const SUPPORTED_LANGUAGES: Language[] = ["fr", "en", "es", "de", "pt", "ja"];

const translations: Record<Language, typeof fr> = { fr, en, es, de, pt, ja };

// Détecter la langue de l'appareil
function detectDeviceLanguage(): Language {
  let locale = "fr";
  try {
    if (Platform.OS === "web") {
      // Web : utiliser navigator.language (disponible dans tous les navigateurs modernes)
      if (typeof navigator !== "undefined" && navigator.language) {
        locale = navigator.language;
      }
    } else if (Platform.OS === "android") {
      locale = NativeModules.I18nManager?.localeIdentifier ?? "fr";
    } else {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale
        ?? NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        ?? "fr";
    }
  } catch {}
  const code = locale.slice(0, 2).toLowerCase() as Language;
  return SUPPORTED_LANGUAGES.includes(code) ? code : "fr";
}

export const DEVICE_LANGUAGE = detectDeviceLanguage();

function get(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : path;
}

export function createT(lang: Language) {
  const dict = translations[lang] as unknown as Record<string, unknown>;
  const fallback = translations["fr"] as unknown as Record<string, unknown>;
  return (key: string, vars?: Record<string, string | number>): string => {
    let str = get(dict, key) || get(fallback, key) || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{{${k}}}`, String(v));
      }
    }
    return str;
  };
}
