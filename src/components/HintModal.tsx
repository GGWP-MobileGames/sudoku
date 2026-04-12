import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import type { PedagogicHint } from "../hooks/useGameState";

interface Props {
  hint:      PedagogicHint | null;
  onApply:   () => void;
  onDismiss: () => void;
}

export default function HintModal({ hint, onApply, onDismiss }: Props) {
  const { t, colors } = useSettings();
  const insets = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (hint) {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }),
        Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 12, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
    }
  }, [hint]);

  if (!hint) return null;

  // Appliquer l'indice ET fermer
  const handleDismiss = () => {
    onApply();
    onDismiss();
  };

  return (
    <Modal transparent animationType="none" visible={!!hint} onRequestClose={handleDismiss}>
      {/* Carte en bas de l'écran */}
      <Animated.View style={[styles.card, { backgroundColor: colors.bg, borderTopColor: colors.borderBox, paddingBottom: Math.max(insets.bottom, 20) + 16, transform: [{ translateY: slideAnim }] }]}>

        <View style={styles.header}>
          <Text style={[styles.headerIcon, { color: colors.hintColor }]}>✦</Text>
          <Text style={[styles.headerTitle, { color: colors.hintColor }]}>{t('hint.title')}</Text>
        </View>

        <Text style={[styles.message, { color: colors.textPrimary }]}>{hint.message}</Text>

        <TouchableOpacity onPress={handleDismiss} style={[styles.btn, { borderColor: colors.borderBox }]} activeOpacity={0.7}>
          <Text style={[styles.btnText, { color: colors.textPrimary }]}>{t('hint.understood')}</Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Carte ancrée tout en bas
  card: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    borderTopWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 20, // sera écrasé dynamiquement avec useSafeAreaInsets
    gap: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon:  { fontSize: 14 },
  headerTitle: {
    fontSize: 12, fontWeight: "800",
    letterSpacing: 3,
  },

  message: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
  },

  btn: {
    paddingVertical: 13,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    fontSize: 13, fontWeight: "700",
    letterSpacing: 2.5,
  },
});
