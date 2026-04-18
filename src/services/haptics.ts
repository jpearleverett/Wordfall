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

export async function selectionHaptic(): Promise<void> {
  // Ultra-light selection feedback
  if (!hapticsEnabled) return;
  await Haptics.selectionAsync();
}

export async function chainReactionHaptic(): Promise<void> {
  // Double-tap pattern for chain reactions
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
}

export async function gravityLandHaptic(): Promise<void> {
  // Soft thud when gravity tiles land
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function levelCompleteHaptic(): Promise<void> {
  // Triple celebration pattern
  if (!hapticsEnabled) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 150);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
}

export async function prestigeHaptic(): Promise<void> {
  // Grand escalating pattern for prestige
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
  setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 350);
}

export async function boosterActivateHaptic(): Promise<void> {
  // Quick double-pulse for booster activation
  if (!hapticsEnabled) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 80);
}

/**
 * Combo haptic — Success + Heavy + Heavy triple pulse. Distinct from a lone
 * booster activation so the two-booster synergy feels meatier.
 */
export async function boosterComboHaptic(): Promise<void> {
  if (!hapticsEnabled) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 90);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 180);
}

export async function streakMilestoneHaptic(): Promise<void> {
  // Rhythmic celebration for streak milestones
  if (!hapticsEnabled) return;
  for (let i = 0; i < 3; i++) {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), i * 120);
  }
  setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
}
