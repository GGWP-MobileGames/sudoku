// ── Thèmes de couleurs ──────────────────────────────────────────────────────

export type ThemeKey = "classic" | "dark" | "gruvbox-light" | "gruvbox-dark" | "ocean" | "forest";

const CLASSIC = {
  isDark: false,
  bg:              "#F5F0E8",
  bgCard:          "#EDEAE0",
  bgCellDefault:   "#F5F0E8",
  bgCellHighlight: "rgba(212,168,60,0.18)",
  bgCellSelected:      "#4A4A4A",
  bgCellSelectedGrid:  "#D4A83C",
  bgCellMatch:     "rgba(212,168,60,0.32)",

  textPrimary:    "#1A1A1A",
  textSecondary:  "#6B6560",
  textFixed:      "#1A1A1A",
  textUser:       "#1A1A1A",
  textError:      "#B5281C",
  textOnSelected: "#F5F0E8",

  borderThin:  "#C8C3B8",
  borderBox:   "#1A1A1A",
  borderOuter: "#1A1A1A",

  btnNum:       "#F5F0E8",
  btnNumBorder: "#B8B3A8",
  btnPrimary:       "#4A4A4A",
  btnPrimaryBorder: "#4A4A4A",
  btnPrimaryText:   "#F5F0E8",

  accent:      "#1A1A1A",
  accentLight: "#D8D3C8",
  error:       "#B5281C",
  hintColor:   "#4A6741",

  overlay: "rgba(26,26,26,0.55)",
  gold:    "#D4A83C",
  bgGold:  "rgba(212,168,60,0.42)",

  hintHighlight: "#C5DEB8",
};

const DARK = {
  isDark: true,
  bg:              "#1A1816",
  bgCard:          "#242220",
  bgCellDefault:   "#2A2825",
  bgCellHighlight: "rgba(212,168,60,0.26)",
  bgCellSelected:      "#3A3530",
  bgCellSelectedGrid:  "#D4A83C",
  bgCellMatch:     "rgba(212,168,60,0.44)",

  textPrimary:    "#EDE8DC",
  textSecondary:  "#9A9590",
  textFixed:      "#EDE8DC",
  textUser:       "#D8D3C8",
  textError:      "#E85040",
  textOnSelected: "#EDE8DC",

  borderThin:  "#3E3A35",
  borderBox:   "#C8C3B8",
  borderOuter: "#C8C3B8",

  btnNum:       "#2A2825",
  btnNumBorder: "#4A4540",
  btnPrimary:       "#D4A83C",
  btnPrimaryBorder: "#D4A83C",
  btnPrimaryText:   "#1A1A1A",

  accent:      "#EDE8DC",
  accentLight: "#383430",
  error:       "#E85040",
  hintColor:   "#6AAA60",

  overlay: "rgba(0,0,0,0.7)",
  gold:    "#D4A83C",
  bgGold:  "rgba(212,168,60,0.42)",

  hintHighlight: "#2E4E2C",
};

const GRUVBOX_LIGHT = {
  isDark: false,
  bg:              "#FBF1C7",
  bgCard:          "#F2E5BC",
  bgCellDefault:   "#FBF1C7",
  bgCellHighlight: "rgba(215,153,33,0.18)",
  bgCellSelected:      "#3C3836",
  bgCellSelectedGrid:  "#D79921",
  bgCellMatch:     "rgba(215,153,33,0.30)",

  textPrimary:    "#282828",
  textSecondary:  "#7C6F64",
  textFixed:      "#282828",
  textUser:       "#3C3836",
  textError:      "#CC241D",
  textOnSelected: "#FBF1C7",

  borderThin:  "#D5C4A1",
  borderBox:   "#282828",
  borderOuter: "#282828",

  btnNum:       "#FBF1C7",
  btnNumBorder: "#BDAE93",
  btnPrimary:       "#3C3836",
  btnPrimaryBorder: "#3C3836",
  btnPrimaryText:   "#FBF1C7",

  accent:      "#282828",
  accentLight: "#EBDBB2",
  error:       "#CC241D",
  hintColor:   "#427B58",

  overlay: "rgba(40,40,40,0.55)",
  gold:    "#D79921",
  bgGold:  "rgba(215,153,33,0.40)",

  hintHighlight: "#B8BB26",
};

