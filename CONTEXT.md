# GGWP Sudoku — Contexte projet

## Vue d'ensemble
Application Sudoku Android développée avec React Native + Expo SDK 52.
Nom de l'app : **Sudoku - GGWP** (marque GGWP = "Good Game Well Played", jeu de mots gamer).
Positionnement : gratuite, sans publicité, sans collecte de données.

---

## Stack technique
- **Framework** : React Native + Expo SDK 52
- **Navigation** : state-based maison dans `App.tsx` (pas de React Navigation)
- **Stockage** : AsyncStorage
- **Animations** : React Native Animated (useNativeDriver: true partout sauf height)
- **i18n** : moteur maison léger dans `src/i18n/index.ts` (sans dépendance externe)
- **Icônes** : `@expo/vector-icons` (Ionicons)
- **Safe area** : `react-native-safe-area-context` (SafeAreaProvider dans App.tsx, SafeAreaView dans chaque écran)

---

## Structure des fichiers
```
sudoku-app/
├── App.tsx                          # Navigation + providers
├── app.json                         # name: "Sudoku - GGWP", package: com.ggwp.sudoku
├── assets/
│   ├── icon.svg                     # Icône app (à convertir en PNG 512×512)
│   ├── feature-graphic.svg          # Bannière Play Store 1024×500
│   └── splash.svg                   # Splash screen (à convertir en PNG)
└── src/
    ├── components/
    │   ├── HintModal.tsx            # Bottom sheet indice pédagogique
    │   ├── NumberPad.tsx            # Pavé numérique + Annuler/Notes/Indice
    │   ├── ScreenTransition.tsx     # Slide directionnel entre écrans (useLayoutEffect)
    │   ├── SudokuCell.tsx           # Cellule grille (React.memo)
    │   ├── SudokuGrid.tsx           # Grille 9×9 + animations vague
    │   └── VictoryModal.tsx         # Modal victoire
    ├── context/
    │   └── SettingsContext.tsx      # Contexte global : settings, colors, t(), vibrate()
    ├── hooks/
    │   └── useGameState.ts          # Toute la logique de jeu
    ├── i18n/
    │   ├── index.ts                 # Moteur i18n : createT(), DEVICE_LANGUAGE
    │   ├── fr.json                  # Français (langue de référence)
    │   ├── en.json
    │   ├── es.json
    │   ├── de.json
    │   ├── pt.json
    │   └── ja.json
    ├── screens/
    │   ├── DailyChallengeScreen.tsx # Défi du jour + calendrier mensuel
    │   ├── GameScreen.tsx           # Écran de jeu
    │   ├── HomeScreen.tsx           # Menu principal
    │   ├── SettingsScreen.tsx       # Paramètres
    │   ├── StatsScreen.tsx          # Statistiques
    │   └── WelcomeScreen.tsx        # Page de bienvenue (1er lancement)
    └── utils/
        ├── dailyChallenge.ts        # Puzzle du jour + sauvegarde daily
        ├── hintAnalyzer.ts          # Analyse pédagogique (6 techniques)
        ├── puzzleDatabase.json      # 10 000 grilles validées (Sudoku Exchange)
        ├── puzzles.ts               # Accès à la base de puzzles
        ├── settings.ts              # AppSettings + load/save
        ├── solver.ts                # Solveur logique humain
        ├── storage.ts               # AsyncStorage : partie, stats, historique
        ├── sudoku.ts                # Génération de grilles (non utilisé en jeu)
        └── theme.ts                 # Palettes LIGHT/DARK + getColors()
```

---

## Navigation (App.tsx)
Screens possibles : `"home" | "game" | "stats" | "settings" | "daily" | "daily-game" | "welcome"`

```
home      → game        (right) : nouvelle partie ou reprise
home      → daily       (right) : défi du jour
daily     → daily-game  (right) : jouer le défi
home      → stats       (up)
home      → settings    (up)
home      → welcome     (left)  : bouton ℹ️
welcome   → home        (right)
game      → home        (left)
```

La fonction `navigate(screen, direction)` change screen + screenKey simultanément (pas de délai).

---

## Thème et couleurs
### LIGHT (défaut)
```
bg:              #F5F0E8  (crème)
bgCard:          #EDEAE0
bgCellSelected:  #4A4A4A  (sélection menu)
bgCellSelectedGrid: #C9963A (sélection dans la grille)
gold:            #C9963A
hintColor:       #4A6741  (vert forêt)
hintHighlight:   #C5DEB8  (vert pomme, cases groupe indice)
```
### DARK
```
bg:              #2A2825
bgCard:          #333028
borderThin:      #48433C
```

**Règle critique** : `StyleSheet.create` utilise toujours `COLORS` (statique). Les couleurs dynamiques (`colors.xxx` du hook) vont uniquement en inline style dans le JSX.

