// src/utils/haptics.ts
// Retours haptiques — no-op sur web, safe si expo-haptics absent.

import { Platform } from "react-native";

let Haptics: typeof import("expo-haptics") | null = null;
if (Platform.OS !== "web") {
  try { Haptics = require("expo-haptics"); } catch {}
}

export function lightImpact() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
export function mediumImpact() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
export function errorNotification() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
export function successNotification() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
