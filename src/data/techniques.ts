import type { TechniqueDiagramSpec } from "../components/TechniqueDiagram";
import { rowCells, colCells, boxCells } from "../components/TechniqueDiagram";

// ───────────────────────────────────────────────────────────────────────────────
// Métadonnées des techniques du dictionnaire.
// Phase 1 : Débutant + Facile (7 techniques).
// ───────────────────────────────────────────────────────────────────────────────

export type Tier = "beginner" | "easy" | "intermediate" | "advanced" | "expert";

export interface Technique {
  id:      string;         // identifiant stable (utilisé dans i18n + nav)
  tier:    Tier;
  diagram: TechniqueDiagramSpec;
}

// Ordre pédagogique (pas alphabétique) — important pour préc/suiv.
export const TECHNIQUES: Technique[] = [
  // ── DÉBUTANT ─────────────────────────────────────────────────────────────
  {
    id:   "last_free_cell",
    tier: "beginner",
    diagram: {
      // Ligne 4 : 8 cellules remplies, la cellule (4,4) est libre → doit être 5.
      givens: [
        { r: 4, c: 0, n: 1 }, { r: 4, c: 1, n: 2 }, { r: 4, c: 2, n: 3 },
        { r: 4, c: 3, n: 4 },                       { r: 4, c: 5, n: 6 },
        { r: 4, c: 6, n: 7 }, { r: 4, c: 7, n: 8 }, { r: 4, c: 8, n: 9 },
      ],
      highlights: [
        { cells: rowCells(4),       role: "secondary" },
        { cells: [[4, 4]],          role: "primary"   },
      ],
    },
  },
  {
    id:   "last_possible_number",
    tier: "beginner",
    diagram: {
      // Cellule (0,0) cible. Ligne 0 élimine 4-9, colonne 0 élimine 2,3,
      // bloc (0,0) neutre → seul 1 reste possible.
      givens: [
        { r: 0, c: 3, n: 4 }, { r: 0, c: 4, n: 5 }, { r: 0, c: 5, n: 6 },
        { r: 0, c: 6, n: 7 }, { r: 0, c: 7, n: 8 }, { r: 0, c: 8, n: 9 },
        { r: 1, c: 0, n: 2 }, { r: 2, c: 0, n: 3 },
      ],
      highlights: [
        { cells: rowCells(0),       role: "secondary" },
        { cells: colCells(0),       role: "secondary" },
        { cells: boxCells(0, 0),    role: "secondary" },
        { cells: [[0, 0]],          role: "primary"   },
      ],
    },
  },
  {
    id:   "last_remaining_cell",
    tier: "beginner",
    diagram: {
      // On veut placer le 5 dans le bloc (0,0). Givens remplissent 6 cases du bloc.
      // Cases vides du bloc : (1,1), (2,1), (2,2).
      // Un 5 en (1,5) bloque la ligne 1 → élimine (1,1).
      // Un 5 en (5,2) bloque la colonne 2 → élimine (2,2).
      // Seule case possible pour le 5 dans le bloc : (2,1).
      givens: [
        // Remplissage du bloc top-left (sans 5)
        { r: 0, c: 0, n: 1 }, { r: 0, c: 1, n: 2 }, { r: 0, c: 2, n: 3 },
        { r: 1, c: 0, n: 4 },                       { r: 1, c: 2, n: 6 },
        { r: 2, c: 0, n: 7 },
        // Les deux 5 qui éliminent les candidates du bloc
        { r: 1, c: 5, n: 5 },  // 5 sur la ligne 1 → élimine (1,1)
        { r: 5, c: 2, n: 5 },  // 5 sur la colonne 2 → élimine (2,2)
      ],
      candidates: [
        { r: 1, c: 1, ns: [5] },  // éliminé par la ligne 1
        { r: 2, c: 1, ns: [5] },  // cible
        { r: 2, c: 2, ns: [5] },  // éliminé par la colonne 2
      ],
      highlights: [
        { cells: rowCells(1),       role: "secondary" },
        { cells: colCells(2),       role: "secondary" },
        { cells: boxCells(0, 0),    role: "secondary" },
        { cells: [[1, 1], [2, 2]],  role: "eliminated" },
        { cells: [[2, 1]],          role: "primary"   },
      ],
      candidateMarks: [
        { r: 1, c: 1, n: 5, role: "eliminated" },
        { r: 2, c: 2, n: 5, role: "eliminated" },
        { r: 2, c: 1, n: 5, role: "target"     },
      ],
    },
  },
  {
    id:   "naked_single",
    tier: "beginner",
    diagram: {
      // Cellule (4,4) n'a qu'un seul candidat possible : 7.
      candidates: [
        { r: 3, c: 3, ns: [2, 5, 8] },
        { r: 3, c: 4, ns: [1, 5]    },
        { r: 3, c: 5, ns: [3, 5, 9] },
        { r: 4, c: 3, ns: [2, 6]    },
        { r: 4, c: 4, ns: [7]       },  // cible
        { r: 4, c: 5, ns: [3, 9]    },
        { r: 5, c: 3, ns: [2, 4, 8] },
        { r: 5, c: 4, ns: [1, 4]    },
        { r: 5, c: 5, ns: [3, 4]    },
      ],
      highlights: [
        { cells: [[4, 4]],          role: "primary" },
      ],
      candidateMarks: [
        { r: 4, c: 4, n: 7, role: "target" },
      ],
    },
  },

  // ── FACILE ───────────────────────────────────────────────────────────────
  {
    id:   "hidden_single",
    tier: "easy",
    diagram: {
      // Dans la colonne 4, le chiffre 7 n'apparaît comme candidat qu'en (3,4).
      // Les autres cellules vides de la colonne ont d'autres candidats, sans 7.
      candidates: [
        { r: 0, c: 4, ns: [1, 2, 8] },
        { r: 1, c: 4, ns: [2, 5, 9] },
        { r: 2, c: 4, ns: [1, 5, 8] },
        { r: 3, c: 4, ns: [2, 7, 8] },   // cible : seul candidat 7 de la colonne
        { r: 5, c: 4, ns: [2, 5]    },
        { r: 6, c: 4, ns: [1, 5, 8] },
        { r: 7, c: 4, ns: [2, 8, 9] },
        { r: 8, c: 4, ns: [1, 5]    },
      ],
      givens: [
        { r: 4, c: 4, n: 4 },
      ],
      highlights: [
        { cells: colCells(4),       role: "secondary" },
        { cells: [[3, 4]],          role: "primary"   },
      ],
      candidateMarks: [
        { r: 3, c: 4, n: 7, role: "target" },
      ],
    },
  },
  {
    id:   "naked_pair",
    tier: "easy",
    diagram: {
      // Ligne 3 : (3,1) et (3,4) ont exactement les mêmes 2 candidats {4, 7}.
      // Les 4 et 7 peuvent être retirés des autres cellules de la ligne.
      candidates: [
        { r: 3, c: 0, ns: [2, 4, 7, 9] },
        { r: 3, c: 1, ns: [4, 7]       },    // paire
        { r: 3, c: 2, ns: [2, 4, 7]    },
        { r: 3, c: 4, ns: [4, 7]       },    // paire
        { r: 3, c: 5, ns: [4, 6, 7]    },
        { r: 3, c: 7, ns: [2, 6]       },
        { r: 3, c: 8, ns: [2, 9]       },
      ],
      givens: [
        { r: 3, c: 3, n: 1 }, { r: 3, c: 6, n: 3 },
      ],
      highlights: [
        { cells: rowCells(3),       role: "secondary" },
        { cells: [[3, 1], [3, 4]],  role: "primary"   },
      ],
      candidateMarks: [
        // Les 4 et 7 dans les autres cellules de la ligne → éliminés
        { r: 3, c: 0, n: 4, role: "eliminated" },
        { r: 3, c: 0, n: 7, role: "eliminated" },
        { r: 3, c: 2, n: 4, role: "eliminated" },
        { r: 3, c: 2, n: 7, role: "eliminated" },
        { r: 3, c: 5, n: 4, role: "eliminated" },
        { r: 3, c: 5, n: 7, role: "eliminated" },
      ],
    },
  },
  {
    id:   "pointing_pair",
    tier: "easy",
    diagram: {
      // Dans le bloc (0,0), le chiffre 3 apparaît uniquement en ligne 0 → (0,1) et (0,2).
      // On peut donc éliminer 3 des autres cellules de la ligne 0 (hors du bloc).
      candidates: [
        { r: 0, c: 1, ns: [3, 5] },      // pointing
        { r: 0, c: 2, ns: [3, 8] },      // pointing
        { r: 1, c: 0, ns: [2, 5] },
        { r: 1, c: 2, ns: [2, 8] },
        { r: 2, c: 0, ns: [5, 8] },
        { r: 2, c: 1, ns: [5, 9] },

        { r: 0, c: 4, ns: [1, 3, 9] },
        { r: 0, c: 5, ns: [3, 7]    },
        { r: 0, c: 7, ns: [1, 3]    },
      ],
      givens: [
        { r: 0, c: 0, n: 4 }, { r: 2, c: 2, n: 6 },
        { r: 0, c: 3, n: 2 }, { r: 0, c: 6, n: 6 }, { r: 0, c: 8, n: 5 },
      ],
      highlights: [
        { cells: boxCells(0, 0),    role: "secondary" },
        { cells: [[0, 1], [0, 2]],  role: "primary"   },
      ],
      candidateMarks: [
        // 3 reste dans la paire pointante
        { r: 0, c: 1, n: 3, role: "target" },
        { r: 0, c: 2, n: 3, role: "target" },
        // 3 éliminé du reste de la ligne 0
        { r: 0, c: 4, n: 3, role: "eliminated" },
        { r: 0, c: 5, n: 3, role: "eliminated" },
        { r: 0, c: 7, n: 3, role: "eliminated" },
      ],
    },
  },
];

// Tiers ordonnés pour l'affichage dans l'index (préserve l'ordre pédagogique)
export const TIERS: Tier[] = ["beginner", "easy", "intermediate", "advanced", "expert"];

export const groupByTier = (list: Technique[]): Record<Tier, Technique[]> => {
  const groups: Record<Tier, Technique[]> = {
    beginner: [], easy: [], intermediate: [], advanced: [], expert: [],
  };
  for (const tech of list) groups[tech.tier].push(tech);
  return groups;
};
