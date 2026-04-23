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
      // Grille partielle réaliste. Cible : (4,4) avec seul candidat 7.
      // Ligne 4 = {1,2,3,4,8,9}, colonne 4 = {3,5,6}, bloc (1,1) = {3,4,6,8}.
      // Union des éliminations = {1,2,3,4,5,6,8,9} → reste 7.
      givens: [
        // Row 0
        { r: 0, c: 0, n: 5 }, { r: 0, c: 2, n: 8 }, { r: 0, c: 5, n: 4 },
        // Row 1
        { r: 1, c: 1, n: 6 }, { r: 1, c: 7, n: 3 },
        // Row 2
        { r: 2, c: 3, n: 2 }, { r: 2, c: 8, n: 1 },
        // Row 3
        { r: 3, c: 4, n: 3 }, { r: 3, c: 7, n: 2 },
        // Row 4 (la ligne de notre cible) — remplit six des neuf cases
        { r: 4, c: 0, n: 1 }, { r: 4, c: 1, n: 2 }, { r: 4, c: 2, n: 3 },
        { r: 4, c: 3, n: 4 }, { r: 4, c: 5, n: 8 }, { r: 4, c: 6, n: 9 },
        // Row 5
        { r: 5, c: 1, n: 9 }, { r: 5, c: 4, n: 6 },
        // Row 6
        { r: 6, c: 0, n: 4 }, { r: 6, c: 8, n: 9 },
        // Row 7
        { r: 7, c: 1, n: 3 }, { r: 7, c: 4, n: 5 }, { r: 7, c: 7, n: 7 },
        // Row 8
        { r: 8, c: 2, n: 6 }, { r: 8, c: 5, n: 1 },
      ],
      candidates: [
        { r: 4, c: 4, ns: [7]       },  // cible — un seul candidat
        { r: 4, c: 7, ns: [5, 6]    },  // pour montrer le contraste
        { r: 4, c: 8, ns: [5, 6, 7] },
      ],
      highlights: [
        { cells: rowCells(4),       role: "secondary" },
        { cells: colCells(4),       role: "secondary" },
        { cells: boxCells(1, 1),    role: "secondary" },
        { cells: [[4, 4]],          role: "primary"   },
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
      // Grille partielle. Cible : 7 caché en (3,4), seul endroit possible dans la colonne 4.
      // Trois blocs de la colonne ((0,1), (1,1) sera complété par le 7 cible, (2,1)) contiennent
      // déjà un 7 hors de la col 4, éliminant le 7 des huit autres cellules.
      givens: [
        // Row 0
        { r: 0, c: 0, n: 1 }, { r: 0, c: 5, n: 4 }, { r: 0, c: 6, n: 8 }, { r: 0, c: 8, n: 5 },
        // Row 1 — 7 dans le bloc (0,1) à (1,3) : élimine 7 de (0,4), (1,4), (2,4) via bloc
        { r: 1, c: 1, n: 9 }, { r: 1, c: 3, n: 7 }, { r: 1, c: 6, n: 2 },
        // Row 2
        { r: 2, c: 0, n: 5 }, { r: 2, c: 7, n: 1 },
        // Row 3 — cible en (3,4)
        { r: 3, c: 0, n: 2 }, { r: 3, c: 2, n: 6 }, { r: 3, c: 7, n: 8 },
        // Row 4 — 7 en (4,0) élimine 7 de (4,4) via ligne
        { r: 4, c: 0, n: 7 }, { r: 4, c: 5, n: 6 }, { r: 4, c: 7, n: 4 },
        // Row 5 — 7 en (5,8) : dans le bloc (1,2)
        { r: 5, c: 1, n: 5 }, { r: 5, c: 3, n: 8 }, { r: 5, c: 8, n: 7 },
        // Row 6
        { r: 6, c: 0, n: 6 }, { r: 6, c: 5, n: 9 },
        // Row 7
        { r: 7, c: 2, n: 3 }, { r: 7, c: 8, n: 2 },
        // Row 8 — 7 en (8,5) : dans le bloc (2,1), élimine 7 de (6,4), (7,4), (8,4) via bloc
        { r: 8, c: 0, n: 4 }, { r: 8, c: 2, n: 1 }, { r: 8, c: 5, n: 7 }, { r: 8, c: 7, n: 3 },
      ],
      candidates: [
        // Colonne 4 : aucune cellule sauf la cible n'a le 7.
        { r: 0, c: 4, ns: [2, 3, 9]    },
        { r: 1, c: 4, ns: [1, 3, 5]    },
        { r: 2, c: 4, ns: [3, 8, 9]    },
        { r: 3, c: 4, ns: [1, 7, 9]    },  // cible — 7 caché parmi d'autres
        { r: 4, c: 4, ns: [2, 3, 5]    },
        { r: 5, c: 4, ns: [1, 2, 4]    },
        { r: 6, c: 4, ns: [2, 3, 4]    },
        { r: 7, c: 4, ns: [1, 5, 8]    },
        { r: 8, c: 4, ns: [2, 6, 8]    },
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
      // Grille partielle. Paire nue {4,7} sur la ligne 3 : en (3,1) et (3,4).
      // Ces deux cellules ont exactement les mêmes 2 candidats → 4 et 7 réservés.
      // Élimination de 4 et 7 dans les autres cellules vides de la ligne.
      givens: [
        // Row 0
        { r: 0, c: 1, n: 2 }, { r: 0, c: 2, n: 5 }, { r: 0, c: 7, n: 6 }, { r: 0, c: 8, n: 3 },
        // Row 1
        { r: 1, c: 1, n: 8 }, { r: 1, c: 4, n: 2 }, { r: 1, c: 6, n: 4 }, { r: 1, c: 7, n: 9 },
        // Row 2
        { r: 2, c: 0, n: 3 }, { r: 2, c: 4, n: 5 }, { r: 2, c: 7, n: 1 },
        // Row 3 — paire en (3,1) et (3,4), givens encadrants
        { r: 3, c: 3, n: 1 }, { r: 3, c: 6, n: 3 },
        // Row 4
        { r: 4, c: 0, n: 6 }, { r: 4, c: 5, n: 8 }, { r: 4, c: 8, n: 5 },
        // Row 5
        { r: 5, c: 0, n: 8 }, { r: 5, c: 2, n: 9 }, { r: 5, c: 5, n: 5 },
        { r: 5, c: 7, n: 7 }, { r: 5, c: 8, n: 6 },
        // Row 6
        { r: 6, c: 0, n: 2 }, { r: 6, c: 4, n: 6 }, { r: 6, c: 5, n: 1 }, { r: 6, c: 7, n: 3 },
        // Row 7
        { r: 7, c: 1, n: 5 }, { r: 7, c: 3, n: 7 }, { r: 7, c: 8, n: 8 },
        // Row 8
        { r: 8, c: 2, n: 1 }, { r: 8, c: 3, n: 4 }, { r: 8, c: 4, n: 9 }, { r: 8, c: 7, n: 2 },
      ],
      candidates: [
        { r: 3, c: 0, ns: [4, 5, 7]    },
        { r: 3, c: 1, ns: [4, 7]       },  // PAIRE
        { r: 3, c: 2, ns: [2, 4, 7]    },
        { r: 3, c: 4, ns: [4, 7]       },  // PAIRE
        { r: 3, c: 5, ns: [2, 4, 6, 7, 9] },
        { r: 3, c: 7, ns: [4, 8]       },
        { r: 3, c: 8, ns: [2, 4, 9]    },
      ],
      highlights: [
        { cells: rowCells(3),       role: "secondary" },
        { cells: [[3, 1], [3, 4]],  role: "primary"   },
      ],
      candidateMarks: [
        // La paire : 4 et 7 réservés
        { r: 3, c: 1, n: 4, role: "target"     },
        { r: 3, c: 1, n: 7, role: "target"     },
        { r: 3, c: 4, n: 4, role: "target"     },
        { r: 3, c: 4, n: 7, role: "target"     },
        // Élimination sur les autres cellules de la ligne
        { r: 3, c: 0, n: 4, role: "eliminated" },
        { r: 3, c: 0, n: 7, role: "eliminated" },
        { r: 3, c: 2, n: 4, role: "eliminated" },
        { r: 3, c: 2, n: 7, role: "eliminated" },
        { r: 3, c: 5, n: 4, role: "eliminated" },
        { r: 3, c: 5, n: 7, role: "eliminated" },
        { r: 3, c: 7, n: 4, role: "eliminated" },
        { r: 3, c: 8, n: 4, role: "eliminated" },
      ],
    },
  },
  {
    id:   "pointing_pair",
    tier: "easy",
    diagram: {
      // Grille partielle. Dans le bloc (0,0), le 3 n'a que deux cases candidates,
      // toutes deux sur la ligne 0 : (0,1) et (0,2). Puisque le 3 du bloc est sur
      // la ligne 0, on élimine le 3 des autres cases de la ligne 0 hors du bloc.
      // Le 3 en (1,7) (row 1, block (0,2)) élimine le 3 des trois cases de la ligne 1
      // dans le bloc (0,0). Les givens (2,0)/(2,1)/(2,2) remplissent la ligne 2 du bloc.
      givens: [
        // Row 0 — row contenant la paire pointante
        { r: 0, c: 0, n: 5 }, { r: 0, c: 3, n: 2 }, { r: 0, c: 6, n: 6 }, { r: 0, c: 8, n: 4 },
        // Row 1 — 3 en (1,7) crucial pour éliminer le 3 du haut du bloc (0,0) via la ligne 1
        { r: 1, c: 4, n: 9 }, { r: 1, c: 5, n: 8 }, { r: 1, c: 7, n: 3 },
        // Row 2 — complète la ligne 2 du bloc (0,0) avec 3 givens
        { r: 2, c: 0, n: 6 }, { r: 2, c: 1, n: 8 }, { r: 2, c: 2, n: 9 },
        // Row 3
        { r: 3, c: 2, n: 1 }, { r: 3, c: 4, n: 5 }, { r: 3, c: 7, n: 7 },
        // Row 4
        { r: 4, c: 0, n: 4 }, { r: 4, c: 5, n: 6 }, { r: 4, c: 8, n: 1 },
        // Row 5
        { r: 5, c: 1, n: 6 }, { r: 5, c: 3, n: 9 }, { r: 5, c: 6, n: 5 },
        // Row 6
        { r: 6, c: 0, n: 9 }, { r: 6, c: 4, n: 2 }, { r: 6, c: 8, n: 5 },
        // Row 7
        { r: 7, c: 2, n: 5 }, { r: 7, c: 5, n: 1 }, { r: 7, c: 7, n: 8 },
        // Row 8
        { r: 8, c: 1, n: 4 }, { r: 8, c: 3, n: 7 }, { r: 8, c: 6, n: 3 }, { r: 8, c: 8, n: 9 },
      ],
      candidates: [
        // Dans le bloc (0,0) : le 3 n'a que (0,1) et (0,2) comme candidats
        { r: 0, c: 1, ns: [1, 3, 7] },  // paire pointante
        { r: 0, c: 2, ns: [3, 7]    },  // paire pointante
        { r: 1, c: 0, ns: [1, 2, 7] },  // pas de 3 — éliminé par (1,7)=3
        { r: 1, c: 1, ns: [1, 2, 7] },  // pas de 3
        { r: 1, c: 2, ns: [2, 4, 7] },  // pas de 3
        // Ligne 0, hors du bloc : le 3 reste candidat en (0,4) et (0,5)
        { r: 0, c: 4, ns: [1, 3, 7] },
        { r: 0, c: 5, ns: [3, 7]    },
      ],
      highlights: [
        { cells: rowCells(0),       role: "secondary" },
        { cells: boxCells(0, 0),    role: "secondary" },
        { cells: [[0, 1], [0, 2]],  role: "primary"   },
      ],
      candidateMarks: [
        // La paire pointante
        { r: 0, c: 1, n: 3, role: "target"     },
        { r: 0, c: 2, n: 3, role: "target"     },
        // Éliminations sur la ligne 0 hors du bloc
        { r: 0, c: 4, n: 3, role: "eliminated" },
        { r: 0, c: 5, n: 3, role: "eliminated" },
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
