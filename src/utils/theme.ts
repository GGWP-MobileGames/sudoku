const LIGHT = {
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

  accent:      "#EDE8DC",
  accentLight: "#383430",
  error:       "#E85040",
  hintColor:   "#6AAA60",

  overlay: "rgba(0,0,0,0.7)",
  gold:    "#D4A83C",
  bgGold:  "rgba(212,168,60,0.42)",

  hintHighlight: "#2E4E2C",
};

export type ColorTheme = typeof LIGHT;

export function getColors(darkMode: boolean): ColorTheme {
  return darkMode ? DARK : LIGHT;
}

// Compatibilité avec le code existant (mode clair par défaut)
export const COLORS = LIGHT;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
};
