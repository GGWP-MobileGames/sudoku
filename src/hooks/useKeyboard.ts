// src/hooks/useKeyboard.ts
// Gère les raccourcis clavier physiques (web / desktop).
// Fonctionne aussi sur mobile si un clavier externe est connecté.

import { useEffect } from "react";
import { Platform } from "react-native";

interface KeyboardActions {
  onNumber:      (n: number) => void;
  onDelete:      () => void;
  onToggleNotes: () => void;
  onHint:        () => void;
  onEscape:      () => void;
  onArrow?:      (dir: "up" | "down" | "left" | "right") => void;
  disabled?:     boolean;
}

export function useKeyboard({
  onNumber, onDelete, onToggleNotes, onHint, onEscape, onArrow, disabled,
}: KeyboardActions) {
  useEffect(() => {
    if (Platform.OS !== "web" || disabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ignorer si un input/textarea est actif
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const key = e.key;

      // Chiffres 1-9
      if (key >= "1" && key <= "9") {
        e.preventDefault();
        onNumber(parseInt(key, 10));
        return;
      }

      // Supprimer
      if (key === "Backspace" || key === "Delete" || key === "0") {
        e.preventDefault();
        onDelete();
        return;
      }

      // Notes (N ou espace)
      if (key === "n" || key === "N" || key === " ") {
        e.preventDefault();
        onToggleNotes();
        return;
      }

      // Hint (H)
      if (key === "h" || key === "H") {
        e.preventDefault();
        onHint();
        return;
      }

      // Flèches directionnelles
      if (onArrow) {
        const arrows: Record<string, "up" | "down" | "left" | "right"> = {
          ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        };
        if (arrows[key]) {
          e.preventDefault();
          onArrow(arrows[key]);
          return;
        }
      }

      // Escape = déselectionner
      if (key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onNumber, onDelete, onToggleNotes, onHint, onEscape, onArrow, disabled]);
}
