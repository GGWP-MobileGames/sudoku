import { useWindowDimensions } from "react-native";

export type DeviceType = "phone" | "tablet" | "desktop";

interface ResponsiveValues {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  deviceType: DeviceType;
  scale: (base: number) => number;
  gridSize: number;
  cellSize: number;
}

const REFERENCE_WIDTH = 375; // iPhone SE

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const isLandscape = width > height;
  const isTablet = shortSide >= 600;
  const deviceType: DeviceType =
    width >= 1024 ? "desktop" : isTablet ? "tablet" : "phone";

  const scale = (base: number): number => {
    const factor = Math.min(width, 500) / REFERENCE_WIDTH;
    return Math.round(base * factor);
  };

  // Grille : prend l'espace disponible selon le contexte
  let gridSize: number;
  if (isLandscape) {
    // En paysage, la grille est contrainte par la hauteur
    gridSize = Math.min(height - 120, width * 0.55, 560);
  } else {
    // En portrait, contrainte par la largeur
    const maxForDevice = isTablet ? 560 : 500;
    gridSize = Math.min(width - 32, height * 0.50, maxForDevice);
  }
  gridSize = Math.max(gridSize, 200); // minimum absolu

  const cellSize = gridSize / 9;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    deviceType,
    scale,
    gridSize,
    cellSize,
  };
}
