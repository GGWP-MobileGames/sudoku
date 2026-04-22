import React from "react";
import { BackHandler, Platform, View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "./src/context/SettingsContext";
import { useFonts, Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import * as SplashScreen from "expo-splash-screen";
import ScreenTransition, { type TransitionDirection } from "./src/components/ScreenTransition";
import HomeScreen     from "./src/screens/HomeScreen";
import GameScreen     from "./src/screens/GameScreen";
import StatsScreen    from "./src/screens/StatsScreen";
import SettingsScreen      from "./src/screens/SettingsScreen";
import DailyChallengeScreen from "./src/screens/DailyChallengeScreen";
import RulesScreen       from "./src/screens/RulesScreen";
import GGWPScreen         from "./src/screens/GGWPScreen";
import AsyncStorage       from "@react-native-async-storage/async-storage";
import { getDailyPuzzle, loadDailyGame, getTodayKey, saveDailyRecord, clearDailyGame, type DailySavedGame } from "./src/utils/dailyChallenge";
import type { Difficulty } from "./src/utils/puzzles";
import type { Grid } from "./src/utils/sudoku";
import type { SavedGame } from "./src/utils/storage";

// Empêche le splash de se masquer automatiquement (natif uniquement)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

type Screen = "home" | "game" | "stats" | "settings" | "daily" | "daily-game" | "welcome" | "rules";

interface AppContentProps {
  onReady: () => void;
}

function AppContent({ onReady }: AppContentProps) {
  const [screen,     setScreen]     = React.useState<Screen | null>(null);
  const [screenKey,  setScreenKey]  = React.useState("home-0");
  const [direction,  setDirection]  = React.useState<TransitionDirection>("fade");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("easy");
  const [savedGame,  setSavedGame]  = React.useState<SavedGame | null>(null);
  const [prebuilt,   setPrebuilt]   = React.useState<{ puzzle: Grid; solution: Grid } | undefined>();
  const dailyGameRef = React.useRef<{ puzzle: Grid; solution: Grid; label: string; dateKey: string } | null>(null);
  const [dailySaved, setDailySaved] = React.useState<DailySavedGame | null>(null);

  const navigate = (s: Screen, dir: TransitionDirection) => {
    setDirection(dir);
    setScreen(s);
    setScreenKey(s + "-" + Date.now());
  };

  // Initialisation : vérification welcome + chargement daily en parallèle
  React.useEffect(() => {
    const todayPuzzle = getDailyPuzzle();
    dailyGameRef.current = todayPuzzle;

    Promise.all([
      AsyncStorage.getItem("has_seen_welcome"),
      loadDailyGame(),
      Platform.OS !== "web" ? new Promise(resolve => setTimeout(resolve, 2000)) : Promise.resolve(),
    ]).then(([welcomed, saved]) => {
      const today = getTodayKey();
      if (saved && saved.dateKey !== today && !saved.isCatchup) {
        // Partie d'un jour précédent (non-rattrapage) → la noter comme tentée et effacer
        saveDailyRecord({
          dateKey:   saved.dateKey,
          seconds:   saved.seconds   ?? 0,
          mistakes:  saved.mistakes  ?? 0,
          hints:     3 - (saved.hintsLeft ?? 3),
          completed: false,
        });
        clearDailyGame();
      } else if (saved) {
        // Partie du jour ou rattrapage en cours → recharger
        setDailySaved(saved);
      }
      const initialScreen: Screen = welcomed ? "home" : "welcome";
      setScreen(initialScreen);
      setScreenKey(initialScreen + "-0");
      setDirection("fade");
      onReady();
    }).catch(() => {
      // Si AsyncStorage échoue au démarrage, on atterrit sur l'accueil sans données daily
      setScreen("home");
      setScreenKey("home-0");
      onReady();
    });
  }, []);

  const handleStart = (d: Difficulty, pre: { puzzle: Grid; solution: Grid }) => {
    setDifficulty(d);
    setSavedGame(null); setPrebuilt(pre);
    navigate("game", "right");
  };

  const handleResume = (game: SavedGame) => {
    setDifficulty(game.difficulty as Difficulty);
    setSavedGame(game); setPrebuilt(undefined);
    navigate("game", "right");
  };

  const handleBackToHome   = () => navigate("home", "left");
  const handleGoStats      = () => navigate("stats", "up");
  const handleBackStats    = () => navigate("home", "down");
  const handleGoSettings   = () => navigate("settings", "up");
  const handleBackSettings = () => navigate("home", "down");
  const handleGoDaily      = () => navigate("daily", "right");
  const handleBackDaily    = () => navigate("home", "left");
  const handleGoRules      = () => navigate("rules", "up");
  const handleBackRules    = () => navigate("home", "down");

  // Lance un défi passé. `mode` :
  //  - "start"   : nouveau rattrapage (aucune partie active)
  //  - "resume"  : reprise d'un rattrapage en cours (savedGame conservé)
  //  - "abandon" : efface la partie active avant de démarrer le rattrapage
  const openPastDay = (dateKey: string, mode: "start" | "resume" | "abandon") => {
    if (mode === "abandon") clearDailyGame();
    if (mode !== "resume")  setDailySaved(null);
    dailyGameRef.current = getDailyPuzzle(dateKey);
    navigate("daily-game", "right");
  };

  const handleStartPast             = (dateKey: string) => openPastDay(dateKey, "start");
  const handleResumePast            = (dateKey: string) => openPastDay(dateKey, "resume");
  const handleAbandonAndStartPast   = (dateKey: string) => openPastDay(dateKey, "abandon");

  // ── Geste retour Android ──────────────────────────────────────────────────
  React.useEffect(() => {
    const onBack = () => {
      if (!screen || screen === "home" || screen === "welcome") return false;
      if (screen === "game")       { handleBackToHome();   return true; }
      if (screen === "stats")      { handleBackStats();    return true; }
      if (screen === "settings")   { handleBackSettings(); return true; }
      if (screen === "daily")      { handleBackDaily();    return true; }
      if (screen === "daily-game") { handleBackToHome();   return true; }
      if (screen === "rules")      { handleBackRules();    return true; }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [screen]);

  if (!screen) return null;

  const renderScreen = () => {
    if (screen === "game") return (
      <GameScreen
        difficulty={difficulty} savedGame={savedGame} prebuilt={prebuilt}
        onBackToHome={handleBackToHome}
        onSettings={handleGoSettings}
      />
    );
    if (screen === "stats") return (
      <StatsScreen onBack={handleBackStats} />
    );
    if (screen === "settings") return (
      <SettingsScreen onBack={handleBackSettings} />
    );
    if (screen === "rules") return (
      <RulesScreen onBack={handleBackRules} />
    );
    if (screen === "welcome") return (
      <GGWPScreen
        onClose={() => {
          AsyncStorage.setItem("has_seen_welcome", "1");
          navigate("home", "right");
        }}
      />
    );
    if (screen === "daily") return (
      <DailyChallengeScreen
        onStart={() => {
          const p = getDailyPuzzle();
          dailyGameRef.current = p;
          setDailySaved(null);
          navigate("daily-game", "right");
        }}
        onResume={() => {
          const p = getDailyPuzzle();
          dailyGameRef.current = p;
          navigate("daily-game", "right");
        }}
        hasSavedGame={!!dailySaved && dailySaved.dateKey === getTodayKey()}
        onStartPast={handleStartPast}
        onResumePast={handleResumePast}
        onAbandonAndStartPast={handleAbandonAndStartPast}
        savedPastDateKey={dailySaved?.isCatchup ? dailySaved.dateKey : undefined}
        onBack={handleBackDaily}
      />
    );
    if (screen === "daily-game") return (
      <GameScreen
        difficulty="hard"
        prebuilt={!dailySaved ? (dailyGameRef.current ?? undefined) : undefined}
        savedGame={dailySaved && dailyGameRef.current ? {
          ...dailySaved,
          solution: dailyGameRef.current.solution,
          notes: Array.isArray(dailySaved.notes?.[0]?.[0]) ? dailySaved.notes : [],
          savedAt: 0,
        } : undefined}
        isDaily
        dailyDateKey={dailySaved?.dateKey ?? dailyGameRef.current?.dateKey ?? getTodayKey()}
        onBackToHome={() => {
          loadDailyGame().then(s => {
            const today = getTodayKey();
            setDailySaved(s && (s.dateKey === today || s.isCatchup) ? s : null);
          });
          navigate("home", "left");
        }}
        onSettings={handleGoSettings}
      />
    );
    return (
      <HomeScreen
        initialDifficulty={difficulty}
        onStart={handleStart}
        onResume={handleResume}
        onStats={handleGoStats}
        onSettings={handleGoSettings}
        onDaily={handleGoDaily}
        onInfo={() => navigate("welcome", "left")}
        onRules={handleGoRules}
        onDifficultyChange={setDifficulty}
      />
    );
  };

  return (
    <ScreenTransition screenKey={screenKey} direction={direction}>
      {renderScreen()}
    </ScreenTransition>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Cinzel_700Bold });
  const [appReady, setAppReady] = React.useState(false);

  React.useEffect(() => {
    if (fontsLoaded && appReady && Platform.OS !== "web") {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady]);

  if (!fontsLoaded) {
    if (Platform.OS === "web") {
      return (
        <View style={{ flex: 1, backgroundColor: "#EDEADE", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 32, fontWeight: "800", letterSpacing: 10, color: "#2C2C2C" }}>SUDOKU</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppContent onReady={() => setAppReady(true)} />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
