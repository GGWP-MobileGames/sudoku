import React, { useLayoutEffect, useRef, useState } from "react";
import { Animated, useWindowDimensions, StyleSheet, View, Easing, Platform } from "react-native";
import { useSettings } from "../context/SettingsContext";

export type TransitionDirection = "right" | "left" | "up" | "down" | "fade";

interface Props {
  children:  React.ReactNode;
  screenKey: string;
  direction: TransitionDirection;
}

function getEntry(direction: TransitionDirection, w: number, h: number) {
  switch (direction) {
    case "right": return { x:  w, y: 0 };
    case "left":  return { x: -w, y: 0 };
    case "up":    return { x: 0,  y: h };
    case "down":  return { x: 0,  y: -h };
    default:      return { x: 0,  y: 0 };
  }
}

// Ombre portée sur le bord d'entrée — renforce l'effet "page qui se tourne"
const SHADOW_STYLE: Record<TransitionDirection, object> = {
  right: { left:   0, top: 0, bottom: 0, width: 18 },
  left:  { right:  0, top: 0, bottom: 0, width: 18 },
  up:    { top:    0, left: 0, right: 0, height: 18 },
  down:  { bottom: 0, left: 0, right: 0, height: 18 },
  fade:  {},
};

export default function ScreenTransition({ children, screenKey, direction }: Props) {
  const { colors } = useSettings();
  const { width, height } = useWindowDimensions();
  const translateX    = useRef(new Animated.Value(0)).current;
  const translateY    = useRef(new Animated.Value(0)).current;
  const opacity       = useRef(new Animated.Value(1)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    const { x, y } = getEntry(direction, width, height);
    translateX.setValue(x);
    translateY.setValue(y);
    shadowOpacity.setValue(1);
    const DURATION = 300;
    setAnimating(true);

    if (direction === "fade") {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1, duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start(() => setAnimating(false));
    } else {
      opacity.setValue(1);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0, duration: DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(translateY, {
          toValue: 0, duration: DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(shadowOpacity, {
          toValue: 0, duration: DURATION,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => setAnimating(false));
    }
  }, [screenKey]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Animated.View style={[
        styles.fill,
        { transform: [{ translateX }, { translateY }], opacity },
      ]}>
        {/* Bloquer les touches pendant l'animation pour éviter les taps ratés */}
        <View style={[styles.fill, { pointerEvents: animating ? "none" : "auto" }]}>
          {children}
        </View>

        {direction !== "fade" && (
          <Animated.View
            style={[
              { pointerEvents: "none" as const },
              styles.shadow,
              SHADOW_STYLE[direction],
              { opacity: shadowOpacity },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  fill: { flex: 1 },
  shadow: {
    position: "absolute",
    // Dégradé simulé avec une teinte semi-transparente sombre sur le bord entrant
    backgroundColor: "rgba(0,0,0,0.10)",
  },
});