---

## Fonctionnalités

### Jeu
- 10 000 grilles depuis `puzzleDatabase.json` (easy/medium/hard/diabolical)
- Saisie : bons chiffres → grid, mauvais → cellErrors (rouge, bas-droite, permanent)
- **Annuler** : annule uniquement les notes, pas les chiffres corrects
- **Indices pédagogiques** : 3 par défaut (configurable), analyse NakedSingle → HiddenSingle → PointingPair → fallback
- Pause automatique quand l'app passe en arrière-plan (AppState)
- Sauvegarde auto à chaque tick du timer

### Défi du jour
- Puzzle déterministe : `seed = année×10000 + mois×100 + jour`, toujours `difficulty: "hard"`
- Sauvegarde séparée dans `daily_current_game` (AsyncStorage)
- 3 indices fixes (ignore le paramètre utilisateur)
- Calendrier mensuel 30 jours avec navigation
- Pop-up détail par jour (tap sur une case du calendrier)
- Streak de jours consécutifs

### Statistiques
- 3 tableaux : Statistiques globales, Meilleures parties, Historique (20 dernières)
- Les parties "en cours" ne sont **plus loguées** (recordOngoing = no-op)
- Les défis du jour apparaissent dans l'historique avec label "★ Défi\ndu jour"
- Colonne "Résultat" supprimée de l'historique (plus assez de cas distincts)

### Internationalisation
- 6 langues : FR, EN, ES, DE, PT, JA
- Détection automatique de la langue de l'appareil
- Sélecteur manuel dans les Paramètres (option "Auto")
- Toutes les chaînes dans `src/i18n/{lang}.json`
- Les messages d'indices pédagogiques sont aussi traduits (section `hints` dans chaque JSON)
- `t()` disponible via `useSettings()` dans tout composant

### Animations
- Slide entre écrans : `useLayoutEffect` dans ScreenTransition (évite le flash position 0)
- Vague d'apparition grille : diagonale, délai 160ms après le slide (160 + i×28ms)
- 3 vagues dorées à la victoire depuis le centre
- Flash or sur groupes complétés
- Slide gauche + LayoutAnimation sur abandon de partie (HomeScreen)

---

## Performance
- `React.memo` sur `SudokuCell` et `NumberPad`
- Initialisation synchrone des états dans `useGameState` (lazy initializers useState)
- `recordOngoing` et `clearSavedGame` appelés en fire-and-forget (`.catch(() => {})`)
- Transitions sans délai artificiel (plus d'InteractionManager)

---

## Paramètres (AppSettings)
```typescript
interface AppSettings {
  darkMode:           boolean;  // défaut false
  highlightIdentical: boolean;  // défaut true
  highlightGroup:     boolean;  // défaut true
  haptics:            boolean;  // défaut true
  hintsPerGame:       number;   // défaut 3
  language:           string;   // défaut 'auto'
}
```

---

## Points d'attention / règles à respecter

1. **Ne jamais** utiliser `colors.xxx` dans `StyleSheet.create` — uniquement en inline style
2. **SafeAreaView** vient de `react-native-safe-area-context`, pas de `react-native`
3. Le type `Difficulty` dans `puzzles.ts` = `"easy" | "medium" | "hard" | "diabolical"` (4 niveaux). Le type dans `sudoku.ts` est différent (vestige, non utilisé en jeu)
4. Les refs miroirs (`secondsRef`, `mistakesRef`, `hintsLeftRef`) existent pour lire les valeurs courantes dans les closures async — ne pas lire `seconds`/`mistakes`/`hintsLeft` directement dans les useEffect de victoire
5. `dailyGameRef` est un `useRef` (pas useState) pour éviter le problème de timing async au lancement du défi
6. Les textes modifiables par le développeur sont **tous** dans `src/i18n/{lang}.json`
7. `pool.ts` a été supprimé — ne pas le recréer
8. `hasConflict` et `findEmptyCell` ont été supprimés — ne pas les recréer

---

## État actuel (mars 2026)
✅ Fonctionnel sur Android via Expo Go
✅ 6 langues complètes
✅ Défi du jour avec calendrier
✅ Sauvegarde complète (partie normale + défi)
✅ SafeAreaView migré vers react-native-safe-area-context
✅ Audit qualité code effectué (pas de code mort)
✅ Accessibilité : fontSize minimum 11px partout sauf ornements décoratifs
✅ Icône et assets Play Store générés (SVG dans assets/)

## En attente
- Conversion SVG → PNG pour assets Expo (icon.png, splash.png, adaptive-icon.png)
- Lien de financement participatif (remplacer `[lien à venir]` dans les JSON)
- Nom de marque final (GGWP retenu, à valider)
- Publication Google Play Store (eas build --platform android --profile production)
