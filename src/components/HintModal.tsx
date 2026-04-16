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
  const insets    = useSafeAreaInsets();
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

  const handleReveal = () => {
    onApply();   // remplit la case ET ferme (applyHint appelle déjà setPendingHint(null))
  };

  const handleDismiss = () => {
    onDismiss(); // ferme sans remplir — la case reste sélectionnée
  };

  return (
    <Modal transparent animationType="none" visible={!!hint} onRequestClose={handleDismiss}>
      <Animated.View style={[
        styles.card,
        {
          backgroundColor:  colors.bg,
          borderTopColor:   colors.borderBox,
          paddingBottom:    Math.max(insets.bottom, 20) + 16,
          transform:        [{ translateY: slideAnim }],
        },
      ]}>

        {/* En-tête : icône + nom de la technique */}
        <View style={styles.header}>
          <Text style={[styles.headerIcon, { color: colors.hintColor }]}>✦</Text>
          <Text style={[styles.headerTitle, { color: colors.hintColor }]}>
            {hint.techniqueTitle}
          </Text>
        </View>

        {/* Message pédagogique */}
        <Text style={[styles.message, { color: colors.textPrimary }]}>
          {hint.message}
        </Text>

        {/* Boutons */}
        <View style={styles.btnRow}>
          {/* Bouton secondaire : fermer sans révéler */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={[styles.btnSecondary, { borderColor: colors.borderBox }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>
              {t('hint.understood')}
            </Text>
          </TouchableOpacity>

          {/* Bouton principal : révéler la solution */}
          <TouchableOpacity
            onPress={handleReveal}
            style={[styles.btnPrimary, { backgroundColor: colors.hintColor }]}
            activeOpacity={0.7}
          >
            <Text style={styles.btnPrimaryText}>
              {t('hint.reveal')}
            </Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position:         "absolute",
    bottom: 0, left: 0, right: 0,
    borderTopWidth:   1,
    paddingTop:       20,
    paddingHorizontal: 24,
    paddingBottom:    20,
    gap:              16,
  },

  header: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  headerIcon:  { fontSize: 14 },
  headerTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 3 },

  message: {
    fontSize:   14,
    lineHeight: 22,
    fontStyle:  "italic",
  },

  btnRow: {
    flexDirection: "row",
    gap:           10,
  },

  // Bouton secondaire : discret, bord fin
  btnSecondary: {
    flex:            1,
    paddingVertical: 12,
    borderWidth:     1,
    alignItems:      "center",
    justifyContent:  "center",
  },
  btnSecondaryText: {
    fontSize:      11,
    fontWeight:    "600",
    letterSpacing: 1.5,
  },

  // Bouton principal : plein, coloré
  btnPrimary: {
    flex:            1,
    paddingVertical: 13,
    alignItems:      "center",
    justifyContent:  "center",
  },
  btnPrimaryText: {
    fontSize:      12,
    fontWeight:    "800",
    letterSpacing: 2,
    color:         "#1A1A1A",
  },
});
