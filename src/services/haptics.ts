import * as Haptics from 'expo-haptics';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export async function tapHaptic(): Promise<void> {
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function wordFoundHaptic(): Promise<void> {
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export async function comboHaptic(): Promise<void> {
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function errorHaptic(): Promise<void> {
  if (!hapticsEnabled) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

export async function successHaptic(): Promise<void> {
  if (!hapticsEnabled) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
