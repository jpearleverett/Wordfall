import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { getRemoteBoolean } from '../services/remoteConfig';
import { OwlIcon } from './icons/iconsMisc';
import { FlameIcon } from './icons/iconsCore';

interface GameplayMascotProps {
  /** Monotonic counter — bumps every time a word is found. Drives the bounce. */
  foundCount: number;
  /** Mirrors GameScreen's last-word tension. Drives the wide-eyed state. */
  tensionActive: boolean;
  /** Player's current flawless streak. Shows the flame overlay when > 0. */
  flawlessStreak: number;
  /**
   * Accent of the current chapter's Grand Library wing (see
   * src/data/library.ts getWing). Tints the bubble border/glow so Folio
   * visibly belongs to the hall being restored. Falls back to the default
   * accent when absent (daily / specialty modes).
   */
  wingAccent?: string;
}

/**
 * FOLIO, the owl archivist and Keeper of the Grand Library (canon lives in
 * src/data/library.ts) — a tiny absolute-positioned mascot that reacts to
 * gameplay events. Renders the bespoke OwlIcon SVG (gold-tinted under
 * last-word tension) so it can ship and be tuned before dedicated art
 * arrives. Swap the icon for <Image source={sprite} /> when a real Folio
 * sprite is available.
 *
 * Mounted absolutely (pointerEvents none) so it never displaces the grid
 * layout or intercepts taps. RC-gated via `gameplayMascotEnabled` (default
 * ON). Reduce-motion-aware: animations collapse to a static render.
 */
const GameplayMascot: React.FC<GameplayMascotProps> = ({
  foundCount,
  tensionActive,
  flawlessStreak,
  wingAccent,
}) => {
  const enabled = getRemoteBoolean('gameplayMascotEnabled');
  const reduceMotion = useReduceMotion();

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const idleBreath = useSharedValue(1);

  // Idle breathing loop — slow scale 1.0 ↔ 1.04, disabled under reduce-motion.
  useEffect(() => {
    if (reduceMotion || !enabled) {
      idleBreath.value = 1;
      return;
    }
    idleBreath.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, enabled]);

  // Word-found bounce — fires on every `foundCount` change (monotonic so
  // increases cleanly; no extra dep needed).
  useEffect(() => {
    if (foundCount === 0 || reduceMotion || !enabled) return;
    scale.value = withSequence(
      withSpring(1.25, { damping: 5, stiffness: 260 }),
      withSpring(1, { damping: 8, stiffness: 180 }),
    );
    rotation.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 120 }),
      withTiming(0, { duration: 120 }),
    );
  }, [foundCount, reduceMotion, enabled]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * idleBreath.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (!enabled) return null;

  // Expression logic — tension retints the owl gold; flame overlay when
  // streak > 0. Wing accent (static style, no per-frame cost) tints the
  // bubble border + glow to the current Library wing.
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble,
          wingAccent ? { borderColor: wingAccent, shadowColor: wingAccent } : null,
          animStyle,
        ]}
      >
        <OwlIcon size={34} accent={tensionActive ? COLORS.gold : undefined} />
        {flawlessStreak > 0 && (
          <View style={styles.streakOverlay}>
            <FlameIcon size={16} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Anchored in the quiet strip below the booster tray, clear of the board
  // and the tray. Two blind-review rounds read every position that touched
  // the board as "a stray sprite floating over tiles" — down here Folio
  // reads as a companion sitting at the table edge. Tune once a real sprite
  // arrives.
  container: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    zIndex: 20,
  },
  bubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(26, 10, 46, 0.85)',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  streakOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -6,
  },
});

export default React.memo(GameplayMascot);