const GRUVBOX_DARK = {
  isDark: true,
  bg:              "#282828",
  bgCard:          "#3C3836",
  bgCellDefault:   "#32302F",
  bgCellHighlight: "rgba(215,153,33,0.22)",
  bgCellSelected:      "#504945",
  bgCellSelectedGrid:  "#D79921",
  bgCellMatch:     "rgba(215,153,33,0.38)",

  textPrimary:    "#EBDBB2",
  textSecondary:  "#A89984",
  textFixed:      "#FBF1C7",
  textUser:       "#EBDBB2",
  textError:      "#FB4934",
  textOnSelected: "#EBDBB2",

  borderThin:  "#504945",
  borderBox:   "#EBDBB2",
  borderOuter: "#EBDBB2",

  btnNum:       "#32302F",
  btnNumBorder: "#665C54",
  btnPrimary:       "#FABD2F",
  btnPrimaryBorder: "#FABD2F",
  btnPrimaryText:   "#282828",

  accent:      "#EBDBB2",
  accentLight: "#3C3836",
  error:       "#FB4934",
  hintColor:   "#8EC07C",

  overlay: "rgba(0,0,0,0.7)",
  gold:    "#FABD2F",
  bgGold:  "rgba(250,189,47,0.40)",

  hintHighlight: "#3C5A38",
};

const OCEAN = {
  isDark: true,
  bg:              "#1B2838",
  bgCard:          "#22354A",
  bgCellDefault:   "#1E2E42",
  bgCellHighlight: "rgba(100,180,220,0.20)",
  bgCellSelected:      "#2A4060",
  bgCellSelectedGrid:  "#5BA4CF",
  bgCellMatch:     "rgba(100,180,220,0.35)",

  textPrimary:    "#D4E4F0",
  textSecondary:  "#8AA8C0",
  textFixed:      "#E8F0F8",
  textUser:       "#C0D8E8",
  textError:      "#F06060",
  textOnSelected: "#D4E4F0",

  borderThin:  "#2A4260",
  borderBox:   "#8AACC8",
  borderOuter: "#8AACC8",

  btnNum:       "#1E2E42",
  btnNumBorder: "#3A5878",
  btnPrimary:       "#5BA4CF",
  btnPrimaryBorder: "#5BA4CF",
  btnPrimaryText:   "#1B2838",

  accent:      "#D4E4F0",
  accentLight: "#22354A",
  error:       "#F06060",
  hintColor:   "#68C8A0",

  overlay: "rgba(10,20,35,0.7)",
  gold:    "#5BA4CF",
  bgGold:  "rgba(91,164,207,0.40)",

  hintHighlight: "#1A4050",
};

const FOREST = {
  isDark: true,
  bg:              "#1A2418",
  bgCard:          "#243020",
  bgCellDefault:   "#1E2A1C",
  bgCellHighlight: "rgba(140,192,124,0.18)",
  bgCellSelected:      "#2E4228",
  bgCellSelectedGrid:  "#8EC07C",
  bgCellMatch:     "rgba(140,192,124,0.32)",

  textPrimary:    "#D0E0C8",
  textSecondary:  "#8AA880",
  textFixed:      "#E0F0D8",
  textUser:       "#C0D8B0",
  textError:      "#E86050",
  textOnSelected: "#D0E0C8",

  borderThin:  "#2E4228",
  borderBox:   "#90B888",
  borderOuter: "#90B888",

  btnNum:       "#1E2A1C",
  btnNumBorder: "#3A5835",
  btnPrimary:       "#8EC07C",
  btnPrimaryBorder: "#8EC07C",
  btnPrimaryText:   "#1A2418",

  accent:      "#D0E0C8",
  accentLight: "#243020",
  error:       "#E86050",
  hintColor:   "#A0D090",

  overlay: "rgba(10,18,10,0.7)",
  gold:    "#8EC07C",
  bgGold:  "rgba(140,192,124,0.38)",

  hintHighlight: "#2A4825",
};

// ── Registre des thèmes ─────────────────────────────────────────────────────

const THEMES: Record<ThemeKey, typeof CLASSIC> = {
  "classic":       CLASSIC,
  "dark":          DARK,
  "gruvbox-light": GRUVBOX_LIGHT,
  "gruvbox-dark":  GRUVBOX_DARK,
  "ocean":         OCEAN,
  "forest":        FOREST,
};

export type ColorTheme = typeof CLASSIC;

export function getColors(theme: ThemeKey): ColorTheme {
  return THEMES[theme] ?? CLASSIC;
}

export const THEME_LIST: { key: ThemeKey; label: string }[] = [
  { key: "classic",       label: "Classique" },
  { key: "dark",          label: "Sombre" },
  { key: "gruvbox-light", label: "Gruvbox Light" },
  { key: "gruvbox-dark",  label: "Gruvbox Dark" },
  { key: "ocean",         label: "Océan" },
  { key: "forest",        label: "Forêt" },
];

// Compatibilité : COLORS reste l'export par défaut (classique)
export const COLORS = CLASSIC;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
};
